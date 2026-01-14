// NOTE: DODO PAYMENTS
/**
 * Subscription Configuration (Client-Safe)
 *
 * This module provides client-safe utilities for checking Dodo Payments status.
 * Can be imported from both client and server components.
 *
 * @module lib/subscription/config
 */

/**
 * Subscription plan types
 * - free: Limited access (5 subjects, natal only, 5 AI/day)
 * - trial: Full access during trial period
 * - pro: Full access (paid subscription)
 * - lifetime: Full access (one-time purchase)
 */
export type SubscriptionPlan = 'free' | 'trial' | 'pro' | 'lifetime'

/**
 * Subscription status
 */
export interface SubscriptionStatus {
  plan: SubscriptionPlan
  isActive: boolean
  trialDaysLeft: number | null
  subscriptionEndsAt?: Date | null
  /** Whether data may be stale and a sync is recommended */
  isStale?: boolean
}

/**
 * Check if Dodo Payments module is installed/enabled
 * Uses environment variable - safe for client components
 */
export function isDodoPaymentsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_DODO_PAYMENTS === 'true'
}
