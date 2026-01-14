import { NextResponse } from 'next/server'

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// Note: This resets on server restart and doesn't work across multiple instances
// For production with multiple instances, use Redis
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries periodically
const CLEANUP_INTERVAL = 60 * 1000 // 1 minute
let cleanupTimer: NodeJS.Timeout | null = null

function startCleanup() {
  if (cleanupTimer) return

  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)

  // Don't keep the process alive just for cleanup
  if (cleanupTimer.unref) {
    cleanupTimer.unref()
  }
}

startCleanup()

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in seconds */
  windowSeconds: number
  /** Optional prefix for the key (e.g., 'api', 'ai') */
  prefix?: string
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
}

/**
 * Check and update rate limit for a given identifier
 *
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Result indicating if request is allowed
 *
 * @example
 * ```ts
 * const result = checkRateLimit(userId, { limit: 100, windowSeconds: 60 })
 * if (!result.success) {
 *   return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
 * }
 * ```
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const { limit, windowSeconds, prefix = 'default' } = config
  const key = `${prefix}:${identifier}`
  const now = Date.now()
  const windowMs = windowSeconds * 1000

  const entry = rateLimitStore.get(key)

  // If no entry or window has passed, create new entry
  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    }
    rateLimitStore.set(key, newEntry)
    return {
      success: true,
      remaining: limit - 1,
      resetTime: newEntry.resetTime,
    }
  }

  // Check if limit exceeded
  if (entry.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // Increment count
  entry.count++
  return {
    success: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Create rate-limited response headers
 */
export function rateLimitHeaders(result: RateLimitResult, limit: number): HeadersInit {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
  }
}

/**
 * Standard rate limit exceeded response
 */
export function rateLimitExceededResponse(result: RateLimitResult, limit: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
    },
    {
      status: 429,
      headers: rateLimitHeaders(result, limit),
    },
  )
}

// Preset configurations for different endpoints
export const RATE_LIMITS = {
  /** Standard API endpoints: 100 requests per minute */
  standard: { limit: 100, windowSeconds: 60, prefix: 'api' },
  /** Strict endpoints (sensitive operations): 20 requests per minute */
  strict: { limit: 20, windowSeconds: 60, prefix: 'strict' },
  /** Auth endpoints: 10 requests per minute */
  auth: { limit: 10, windowSeconds: 60, prefix: 'auth' },
  /** AI endpoints: 60 requests per minute (burst protection) */
  ai: { limit: 60, windowSeconds: 60, prefix: 'ai' },
  /** IP-based rate limiting: 20 requests per minute */
  ip: { limit: 20, windowSeconds: 60, prefix: 'ip' },
  /** Public chart generation: 60 requests per minute (higher for demo users) */
  publicChart: { limit: 60, windowSeconds: 60, prefix: 'public_chart' },
} as const

// ============================================================================
// IP EXTRACTION
// ============================================================================

/**
 * Extract real IP address from request headers
 * Considers proxy headers like X-Forwarded-For
 *
 * @param headers - Request headers object
 * @returns IP address or 'unknown'
 */
export function getClientIp(headers: Headers): string {
  // Check X-Forwarded-For (used by most proxies/load balancers)
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  // Check X-Real-IP (used by some proxies)
  const realIp = headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  // Fallback
  return 'unknown'
}

// ============================================================================
// ACCOUNT LOCKOUT (BRUTE-FORCE PROTECTION)
// ============================================================================

interface FailedLoginEntry {
  count: number
  firstAttemptTime: number
  lockedUntil: number | null
}

// In-memory store for failed login attempts
const failedLoginStore = new Map<string, FailedLoginEntry>()

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000 // Track attempts within 15 min window

/**
 * Check if account is locked due to failed login attempts
 *
 * @param username - Username to check
 * @returns Object with locked status and remaining time
 */
export function checkAccountLockout(username: string): { locked: boolean; remainingSeconds?: number } {
  const entry = failedLoginStore.get(username)

  if (!entry) {
    return { locked: false }
  }

  const now = Date.now()

  // Check if currently locked
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000)
    return { locked: true, remainingSeconds }
  }

  // Check if attempt window has passed - reset if so
  if (now - entry.firstAttemptTime > ATTEMPT_WINDOW_MS) {
    failedLoginStore.delete(username)
    return { locked: false }
  }

  // Check if max attempts reached
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    // Lock the account
    entry.lockedUntil = now + LOCKOUT_DURATION_MS
    const remainingSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000)
    return { locked: true, remainingSeconds }
  }

  return { locked: false }
}

/**
 * Record failed login attempt
 *
 * @param username - Username that failed login
 */
export function recordFailedLogin(username: string): void {
  const now = Date.now()
  const entry = failedLoginStore.get(username)

  if (!entry || now - entry.firstAttemptTime > ATTEMPT_WINDOW_MS) {
    // Start new tracking window
    failedLoginStore.set(username, {
      count: 1,
      firstAttemptTime: now,
      lockedUntil: null,
    })
  } else {
    // Increment existing count
    entry.count++
  }
}

/**
 * Clear failed login attempts for a user (called on successful login)
 *
 * @param username - Username to clear
 */
export function clearFailedLogins(username: string): void {
  failedLoginStore.delete(username)
}
