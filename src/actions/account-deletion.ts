'use server'

// NOTE: DODO PAYMENTS
/**
 * This file cancels subscription on account deletion with Dodo Payments
 */

/**
 * Account Deletion Server Actions
 *
 * Handles the secure account deletion flow:
 * 1. Request deletion -> sends confirmation email
 * 2. Verify deletion -> cancels subscription and deletes user
 *
 * @module actions/account-deletion
 */

import { prisma } from '@/lib/db/prisma'
import { randomBytes, createHash } from 'crypto'
import { logger } from '@/lib/logging/server'
import { withAuth } from '@/lib/security/auth'
import { sendAccountDeletionConfirmation, isEmailConfigured } from '@/lib/mail/mail'
import { deleteSession } from '@/lib/security/session'

/**
 * Result type for account deletion actions
 */
type ActionResult = {
  error?: string
  success?: boolean
}

/**
 * Request account deletion
 *
 * Sends a confirmation email with a secure token that expires in 1 hour.
 * User must click the link in the email to complete deletion.
 *
 * @returns Success status
 */
export async function requestAccountDeletion(): Promise<ActionResult> {
  // Check if email is configured
  if (!isEmailConfigured()) {
    logger.error('Account deletion requested but email service is not configured')
    return { error: 'Email service is not configured. Please contact support.' }
  }

  return withAuth(async (session) => {
    try {
      // Get user info for email
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { email: true, username: true },
      })

      if (!user) {
        return { error: 'User not found.' }
      }

      if (!user.email) {
        return { error: 'No email address associated with your account. Please add an email first.' }
      }

      // Invalidate any existing deletion tokens
      await prisma.verificationToken.updateMany({
        where: {
          userId: session.userId,
          type: 'account_deletion',
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
          type: 'account_deletion',
          userId: session.userId,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      })

      // Send confirmation email with plaintext token
      const emailSent = await sendAccountDeletionConfirmation(user.email, token, user.username)

      if (!emailSent) {
        return { error: 'Failed to send confirmation email. Please try again.' }
      }

      logger.info(`Account deletion confirmation sent for user: ${session.userId}`)
      return { success: true }
    } catch (error) {
      logger.error('Account deletion request error:', error)
      return { error: 'An error occurred. Please try again.' }
    }
  }).catch(() => ({ success: false, error: 'Unauthorized' }))
}

/**
 * Get pending account deletion request for current user
 *
 * @returns Pending deletion info or null
 */
export async function getPendingAccountDeletion(): Promise<{ expiresAt: Date } | null> {
  return withAuth(async (session) => {
    const token = await prisma.verificationToken.findFirst({
      where: {
        userId: session.userId,
        type: 'account_deletion',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { expiresAt: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!token) {
      return null
    }

    return {
      expiresAt: token.expiresAt,
    }
  }).catch(() => null)
}

/**
 * Cancel pending account deletion request
 *
 * @returns Success status
 */
export async function cancelAccountDeletion(): Promise<ActionResult> {
  return withAuth(async (session) => {
    try {
      await prisma.verificationToken.updateMany({
        where: {
          userId: session.userId,
          type: 'account_deletion',
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      })

      logger.info(`Account deletion cancelled for user: ${session.userId}`)
      return { success: true }
    } catch (error) {
      logger.error('Cancel account deletion error:', error)
      return { error: 'An error occurred. Please try again.' }
    }
  }).catch(() => ({ success: false, error: 'Unauthorized' }))
}

/**
 * Verify account deletion token and delete the account
 *
 * This function:
 * 1. Validates the token
 * 2. Cancels any active Dodo Payments subscription
 * 3. Deletes the user and all related data (cascade)
 *
 * @param token - The verification token from email
 * @returns Success status
 */
export async function verifyAccountDeletion(token: string): Promise<ActionResult> {
  try {
    // Hash the token before lookup
    const tokenHash = createHash('sha256').update(token).digest('hex')

    // Find and validate token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: tokenHash },
    })

    if (!verificationToken) {
      return { error: 'Invalid or expired confirmation link.' }
    }

    if (verificationToken.type !== 'account_deletion') {
      return { error: 'Invalid confirmation link.' }
    }

    if (verificationToken.usedAt) {
      return { error: 'This confirmation link has already been used.' }
    }

    if (verificationToken.expiresAt < new Date()) {
      return { error: 'This confirmation link has expired. Please request a new one.' }
    }

    const userId = verificationToken.userId

    // Get user info for subscription cancellation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionId: true,
        subscriptionPlan: true,
        username: true,
        email: true,
      },
    })

    if (!user) {
      return { error: 'User not found.' }
    }

    // Cancel Dodo Payments subscription if active
    if (
      user.subscriptionId &&
      user.subscriptionPlan &&
      user.subscriptionPlan !== 'free' &&
      user.subscriptionPlan !== 'lifetime'
    ) {
      try {
        // Dynamic import to avoid issues if Dodo Payments module is not installed
        const { cancelSubscription } = await import('@/dodopayments/lib/server')
        const result = await cancelSubscription(user.subscriptionId)

        if (!result.success) {
          logger.warn(`Failed to cancel Dodo Payments subscription for user ${userId}: ${result.error}`)
          // Continue with deletion anyway - subscription will expire naturally
        } else {
          logger.info(`Dodo Payments subscription cancelled for user ${userId}`)
        }
      } catch (error) {
        logger.warn(`Dodo Payments module not available for subscription cancellation: ${error}`)
        // Continue with deletion - Dodo Payments might not be installed
      }
    }

    // Delete the user (cascade will delete related data)
    await prisma.$transaction([
      // Mark token as used first
      prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
      // Delete all verification tokens for this user
      prisma.verificationToken.deleteMany({
        where: { userId },
      }),
      // Delete the user (cascades to subjects, preferences, saved charts, etc.)
      prisma.user.delete({
        where: { id: userId },
      }),
    ])

    logger.info(`Account deleted: ${userId} (${user.username})`)

    // Invalidate session for the deleted user
    await deleteSession()

    return { success: true }
  } catch (error) {
    logger.error('Account deletion verification error:', error)
    return { error: 'An error occurred. Please try again.' }
  }
}

/**
 * Check if account deletion token is valid (without consuming it)
 *
 * @param token - The verification token from email
 * @returns Validation result
 */
export async function validateDeletionToken(token: string): Promise<{
  valid: boolean
  error?: string
  username?: string
}> {
  try {
    // Hash the token before lookup
    const tokenHash = createHash('sha256').update(token).digest('hex')

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: tokenHash },
    })

    if (!verificationToken) {
      return { valid: false, error: 'Invalid or expired confirmation link.' }
    }

    if (verificationToken.type !== 'account_deletion') {
      return { valid: false, error: 'Invalid confirmation link.' }
    }

    if (verificationToken.usedAt) {
      return { valid: false, error: 'This confirmation link has already been used.' }
    }

    if (verificationToken.expiresAt < new Date()) {
      return { valid: false, error: 'This confirmation link has expired. Please request a new one.' }
    }

    // Get username for display
    const user = await prisma.user.findUnique({
      where: { id: verificationToken.userId },
      select: { username: true },
    })

    return {
      valid: true,
      username: user?.username,
    }
  } catch (error) {
    logger.error('Token validation error:', error)
    return { valid: false, error: 'An error occurred. Please try again.' }
  }
}
