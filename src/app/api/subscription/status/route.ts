// NOTE: DODO PAYMENTS
/**
 * Subscription Status API Route
 *
 * Falls back to lifetime status if billing is not enabled.
 *
 * Query Parameters:
 * - forceSync=true: Forces a sync with billing provider API
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/security/session'
import { getSubscriptionStatus } from '@/lib/subscription'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSession()

  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if forceSync is requested (for billing pages)
  const forceSync = request.nextUrl.searchParams.get('forceSync') === 'true'

  const status = await getSubscriptionStatus(session.userId, { forceSync })

  return NextResponse.json({
    plan: status.plan,
    isActive: status.isActive,
    trialDaysLeft: status.trialDaysLeft,
    subscriptionEndsAt: status.subscriptionEndsAt ?? null,
    isStale: status.isStale ?? false,
  })
}
