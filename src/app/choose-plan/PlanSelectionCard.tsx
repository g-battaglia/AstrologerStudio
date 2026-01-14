'use client'

// NOTE: DODO PAYMENTS
/**
 * Plan Selection Card Component
 *
 * Displays Free and Pro plan options side by side for onboarding.
 * Uses Dodo Payments for checkout when billing is enabled.
 *
 * @module app/choose-plan/PlanSelectionCard
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Loader2, Sparkles, Crown } from 'lucide-react'
import { selectFreePlan, completeOnboarding } from '@/actions/plan-selection'
import { isDodoPaymentsEnabled } from '@/lib/subscription/config'
import { dodoPaymentsConfig } from '@/dodopayments/lib/config'
import { PRICING_CONFIG } from '@/lib/config/pricing'

interface PlanSelectionCardProps {
  userId: string
  email?: string
}

export function PlanSelectionCard({ userId, email }: PlanSelectionCardProps) {
  const router = useRouter()
  const [isSelectingFree, setIsSelectingFree] = useState(false)
  const [isSelectingPro, setIsSelectingPro] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectFree = async () => {
    setIsSelectingFree(true)
    setError(null)

    const result = await selectFreePlan()

    if (result.error) {
      setError(result.error)
      setIsSelectingFree(false)
      // Automatically refresh if logged out
      if (result.error.includes('Logging you out')) {
        setTimeout(() => window.location.reload(), 2000)
      }
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        {/* Free Plan Card - order-2 on mobile to show Pro first */}
        <Card className="relative border-2 border-muted hover:border-muted-foreground/50 transition-colors flex flex-col order-2 md:order-1">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">Free</CardTitle>
            <CardDescription>Get started with the basics</CardDescription>
            <div className="pt-2">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>

          <CardContent className="grow">
            <ul className="space-y-3">
              {PRICING_CONFIG.features.free.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter className="mt-auto">
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleSelectFree}
              disabled={isSelectingFree || isSelectingPro}
            >
              {isSelectingFree ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Selecting...
                </>
              ) : (
                'Continue with Free'
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Pro Plan Card - order-1 on mobile to show first */}
        <Card className="relative overflow-hidden border-2 border-primary/50 bg-linear-to-b from-background to-primary/5 flex flex-col order-1 md:order-2">
          {/* Decorative gradient */}
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary via-purple-500 to-pink-500" />

          {/* Popular badge */}
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Recommended
            </span>
          </div>

          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Pro</CardTitle>
            <CardDescription>Full access to all features</CardDescription>
            <div className="pt-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl text-muted-foreground line-through decoration-2">$10</span>
                <span className="text-3xl font-bold">$5</span>
              </div>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-primary font-medium">15-day free trial</p>
          </CardHeader>

          <CardContent className="grow">
            <ul className="space-y-3">
              {PRICING_CONFIG.features.pro.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter className="mt-auto">
            <ProCheckoutButton
              userId={userId}
              email={email}
              isDisabled={isSelectingFree || isSelectingPro}
              onLoading={setIsSelectingPro}
              onError={setError}
            />
          </CardFooter>
        </Card>

        {error && (
          <div className="col-span-full rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Pro checkout button that redirects to Dodo Payments
 */
function ProCheckoutButton({
  userId,
  email,
  isDisabled,
  onLoading,
  onError,
}: {
  userId: string
  email?: string
  isDisabled: boolean
  onLoading: (loading: boolean) => void
  onError: (error: string | null) => void
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckoutReady, setIsCheckoutReady] = useState(false)

  // Initialize Dodo checkout SDK
  useEffect(() => {
    if (!isDodoPaymentsEnabled()) {
      setIsCheckoutReady(true) // No checkout needed
      return
    }

    const initCheckout = async () => {
      try {
        const { DodoPayments } = await import('dodopayments-checkout')
        DodoPayments.Initialize({
          mode: dodoPaymentsConfig.mode,
          displayType: 'overlay',
          onEvent: (event: { event_type: string }) => {
            if (event.event_type === 'checkout.closed' || event.event_type === 'checkout.error') {
              setIsLoading(false)
              onLoading(false)
            }
          },
        })
        setIsCheckoutReady(true)
      } catch (error) {
        console.error('Failed to initialize checkout:', error)
        setIsCheckoutReady(true) // Continue anyway
      }
    }
    initCheckout()
  }, [onLoading])

  const handleClick = async () => {
    setIsLoading(true)
    onLoading(true)
    onError(null)

    // Check if Dodo Payments is enabled
    if (!isDodoPaymentsEnabled()) {
      // If billing is not enabled, treat as free plan with lifetime access
      const result = await completeOnboarding()
      if (result.error) {
        onError(result.error)
        setIsLoading(false)
        onLoading(false)
        // Automatically refresh if logged out
        if (result.error.includes('Logging you out')) {
          setTimeout(() => window.location.reload(), 2000)
        }
      } else {
        router.push('/dashboard')
      }
      return
    }

    try {
      // Create checkout session via API
      const response = await fetch('/api/dodo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: dodoPaymentsConfig.productId,
          userId,
          email,
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
      console.error('Failed to open checkout:', error)
      onError('Failed to open checkout. Please try again.')
      setIsLoading(false)
      onLoading(false)
    }
  }

  return (
    <Button className="w-full" size="lg" onClick={handleClick} disabled={isDisabled || isLoading || !isCheckoutReady}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        'Start Free Trial'
      )}
    </Button>
  )
}
