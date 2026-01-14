// NOTE: DODO PAYMENTS
/**
 * Public Pricing Page
 *
 * Displays subscription pricing for all users (authenticated or not).
 * Uses the public (legal) layout without app sidebar.
 *
 * IMPORTANT: This page verifies subscription status directly with Dodo Payments API
 * to ensure accuracy, then syncs the result to the database.
 *
 * @module app/(legal)/pricing/page
 */
import { isDodoPaymentsEnabled } from '@/lib/subscription/config'
import { getSession } from '@/lib/security/session'
import { prisma } from '@/lib/db/prisma'

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ onboarding?: string }> }) {
  const session = await getSession()
  const params = await searchParams
  const isOnboarding = params.onboarding === 'true'

  // Get user email for subscription verification
  let userEmail: string | null = null
  let userName: string | null = null
  let plan: string | undefined = undefined

  if (session?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, username: true, subscriptionPlan: true, customerId: true },
    })
    userEmail = user?.email || null
    userName = user?.username || null
    plan = user?.subscriptionPlan || undefined
  }

  // MODE 1: Dodo Payments module is installed - verify directly with API
  if (isDodoPaymentsEnabled()) {
    try {
      // Dynamic imports - will work when dodopayments module exists
      const { PricingCard } = await import('@/dodopayments/components/PricingCard')
      const { syncSubscriptionFromDodo } = await import('@/dodopayments/lib/subscription')
      const { getActiveSubscriptionByEmail } = await import('@/dodopayments/lib/server')

      // Verify subscription directly with Dodo Payments API using user's email
      let hasPaidPlan = false
      if (userEmail && session?.userId) {
        const dodoSubscription = await getActiveSubscriptionByEmail(userEmail)

        if (dodoSubscription) {
          // Sync subscription data to database
          await syncSubscriptionFromDodo(session.userId, userEmail)
          plan = dodoSubscription.plan
          // Only consider it a paid plan if it's actually pro or trial (not free/canceled)
          hasPaidPlan = dodoSubscription.plan === 'pro' || dodoSubscription.plan === 'trial'
        } else {
          // No subscription found at all - sync this fact to database
          await syncSubscriptionFromDodo(session.userId, userEmail)
          hasPaidPlan = plan === 'lifetime' // Only lifetime is valid without Dodo subscription
        }
      } else {
        // Not logged in or no email - check DB plan only
        hasPaidPlan = plan === 'pro' || plan === 'lifetime' || plan === 'trial'
      }

      if (hasPaidPlan && session) {
        return (
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-8">Your Subscription</h1>
            <div className="rounded-lg border bg-card p-6">
              <p className="text-lg font-medium">
                You have an active <span className="text-primary capitalize">{plan}</span> subscription.
              </p>
            </div>
          </div>
        )
      }

      // Show pricing for users without subscription (authenticated or not)
      return (
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
            <p className="text-muted-foreground">Unlock full access to Astrologer Studio</p>
          </div>
          <PricingCard
            userId={session?.userId}
            userEmail={userEmail || undefined}
            userName={userName || undefined}
            isOnboarding={isOnboarding}
          />
        </div>
      )
    } catch (error) {
      // Dodo Payments module import failed - show error
      console.error('Failed to load Dodo Payments components:', error)
      return (
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Configuration Error</h1>
          <p className="text-muted-foreground">
            Dodo Payments is enabled but components could not be loaded. Please check your installation.
          </p>
        </div>
      )
    }
  }

  // MODE 2: Dodo Payments module NOT installed - show simple status
  const hasPaidPlan = plan === 'pro' || plan === 'lifetime' || plan === 'trial'
  if (hasPaidPlan) {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-8">Your Subscription</h1>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-lg font-medium">
            You have an active <span className="text-primary capitalize">{plan}</span> subscription.
          </p>
        </div>
      </div>
    )
  }

  // No payments and no subscription - show coming soon
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-4">Pricing</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  )
}
