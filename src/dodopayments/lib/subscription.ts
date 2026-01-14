// NOTE: DODO PAYMENTS
/**
 * Subscription Service
 *
 * Business logic for subscription management with hybrid sync pattern.
 *
 * ARCHITECTURE: Hybrid Pattern
 * - Primary: Database cache for fast reads
 * - Secondary: Dodo Payments API for periodic verification
 * - Sync: Lazy background sync when data is stale (>24h)
 *
 * @module dodopayments/lib/subscription
 */
import 'server-only'
import { prisma } from '@/lib/db/prisma'
import { isDodoPaymentsEnabled, planGrantsAccess, mapDodoStatusToPlan, type SubscriptionPlan } from './config'
import { logger } from '@/lib/logging/server'

/**
 * How long before subscription data is considered stale (24 hours)
 */
const SYNC_STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000

/**
 * Subscription status returned by getUserSubscription
 */
export interface SubscriptionStatus {
  plan: SubscriptionPlan
  isActive: boolean
  subscriptionId: string | null
  customerId: string | null
  trialEndsAt: Date | null
  subscriptionEndsAt: Date | null
  trialDaysLeft: number | null
  /** Whether data is stale and sync is recommended */
  isStale?: boolean
}

/**
 * Get user's subscription status with lazy sync
 *
 * @param userId - The user ID to check
 * @param options - Options for subscription check
 * @returns Subscription status object
 */
export async function getUserSubscription(
  userId: string,
  options: { forceSync?: boolean } = {}
): Promise<SubscriptionStatus> {
  logger.info(`[DodoPayments/Subscription] getUserSubscription called: userId=${userId}`)

  // If Dodo Payments is disabled, fallback to free plan
  if (!isDodoPaymentsEnabled()) {
    logger.warn(`⚠️ Dodo Payments disabled → using free plan for user ${userId}`)

    return {
      plan: 'free',
      isActive: planGrantsAccess('free'),
      subscriptionId: null,
      customerId: null,
      trialEndsAt: null,
      subscriptionEndsAt: null,
      trialDaysLeft: null,
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      subscriptionPlan: true,
      subscriptionId: true,
      customerId: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
      lastSubscriptionSync: true,
    },
  })

  if (!user) {
    logger.warn(`[DodoPayments/Subscription] User not found: ${userId}`)
    return {
      plan: 'free',
      isActive: false,
      subscriptionId: null,
      customerId: null,
      trialEndsAt: null,
      subscriptionEndsAt: null,
      trialDaysLeft: null,
    }
  }

  // Check if data is stale
  const now = Date.now()
  const lastSync = user.lastSubscriptionSync?.getTime() || 0
  const isStale = now - lastSync > SYNC_STALE_THRESHOLD_MS

  // Force sync or lazy sync if stale
  if (options.forceSync) {
    // Blocking sync - wait for result
    if (user.email || user.customerId) {
      await syncSubscriptionFromDodo(userId, user.email || '', user.customerId)
      // Re-fetch user after sync
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          subscriptionPlan: true,
          subscriptionId: true,
          customerId: true,
          trialEndsAt: true,
          subscriptionEndsAt: true,
        },
      })
      if (updatedUser) {
        return buildSubscriptionStatus(updatedUser, false)
      }
    }
  } else if (isStale && (user.email || user.customerId)) {
    // Non-blocking lazy sync - fire and forget
    logger.info(`[DodoPayments/Subscription] Data stale for user ${userId}, triggering background sync`)
    syncSubscriptionFromDodo(userId, user.email || '', user.customerId).catch((error) => {
      logger.error(`[DodoPayments/Subscription] Background sync failed for user ${userId}:`, error)
    })
  }

  logger.info(
    `[DodoPayments/Subscription] User DB data: plan=${user.subscriptionPlan}, customerId=${user.customerId}, subscriptionId=${user.subscriptionId}`
  )

  return buildSubscriptionStatus(user, isStale)
}

/**
 * Build subscription status from user data
 */
function buildSubscriptionStatus(
  user: {
    subscriptionPlan: string
    subscriptionId: string | null
    customerId: string | null
    trialEndsAt: Date | null
    subscriptionEndsAt: Date | null
  },
  isStale: boolean
): SubscriptionStatus {
  const plan = (user.subscriptionPlan || 'free') as SubscriptionPlan

  // Calculate trial days left
  let trialDaysLeft: number | null = null
  let effectivePlan = plan

  if (plan === 'trial' && user.trialEndsAt) {
    const now = new Date()
    const trialEnd = new Date(user.trialEndsAt)
    const diffMs = trialEnd.getTime() - now.getTime()
    trialDaysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

    // Trial expired
    if (trialDaysLeft <= 0) {
      effectivePlan = 'free'
      trialDaysLeft = 0
    }
  }

  return {
    plan: effectivePlan,
    isActive: planGrantsAccess(effectivePlan),
    subscriptionId: user.subscriptionId,
    customerId: user.customerId,
    trialEndsAt: user.trialEndsAt,
    subscriptionEndsAt: user.subscriptionEndsAt,
    trialDaysLeft,
    isStale,
  }
}

/**
 * Sync subscription data from Dodo Payments API
 *
 * @param userId - User ID to sync
 * @param email - User email for lookup (fallback)
 * @param customerId - Dodo customer ID for direct lookup (preferred)
 * @returns true if sync was successful
 */
export async function syncSubscriptionFromDodo(
  userId: string,
  email: string,
  customerId?: string | null
): Promise<boolean> {
  logger.info(`[DodoPayments/Subscription] Syncing subscription for user ${userId}`)

  try {
    const { getSubscription, getActiveSubscriptionByEmail } = await import('./server')

    let subscriptionData = null

    // Try to get by subscription ID first if we have one
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionId: true },
    })

    if (user?.subscriptionId) {
      logger.info(`[DodoPayments/Subscription] Looking up subscription by ID: ${user.subscriptionId}`)
      subscriptionData = await getSubscription(user.subscriptionId)
    }

    // Fall back to email lookup
    if (!subscriptionData && email) {
      logger.info(`[DodoPayments/Subscription] Falling back to email lookup: ${email}`)
      subscriptionData = await getActiveSubscriptionByEmail(email)
    }

    if (subscriptionData) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionPlan: subscriptionData.plan,
          subscriptionId: subscriptionData.subscriptionId,
          customerId: subscriptionData.customerId,
          trialEndsAt: subscriptionData.trialEnd,
          subscriptionEndsAt: subscriptionData.currentPeriodEnd,
          lastSubscriptionSync: new Date(),
        },
      })
      logger.info(`[DodoPayments/Subscription] Synced user ${userId}: plan=${subscriptionData.plan}`)
      return true
    } else {
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionPlan: true, trialEndsAt: true, customerId: true, subscriptionId: true },
      })

      const hasDodoIdentifiers = !!existingUser?.customerId || !!existingUser?.subscriptionId
      const shouldDowngrade =
        existingUser?.subscriptionPlan !== 'lifetime' && !existingUser?.trialEndsAt && !hasDodoIdentifiers

      await prisma.user.update({
        where: { id: userId },
        data: {
          lastSubscriptionSync: new Date(),
          ...(shouldDowngrade ? { subscriptionPlan: 'free' } : {}),
        },
      })

      if (shouldDowngrade) {
        logger.info(`[DodoPayments/Subscription] No subscription found for user ${userId}, downgraded to free`)
      } else {
        logger.info(
          `[DodoPayments/Subscription] No subscription found for user ${userId}, keeping plan: ${existingUser?.subscriptionPlan}`
        )
      }
      return true
    }
  } catch (error) {
    logger.error(`[DodoPayments/Subscription] Failed to sync for user ${userId}:`, error)
    return false
  }
}

/**
 * Force sync subscription and return fresh data
 */
export async function getFreshSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  return getUserSubscription(userId, { forceSync: true })
}

/**
 * Check if user has an active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const status = await getUserSubscription(userId)
  return status.isActive
}

/**
 * Update user subscription from Dodo Payments webhook
 */
export async function updateUserSubscription(params: {
  customerId: string
  subscriptionId: string
  plan: SubscriptionPlan
  trialEndsAt?: Date | null
  subscriptionEndsAt?: Date | null
}): Promise<boolean> {
  const { customerId, subscriptionId, plan, trialEndsAt, subscriptionEndsAt } = params

  try {
    let user = await prisma.user.findFirst({
      where: { customerId },
    })

    if (!user) {
      user = await prisma.user.findFirst({
        where: { subscriptionId },
      })
    }

    if (!user) {
      logger.error(`No user found for customerId: ${customerId} or subscriptionId: ${subscriptionId}`)
      return false
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        customerId,
        subscriptionId,
        subscriptionPlan: plan,
        trialEndsAt,
        subscriptionEndsAt,
        lastSubscriptionSync: new Date(),
      },
    })

    logger.info(`[DodoPayments] Updated subscription for user ${user.id}: ${plan}`)
    return true
  } catch (error) {
    logger.error('[DodoPayments] Failed to update user subscription:', error)
    return false
  }
}

/**
 * Link Dodo Payments customer to user (called after checkout)
 */
export async function linkDodoCustomer(userId: string, customerId: string): Promise<void> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(userId)) {
    logger.error(`Invalid userId format in linkDodoCustomer: ${userId}`)
    return
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        customerId,
        lastSubscriptionSync: new Date(),
      },
    })
    logger.info(`[DodoPayments] Linked customer ${customerId} to user ${userId}`)
  } catch (error) {
    logger.error(`[DodoPayments] Failed to link customer ${customerId} to user ${userId}:`, error)
  }
}

/**
 * Set user to lifetime plan (for admins/self-hosted)
 */
export async function setLifetimePlan(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: 'lifetime',
      lastSubscriptionSync: new Date(),
    },
  })
}
