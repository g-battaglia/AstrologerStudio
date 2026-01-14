// NOTE: DODO PAYMENTS
/**
 * Subscription Access Control
 *
 * Server-side utilities for checking subscription access.
 *
 * @module dodopayments/lib/access
 */
import 'server-only'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/security/session'
import { getUserSubscription, type SubscriptionStatus } from './subscription'
import { type SubscriptionPlan } from './config'
import { logger } from '@/lib/logging/server'

/**
 * Custom error for payment required
 */
export class PaymentRequiredError extends Error {
  constructor(message = 'Payment required') {
    super(message)
    this.name = 'PaymentRequiredError'
  }
}

/**
 * Auth session with subscription data
 */
export interface AuthSessionWithSubscription {
  userId: string
  username: string
  subscriptionPlan: SubscriptionPlan
  isSubscriptionActive: boolean
  trialDaysLeft: number | null
}

/**
 * Get session with subscription status
 */
export async function getSessionWithSubscription(): Promise<AuthSessionWithSubscription | null> {
  const session = await getSession()
  if (!session) {
    return null
  }

  const subscription = await getUserSubscription(session.userId)

  return {
    userId: session.userId,
    username: session.username,
    subscriptionPlan: subscription.plan,
    isSubscriptionActive: subscription.isActive,
    trialDaysLeft: subscription.trialDaysLeft,
  }
}

/**
 * Check if user has active subscription
 */
export async function checkSubscription(userId: string): Promise<SubscriptionStatus> {
  return getUserSubscription(userId)
}

/**
 * Require active subscription or redirect to pricing
 */
export async function requireSubscription(userId: string, redirectPath = '/pricing'): Promise<void> {
  const subscription = await getUserSubscription(userId)

  if (!subscription.isActive) {
    logger.info(`User ${userId} has no active subscription, redirecting to ${redirectPath}`)
    redirect(redirectPath)
  }
}
