/**
 * Server-side reCAPTCHA verification utility
 */

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

// Check if reCAPTCHA is disabled (for self-hosted/dev environments)
// Uses NEXT_PUBLIC_ prefix so it's available on both client and server
const isRecaptchaDisabled = process.env.NEXT_PUBLIC_DISABLE_RECAPTCHA === 'true'

// Log warning once at startup if reCAPTCHA is disabled
if (isRecaptchaDisabled) {
  console.warn(
    '[SECURITY WARNING] reCAPTCHA verification is DISABLED. ' +
      'This should only be used in development or *local* self-hosted environments. ' +
      'Set NEXT_PUBLIC_DISABLE_RECAPTCHA=false in production.',
  )
}

interface RecaptchaResponse {
  success: boolean
  challenge_ts?: string
  hostname?: string
  'error-codes'?: string[]
}

/**
 * Verify a reCAPTCHA token with Google's API
 *
 * @param token - The reCAPTCHA response token from the client
 * @returns Promise resolving to true if verification succeeds, false otherwise
 *
 * @remarks
 * - Requires RECAPTCHA_SECRET_KEY environment variable
 * - Makes a POST request to Google's reCAPTCHA verification endpoint
 * - Returns false on any error or invalid response
 *
 * @example
 * ```ts
 * const isValid = await verifyRecaptcha(token)
 * if (!isValid) {
 *   return { error: 'reCAPTCHA verification failed' }
 * }
 * ```
 */
export async function verifyRecaptcha(token: string): Promise<boolean> {
  // Allow disabling reCAPTCHA for self-hosted/dev environments
  if (isRecaptchaDisabled) {
    return true
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY

  if (!secretKey) {
    throw new Error(
      'RECAPTCHA_SECRET_KEY is not configured. ' +
        'Either set RECAPTCHA_SECRET_KEY or disable reCAPTCHA with NEXT_PUBLIC_DISABLE_RECAPTCHA=true',
    )
  }

  if (!token) {
    console.error('No reCAPTCHA token provided')
    return false
  }

  try {
    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    })

    if (!response.ok) {
      console.error('reCAPTCHA verification request failed:', response.status)
      return false
    }

    const data: RecaptchaResponse = await response.json()

    if (!data.success) {
      console.error('reCAPTCHA verification failed:', data['error-codes'])
      return false
    }

    return true
  } catch (error) {
    console.error('reCAPTCHA verification error:', error)
    return false
  }
}
