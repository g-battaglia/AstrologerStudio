'use client'

// NOTE: DODO PAYMENTS
import { useQuery } from '@tanstack/react-query'
import { isDodoPaymentsEnabled, type SubscriptionStatus } from './config'

const DEFAULT_LIFETIME_STATUS: SubscriptionStatus = {
  plan: 'lifetime',
  isActive: true,
  trialDaysLeft: null,
}

const DEFAULT_FREE_STATUS: SubscriptionStatus = {
  plan: 'free',
  isActive: true, // Free is active
  trialDaysLeft: null,
}

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      if (!isDodoPaymentsEnabled()) {
        return DEFAULT_LIFETIME_STATUS
      }

      try {
        const response = await fetch('/api/subscription/status')
        if (!response.ok) {
          throw new Error('Failed to fetch subscription status')
        }
        return response.json() as Promise<SubscriptionStatus>
      } catch (error) {
        console.error('Subscription check failed:', error)
        // Fallback to free if API fails (safe default)
        return DEFAULT_FREE_STATUS
      }
    },
    // Don't refetch too often
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  })
}
