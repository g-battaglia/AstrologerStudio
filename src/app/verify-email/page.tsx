import { Suspense } from 'react'
import type { Metadata } from 'next'
import VerifyEmailForm from './VerifyEmailForm'

export const metadata: Metadata = {
  title: 'Verify Email - Astrologer Studio',
  description: 'Verify your new email address for Astrologer Studio',
}

/**
 * Verify Email Page
 */
export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailForm />
    </Suspense>
  )
}
