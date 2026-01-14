'use server'

import { prisma } from '@/lib/db/prisma'
import { randomBytes, createHash } from 'crypto'
import { logger } from '@/lib/logging/server'
import { withAuth } from '@/lib/security/auth'
import { sendEmailChangeVerification, isEmailConfigured } from '@/lib/mail/mail'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

/**
 * Result type for email actions
 */
type ActionResult = {
  error?: string
  success?: boolean
}

/**
 * Get pending email change for current user
 *
 * @returns Pending email or null
 */
export async function getPendingEmailChange(): Promise<{ pendingEmail: string; expiresAt: Date } | null> {
  return withAuth(async (session) => {
    const token = await prisma.verificationToken.findFirst({
      where: {
        userId: session.userId,
        type: 'email_change',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { payload: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!token || !token.payload) {
      return null
    }

    return {
      pendingEmail: token.payload,
      expiresAt: token.expiresAt,
    }
  }).catch(() => null)
}

/**
 * Request email change
 *
 * @param newEmail - New email address
 * @returns Success status
 */
export async function requestEmailChange(newEmail: string): Promise<ActionResult> {
  // Validate email
  const emailSchema = z.string().email('Invalid email address')
  const validation = emailSchema.safeParse(newEmail)
  if (!validation.success) {
    return { error: 'Invalid email address.' }
  }

  // Check if email is configured
  if (!isEmailConfigured()) {
    logger.error('Email change requested but email service is not configured')
    return { error: 'Email service is not configured. Please contact support.' }
  }

  return withAuth(async (session) => {
    try {
      // Check if email is already in use
      const existingUser = await prisma.user.findUnique({
        where: { email: newEmail },
        select: { id: true },
      })

      if (existingUser) {
        return { error: 'This email address is already in use.' }
      }

      // Get user info for email
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { email: true, username: true },
      })

      if (!user) {
        return { error: 'User not found.' }
      }

      // Check if trying to change to same email
      if (user.email === newEmail) {
        return { error: 'This is already your current email address.' }
      }

      // Invalidate any existing email change tokens
      await prisma.verificationToken.updateMany({
        where: {
          userId: session.userId,
          type: 'email_change',
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      })

      // Generate secure token
      const token = randomBytes(32).toString('hex')
      const tokenHash = createHash('sha256').update(token).digest('hex')

      // Create new token (expires in 24 hours) - store hash only
      await prisma.verificationToken.create({
        data: {
          token: tokenHash, // Store hashed version
          type: 'email_change',
          userId: session.userId,
          payload: newEmail,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      })

      // Send verification email to new address with plaintext token
      const emailSent = await sendEmailChangeVerification(newEmail, token, user.username)

      if (!emailSent) {
        return { error: 'Failed to send verification email. Please try again.' }
      }

      logger.info(`Email change verification sent for user: ${session.userId}`)
      return { success: true }
    } catch (error) {
      logger.error('Email change request error:', error)
      return { error: 'An error occurred. Please try again.' }
    }
  }).catch(() => ({ success: false, error: 'Unauthorized' }))
}

/**
 * Verify email change token
 *
 * @param token - Verification token
 * @returns Success status
 */
export async function verifyEmailChange(token: string): Promise<ActionResult> {
  try {
    // Hash the token before lookup
    const tokenHash = createHash('sha256').update(token).digest('hex')

    // Find and validate token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: tokenHash },
    })

    if (!verificationToken) {
      return { error: 'Invalid or expired verification link.' }
    }

    if (verificationToken.type !== 'email_change') {
      return { error: 'Invalid verification link.' }
    }

    if (verificationToken.usedAt) {
      return { error: 'This verification link has already been used.' }
    }

    if (verificationToken.expiresAt < new Date()) {
      return { error: 'This verification link has expired. Please request a new one.' }
    }

    if (!verificationToken.payload) {
      return { error: 'Invalid verification data.' }
    }

    const newEmail = verificationToken.payload

    // Check if email is still available (double-check)
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    })

    if (existingUser && existingUser.id !== verificationToken.userId) {
      return { error: 'This email address is no longer available.' }
    }

    // Update email and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { email: newEmail },
      }),
      prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ])

    logger.info(`Email changed for user: ${verificationToken.userId}`)
    return { success: true }
  } catch (error) {
    logger.error('Email verification error:', error)

    // Handle unique constraint violation
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: 'This email address is no longer available.' }
    }

    return { error: 'An error occurred. Please try again.' }
  }
}

/**
 * Cancel pending email change
 *
 * @returns Success status
 */
export async function cancelPendingEmailChange(): Promise<ActionResult> {
  return withAuth(async (session) => {
    try {
      await prisma.verificationToken.updateMany({
        where: {
          userId: session.userId,
          type: 'email_change',
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      })

      logger.info(`Pending email change cancelled for user: ${session.userId}`)
      return { success: true }
    } catch (error) {
      logger.error('Cancel email change error:', error)
      return { error: 'An error occurred. Please try again.' }
    }
  }).catch(() => ({ success: false, error: 'Unauthorized' }))
}
