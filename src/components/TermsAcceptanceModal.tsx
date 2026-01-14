'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { acceptTerms } from '@/actions/acceptTerms'
import { FileText, Shield, Loader2 } from 'lucide-react'

interface TermsAcceptanceModalProps {
  needsTermsAcceptance: boolean
  needsPrivacyAcceptance: boolean
}

/**
 * Modal overlay that requires users to accept Terms of Service and Privacy Policy.
 * Shown when user hasn't accepted current versions of legal documents.
 * App is visible but blocked in the background until acceptance.
 */
export function TermsAcceptanceModal({ needsTermsAcceptance, needsPrivacyAcceptance }: TermsAcceptanceModalProps) {
  const [termsChecked, setTermsChecked] = useState(false)
  const [privacyChecked, setPrivacyChecked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine if modal should be open
  const isOpen = needsTermsAcceptance || needsPrivacyAcceptance

  // Check if all required acceptances are checked
  const canSubmit = (!needsTermsAcceptance || termsChecked) && (!needsPrivacyAcceptance || privacyChecked)

  const handleAccept = async () => {
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await acceptTerms()
      if (!result.success) {
        setError(result.error || 'Failed to save acceptance. Please try again.')
      }
      // On success, the page will revalidate and the modal will close automatically
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={true}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {needsTermsAcceptance && needsPrivacyAcceptance
              ? 'Terms & Privacy Policy'
              : needsTermsAcceptance
                ? 'Terms of Service Update'
                : 'Privacy Policy Update'}
          </DialogTitle>
          <DialogDescription>
            {needsTermsAcceptance && needsPrivacyAcceptance
              ? 'Please review and accept our Terms of Service and Privacy Policy to continue using the app.'
              : 'We have updated our policies. Please review and accept to continue.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {needsTermsAcceptance && (
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <Checkbox
                id="terms"
                checked={termsChecked}
                onCheckedChange={(checked) => setTermsChecked(checked === true)}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Terms of Service
                </div>
                <p className="text-xs text-muted-foreground">
                  I have read and agree to the{' '}
                  <Link
                    href="/legal?tab=terms"
                    className="underline hover:text-foreground"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms of Service
                  </Link>
                </p>
              </div>
            </label>
          )}

          {needsPrivacyAcceptance && (
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <Checkbox
                id="privacy"
                checked={privacyChecked}
                onCheckedChange={(checked) => setPrivacyChecked(checked === true)}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Privacy Policy
                </div>
                <p className="text-xs text-muted-foreground">
                  I have read and agree to the{' '}
                  <Link
                    href="/legal?tab=privacy"
                    className="underline hover:text-foreground"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </label>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleAccept} disabled={!canSubmit || isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Accept & Continue'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
