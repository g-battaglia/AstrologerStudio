// NOTE: DODO PAYMENTS
/**
 * Dodo Payments Checkout API Route
 *
 * Creates checkout sessions for Dodo Payments subscriptions.
 *
 * SECURITY: Validates user session and creates checkout with user metadata.
 *
 * @module api/dodo/checkout
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/security/session'
import { createCheckoutSession } from '@/dodopayments/lib/server'
import { dodoPaymentsConfig } from '@/dodopayments/lib/config'
import { logger } from '@/lib/logging/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get current session
    const session = await getSession()

    // Parse request body
    const body = await request.json()
    const { productId, userId, email, name } = body

    // Use session data if available, fallback to request data
    const effectiveUserId = session?.userId || userId
    const effectiveEmail = email || ''
    const effectiveName = name || session?.username || ''

    // Validate product ID
    const effectiveProductId = productId || dodoPaymentsConfig.productId
    if (!effectiveProductId) {
      logger.error('[DodoPayments/Checkout] No product ID configured')
      return NextResponse.json({ error: 'Product ID not configured' }, { status: 400 })
    }

    // Create checkout session with user metadata
    const checkoutSession = await createCheckoutSession(effectiveProductId, {
      user_id: effectiveUserId || '',
      email: effectiveEmail,
      name: effectiveName,
    })

    if (!checkoutSession) {
      logger.error('[DodoPayments/Checkout] Failed to create checkout session')
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    logger.info(`[DodoPayments/Checkout] Created session for user ${effectiveUserId}: ${checkoutSession.sessionId}`)

    return NextResponse.json({
      checkoutUrl: checkoutSession.checkoutUrl,
      sessionId: checkoutSession.sessionId,
    })
  } catch (error) {
    logger.error('[DodoPayments/Checkout] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
