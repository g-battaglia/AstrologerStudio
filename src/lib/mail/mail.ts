/**
 * Email Service using Nodemailer with SMTP
 *
 * Provides email sending functionality for:
 * - Password reset emails
 * - Email change verification emails
 */

import nodemailer from 'nodemailer'
import { logger } from '@/lib/logging/server'

// Environment validation
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASSWORD = process.env.SMTP_PASSWORD
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASSWORD)
}

/**
 * Create nodemailer transporter with Zoho SMTP configuration
 */
function createTransporter() {
  if (!isEmailConfigured()) {
    throw new Error('Email service not configured. Please set SMTP environment variables.')
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  })
}

/**
 * Send password reset email
 *
 * @param email - Recipient email address
 * @param token - Password reset token
 * @param username - Optional username for personalization
 */
export async function sendPasswordResetEmail(email: string, token: string, username?: string): Promise<boolean> {
  try {
    const transporter = createTransporter()
    const resetUrl = `${APP_URL}/reset-password?token=${token}`

    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'Reset Your Password - Astrologer Studio',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🌟 Astrologer Studio</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
            
            <p>Hello${username ? ` ${username}` : ''},</p>
            
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
            
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Password Reset Request - Astrologer Studio

Hello${username ? ` ${username}` : ''},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
      `.trim(),
    })

    logger.info(`Password reset email sent to ${email}`)
    return true
  } catch (error) {
    logger.error('Failed to send password reset email:', error)
    return false
  }
}

/**
 * Send email change verification email
 *
 * @param newEmail - New email address to verify
 * @param token - Verification token
 * @param username - Optional username for personalization
 */
export async function sendEmailChangeVerification(
  newEmail: string,
  token: string,
  username?: string,
): Promise<boolean> {
  try {
    const transporter = createTransporter()
    const verifyUrl = `${APP_URL}/verify-email?token=${token}`

    await transporter.sendMail({
      from: SMTP_FROM,
      to: newEmail,
      subject: 'Verify Your New Email - Astrologer Studio',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🌟 Astrologer Studio</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1f2937; margin-top: 0;">Verify Your New Email Address</h2>
            
            <p>Hello${username ? ` ${username}` : ''},</p>
            
            <p>You've requested to change your email address to this one. Click the button below to verify and complete the change:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours.</p>
            
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this email change, please ignore this email or contact support if you're concerned about your account security.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verifyUrl}" style="color: #6366f1; word-break: break-all;">${verifyUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Verify Your New Email Address - Astrologer Studio

Hello${username ? ` ${username}` : ''},

You've requested to change your email address to this one. Click the link below to verify and complete the change:

${verifyUrl}

This link will expire in 24 hours.

If you didn't request this email change, please ignore this email or contact support if you're concerned about your account security.
      `.trim(),
    })

    logger.info(`Email change verification sent to ${newEmail}`)
    return true
  } catch (error) {
    logger.error('Failed to send email change verification:', error)
    return false
  }
}

/**
 * Send account verification email for new registrations
 *
 * @param email - Recipient email address
 * @param token - Verification token
 * @param username - Username for personalization
 */
export async function sendAccountVerificationEmail(email: string, token: string, username: string): Promise<boolean> {
  try {
    const transporter = createTransporter()
    const verifyUrl = `${APP_URL}/verify-account?token=${token}`

    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'Verify Your Account - Astrologer Studio',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🌟 Astrologer Studio</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1f2937; margin-top: 0;">Welcome, ${username}!</h2>
            
            <p>Thank you for registering with Astrologer Studio. Please verify your email address to activate your account:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Verify My Account
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours.</p>
            
            <p style="color: #6b7280; font-size: 14px;">If you didn't create this account, you can safely ignore this email.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verifyUrl}" style="color: #6366f1; word-break: break-all;">${verifyUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to Astrologer Studio, ${username}!

Thank you for registering. Please verify your email address to activate your account:

${verifyUrl}

This link will expire in 24 hours.

If you didn't create this account, you can safely ignore this email.
      `.trim(),
    })

    logger.info(`Account verification email sent to ${email}`)
    return true
  } catch (error) {
    logger.error('Failed to send account verification email:', error)
    return false
  }
}

/**
 * Send account deletion confirmation email
 *
 * @param email - Recipient email address
 * @param token - Deletion confirmation token
 * @param username - Optional username for personalization
 */
export async function sendAccountDeletionConfirmation(
  email: string,
  token: string,
  username?: string,
): Promise<boolean> {
  try {
    const transporter = createTransporter()
    const confirmUrl = `${APP_URL}/confirm-account-deletion?token=${token}`

    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'Confirm Account Deletion - Astrologer Studio',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Account Deletion Request</h1>
          </div>
          
          <div style="background: #fef2f2; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #fecaca;">
            <h2 style="color: #991b1b; margin-top: 0;">Confirm Account Deletion</h2>
            
            <p>Hello${username ? ` ${username}` : ''},</p>
            
            <p style="color: #dc2626; font-weight: 600;">You have requested to permanently delete your Astrologer Studio account.</p>
            
            <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #991b1b;"><strong>Warning:</strong> This action is irreversible. The following will be permanently deleted:</p>
              <ul style="color: #991b1b; margin: 10px 0;">
                <li>Your profile and account settings</li>
                <li>All saved subjects and birth charts</li>
                <li>All saved calculations and interpretations</li>
                <li>Your subscription (if active) will be cancelled</li>
              </ul>
            </div>
            
            <p>If you are sure you want to delete your account, click the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" style="background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Confirm Account Deletion
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
            
            <p style="color: #6b7280; font-size: 14px;"><strong>If you did not request this</strong>, please ignore this email. Your account will remain safe.</p>
            
            <hr style="border: none; border-top: 1px solid #fecaca; margin: 20px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${confirmUrl}" style="color: #dc2626; word-break: break-all;">${confirmUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Account Deletion Request - Astrologer Studio

Hello${username ? ` ${username}` : ''},

You have requested to permanently delete your Astrologer Studio account.

WARNING: This action is irreversible. The following will be permanently deleted:
- Your profile and account settings
- All saved subjects and birth charts
- All saved calculations and interpretations
- Your subscription (if active) will be cancelled

If you are sure you want to delete your account, click the link below:

${confirmUrl}

This link will expire in 1 hour for security reasons.

If you did not request this, please ignore this email. Your account will remain safe.
      `.trim(),
    })

    logger.info(`Account deletion confirmation email sent to ${email}`)
    return true
  } catch (error) {
    logger.error('Failed to send account deletion confirmation email:', error)
    return false
  }
}
