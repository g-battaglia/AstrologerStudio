import { Suspense } from 'react'
import type { Metadata } from 'next'
import ForgotPasswordForm from './ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Forgot Password - Astrologer Studio',
  description: 'Reset your Astrologer Studio password',
}

/**
 * Forgot Password Page
 */
export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
