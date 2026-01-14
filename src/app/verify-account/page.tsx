import { Suspense } from 'react'
import type { Metadata } from 'next'
import VerifyAccountForm from './VerifyAccountForm'

export const metadata: Metadata = {
  title: 'Verify Account - Astrologer Studio',
  description: 'Verify your Astrologer Studio account',
}

/**
 * Account Verification Page
 */
export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyAccountForm />
    </Suspense>
  )
}
