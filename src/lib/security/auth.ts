import 'server-only'
import { getSession } from '@/lib/security/session'

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
