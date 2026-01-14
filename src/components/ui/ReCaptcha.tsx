'use client'

import ReCAPTCHA from 'react-google-recaptcha'
import { forwardRef } from 'react'

// Check if reCAPTCHA is disabled (for self-hosted environments)
export const isRecaptchaDisabled = process.env.NEXT_PUBLIC_DISABLE_RECAPTCHA === 'true'

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
    console.error('NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not configured')
    return null
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
