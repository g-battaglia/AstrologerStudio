// NOTE: DODO PAYMENTS
/**
 * Subscription Module Stub (Server-Only)
 *
 * This module provides subscription status without depending on Dodo Payments.
 * When Dodo Payments module is not installed, all users get "lifetime" access.
 *
 * @module lib/subscription
 */
import 'server-only'
import { getSession } from '@/lib/security/session'
import { logger } from '@/lib/logging/server'
import { isDodoPaymentsEnabled, type SubscriptionPlan, type SubscriptionStatus } from './config'

// Re-export client-safe types and functions
export { isDodoPaymentsEnabled, type SubscriptionPlan, type SubscriptionStatus } from './config'

/**
 * Get user's subscription status
 * Falls back to "lifetime" when Dodo Payments is not installed
 *
 * @param userId - User ID to check
 * @param options - Options for subscription check
 * @returns Subscription status
 */
export async function getSubscriptionStatus(
  userId: string,
  options: { forceSync?: boolean } = {}
): Promise<SubscriptionStatus> {
  const dpEnabled = isDodoPaymentsEnabled()
  logger.info(`[Subscription] getSubscriptionStatus called: userId=${userId}, dpEnabled=${dpEnabled}, forceSync=${options.forceSync ?? false}`)

  // If Dodo Payments module is not installed, everyone has lifetime access
  if (!dpEnabled) {
    logger.info(`[Subscription] Dodo Payments disabled → returning lifetime access for user ${userId}`)
    return {
      plan: 'lifetime',
      isActive: true,
      trialDaysLeft: null,
      subscriptionEndsAt: null,
      isStale: false,
    }
  }

  // Dynamically import from Dodo Payments module
  try {
    logger.info(`[Subscription] Loading Dodo Payments module for user ${userId}...`)
    const { getUserSubscription } = await import('@/dodopayments/lib/subscription')
    const status = await getUserSubscription(userId, options)
    logger.info(`[Subscription] User ${userId} subscription: plan=${status.plan}, isActive=${status.isActive}`)
    return {
      plan: status.plan,
      isActive: status.isActive,
      trialDaysLeft: status.trialDaysLeft,
      subscriptionEndsAt: status.subscriptionEndsAt,
      isStale: status.isStale ?? false,
    }
  } catch (error) {
    // Dodo Payments module not available - fallback to lifetime
    logger.warn(`[Subscription] Dodo Payments import failed, fallback to lifetime:`, error)
    return {
      plan: 'lifetime',
      isActive: true,
      trialDaysLeft: null,
      subscriptionEndsAt: null,
      isStale: false,
    }
  }
}

/**
 * Get session with subscription status
 * Falls back to "lifetime" when Dodo Payments is not installed
 */
export async function getSessionWithSubscription() {
  const session = await getSession()
  if (!session) {
    logger.debug(`[Subscription] getSessionWithSubscription: no session`)
    return null
  }

  const dpEnabled = isDodoPaymentsEnabled()
  logger.debug(`[Subscription] getSessionWithSubscription for ${session.username}, dpEnabled=${dpEnabled}`)

  // If Dodo Payments not installed, everyone has lifetime
  if (!dpEnabled) {
    logger.info(`[Subscription] Dodo Payments disabled → lifetime for ${session.username}`)
    return {
      userId: session.userId,
      username: session.username,
      subscriptionPlan: 'lifetime' as SubscriptionPlan,
      isSubscriptionActive: true,
      trialDaysLeft: null,
    }
  }

  // Try to get from Dodo Payments module
  try {
    const { getSessionWithSubscription: dpGetSession } = await import('@/dodopayments/lib/access')
    return dpGetSession()
  } catch {
    return {
      userId: session.userId,
      username: session.username,
      subscriptionPlan: 'lifetime' as SubscriptionPlan,
      isSubscriptionActive: true,
      trialDaysLeft: null,
    }
  }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const status = await getSubscriptionStatus(userId)
  return status.isActive
}
