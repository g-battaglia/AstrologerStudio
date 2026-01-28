// NOTE: DODO PAYMENTS
/**
 * Customer Portal API Route
 *
 * Creates a customer portal session for managing subscriptions.
 *
 * SECURITY: Validates user session and only returns portal for user's own customer ID.
 *
 * @module api/dodo/portal
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/security/session'
import { getCustomerPortalUrl } from '@/dodopayments/lib/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logging/server'

export async function POST(_request: NextRequest): Promise<NextResponse> {
  try {
    // Get current session
    const session = await getSession()

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's customer ID from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { customerId: true },
    })

    if (!user?.customerId) {
      logger.warn(`[DodoPayments/Portal] No customer ID for user ${session.userId}`)
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Get customer portal URL
    const portalUrl = await getCustomerPortalUrl(user.customerId)

    if (!portalUrl) {
      logger.error(`[DodoPayments/Portal] Failed to create portal for customer ${user.customerId}`)
      return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
    }

    logger.info(`[DodoPayments/Portal] Created portal for user ${session.userId}`)

    return NextResponse.json({
      url: portalUrl,
    })
  } catch (error) {
    logger.error('[DodoPayments/Portal] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
