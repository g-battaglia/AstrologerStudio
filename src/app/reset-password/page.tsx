import { Suspense } from 'react'
import type { Metadata } from 'next'
import ResetPasswordForm from './ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Reset Password - Astrologer Studio',
  description: 'Create a new password for your Astrologer Studio account',
}

/**
 * Reset Password Page
 */
export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
