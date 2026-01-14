'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Mail, KeyRound, AlertCircle, CheckCircle } from 'lucide-react'
import { getUserProfile, updateUserProfile, type UserProfileData } from '@/actions/user'
import { requestEmailChange, getPendingEmailChange, cancelPendingEmailChange } from '@/actions/email'
import { changePassword, createPassword } from '@/actions/auth'
import { clientLogger } from '@/lib/logging/client'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Crown, Infinity as InfinityIcon, Clock, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DeleteAccountDialog } from './DeleteAccountDialog'

// Subscription card component with checkmark for paid users
function SubscriptionCard() {
  // Use query with forceSync for accurate billing data
  const { data, isLoading } = useQuery({
    queryKey: ['subscription-settings'],
    queryFn: async () => {
      const response = await fetch('/api/subscription/status?forceSync=true')
      if (!response.ok) throw new Error('Failed to fetch')
      return response.json() as Promise<{
        plan: string
        isActive: boolean
        trialDaysLeft: number | null
        subscriptionId?: string
        subscriptionEndsAt?: string
      }>
    },
    staleTime: 0, // Always fresh on settings page
  })

  const handleManageSubscription = async () => {
    // Use Dodo Payments API to get personalized customer portal URL
    try {
      const response = await fetch('/api/dodo/portal', { method: 'POST' })
      if (response.ok) {
        const { url } = await response.json()
        window.open(url, '_blank')
      } else {
        // Fallback to generic Dodo dashboard if portal creation fails
        window.open('https://app.dodopayments.com', '_blank')
      }
    } catch {
      window.open('https://app.dodopayments.com', '_blank')
    }
  }

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardContent className="py-2">
          <div className="flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const plan = data?.plan || 'free'
  const isPaid = plan === 'pro' || plan === 'trial'
  const isLifetime = plan === 'lifetime'

  // Get badge styling based on plan
  const getBadge = () => {
    switch (plan) {
      case 'lifetime':
        return { variant: 'default' as const, label: 'Lifetime', Icon: InfinityIcon }
      case 'pro':
        return { variant: 'default' as const, label: 'Pro', Icon: Crown }
      case 'trial':
        return { variant: 'outline' as const, label: 'Trial', Icon: Clock }
      default:
        return { variant: 'outline' as const, label: 'Free', Icon: CreditCard }
    }
  }

  const { variant, label, Icon } = getBadge()

  return (
    <Card className="border-2 border-primary/30 bg-primary/5 py-4">
      <CardContent className="py-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(isPaid || isLifetime) && <CheckCircle className="h-5 w-5 text-green-500" />}
            <span className="font-medium">Subscription</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Badge className="h-8 w-24" variant={variant}>
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </Badge>
              {/* FIXME: COUNTDOWN DISABLED */}
              {/*
              {plan === 'trial' && data?.trialDaysLeft !== null && (
                <span className="text-sm text-muted-foreground">{data?.trialDaysLeft} days left</span>
              )}
              */}
            </div>
            {/* Show manage button for paid subscriptions */}
            {isPaid && (
              <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                <CreditCard className="mr-2 h-4 w-4" />
                Manage
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Email Change Dialog Component
function EmailChangeDialog({ currentEmail, onSuccess }: { currentEmail: string | null; onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await requestEmailChange(newEmail)
      if (result.error) {
        setError(result.error)
      } else {
        toast.success('Verification email sent! Please check your inbox.')
        setOpen(false)
        setNewEmail('')
        onSuccess()
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="mr-2 h-4 w-4" />
          Change Email
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Email Address</DialogTitle>
          <DialogDescription>
            Enter your new email address. We&apos;ll send a verification link to confirm the change.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {currentEmail && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Current Email</Label>
                <p className="text-sm">{currentEmail}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email Address</Label>
              <Input
                id="newEmail"
                type="email"
                placeholder="new@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !newEmail}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Verification'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Password Change/Create Dialog Component
// Shows "Create Password" for OAuth users, "Change Password" for users with existing password
function PasswordChangeDialog({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const isCreateMode = !hasPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Call appropriate action based on mode
      const result = isCreateMode
        ? await createPassword(newPassword)
        : await changePassword(currentPassword, newPassword)

      if (result.error) {
        setError(result.error)
      } else {
        toast.success(isCreateMode ? 'Password created successfully!' : 'Password changed successfully!')
        setOpen(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="mr-2 h-4 w-4" />
          {isCreateMode ? 'Create Password' : 'Change Password'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isCreateMode ? 'Create Password' : 'Change Password'}</DialogTitle>
          <DialogDescription>
            {isCreateMode
              ? 'Set a password to also login with your username and password.'
              : 'Enter your current password and choose a new one.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Only show current password field for users who already have a password */}
            {!isCreateMode && (
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="newPassword">{isCreateMode ? 'Password' : 'New Password'}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, number, and special character.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (!isCreateMode && !currentPassword) || !newPassword || !confirmPassword}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isCreateMode ? 'Creating...' : 'Changing...'}
                </>
              ) : isCreateMode ? (
                'Create Password'
              ) : (
                'Change Password'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Pending Email Change Banner
function PendingEmailBanner({ pendingEmail, onCancel }: { pendingEmail: string; onCancel: () => void }) {
  const [isCancelling, setIsCancelling] = useState(false)

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      const result = await cancelPendingEmailChange()
      if (result.success) {
        toast.success('Email change cancelled.')
        onCancel()
      } else {
        toast.error(result.error || 'Failed to cancel.')
      }
    } catch {
      toast.error('An error occurred.')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-sm font-medium">Email change pending verification</p>
          <p className="text-xs text-muted-foreground">
            Waiting for you to verify: <strong>{pendingEmail}</strong>
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isCancelling}>
        {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      </Button>
    </div>
  )
}

const profileSchema = z.object({
  firstName: z.string().max(50, 'First name too long').optional(),
  lastName: z.string().max(50, 'Last name too long').optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export function AccountSettingsPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<UserProfileData | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  })

  const loadData = async () => {
    try {
      const [profileData, pendingData] = await Promise.all([getUserProfile(), getPendingEmailChange()])
      if (profileData) {
        setUser(profileData)
        form.reset({
          firstName: profileData.firstName || '',
          lastName: profileData.lastName || '',
        })
      }
      if (pendingData) {
        setPendingEmail(pendingData.pendingEmail)
      } else {
        setPendingEmail(null)
      }
    } catch (error) {
      clientLogger.error('Failed to load profile:', error)
      toast.error('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(data: ProfileFormValues) {
    setSaving(true)
    try {
      const result = await updateUserProfile(data)
      if (result.success) {
        toast.success('Profile updated successfully')
      } else {
        toast.error(result.error || 'Failed to update profile')
      }
    } catch (error) {
      clientLogger.error('Failed to update profile:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>
          <p className="text-muted-foreground">Manage your personal information and account details.</p>
        </div>
      </div>

      {/* NOTE: DODO PAYMENTS - Subscription Section - Prominent at top */}
      <SubscriptionCard />

      {/* Pending Email Change Banner */}
      {pendingEmail && <PendingEmailBanner pendingEmail={pendingEmail} onCancel={loadData} />}

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your account profile details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={user?.username || ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Username cannot be changed.</p>
              </div>

              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="flex items-center gap-2">
                  <Input value={user?.email || 'Not set'} disabled className="bg-muted" />
                  <EmailChangeDialog currentEmail={user?.email || null} onSuccess={loadData} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" {...form.register('firstName')} disabled={saving} />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" {...form.register('lastName')} disabled={saving} />
                {form.formState.errors.lastName && (
                  <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !form.formState.isDirty}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your account security settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-muted-foreground">
                {user?.hasPassword
                  ? 'Change your account password.'
                  : 'Create a password to also login with username/password.'}
              </p>
            </div>
            <PasswordChangeDialog hasPassword={user?.hasPassword ?? true} />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions. Proceed with caution.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
            </div>
            <DeleteAccountDialog />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
