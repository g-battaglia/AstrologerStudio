// NOTE: DODO PAYMENTS
/**
 * Dodo Payments Configuration
 *
 * Client-safe and server-side configuration for Dodo Payments integration.
 *
 * @module dodopayments/lib/config
 */

export type SubscriptionPlan = 'free' | 'trial' | 'pro' | 'lifetime'

/**
 * Dodo subscription status from API
 */
export type DodoSubscriptionStatus =
  | 'active'
  | 'on_hold'
  | 'cancelled'
  | 'expired'
  | 'pending'
  | 'failed'

/**
 * Dodo Payments configuration from environment variables
 */
export const dodoPaymentsConfig = {
  /** Whether Dodo Payments is enabled */
  enabled: process.env.NEXT_PUBLIC_ENABLE_DODO_PAYMENTS === 'true',

  /** Dodo Payments Product ID for subscription (client-safe) */
  productId: process.env.NEXT_PUBLIC_DODO_PAYMENTS_PRODUCT_ID || '',

  /** Dodo Payments mode: 'test' or 'live' (client-safe) */
  mode: (process.env.NEXT_PUBLIC_DODO_PAYMENTS_MODE || 'test') as 'test' | 'live',
}

/**
 * Check if Dodo Payments is enabled
 */
export function isDodoPaymentsEnabled(): boolean {
  return dodoPaymentsConfig.enabled
}

/**
 * Check if a plan grants access (is "active")
 */
export function planGrantsAccess(plan: SubscriptionPlan): boolean {
  return plan === 'pro' || plan === 'trial' || plan === 'lifetime'
}

/**
 * Map Dodo subscription status to our internal plan
 */
export function mapDodoStatusToPlan(status: DodoSubscriptionStatus): SubscriptionPlan {
  switch (status) {
    case 'active':
      return 'pro'
    case 'pending':
      return 'trial' // Pending subscriptions treated as trial
    case 'on_hold':
    case 'cancelled':
    case 'expired':
    default:
      return 'free'
  }
}
