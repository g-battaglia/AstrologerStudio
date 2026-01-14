import 'server-only'
import { getAdminSession, AdminSessionPayload } from '@/lib/security/admin-session'

/**
 * Admin Authentication Utilities
 * Wrapper functions for admin-only Server Actions and API routes
 */

/**
 * Error thrown when admin is not authenticated
 */
export class AdminUnauthorizedError extends Error {
  constructor(message = 'Admin authentication required') {
    super(message)
    this.name = 'AdminUnauthorizedError'
  }
}

/**
 * Error thrown when admin doesn't have required role
 */
export class AdminForbiddenError extends Error {
  constructor(message = 'Insufficient admin privileges') {
    super(message)
    this.name = 'AdminForbiddenError'
  }
}

/**
 * Wrapper for Server Actions that require admin authentication
 *
 * @param fn - Async function that receives the authenticated admin session
 * @returns Result of the wrapped function
 * @throws AdminUnauthorizedError if admin is not authenticated
 *
 * @example
 * ```ts
 * export async function getUsers() {
 *   return withAdminAuth(async (session) => {
 *     return prisma.user.findMany()
 *   })
 * }
 * ```
 */
export async function withAdminAuth<T>(
  fn: (session: AdminSessionPayload) => Promise<T>
): Promise<T> {
  const session = await getAdminSession()

  if (!session) {
    throw new AdminUnauthorizedError()
  }

  return fn(session)
}

/**
 * Wrapper for Server Actions that require superadmin role
 *
 * @param fn - Async function that receives the authenticated admin session
 * @returns Result of the wrapped function
 * @throws AdminUnauthorizedError if not authenticated
 * @throws AdminForbiddenError if not a superadmin
 */
export async function withSuperAdminAuth<T>(
  fn: (session: AdminSessionPayload) => Promise<T>
): Promise<T> {
  const session = await getAdminSession()

  if (!session) {
    throw new AdminUnauthorizedError()
  }

  if (session.role !== 'superadmin') {
    throw new AdminForbiddenError('Superadmin access required')
  }

  return fn(session)
}

/**
 * Get authenticated admin session or throw
 *
 * @returns Authenticated admin session
 * @throws AdminUnauthorizedError if not authenticated
 */
export async function requireAdminAuth(): Promise<AdminSessionPayload> {
  const session = await getAdminSession()

  if (!session) {
    throw new AdminUnauthorizedError()
  }

  return session
}

/**
 * Check if current session is a superadmin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await getAdminSession()
  return session?.role === 'superadmin'
}
