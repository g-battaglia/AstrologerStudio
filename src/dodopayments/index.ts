// NOTE: DODO PAYMENTS
/**
 * Dodo Payments Module Entry Point
 *
 * This is the main entry point for the Dodo Payments billing module.
 * All exports from this module can be used by the main application.
 *
 * IMPORTANT: This entire folder can be deleted to disable Dodo Payments.
 * The app will fall back to "lifetime" access for all users.
 *
 * @module dodopayments
 */

// Re-export from lib
export { isDodoPaymentsEnabled, dodoPaymentsConfig, planGrantsAccess, mapDodoStatusToPlan } from './lib/config'
export type { SubscriptionPlan, DodoSubscriptionStatus } from './lib/config'
export {
  getUserSubscription,
  hasActiveSubscription,
  updateUserSubscription,
  syncSubscriptionFromDodo,
  getFreshSubscriptionStatus,
  linkDodoCustomer,
  setLifetimePlan,
} from './lib/subscription'
export type { SubscriptionStatus } from './lib/subscription'
export {
  requireSubscription,
  getSessionWithSubscription,
  checkSubscription,
  PaymentRequiredError,
} from './lib/access'
export type { AuthSessionWithSubscription } from './lib/access'

// Re-export components
export { PricingCard } from './components/PricingCard'
