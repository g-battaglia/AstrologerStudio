'use client'

/**
 * NOTE: DODO PAYMENTS - This component handles checkout success and subscription sync
 *
 * Checkout Success Handler
 *
 * Client component that handles the checkout=success parameter.
 * Forces a sync with billing API and shows a success toast.
 */
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function CheckoutSuccessHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const checkoutSuccess = searchParams.get('checkout')
    if (checkoutSuccess === 'success' && !isProcessing) {
      setIsProcessing(true)

      // Call API to force sync with billing provider (this updates the database)
      const syncAndRefresh = async () => {
        try {
          // Force sync subscription status from Dodo Payments API
          await fetch('/api/subscription/status?forceSync=true')

          // Invalidate subscription cache so it fetches fresh data
          queryClient.invalidateQueries({ queryKey: ['subscription'] })
          queryClient.invalidateQueries({ queryKey: ['subscription-status'] })

          toast.success('Payment successful! Your subscription is now active.')
        } catch (error) {
          console.error('Failed to sync subscription:', error)
          toast.error('Payment received, but sync failed. Please refresh the page.')
        }

        // Remove the checkout param from URL
        const params = new URLSearchParams(searchParams)
        params.delete('checkout')
        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
        router.replace(newUrl)
      }

      syncAndRefresh()
    }
  }, [searchParams, queryClient, pathname, router, isProcessing])

  return null
}
