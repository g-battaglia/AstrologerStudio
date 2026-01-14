'use client'

/**
 * Delete Account Dialog Component
 *
 * Multi-step confirmation dialog for account deletion:
 * 1. Warning about data loss
 * 2. Subscription check (if applicable)
 * 3. Final confirmation with text input
 *
 * @module components/settings/DeleteAccountDialog
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2, AlertTriangle, Trash2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { requestAccountDeletion } from '@/actions/account-deletion'
import { useSubscription } from '@/lib/subscription/hooks'
import { isDodoPaymentsEnabled } from '@/lib/subscription/config'

type Step = 'warning' | 'subscription' | 'confirm' | 'success'

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('warning')
  const [subscriptionAcknowledged, setSubscriptionAcknowledged] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get subscription status
  const billingEnabled = isDodoPaymentsEnabled()
  const { data: subscription, isLoading: isSubscriptionLoading } = useSubscription()
  const hasActiveSubscription = billingEnabled && subscription?.plan && subscription.plan !== 'free'

  const resetDialog = () => {
    setStep('warning')
    setSubscriptionAcknowledged(false)
    setConfirmText('')
    setIsSubmitting(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setTimeout(resetDialog, 200)
    }
  }

  const handleContinueFromWarning = () => {
    if (hasActiveSubscription) {
      setStep('subscription')
    } else {
      setStep('confirm')
    }
  }

  const handleContinueFromSubscription = () => {
    setStep('confirm')
  }

  const handleRequestDeletion = async () => {
    if (confirmText !== 'DELETE') return

    setIsSubmitting(true)

    try {
      const result = await requestAccountDeletion()

      if (result.error) {
        toast.error(result.error)
        setIsSubmitting(false)
      } else {
        setStep('success')
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 'warning':
        return (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="rounded-full bg-destructive/10 p-3">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">Delete Your Account?</DialogTitle>
              <DialogDescription className="text-center">
                This action is permanent and cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive mb-3">
                  The following data will be permanently deleted:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    Your profile and account settings
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    All saved subjects and birth charts
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    All saved calculations and interpretations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    Chart preferences and customizations
                  </li>
                </ul>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleContinueFromWarning} className="w-full sm:w-auto">
                Continue
              </Button>
            </DialogFooter>
          </>
        )

      case 'subscription':
        return (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="rounded-full bg-amber-500/10 p-3">
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">Active Subscription</DialogTitle>
              <DialogDescription className="text-center">
                You have an active subscription that will be cancelled.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                  Your current plan: <span className="capitalize">{subscription?.plan}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  If you delete your account, your subscription will be cancelled immediately. You will not be charged
                  again, but no refunds will be issued for the current billing period.
                </p>
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="acknowledge-subscription"
                  checked={subscriptionAcknowledged}
                  onCheckedChange={(checked) => setSubscriptionAcknowledged(checked === true)}
                />
                <Label htmlFor="acknowledge-subscription" className="text-sm leading-relaxed cursor-pointer">
                  I understand that my subscription will be cancelled immediately and I will lose access to all premium
                  features.
                </Label>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setStep('warning')} className="w-full sm:w-auto">
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleContinueFromSubscription}
                disabled={!subscriptionAcknowledged}
                className="w-full sm:w-auto"
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )

      case 'confirm':
        return (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="rounded-full bg-destructive/10 p-3">
                  <Trash2 className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">Final Confirmation</DialogTitle>
              <DialogDescription className="text-center">
                Type <strong>DELETE</strong> to confirm account deletion.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="confirm-delete">Type DELETE to confirm</Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="DELETE"
                  className="font-mono"
                  autoComplete="off"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                A confirmation email will be sent to your registered email address. You must click the link in the email
                to complete the deletion.
              </p>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setStep(hasActiveSubscription ? 'subscription' : 'warning')}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleRequestDeletion}
                disabled={confirmText !== 'DELETE' || isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Request Deletion'
                )}
              </Button>
            </DialogFooter>
          </>
        )

      case 'success':
        return (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="rounded-full bg-green-500/10 p-3">
                  <Mail className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">Check Your Email</DialogTitle>
              <DialogDescription className="text-center">
                We&apos;ve sent a confirmation email to your registered email address.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg border bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Click the link in the email to complete your account deletion. The link will expire in{' '}
                  <strong>1 hour</strong>.
                </p>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                If you don&apos;t see the email, check your spam folder.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="w-full">
                Close
              </Button>
            </DialogFooter>
          </>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Delete My Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {isSubscriptionLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          renderStep()
        )}
      </DialogContent>
    </Dialog>
  )
}
