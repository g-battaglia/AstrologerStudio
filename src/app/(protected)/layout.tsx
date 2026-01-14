import AppLayout from '@/components/AppLayout'
import { ReactNode } from 'react'
import { getSession } from '@/lib/security/session'
import { prisma } from '@/lib/db/prisma'
import { redirect } from 'next/navigation'
import { LEGAL_VERSIONS } from '@/lib/config/legal'
import { TermsAcceptanceModal } from '@/components/TermsAcceptanceModal'

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getSession()

  // If not authenticated, redirect to login
  if (!session?.userId) {
    redirect('/login')
  }

  // Fetch user data including legal acceptance status
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      onboardingCompleted: true,
      termsAcceptedVersion: true,
      privacyAcceptedVersion: true,
    },
  })

  // If onboarding not completed, redirect to choose-plan
  if (!user?.onboardingCompleted) {
    redirect('/choose-plan')
  }

  // Check if user needs to accept current versions of legal documents
  const needsTermsAcceptance = user.termsAcceptedVersion !== LEGAL_VERSIONS.terms
  const needsPrivacyAcceptance = user.privacyAcceptedVersion !== LEGAL_VERSIONS.privacy

  return (
    <AppLayout>
      {children}
      <TermsAcceptanceModal
        needsTermsAcceptance={needsTermsAcceptance}
        needsPrivacyAcceptance={needsPrivacyAcceptance}
      />
    </AppLayout>
  )
}
