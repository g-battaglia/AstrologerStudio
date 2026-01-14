'use server'

// NOTE: DODO PAYMENTS
/**
 * This file syncs subscription on login with Dodo Payments
 */

import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { createSession, deleteSession, getSession } from '@/lib/security/session'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { verifyRecaptcha } from '@/lib/security/recaptcha'
import { logger } from '@/lib/logging/server'
import { headers } from 'next/headers'
import {
  checkRateLimit,
  getClientIp,
  checkAccountLockout,
  recordFailedLogin,
  clearFailedLogins,
  RATE_LIMITS,
} from '@/lib/security/rate-limit'

/**
 * Login credentials validation schema
 */
const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50),
  password: z.string().min(1, 'Password is required'),
  recaptchaToken: z.string().min(1, 'reCAPTCHA verification required'),
})

/**
 * Action result type for login/auth operations
 */
type ActionResult = {
  error?: string
  success?: boolean
}

/**
 * Server action to authenticate a user
 *
 * @param _prevState - Previous form state (unused but required by useFormState)
 * @param formData - Form data containing username and password
 * @returns Error object or redirects to home on success
 *
 * @remarks
 * - Validates input with Zod schema
 * - Compares password using bcrypt
 * - Creates session cookie on successful auth
 * - Redirects to home page after login
 *
 * @example
 * ```tsx
 * const [state, formAction] = useFormState(login, undefined)
 * <form action={formAction}>...</form>
 * ```
 */
export async function login(_prevState: unknown, formData: FormData): Promise<ActionResult> {
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const recaptchaToken = formData.get('recaptchaToken') as string

  // Validate input
  const validation = LoginSchema.safeParse({ username, password, recaptchaToken })
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || 'Invalid input' }
  }

  // IP-based rate limiting (before authentication)
  const headersList = await headers()
  const clientIp = getClientIp(headersList)
  const ipRateLimit = checkRateLimit(`ip:${clientIp}`, RATE_LIMITS.ip)
  if (!ipRateLimit.success) {
    logger.warn(`IP rate limit exceeded for login: ${clientIp}`)
    return { error: 'Too many login attempts from this IP. Please try again later.' }
  }

  // Account lockout check (brute-force protection)
  const lockoutStatus = checkAccountLockout(validation.data.username)
  if (lockoutStatus.locked) {
    const minutes = Math.ceil((lockoutStatus.remainingSeconds || 0) / 60)
    return {
      error: `Account temporarily locked due to multiple failed login attempts. Please try again in ${minutes} minutes.`,
    }
  }

  // Verify reCAPTCHA token
  const isRecaptchaValid = await verifyRecaptcha(validation.data.recaptchaToken)
  if (!isRecaptchaValid) {
    return { error: 'reCAPTCHA verification failed. Please try again.' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: validation.data.username },
    })

    if (!user) {
      // Record failed attempt for brute-force tracking
      recordFailedLogin(validation.data.username)
      // Generic error message to prevent username enumeration
      return { error: 'Invalid credentials' }
    }

    // OAuth-only users don't have a password
    if (!user.password) {
      recordFailedLogin(validation.data.username)
      return { error: 'Invalid credentials' }
    }

    const isValid = await bcrypt.compare(validation.data.password, user.password)

    if (!isValid) {
      // Record failed attempt
      recordFailedLogin(validation.data.username)
      return { error: 'Invalid credentials' }
    }

    if (!user.emailVerified) {
      return { error: 'Please verify your email address before logging in.' }
    }

    // Clear failed login attempts on successful login
    clearFailedLogins(validation.data.username)

    // Track login analytics
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    })

    await createSession(user.id, user.username)

    // Sync subscription status with Dodo Payments on every login (BLOCKING)
    // This ensures the subscription status is always up-to-date before user accesses the app
    try {
      const { isDodoPaymentsEnabled } = await import('@/lib/subscription/config')
      if (isDodoPaymentsEnabled()) {
        const { syncSubscriptionFromDodo } = await import('@/dodopayments/lib/subscription')
        // Wait for sync to complete so subscription status is accurate
        await syncSubscriptionFromDodo(user.id, user.email || '', user.customerId)
        logger.info(`Subscription synced on login for user ${user.id}`)
      }
    } catch (error) {
      // Dodo Payments module not available or sync failed - continue with login
      logger.warn('Subscription sync on login failed:', error)
    }

    return { success: true }
  } catch (error) {
    logger.error('Login error:', error)
    return { error: 'Authentication failed. Please try again.' }
  }
}

/**
 * Server action to log out the current user
 *
 * @remarks
 * - Deletes the session cookie
 * - Redirects to login page
 *
 * @example
 * ```tsx
 * <form action={logout}>
 *   <button type="submit">Logout</button>
 * </form>
 * ```
 */
export async function logout(): Promise<void> {
  await deleteSession()
  redirect('/login')
}

/**
 * Get the currently authenticated user's basic info
 *
 * @returns User object with id and username, or null if not authenticated
 *
 * @remarks
 * - Does not query database for performance
 * - Only returns session data (userId and username)
 * - For full user data, query prisma.user separately
 *
 * @example
 * ```ts
 * const user = await getCurrentUser()
 * if (!user) redirect('/login')
 * console.log(user.username)
 * ```
 */
export async function getCurrentUser(): Promise<{ id: string; username: string } | null> {
  const session = await getSession()
  if (!session) return null

  return {
    id: session.userId,
    username: session.username,
  }
}

// ============================================================================
// PASSWORD RESET FLOW
// ============================================================================

import { randomBytes, createHash } from 'crypto'
import { sendPasswordResetEmail, isEmailConfigured } from '@/lib/mail/mail'
import { withAuth } from '@/lib/security/auth'

/**
 * Request a password reset email
 *
 * @param identifier - Email or username
 * @param recaptchaToken - reCAPTCHA verification token
 * @returns Success status (always returns success to prevent user enumeration)
 */
export async function requestPasswordReset(identifier: string, recaptchaToken: string): Promise<ActionResult> {
  // Verify reCAPTCHA
  const isRecaptchaValid = await verifyRecaptcha(recaptchaToken)
  if (!isRecaptchaValid) {
    return { error: 'reCAPTCHA verification failed. Please try again.' }
  }

  // IP-based rate limiting
  const headersList = await headers()
  const clientIp = getClientIp(headersList)
  const ipRateLimit = checkRateLimit(`ip:${clientIp}`, RATE_LIMITS.ip)
  if (!ipRateLimit.success) {
    logger.warn(`IP rate limit exceeded for password reset: ${clientIp}`)
    return { error: 'Too many password reset attempts from this IP. Please try again later.' }
  }

  // Check if email is configured
  if (!isEmailConfigured()) {
    logger.error('Password reset requested but email service is not configured')
    return { error: 'Email service is not configured. Please contact support.' }
  }

  try {
    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      select: { id: true, email: true, username: true },
    })

    // Always return success to prevent user enumeration
    if (!user || !user.email) {
      logger.info(`Password reset requested for unknown identifier: ${identifier}`)
      return { success: true }
    }

    // Invalidate any existing password reset tokens for this user
    await prisma.verificationToken.updateMany({
      where: {
        userId: user.id,
        type: 'password_reset',
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    })

    // Generate secure token
    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')

    // Create new token (expires in 1 hour) - store hash only
    await prisma.verificationToken.create({
      data: {
        token: tokenHash, // Store hashed version
        type: 'password_reset',
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })

    // Send email with plaintext token
    await sendPasswordResetEmail(user.email, token, user.username)

    logger.info(`Password reset email sent for user: ${user.id}`)
    return { success: true }
  } catch (error) {
    logger.error('Password reset request error:', error)
    return { error: 'An error occurred. Please try again.' }
  }
}

/**
 * Validate a password reset token
 *
 * @param token - The reset token to validate
 * @returns Whether the token is valid
 */
export async function validateResetToken(token: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Hash the token before lookup
    const tokenHash = createHash('sha256').update(token).digest('hex')

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: tokenHash },
    })

    if (!verificationToken) {
      return { valid: false, error: 'Invalid or expired reset link.' }
    }

    if (verificationToken.type !== 'password_reset') {
      return { valid: false, error: 'Invalid reset link.' }
    }

    if (verificationToken.usedAt) {
      return { valid: false, error: 'This reset link has already been used.' }
    }

    if (verificationToken.expiresAt < new Date()) {
      return { valid: false, error: 'This reset link has expired. Please request a new one.' }
    }

    return { valid: true }
  } catch (error) {
    logger.error('Token validation error:', error)
    return { valid: false, error: 'An error occurred. Please try again.' }
  }
}

/**
 * Reset password with token
 *
 * @param token - The password reset token
 * @param newPassword - The new password
 * @returns Success status
 */
export async function resetPassword(token: string, newPassword: string): Promise<ActionResult> {
  // Validate password
  // Validate password
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
  if (!passwordRegex.test(newPassword)) {
    return {
      error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
    }
  }

  try {
    // Hash the token before lookup
    const tokenHash = createHash('sha256').update(token).digest('hex')

    // Find and validate token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: tokenHash },
    })

    if (!verificationToken) {
      return { error: 'Invalid or expired reset link.' }
    }

    if (verificationToken.type !== 'password_reset') {
      return { error: 'Invalid reset link.' }
    }

    if (verificationToken.usedAt) {
      return { error: 'This reset link has already been used.' }
    }

    if (verificationToken.expiresAt < new Date()) {
      return { error: 'This reset link has expired. Please request a new one.' }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ])

    logger.info(`Password reset completed for user: ${verificationToken.userId}`)
    return { success: true }
  } catch (error) {
    logger.error('Password reset error:', error)
    return { error: 'An error occurred. Please try again.' }
  }
}

/**
 * Change password for authenticated user
 *
 * @param currentPassword - Current password for verification
 * @param newPassword - New password
 * @returns Success status
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<ActionResult> {
  return withAuth(async (session) => {
    // Validate new password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
    if (!passwordRegex.test(newPassword)) {
      return {
        error:
          'New password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      }
    }

    try {
      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { password: true },
      })

      if (!user) {
        return { error: 'User not found.' }
      }

      // OAuth users without password should use createPassword instead
      if (!user.password) {
        return { error: 'Please use "Create Password" to set your first password.' }
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password)
      if (!isValid) {
        return { error: 'Current password is incorrect.' }
      }

      // Hash and update new password
      const hashedPassword = await bcrypt.hash(newPassword, 12)
      await prisma.user.update({
        where: { id: session.userId },
        data: { password: hashedPassword },
      })

      logger.info(`Password changed for user: ${session.userId}`)
      return { success: true }
    } catch (error) {
      logger.error('Change password error:', error)
      return { error: 'An error occurred. Please try again.' }
    }
  }).catch(() => ({ success: false, error: 'Unauthorized' }))
}

/**
 * Create password for OAuth-only user
 *
 * Allows users who registered via OAuth (Google) to add a password
 * so they can also login with username/password.
 *
 * @param newPassword - The new password to set
 * @returns Success status
 */
export async function createPassword(newPassword: string): Promise<ActionResult> {
  return withAuth(async (session) => {
    // Validate password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
    if (!passwordRegex.test(newPassword)) {
      return {
        error:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      }
    }

    try {
      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { password: true },
      })

      if (!user) {
        return { error: 'User not found.' }
      }

      // Only allow if user doesn't have a password yet
      if (user.password) {
        return { error: 'You already have a password. Use "Change Password" instead.' }
      }

      // Hash and save new password
      // Also set emailVerified for OAuth users who may not have it set (legacy accounts)
      const hashedPassword = await bcrypt.hash(newPassword, 12)
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          password: hashedPassword,
          emailVerified: new Date(), // OAuth users have verified email via Google
        },
      })

      logger.info(`Password created for OAuth user: ${session.userId}`)
      return { success: true }
    } catch (error) {
      logger.error('Create password error:', error)
      return { error: 'An error occurred. Please try again.' }
    }
  }).catch(() => ({ success: false, error: 'Unauthorized' }))
}
