'use client'

// NOTE: DODO PAYMENTS
/**
 * Pricing Card Component
 *
 * Displays subscription pricing and handles checkout with Dodo Payments overlay.
 *
 * @module dodopayments/components/PricingCard
 */
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Sparkles, Loader2 } from 'lucide-react'
import { dodoPaymentsConfig } from '../lib/config'

import { PRICING_CONFIG } from '@/lib/config/pricing'

interface PricingCardProps {
  userId?: string
  userEmail?: string
  userName?: string
  isOnboarding?: boolean
}

export function PricingCard({ userId, userEmail, userName, isOnboarding: _isOnboarding }: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Dynamically import and initialize Dodo Payments checkout
    const initCheckout = async () => {
      try {
        const { DodoPayments } = await import('dodopayments-checkout')

        DodoPayments.Initialize({
          mode: dodoPaymentsConfig.mode,
          displayType: 'overlay',
          onEvent: (event: { event_type: string; data?: { message?: string } }) => {
            switch (event.event_type) {
              case 'checkout.opened':
                setIsLoading(false)
                break
              case 'checkout.closed':
                setIsLoading(false)
                break
              case 'checkout.error':
                setIsLoading(false)
                console.error('[DodoPayments] Checkout error:', event.data?.message)
                break
            }
          },
        })

        setIsInitialized(true)
      } catch (error) {
        console.error('[DodoPayments] Failed to initialize checkout:', error)
      }
    }

    initCheckout()
  }, [])

  const handleCheckout = async () => {
    if (!isInitialized) {
      console.error('[DodoPayments] Checkout not initialized')
      return
    }

    setIsLoading(true)

    try {
      // Create checkout session via server action
      const response = await fetch('/api/dodo/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: dodoPaymentsConfig.productId,
          userId,
          email: userEmail,
          name: userName,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { checkoutUrl } = await response.json()

      if (!checkoutUrl) {
        throw new Error('No checkout URL returned')
      }

      // Open overlay checkout
      const { DodoPayments } = await import('dodopayments-checkout')
      await DodoPayments.Checkout.open({ checkoutUrl })
    } catch (error) {
      console.error('[DodoPayments] Failed to start checkout:', error)
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto border-2 border-primary/20 bg-linear-to-b from-card to-card/80">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Pro Plan</CardTitle>
        <CardDescription>Full access to Astrologer Studio</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pricing */}
        {/* Pricing */}
        <div className="text-center my-6">
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl text-muted-foreground line-through decoration-2">
              ${PRICING_CONFIG.plans.pro.price}
            </span>
            <span className="text-5xl font-bold gradient-text">${PRICING_CONFIG.plans.pro.launchPrice}</span>
          </div>
          <span className="text-muted-foreground">/month</span>
          <p className="mt-2 text-sm text-primary font-medium">
            {PRICING_CONFIG.plans.pro.launchDiscountPercentage}% off — Launch price!
          </p>
        </div>

        {/* Features */}

        <ul className="space-y-2">
          {PRICING_CONFIG.features.pro.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button onClick={handleCheckout} disabled={isLoading || !isInitialized} className="w-full" size="lg">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Subscribe Now'
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
