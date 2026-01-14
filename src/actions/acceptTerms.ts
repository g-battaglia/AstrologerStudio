'use server'

import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/security/session'
import { LEGAL_VERSIONS } from '@/lib/config/legal'
import { revalidatePath } from 'next/cache'

interface AcceptTermsResult {
  success: boolean
  error?: string
}

/**
 * Server action to record user's acceptance of Terms of Service and Privacy Policy
 */
export async function acceptTerms(): Promise<AcceptTermsResult> {
  try {
    const session = await getSession()

    if (!session?.userId) {
      return { success: false, error: 'Not authenticated' }
    }

    const now = new Date()

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        termsAcceptedVersion: LEGAL_VERSIONS.terms,
        termsAcceptedAt: now,
        privacyAcceptedVersion: LEGAL_VERSIONS.privacy,
        privacyAcceptedAt: now,
      },
    })

    // Revalidate to update the layout state
    revalidatePath('/(protected)', 'layout')

    return { success: true }
  } catch (error) {
    console.error('Error accepting terms:', error)
    return { success: false, error: 'Failed to save acceptance' }
  }
}
