import { Suspense } from 'react'
import type { Metadata } from 'next'
import ConfirmDeletionForm from './ConfirmDeletionForm'

export const metadata: Metadata = {
  title: 'Confirm Account Deletion - Astrologer Studio',
  description: 'Confirm the permanent deletion of your account',
}

export default function ConfirmAccountDeletionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <ConfirmDeletionForm />
    </Suspense>
  )
}
