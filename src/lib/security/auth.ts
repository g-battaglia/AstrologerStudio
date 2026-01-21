import 'server-only'
import { getSession } from '@/lib/security/session'
import { prisma } from '@/lib/db/prisma'

// In-memory cache to throttle lastActiveAt updates (5 min = 300000ms)
// This prevents excessive database writes while still tracking user activity
const ACTIVITY_UPDATE_THROTTLE_MS = 5 * 60 * 1000
const lastActivityUpdateCache = new Map<string, number>()

/**
 * Session data returned by authentication wrapper
 */
export interface AuthSession {
  userId: string
  username: string
}

/**
 * Error thrown when user is not authenticated
 */
export class UnauthorizedError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Error thrown when user doesn't have permission
 */
export class ForbiddenError extends Error {
  constructor(message = 'Access denied') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/**
 * Error thrown when resource is not found
 */
export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

/**
 * Wrapper for Server Actions that require authentication
 * Eliminates repetitive session checking code
 *
 * @param fn - Async function that receives the authenticated session
 * @returns Result of the wrapped function
 * @throws UnauthorizedError if user is not authenticated
 *
 * @example
 * ```ts
 * export async function getSubjects() {
 *   return withAuth(async (session) => {
 *     return prisma.subject.findMany({
 *       where: { ownerId: session.userId }
 *     })
 *   })
 * }
 * ```
 */
export async function withAuth<T>(fn: (session: AuthSession) => Promise<T>): Promise<T> {
  const session = await getSession()

  if (!session) {
    throw new UnauthorizedError()
  }

  // Update lastActiveAt in background (throttled to avoid DB spam)
  const now = Date.now()
  const lastUpdate = lastActivityUpdateCache.get(session.userId) || 0
  if (now - lastUpdate > ACTIVITY_UPDATE_THROTTLE_MS) {
    lastActivityUpdateCache.set(session.userId, now)
    // Fire-and-forget update (don't await to avoid blocking the request)
    prisma.user
      .update({
        where: { id: session.userId },
        data: { lastActiveAt: new Date() },
      })
      .catch(() => {
        // Silent fail - activity tracking shouldn't break functionality
      })
  }

  return fn({
    userId: session.userId,
    username: session.username,
  })
}

/**
 * Get authenticated session or throw
 * Useful when you need the session for multiple operations
 *
 * @returns Authenticated session
 * @throws UnauthorizedError if not authenticated
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession()

  if (!session) {
    throw new UnauthorizedError()
  }

  return {
    userId: session.userId,
    username: session.username,
  }
}
