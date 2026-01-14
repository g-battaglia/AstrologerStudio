import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies, headers } from 'next/headers'
import { prisma } from '@/lib/db/prisma'

/**
 * Admin Session Management
 * Completely separate from regular user sessions for security isolation
 * Uses a different cookie name (admin_session) and secret key
 */

const secretKey = process.env.ADMIN_SESSION_SECRET

// Strict validation in production
if (process.env.NODE_ENV === 'production') {
  if (!secretKey) {
    throw new Error('ADMIN_SESSION_SECRET environment variable must be set in production')
  }
  if (secretKey.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters long')
  }
}

// Development fallback with warning
const effectiveSecret = secretKey || 'dev-only-admin-secret-key-change-in-prod-32c'
if (!secretKey) {
  console.warn('⚠️  Using default ADMIN_SESSION_SECRET. Set a secure secret for production!')
}

const encodedKey = new TextEncoder().encode(effectiveSecret)

// Admin session cookie name (different from user session)
const ADMIN_COOKIE_NAME = 'admin_session'

// Session duration: 8 hours (shorter than user sessions for security)
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000

/**
 * Admin session payload structure
 */
export type AdminSessionPayload = {
  /** Admin user ID */
  adminId: string
  /** Admin username */
  username: string
  /** Admin role */
  role: 'admin' | 'superadmin'
  /** Database session ID for revocation tracking */
  sessionId: string
  /** Session expiration timestamp */
  expiresAt: Date
}

/**
 * Encrypts admin session payload into a JWT token
 */
export async function encryptAdminSession(payload: AdminSessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(encodedKey)
}

/**
 * Decrypts and verifies an admin JWT session token
 */
export async function decryptAdminSession(
  session: string | undefined = ''
): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload as unknown as AdminSessionPayload
  } catch {
    return null
  }
}

/**
 * Get client IP address from request headers
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers()
  return (
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Get user agent from request headers
 */
export async function getUserAgent(): Promise<string> {
  const headersList = await headers()
  return headersList.get('user-agent') || 'unknown'
}

/**
 * Creates a new admin session
 * - Creates database session record for tracking
 * - Sets encrypted cookie
 * - Logs the session creation in audit log
 */
export async function createAdminSession(
  adminId: string,
  username: string,
  role: 'admin' | 'superadmin'
): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  const ipAddress = await getClientIp()
  const userAgent = await getUserAgent()

  // Create session record in database
  const dbSession = await prisma.adminSession.create({
    data: {
      adminId,
      ipAddress,
      userAgent,
      expiresAt,
    },
  })

  // Log login action
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'login',
      details: JSON.stringify({ userAgent }),
      ipAddress,
    },
  })

  // Update last login info
  await prisma.adminUser.update({
    where: { id: adminId },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    },
  })

  const session = await encryptAdminSession({
    adminId,
    username,
    role,
    sessionId: dbSession.id,
    expiresAt,
  })

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'strict', // Stricter than user sessions
    path: '/admin', // Only sent to admin routes
  })
}

/**
 * Retrieves the current admin session
 * Also validates that the session hasn't been revoked
 */
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  const payload = await decryptAdminSession(sessionCookie)

  if (!payload) {
    return null
  }

  // Check if session has been revoked in database
  const dbSession = await prisma.adminSession.findUnique({
    where: { id: payload.sessionId },
  })

  if (!dbSession || dbSession.revokedAt) {
    // Session was revoked - return null (cookie cleanup happens on explicit logout)
    return null
  }

  // Check if session has expired
  if (new Date() > dbSession.expiresAt) {
    // Session expired - return null (cookie cleanup happens on explicit logout)
    return null
  }

  return payload
}

/**
 * Deletes the admin session (logout)
 * - Marks session as revoked in database
 * - Logs the logout action
 * - Removes the cookie
 */
export async function deleteAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  const payload = await decryptAdminSession(sessionCookie)

  if (payload) {
    const ipAddress = await getClientIp()

    // Revoke the session in database
    await prisma.adminSession.update({
      where: { id: payload.sessionId },
      data: { revokedAt: new Date() },
    }).catch(() => {
      // Session might already be deleted, ignore
    })

    // Log logout action
    await prisma.adminAuditLog.create({
      data: {
        adminId: payload.adminId,
        action: 'logout',
        ipAddress,
      },
    }).catch(() => {
      // Best effort logging
    })
  }

  cookieStore.delete(ADMIN_COOKIE_NAME)
}

/**
 * Revoke all sessions for an admin user
 * Useful when password is changed or account is compromised
 */
export async function revokeAllAdminSessions(adminId: string): Promise<void> {
  await prisma.adminSession.updateMany({
    where: {
      adminId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  })
}
