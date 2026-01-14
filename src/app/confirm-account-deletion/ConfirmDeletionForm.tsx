'use client'

/**
 * Confirm Account Deletion Form
 *
 * Final confirmation page after user clicks the email link.
 * Shows account info and requires explicit confirmation to delete.
 *
 * @module app/confirm-account-deletion/ConfirmDeletionForm
 */

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validateDeletionToken, verifyAccountDeletion } from '@/actions/account-deletion'
import Link from 'next/link'
import { AlertTriangle, CheckCircle, Loader2, XCircle, Trash2, ArrowLeft } from 'lucide-react'

export default function ConfirmDeletionForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    async function validate() {
      if (!token) {
        setValidationError('No confirmation token provided.')
        setIsValidating(false)
        return
      }

      const result = await validateDeletionToken(token)
      setIsValid(result.valid)
      setValidationError(result.error || null)
      setUsername(result.username || null)
      setIsValidating(false)
    }

    validate()
  }, [token])

  const handleDelete = async () => {
    if (!token) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const result = await verifyAccountDeletion(token)

      if (result.error) {
        setDeleteError(result.error)
        setIsDeleting(false)
      } else {
        setIsDeleted(true)
        // Redirect to home after a delay
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    } catch {
      setDeleteError('An unexpected error occurred. Please try again.')
      setIsDeleting(false)
    }
  }

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Validating confirmation link...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invalid token
  if (!isValid || validationError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>{validationError}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/settings">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Successfully deleted
  if (isDeleted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle>Account Deleted</CardTitle>
            <CardDescription>Your account has been permanently deleted. Redirecting to home page...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/">Go to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Confirmation step
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-xl">Final Confirmation</CardTitle>
          <CardDescription>
            {username ? (
              <>
                You are about to permanently delete the account for <strong>{username}</strong>.
              </>
            ) : (
              'You are about to permanently delete your account.'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive font-medium">
              This is your last chance to cancel. Once you click the button below, all your data will be permanently
              deleted and cannot be recovered.
            </p>
          </div>

          {deleteError && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{deleteError}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="w-full">
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting Account...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Yes, Delete My Account
                </>
              )}
            </Button>

            <Button variant="outline" asChild disabled={isDeleting} className="w-full">
              <Link href="/settings">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
