// NOTE: DODO PAYMENTS
/**
 * Dodo Payments Webhook Handler
 *
 * Handles webhook events from Dodo Payments.
 *
 * SECURITY:
 * - Uses SDK's unwrap() method for timing-safe signature verification
 * - Validates webhook-id, webhook-signature, webhook-timestamp headers
 * - Returns 401 for invalid signatures to block malicious requests
 *
 * @module dodopayments/api/webhook/route
 */
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook, type DodoWebhookPayload } from '@/dodopayments/lib/server'
import { updateUserSubscription, linkDodoCustomer } from '@/dodopayments/lib/subscription'
import { mapDodoStatusToPlan, type DodoSubscriptionStatus } from '@/dodopayments/lib/config'
import { logger } from '@/lib/logging/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract webhook headers
    const webhookId = request.headers.get('webhook-id')
    const webhookSignature = request.headers.get('webhook-signature')
    const webhookTimestamp = request.headers.get('webhook-timestamp')

    if (!webhookId || !webhookSignature || !webhookTimestamp) {
      logger.error('[DodoPayments Webhook] Missing required headers')
      return NextResponse.json({ error: 'Missing webhook headers' }, { status: 400 })
    }

    const rawBody = await request.text()

    // Verify webhook signature using SDK
    let event: DodoWebhookPayload
    try {
      event = await verifyWebhook(rawBody, {
        'webhook-id': webhookId,
        'webhook-signature': webhookSignature,
        'webhook-timestamp': webhookTimestamp,
      })
    } catch (error) {
      logger.error('[DodoPayments Webhook] Signature verification failed:', error)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const eventType = event.type
    logger.info(`[DodoPayments Webhook] Received event: ${eventType}`)

    // Check if this is a subscription event using payload_type (per docs) or type prefix
    // SDK provides payload_type: 'Payment' | 'Subscription' | 'Refund' | 'Dispute' | 'LicenseKey'
    const isSubscriptionEvent = event.data.payload_type === 'Subscription' || eventType.startsWith('subscription.')

    if (!isSubscriptionEvent) {
      logger.info(`[DodoPayments Webhook] Ignoring non-subscription event: ${eventType}`)
      return NextResponse.json({ received: true })
    }

    // Extract subscription data from event.data
    // SDK v2.14: For subscription events, data contains the Subscription object
    const data = event.data
    const subscriptionId = data.subscription_id
    const customer = data.customer
    const status = data.status as DodoSubscriptionStatus
    const nextBillingDate = data.next_billing_date
    const metadata = data.metadata

    if (!subscriptionId || !customer) {
      logger.error('[DodoPayments Webhook] Missing subscription or customer data')
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const customerId = customer.customer_id
    const userId = metadata?.user_id

    // Handle different event types
    switch (eventType) {
      case 'subscription.active':
      case 'subscription.updated':
      case 'subscription.renewed':
      case 'subscription.plan_changed': {
        const plan = mapDodoStatusToPlan(status)
        const subscriptionEndsAt = nextBillingDate ? new Date(nextBillingDate) : null

        // If we have userId from metadata, link customer first
        if (userId && customerId) {
          await linkDodoCustomer(userId, customerId)
        }

        await updateUserSubscription({
          customerId,
          subscriptionId,
          plan,
          trialEndsAt: null,
          subscriptionEndsAt,
        })

        logger.info(`[DodoPayments Webhook] Subscription updated: ${subscriptionId} → ${plan}`)
        break
      }

      case 'subscription.on_hold':
      case 'subscription.cancelled':
      case 'subscription.expired':
      case 'subscription.failed': {
        await updateUserSubscription({
          customerId,
          subscriptionId,
          plan: 'free',
          trialEndsAt: null,
          subscriptionEndsAt: null,
        })

        logger.info(`[DodoPayments Webhook] Subscription ended: ${subscriptionId} → free`)
        break
      }

      default:
        logger.info(`[DodoPayments Webhook] Unhandled event type: ${eventType}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('[DodoPayments Webhook] Processing failed:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
