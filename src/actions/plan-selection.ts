'use server'

/**
 * NOTE: DODO PAYMENTS - This file handles plan selection during onboarding
 */

/**
 * Plan Selection Actions
 *
 * Server actions for handling plan selection during onboarding.
 *
 * @module actions/plan-selection
 */

import { prisma } from '@/lib/db/prisma'
import { getSession, deleteSession } from '@/lib/security/session'
import { logger } from '@/lib/logging/server'
import { revalidatePath } from 'next/cache'

/**
 * Result type for plan selection actions
 */
type ActionResult = {
  error?: string
  success?: boolean
}

/**
 * Select Free plan and complete onboarding
 *
 * Marks the user's onboarding as complete while keeping them on the free plan.
 * Users can upgrade to Pro later from the pricing page.
 *
 * @returns Success status or error
 */
export async function selectFreePlan(): Promise<ActionResult> {
  try {
    const session = await getSession()

    if (!session?.userId) {
      return { error: 'You must be logged in to select a plan.' }
    }

    // Check if user exists first to provide better error
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true },
    })

    if (!user) {
      await deleteSession()
      return { error: 'User account not found. Logging you out...' }
    }

    // Update user to mark onboarding as complete
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        onboardingCompleted: true,
        subscriptionPlan: 'free',
      },
    })

    logger.info(`User ${session.userId} selected free plan and completed onboarding`)

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    logger.error('Error selecting free plan:', error)

    // Handle Prisma record not found error specifically
    const prismaError = error as { code?: string }
    if (prismaError.code === 'P2025') {
      await deleteSession()
      return { error: 'User account not found. Logging you out...' }
    }

    return { error: 'An error occurred. Please try again.' }
  }
}

/**
 * Check if user has completed onboarding
 *
 * @returns Whether onboarding is completed
 */
export async function checkOnboardingStatus(): Promise<{ completed: boolean; userId?: string }> {
  try {
    const session = await getSession()

    if (!session?.userId) {
      return { completed: false }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { onboardingCompleted: true },
    })

    if (!user) {
      await deleteSession()
      return { completed: false }
    }

    return {
      completed: user?.onboardingCompleted ?? false,
      userId: session.userId,
    }
  } catch (error) {
    logger.error('Error checking onboarding status:', error)
    return { completed: false }
  }
}

/**
 * Mark onboarding as complete (called after Dodo Payments checkout success)
 *
 * @returns Success status or error
 */
export async function completeOnboarding(): Promise<ActionResult> {
  try {
    const session = await getSession()

    if (!session?.userId) {
      return { error: 'You must be logged in.' }
    }

    // Check if user exists first
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true },
    })

    if (!user) {
      await deleteSession()
      return { error: 'User account not found. Logging you out...' }
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { onboardingCompleted: true },
    })

    logger.info(`User ${session.userId} completed onboarding`)

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    logger.error('Error completing onboarding:', error)

    const prismaError = error as { code?: string }
    if (prismaError.code === 'P2025') {
      await deleteSession()
      return { error: 'User account not found. Logging you out...' }
    }

    return { error: 'An error occurred. Please try again.' }
  }
}
