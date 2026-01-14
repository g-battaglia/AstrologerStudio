// NOTE: DODO PAYMENTS
/**
 * Dodo Payments Webhook Route
 *
 * Re-exports the webhook handler from the dodopayments module.
 * This file exists in the app router to expose the webhook endpoint.
 *
 * @module api/dodo/webhook
 */
export { POST } from '@/dodopayments/api/webhook/route'
