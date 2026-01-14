/**
 * Utility to check if AI interpretation is globally enabled
 * based on environment variables (Feature Flags).
 */

export function isAIGloballyEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_AI_INTERPRETATION === 'true'
}
