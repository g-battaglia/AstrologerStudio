import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { NextProxy } from 'next/server'
import { decrypt } from '@/lib/security/session'

/**
 * Routes that redirect authenticated users to dashboard
 */
const authRedirectRoutes = ['/', '/login']

/**
 * Public pages accessible to EVERYONE (logged in or not)
 * Admin routes handle their own authentication separately
 */
const publicAccessRoutes = [
  '/about',
  '/legal',
  '/pricing',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/register',
  '/verify-account',
  '/share/birthchart',
  '/admin', // Admin section has its own auth
]

/**
 * Check if path starts with a public access route
 */
function isPublicRoute(path: string): boolean {
  return publicAccessRoutes.some((route) => path === route || path.startsWith(route + '/'))
}

/**
 * Checks if an IP address matches a CIDR range or exact IP.
 *
 * Supports both exact IP matching and CIDR notation for subnet matching.
 * IPv4 only - IPv6 addresses will return false.
 *
 * @param ip - The client IP address to check (e.g., "192.168.1.100")
 * @param cidr - The allowed IP or CIDR range (e.g., "192.168.1.0/24" or "1.2.3.4")
 * @returns true if the IP matches the CIDR range or exact IP, false otherwise
 *
 * @example
 * // Exact match
 * ipMatchesCidr("1.2.3.4", "1.2.3.4") // true
 *
 * // CIDR range match
 * ipMatchesCidr("192.168.1.50", "192.168.1.0/24") // true
 * ipMatchesCidr("192.168.2.50", "192.168.1.0/24") // false
 *
 * // Broader ranges
 * ipMatchesCidr("10.5.20.100", "10.0.0.0/8") // true (all 10.x.x.x)
 */
function ipMatchesCidr(ip: string, cidr: string): boolean {
  // Exact match - most common case for single IPs
  if (ip === cidr) return true

  // CIDR range check - requires "/" notation
  if (!cidr.includes('/')) return false

  // Parse CIDR notation: "192.168.1.0/24" -> range="192.168.1.0", bits="24"
  const [range, bits] = cidr.split('/')
  if (!range || !bits) return false

  // Validate subnet mask (0-32 for IPv4)
  const mask = parseInt(bits, 10)
  if (isNaN(mask) || mask < 0 || mask > 32) return false

  // Split IPs into octets and validate format
  const ipParts = ip.split('.').map(Number)
  const rangeParts = range.split('.').map(Number)

  if (ipParts.length !== 4 || rangeParts.length !== 4) return false

  // Convert IPv4 addresses to 32-bit integers for bitwise comparison
  // Example: 192.168.1.100 -> (192<<24) | (168<<16) | (1<<8) | 100
  const ipNum = (ipParts[0]! << 24) | (ipParts[1]! << 16) | (ipParts[2]! << 8) | ipParts[3]!
  const rangeNum = (rangeParts[0]! << 24) | (rangeParts[1]! << 16) | (rangeParts[2]! << 8) | rangeParts[3]!

  // Create bitmask from CIDR prefix length
  // Example: /24 -> ~((1<<8)-1) = ~255 = 0xFFFFFF00 (first 24 bits set)
  const maskNum = ~((1 << (32 - mask)) - 1)

  // Compare masked values: both must have same network portion
  return (ipNum & maskNum) === (rangeNum & maskNum)
}

/**
 * Validates if a client IP is allowed to access admin routes.
 *
 * Reads from the ADMIN_ALLOWED_IPS environment variable which should contain
 * a comma-separated list of allowed IPs or CIDR ranges.
 *
 * If ADMIN_ALLOWED_IPS is not set or empty, all IPs are allowed
 * (the admin panel will still be protected by reCAPTCHA and password).
 *
 * @param clientIp - The IP address of the incoming request
 * @returns true if access is allowed, false if blocked
 *
 * @example
 * // .env: ADMIN_ALLOWED_IPS="1.2.3.4,192.168.0.0/16"
 * isAdminIpAllowed("1.2.3.4")       // true - exact match
 * isAdminIpAllowed("192.168.5.10")  // true - in CIDR range
 * isAdminIpAllowed("5.6.7.8")       // false - not in list
 *
 * // .env: ADMIN_ALLOWED_IPS="" (empty)
 * isAdminIpAllowed("any.ip.here")   // true - no restrictions
 */
function isAdminIpAllowed(clientIp: string): boolean {
  const allowedIps = process.env.ADMIN_ALLOWED_IPS?.trim()

  // If not configured or empty, allow all IPs (other security measures still apply)
  if (!allowedIps) return true

  // Parse comma-separated list and filter empty entries
  const allowList = allowedIps.split(',').map((ip) => ip.trim()).filter(Boolean)
  if (allowList.length === 0) return true

  // Check if client IP matches any allowed IP or CIDR range
  return allowList.some((allowed) => ipMatchesCidr(clientIp, allowed))
}

/**
 * Extracts the client IP address from request headers.
 *
 * Checks headers in order of preference:
 * 1. x-forwarded-for (standard proxy header, takes first IP if multiple)
 * 2. x-real-ip (nginx style)
 * 3. Falls back to 127.0.0.1 if no headers present
 *
 * Note: When behind a reverse proxy (Vercel, Cloudflare, nginx),
 * the real client IP is in these headers, not the TCP connection.
 *
 * @param req - The Next.js request object
 * @returns The client's IP address as a string
 */
function getClientIpFromRequest(req: NextRequest): string {
  return (
    // x-forwarded-for may contain multiple IPs: "client, proxy1, proxy2"
    // The first one is the original client
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

/**
 * API routes that require authentication
 */
const protectedApiRoutes = ['/api/ai', '/api/saved-charts', '/api/subjects']

/**
 * Check if path is a protected API route
 */
function isProtectedApiRoute(path: string): boolean {
  return protectedApiRoutes.some((route) => path.startsWith(route))
}

/**
 * Proxy handler for authentication and route protection.
 *
 * @remarks
 * - Protected routes require a valid session cookie
 * - Public routes redirect authenticated users to home
 * - Legal routes are accessible to everyone
 * - Session is validated using JWT decryption
 * - Security headers are added to all responses
 */
const proxy: NextProxy = async (req: NextRequest) => {
  const path = req.nextUrl.pathname
  const isAuthRedirectRoute = authRedirectRoutes.includes(path)
  const isPublicAccessRoute = isPublicRoute(path)
  const isApiRoute = path.startsWith('/api/')

  const cookie = req.cookies.get('session')?.value
  const session = await decrypt(cookie)

  // Handle protected API routes
  if (isApiRoute && isProtectedApiRoute(path) && !session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Admin routes: check IP allowlist first
  if (path.startsWith('/admin')) {
    const clientIp = getClientIpFromRequest(req)
    if (!isAdminIpAllowed(clientIp)) {
      // Redirect blocked IPs to root instead of showing 403
      return NextResponse.redirect(new URL('/', req.nextUrl))
    }
    // Allow through - admin routes handle their own auth
    return NextResponse.next()
  }

  // Public access routes are accessible to everyone - no redirect
  if (isPublicAccessRoute) {
    const response = NextResponse.next()
    return response
  }

  // Redirect to login if accessing protected page route without session
  if (!isAuthRedirectRoute && !isApiRoute && !session?.userId) {
    const loginUrl = new URL('/login', req.nextUrl)
    loginUrl.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect to dashboard if accessing auth redirect route with valid session
  if (isAuthRedirectRoute && session?.userId) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  const response = NextResponse.next()

  // Security headers (centralized in next.config.mjs, these are fallbacks)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), interest-cohort=()')

  return response
}

export default proxy

/**
 * Matcher configuration for proxy.
 * Excludes static files and Next.js internals.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - static files (png, jpg, svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)',
  ],
}
