// NOTE: DODO PAYMENTS
/**
 * Dodo Payments Server-Side SDK
 *
 * Server-side utilities for Dodo Payments integration.
 * Handles webhook verification and API calls.
 *
 * SECURITY: API key is server-only, never exposed to client.
 * Webhook verification uses SDK's unwrap() method for secure signature validation.
 *
 * @module dodopayments/lib/server
 */
import 'server-only'
import DodoPayments from 'dodopayments'
import { logger } from '@/lib/logging/server'
import { dodoPaymentsConfig, mapDodoStatusToPlan, type DodoSubscriptionStatus } from './config'

/**
 * Dodo Payments API key for server-side operations
 * SECURITY: This is a secret and must never be exposed to the client
 */
const DODO_PAYMENTS_API_KEY = process.env.DODO_PAYMENTS_API_KEY || ''

/**
 * Dodo Payments webhook secret for signature verification
 * SECURITY: This is a secret and must never be exposed to the client
 */
const DODO_PAYMENTS_WEBHOOK_KEY = process.env.DODO_PAYMENTS_WEBHOOK_KEY || ''

/**
 * Singleton Dodo Payments client instance
 */
let clientInstance: DodoPayments | null = null

/**
 * Get or create Dodo Payments client
 */
function getClient(): DodoPayments | null {
  if (clientInstance) return clientInstance

  if (!DODO_PAYMENTS_API_KEY) {
    logger.warn('[DodoPayments] API key not configured')
    return null
  }

  // SDK v2.14+ accepts webhookKey in constructor
  clientInstance = new DodoPayments({
    bearerToken: DODO_PAYMENTS_API_KEY,
    environment: dodoPaymentsConfig.mode === 'live' ? 'live_mode' : 'test_mode',
    webhookKey: DODO_PAYMENTS_WEBHOOK_KEY || null,
  })

  return clientInstance
}

/**
 * Webhook headers required for verification
 */
export interface WebhookHeaders {
  'webhook-id': string
  'webhook-signature': string
  'webhook-timestamp': string
}

/**
 * Dodo Payments webhook event types we handle
 */
export type DodoWebhookEventType =
  | 'subscription.active'
  | 'subscription.updated'
  | 'subscription.on_hold'
  | 'subscription.renewed'
  | 'subscription.plan_changed'
  | 'subscription.cancelled'
  | 'subscription.failed'
  | 'subscription.expired'
  | 'payment.succeeded'
  | 'payment.failed'

/**
 * Webhook payload structure (simplified for our use case)
 */
export interface DodoWebhookPayload {
  business_id: string
  type: DodoWebhookEventType
  timestamp: string
  data: {
    /** Payload type from docs: Payment | Subscription | Refund | Dispute | LicenseKey */
    payload_type?: 'Payment' | 'Subscription' | 'Refund' | 'Dispute' | 'LicenseKey'
    subscription_id?: string
    customer?: {
      customer_id: string
      email: string
      name?: string
    }
    status?: DodoSubscriptionStatus
    next_billing_date?: string
    metadata?: Record<string, string>
    [key: string]: unknown
  }
}

/**
 * Verify and unwrap webhook payload using SDK's built-in method
 *
 * SECURITY: Uses SDK's unwrap() which implements:
 * - HMAC-SHA256 signature verification
 * - Timing-safe comparison
 * - Timestamp validation
 *
 * @param rawBody - Raw request body as string
 * @param headers - Webhook headers containing signature
 * @returns Parsed and verified webhook payload
 * @throws Error if verification fails
 */
export async function verifyWebhook(
  rawBody: string,
  headers: WebhookHeaders
): Promise<DodoWebhookPayload> {
  const client = getClient()

  if (!client) {
    throw new Error('Dodo Payments client not configured')
  }

  if (!DODO_PAYMENTS_WEBHOOK_KEY) {
    throw new Error('Dodo Payments webhook key not configured')
  }

  try {
    // Use SDK's built-in unwrap method for secure verification
    // SDK v2.14+ has this on client.webhooks.unwrap()
    const event = client.webhooks.unwrap(rawBody, {
      headers: {
        'webhook-id': headers['webhook-id'],
        'webhook-signature': headers['webhook-signature'],
        'webhook-timestamp': headers['webhook-timestamp'],
      },
      key: DODO_PAYMENTS_WEBHOOK_KEY,
    })

    // Map SDK event to our simplified type
    // Use type assertion through unknown for safe conversion
    return {
      business_id: event.business_id,
      type: event.type as DodoWebhookEventType,
      timestamp: event.timestamp,
      data: event.data as unknown as DodoWebhookPayload['data'],
    }
  } catch (error) {
    logger.error('[DodoPayments] Webhook verification failed:', error)
    throw new Error('Invalid webhook signature')
  }
}

/**
 * Subscription data returned from Dodo Payments API
 */
export interface DodoSubscriptionData {
  subscriptionId: string
  customerId: string
  status: DodoSubscriptionStatus
  plan: 'trial' | 'pro' | 'free' | 'lifetime'
  currentPeriodEnd: Date | null
  trialEnd: Date | null
}

/**
 * Get subscription by ID from Dodo Payments API
 *
 * @param subscriptionId - Dodo subscription ID
 * @returns Subscription data or null if not found
 */
export async function getSubscription(subscriptionId: string): Promise<DodoSubscriptionData | null> {
  const client = getClient()

  if (!client) {
    return null
  }

  try {
    const subscription = await client.subscriptions.retrieve(subscriptionId)

    const status = subscription.status as DodoSubscriptionStatus
    const plan = mapDodoStatusToPlan(status)

    return {
      subscriptionId: subscription.subscription_id,
      customerId: subscription.customer.customer_id,
      status,
      plan,
      currentPeriodEnd: subscription.next_billing_date
        ? new Date(subscription.next_billing_date)
        : null,
      trialEnd: null, // SDK uses trial_period_days instead
    }
  } catch (error) {
    logger.error(`[DodoPayments] Failed to get subscription ${subscriptionId}:`, error)
    return null
  }
}

/**
 * List subscriptions for a customer
 *
 * @param customerId - Customer ID
 * @returns Array of subscription data
 */
export async function listCustomerSubscriptions(customerId: string): Promise<DodoSubscriptionData[]> {
  const client = getClient()

  if (!client) {
    return []
  }

  try {
    const subscriptions = await client.subscriptions.list({
      customer_id: customerId,
    })

    const results: DodoSubscriptionData[] = []
    for await (const sub of subscriptions) {
      const status = sub.status as DodoSubscriptionStatus
      results.push({
        subscriptionId: sub.subscription_id,
        customerId: sub.customer.customer_id,
        status,
        plan: mapDodoStatusToPlan(status),
        currentPeriodEnd: sub.next_billing_date ? new Date(sub.next_billing_date) : null,
        trialEnd: null, // SDK uses trial_period_days instead
      })
    }

    return results
  } catch (error) {
    logger.error(`[DodoPayments] Failed to list subscriptions for customer ${customerId}:`, error)
    return []
  }
}

/**
 * Cancel a Dodo Payments subscription
 *
 * @param subscriptionId - The subscription ID to cancel
 * @returns Success status and optional error message
 */
export async function cancelSubscription(
  subscriptionId: string,
  options: { immediate?: boolean } = {}
): Promise<{ success: boolean; error?: string }> {
  const client = getClient()

  if (!client) {
    return { success: false, error: 'Dodo Payments not configured' }
  }

  try {
    if (options.immediate) {
      // Immediate cancellation - subscription ends now
      await client.subscriptions.update(subscriptionId, {
        status: 'cancelled',
      })
      logger.info(`[DodoPayments] Subscription cancelled immediately: ${subscriptionId}`)
    } else {
      // Graceful cancellation - subscription ends at next billing date
      await client.subscriptions.update(subscriptionId, {
        cancel_at_next_billing_date: true,
      })
      logger.info(`[DodoPayments] Subscription set to cancel at period end: ${subscriptionId}`)
    }
    return { success: true }
  } catch (error) {
    logger.error(`[DodoPayments] Failed to cancel subscription ${subscriptionId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get customer by email from Dodo Payments API
 *
 * @param email - Customer email address
 * @returns Customer ID or null if not found
 */
export async function getCustomerByEmail(email: string): Promise<string | null> {
  const client = getClient()

  if (!client) {
    return null
  }

  try {
    const customers = await client.customers.list({ email })

    let customer = null
    for await (const c of customers) {
      customer = c
      break // Take the first match
    }

    if (!customer) {
      logger.info(`[DodoPayments] No customer found for email: ${email}`)
      return null
    }

    logger.info(`[DodoPayments] Found customer for email ${email}: ${customer.customer_id}`)
    return customer.customer_id
  } catch (error) {
    logger.error(`[DodoPayments] Failed to get customer by email ${email}:`, error)
    return null
  }
}

/**
 * Get active subscription for a customer by email
 *
 * @param email - Customer email
 * @returns Active subscription data or null
 */
export async function getActiveSubscriptionByEmail(email: string): Promise<DodoSubscriptionData | null> {
  const customerId = await getCustomerByEmail(email)

  if (!customerId) {
    return null
  }

  const subscriptions = await listCustomerSubscriptions(customerId)

  // Find the first active subscription
  const activeSub = subscriptions.find((sub) => sub.status === 'active')

  if (activeSub) {
    return activeSub
  }

  // Return the most recent subscription if no active one
  return subscriptions[0] || null
}

/**
 * Create a checkout session for subscription
 *
 * Uses SDK v2.14+ checkoutSessions.create() method
 *
 * @param productId - Product ID for the subscription
 * @param metadata - Optional metadata to attach (e.g., user_id)
 * @returns Checkout session URL or null
 */
export async function createCheckoutSession(
  productId: string,
  metadata?: Record<string, string>
): Promise<{ checkoutUrl: string; sessionId: string } | null> {
  const client = getClient()

  if (!client) {
    return null
  }

  try {
    // Use checkoutSessions.create() - correct API for SDK v2.14+
    const session = await client.checkoutSessions.create({
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
        },
      ],
      customer: metadata?.email ? {
        email: metadata.email,
        name: metadata.name || undefined,
      } : undefined,
      metadata: metadata || {},
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/choose-plan?completed=true`,
    })

    // SDK returns checkout_url (optional when payment_method_id is provided)
    if (!session.checkout_url) {
      logger.error('[DodoPayments] No checkout_url in response')
      return null
    }

    return {
      checkoutUrl: session.checkout_url,
      sessionId: session.session_id,
    }
  } catch (error) {
    logger.error('[DodoPayments] Failed to create checkout session:', error)
    return null
  }
}

/**
 * Get customer portal URL for managing subscription
 *
 * Uses SDK v2.14+ customers.customerPortal.create() for secure portal access
 *
 * @param customerId - Dodo customer ID
 * @param sendEmail - If true, sends portal link via email
 * @returns Customer portal URL or null
 */
export async function getCustomerPortalUrl(
  customerId: string,
  sendEmail: boolean = false
): Promise<string | null> {
  const client = getClient()

  if (!client) {
    return null
  }

  try {
    const portal = await client.customers.customerPortal.create(customerId, {
      send_email: sendEmail,
    })

    logger.info(`[DodoPayments] Created customer portal for ${customerId}`)
    return portal.link
  } catch (error) {
    logger.error(`[DodoPayments] Failed to create customer portal for ${customerId}:`, error)
    return null
  }
}
