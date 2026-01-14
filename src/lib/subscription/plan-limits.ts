// NOTE: DODO PAYMENTS
/**
 * @fileoverview Plan Limits Configuration
 *
 * Defines resource limits for each subscription plan.
 *
 * ## Environment Variables
 * - `FREE_MAX_AI_DAILY` - Daily AI generations for free users (default: 5)
 * - `PRO_MAX_AI_DAILY` - Daily AI generations for pro users (default: 20)
 *
 * @module lib/subscription/plan-limits
 */

import { isDodoPaymentsEnabled, type SubscriptionPlan } from './config'

// ─────────────────────────────────────────────────────────────────────────────
// Environment-based limits
// ─────────────────────────────────────────────────────────────────────────────

const FREE_MAX_AI_DAILY = parseInt(process.env.FREE_MAX_AI_DAILY || '5', 10)
const PRO_MAX_AI_DAILY = parseInt(process.env.PRO_MAX_AI_DAILY || '20', 10)

/**
 * Chart types available in the application
 */
export type ChartType = 'natal' | 'transits' | 'synastry' | 'composite' | 'solar-return' | 'lunar-return' | 'timeline'

/**
 * All available chart types
 */
export const ALL_CHART_TYPES: ChartType[] = [
  'natal',
  'transits',
  'synastry',
  'composite',
  'solar-return',
  'lunar-return',
  'timeline',
]

/**
 * Limits configuration for each plan
 */
export interface PlanLimits {
  maxSubjects: number
  allowedChartTypes: ChartType[] | 'all'
  maxAIGenerations: number // Daily limit
}

/**
 * Plan limits by subscription type.
 */
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxSubjects: 5,
    allowedChartTypes: ['natal'],
    maxAIGenerations: FREE_MAX_AI_DAILY,
  },
  trial: {
    maxSubjects: Infinity,
    allowedChartTypes: 'all',
    maxAIGenerations: PRO_MAX_AI_DAILY,
  },
  pro: {
    maxSubjects: Infinity,
    allowedChartTypes: 'all',
    maxAIGenerations: PRO_MAX_AI_DAILY,
  },
  lifetime: {
    maxSubjects: Infinity,
    allowedChartTypes: 'all',
    maxAIGenerations: PRO_MAX_AI_DAILY,
  },
}

/**
 * Get limits for a subscription plan
 */
export function getPlanLimits(plan: SubscriptionPlan | string | null | undefined): PlanLimits {
  // If Dodo Payments is disabled, everyone gets lifetime limits
  if (!isDodoPaymentsEnabled()) {
    return PLAN_LIMITS.lifetime
  }

  if (!plan || !(plan in PLAN_LIMITS)) {
    return PLAN_LIMITS.free
  }
  return PLAN_LIMITS[plan as SubscriptionPlan]
}

/**
 * Check if a plan can access a specific chart type
 */
export function canAccessChartType(plan: SubscriptionPlan | string | null | undefined, chartType: ChartType): boolean {
  const limits = getPlanLimits(plan)
  if (limits.allowedChartTypes === 'all') return true
  return limits.allowedChartTypes.includes(chartType)
}

/**
 * Check if subject creation is allowed (under limit)
 */
export function canCreateSubject(plan: SubscriptionPlan | string | null | undefined, currentCount: number): boolean {
  const limits = getPlanLimits(plan)
  return currentCount < limits.maxSubjects
}

/**
 * Check if AI generation is allowed (under limit)
 */
export function canGenerateAI(plan: SubscriptionPlan | string | null | undefined, totalGenerations: number): boolean {
  const limits = getPlanLimits(plan)
  return totalGenerations < limits.maxAIGenerations
}

/**
 * Get remaining subjects allowed
 */
export function getRemainingSubjects(plan: SubscriptionPlan | string | null | undefined, currentCount: number): number {
  const limits = getPlanLimits(plan)
  if (limits.maxSubjects === Infinity) return Infinity
  return Math.max(0, limits.maxSubjects - currentCount)
}

/**
 * Get remaining AI generations allowed
 */
export function getRemainingAIGenerations(
  plan: SubscriptionPlan | string | null | undefined,
  totalGenerations: number,
): number {
  const limits = getPlanLimits(plan)
  if (limits.maxAIGenerations === Infinity) return Infinity
  return Math.max(0, limits.maxAIGenerations - totalGenerations)
}
