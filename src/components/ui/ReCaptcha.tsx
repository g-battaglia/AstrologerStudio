'use client'

import ReCAPTCHA from 'react-google-recaptcha'
import { forwardRef } from 'react'

// Check if reCAPTCHA is disabled (for self-hosted/dev environments)
export const isRecaptchaDisabled = process.env.NEXT_PUBLIC_DISABLE_RECAPTCHA === 'true'

// Log warning if disabled (client-side)
if (typeof window !== 'undefined' && isRecaptchaDisabled) {
  console.warn(
    '[SECURITY WARNING] reCAPTCHA is DISABLED. ' +
      'This should only be used in development or self-hosted environments.',
  )
}

interface ReCaptchaProps {
  onChange: (token: string | null) => void
  onExpired?: () => void
  onError?: () => void
}

/**
 * ReCAPTCHA v2 checkbox component
 * Wrapper around react-google-recaptcha with consistent styling
 * Returns null when NEXT_PUBLIC_DISABLE_RECAPTCHA=true
 */
const ReCaptcha = forwardRef<ReCAPTCHA, ReCaptchaProps>(({ onChange, onExpired, onError }, ref) => {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  // Don't render the widget if disabled
  if (isRecaptchaDisabled) {
    return null
  }

  if (!siteKey) {
    throw new Error(
      'NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not configured. ' +
        'Either set NEXT_PUBLIC_RECAPTCHA_SITE_KEY or disable reCAPTCHA with NEXT_PUBLIC_DISABLE_RECAPTCHA=true',
    )
  }

  return (
    <div className="flex justify-center">
      <ReCAPTCHA
        ref={ref}
        sitekey={siteKey}
        onChange={onChange}
        onExpired={onExpired}
        onError={onError}
        theme="light"
      />
    </div>
  )
})

ReCaptcha.displayName = 'ReCaptcha'

export { ReCaptcha }
