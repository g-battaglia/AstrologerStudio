'use server'

import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { randomBytes, createHash } from 'crypto'
import { z } from 'zod'
import { verifyRecaptcha } from '@/lib/security/recaptcha'
import { logger } from '@/lib/logging/server'
import { sendAccountVerificationEmail, isEmailConfigured } from '@/lib/mail/mail'
import { Prisma } from '@prisma/client'
import { headers } from 'next/headers'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/security/rate-limit'
import { LEGAL_VERSIONS } from '@/lib/config/legal'

/**
 * Result type for registration actions
 */
type ActionResult = {
  error?: string
  success?: boolean
}

/**
 * Check if email registration is enabled
 */
export async function isEmailRegistrationEnabled(): Promise<boolean> {
  return process.env.NEXT_PUBLIC_ENABLE_EMAIL_REGISTRATION === 'true'
}

/**
 * Registration validation schema
 */
const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  recaptchaToken: z.string().min(1, 'reCAPTCHA verification required'),
})

/**
 * Register a new user with email verification
 *
 * @param data - Registration form data
 * @returns Success status or error
 */
export async function registerUser(data: {
  username: string
  email: string
  password: string
  recaptchaToken: string
}): Promise<ActionResult> {
  // Check if registration is enabled
  if (!isEmailRegistrationEnabled()) {
    return { error: 'Email registration is currently disabled.' }
  }

  // Check if email is configured
  if (!isEmailConfigured()) {
    logger.error('Registration attempted but email service is not configured')
    return { error: 'Email service is not configured. Please contact support.' }
  }

  // Validate input
  const validation = RegisterSchema.safeParse(data)
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || 'Invalid input' }
  }

  // Verify reCAPTCHA
  const isRecaptchaValid = await verifyRecaptcha(validation.data.recaptchaToken)
  if (!isRecaptchaValid) {
    return { error: 'reCAPTCHA verification failed. Please try again.' }
  }

  // IP-based rate limiting
  const headersList = await headers()
  const clientIp = getClientIp(headersList)
  const ipRateLimit = checkRateLimit(`ip:${clientIp}`, RATE_LIMITS.ip)
  if (!ipRateLimit.success) {
    logger.warn(`IP rate limit exceeded for registration: ${clientIp}`)
    return { error: 'Too many registration attempts from this IP. Please try again later.' }
  }

  try {
    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: validation.data.username }, { email: validation.data.email }],
      },
      select: { username: true, email: true },
    })

    if (existingUser) {
      if (existingUser.username === validation.data.username) {
        return { error: 'This username is already taken.' }
      }
      if (existingUser.email === validation.data.email) {
        return { error: 'This email is already registered.' }
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validation.data.password, 12)

    // Create user (not verified yet) with terms acceptance
    const now = new Date()
    const user = await prisma.user.create({
      data: {
        username: validation.data.username,
        email: validation.data.email,
        password: hashedPassword,
        authProvider: 'credentials',
        subscriptionPlan: 'free',
        // Terms acceptance from registration form
        termsAcceptedVersion: LEGAL_VERSIONS.terms,
        termsAcceptedAt: now,
        privacyAcceptedVersion: LEGAL_VERSIONS.privacy,
        privacyAcceptedAt: now,
      },
    })

    // Generate verification token and hash it for storage
    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')

    // Create verification token (expires in 24 hours) - store hash only
    await prisma.verificationToken.create({
      data: {
        token: tokenHash,
        type: 'account_verification',
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    })

    // Send verification email
    const emailSent = await sendAccountVerificationEmail(validation.data.email, token, validation.data.username)

    if (!emailSent) {
      // Rollback: delete the user if email failed
      await prisma.user.delete({ where: { id: user.id } })
      return { error: 'Failed to send verification email. Please try again.' }
    }

    logger.info(`New user registered: ${user.id} (${validation.data.username})`)

    // Notify Slack about new user registration
    const { sendNewUserNotification } = await import('@/lib/logging/slack')
    void sendNewUserNotification(validation.data.username, validation.data.email, 'email')

    return { success: true }
  } catch (error) {
    logger.error('Registration error:', error)

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { error: 'Username or email is already in use.' }
      }
    }

    return { error: 'An error occurred during registration. Please try again.' }
  }
}

/**
 * Verify account with token
 *
 * @param token - Verification token from email
 * @returns Success status or error
 */
export async function verifyAccount(token: string): Promise<ActionResult> {
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

    if (verificationToken.type !== 'account_verification') {
      return { error: 'Invalid verification link.' }
    }

    if (verificationToken.usedAt) {
      return { error: 'This verification link has already been used.' }
    }

    if (verificationToken.expiresAt < new Date()) {
      return { error: 'This verification link has expired. Please register again.' }
    }

    // Mark token as used and verify user email
    await prisma.$transaction([
      prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: new Date() },
      }),
    ])

    logger.info(`Account verified for user: ${verificationToken.userId}`)
    return { success: true }
  } catch (error) {
    logger.error('Account verification error:', error)
    return { error: 'An error occurred. Please try again.' }
  }
}

/**
 * Resend account verification email
 *
 * @param email - Email address
 * @param recaptchaToken - reCAPTCHA token
 * @returns Success status
 */
export async function resendVerificationEmail(email: string, recaptchaToken: string): Promise<ActionResult> {
  // Verify reCAPTCHA
  const isRecaptchaValid = await verifyRecaptcha(recaptchaToken)
  if (!isRecaptchaValid) {
    return { error: 'reCAPTCHA verification failed. Please try again.' }
  }

  if (!isEmailConfigured()) {
    return { error: 'Email service is not configured.' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, username: true },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return { success: true }
    }

    // Check if already verified (no pending token)
    const existingToken = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        type: 'account_verification',
        usedAt: null,
      },
    })

    // If already verified, silently succeed
    if (!existingToken) {
      return { success: true }
    }

    // Invalidate old tokens
    await prisma.verificationToken.updateMany({
      where: {
        userId: user.id,
        type: 'account_verification',
        usedAt: null,
      },
      data: { usedAt: new Date() },
    })

    // Create new token and hash it for storage
    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')

    await prisma.verificationToken.create({
      data: {
        token: tokenHash,
        type: 'account_verification',
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    // Send email
    await sendAccountVerificationEmail(email, token, user.username)

    return { success: true }
  } catch (error) {
    logger.error('Resend verification error:', error)
    return { error: 'An error occurred. Please try again.' }
  }
}
