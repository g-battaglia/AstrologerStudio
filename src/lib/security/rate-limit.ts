import { NextResponse } from 'next/server'
import { logger } from '@/lib/logging/server'

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting service
 *
 * ## Cleanup Timer Lifecycle
 *
 * The cleanup timer uses a **lazy initialization pattern**:
 * - Timer is only started when the first rate limit entry is created
 * - Timer stops automatically when all entries are cleaned up
 * - `.unref()` is called to prevent blocking process exit
 *
 * This approach minimizes memory allocation when rate limiting is not in use,
 * while still providing automatic cleanup during active use.
 *
 * For testing, `stopCleanup()` and `_getCleanupState()` are exported.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// Note: This resets on server restart and doesn't work across multiple instances
// For production with multiple instances, use Redis
const rateLimitStore = new Map<string, RateLimitEntry>()

// Maximum entries to prevent memory leaks from distributed traffic (bots, DDoS, crawlers)
// When limit is reached, oldest entries are evicted (LRU-style)
const MAX_RATE_LIMIT_ENTRIES = 10_000

// Clean up old entries periodically
const CLEANUP_INTERVAL = 60 * 1000 // 1 minute
let cleanupTimer: NodeJS.Timeout | null = null

/**
 * Start the cleanup timer (lazy initialization).
 * Only starts if not already running.
 */
function startCleanup(): void {
  if (cleanupTimer) return

  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }

    // If store is empty after cleanup, stop the timer to free resources
    if (rateLimitStore.size === 0) {
      stopCleanup()
    }
  }, CLEANUP_INTERVAL)

  // Don't keep the process alive just for cleanup
  if (cleanupTimer.unref) {
    cleanupTimer.unref()
  }
}

/**
 * Stop the cleanup timer.
 * Useful for testing and explicit lifecycle management.
 */
export function stopCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
}

/**
 * Get the current cleanup timer state (for testing purposes).
 * @returns Object with timer status and store size
 */
export function _getCleanupState(): { timerActive: boolean; storeSize: number } {
  return {
    timerActive: cleanupTimer !== null,
    storeSize: rateLimitStore.size,
  }
}

/**
 * Clear all rate limit entries (for testing purposes).
 */
export function _clearRateLimitStore(): void {
  rateLimitStore.clear()
  stopCleanup()
}

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

    // Evict oldest entry if at capacity (LRU-style eviction)
    if (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
      const oldestKey = rateLimitStore.keys().next().value
      if (oldestKey) {
        rateLimitStore.delete(oldestKey)
        logger.warn('[RateLimit] rateLimitStore at capacity, evicted oldest entry', {
          evictedKey: oldestKey,
          storeSize: MAX_RATE_LIMIT_ENTRIES,
        })
      }
    }

    rateLimitStore.set(key, newEntry)

    // Start cleanup timer lazily on first entry
    startCleanup()

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

// Maximum entries to prevent memory leaks from brute-force attempts with many usernames
const MAX_FAILED_LOGIN_ENTRIES = 5_000

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
    // Evict oldest entry if at capacity (LRU-style eviction)
    if (failedLoginStore.size >= MAX_FAILED_LOGIN_ENTRIES) {
      const oldestKey = failedLoginStore.keys().next().value
      if (oldestKey) {
        failedLoginStore.delete(oldestKey)
        logger.warn('[RateLimit] failedLoginStore at capacity, evicted oldest entry', {
          storeSize: MAX_FAILED_LOGIN_ENTRIES,
        })
      }
    }

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
