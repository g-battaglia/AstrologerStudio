'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/types/auth'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { ReCaptcha, isRecaptchaDisabled } from '@/components/ui/ReCaptcha'
import { useRef, useCallback } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

// Check if Google OAuth is enabled via environment variable
const isGoogleOAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH === 'true'

// OAuth error messages
const oauthErrorMessages: Record<string, string> = {
  oauth_disabled: 'Google sign-in is not available',
  oauth_cancelled: 'Google sign-in was cancelled',
  oauth_failed: 'Google sign-in failed. Please try again.',
  email_not_verified: 'Please verify your Google email first',
}

export default function LoginForm() {
  const { login, loginError, isLoginPending } = useAuth()
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  const searchParams = useSearchParams()
  const oauthError = searchParams.get('error')

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      recaptchaToken: isRecaptchaDisabled ? 'disabled' : '',
    },
  })

  const recaptchaToken = form.watch('recaptchaToken')

  const handleRecaptchaChange = useCallback(
    (token: string | null) => {
      form.setValue('recaptchaToken', token || '', { shouldValidate: true })
    },
    [form],
  )

  const handleRecaptchaExpired = useCallback(() => {
    form.setValue('recaptchaToken', '', { shouldValidate: true })
  }, [form])

  const onSubmit = (data: LoginInput) => {
    login(data, {
      onError: () => {
        // Reset reCAPTCHA on error so user can try again
        recaptchaRef.current?.reset()
        form.setValue('recaptchaToken', '')
      },
    })
  }

  const handleGoogleSignIn = () => {
    // Redirect to Google OAuth endpoint
    window.location.href = '/api/auth/google'
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
        <p className="text-sm text-muted-foreground">Enter your credentials to access Astrologer Studio</p>
      </div>

      <div className="grid gap-6">
        {/* OAuth Error Display */}
        {oauthError && oauthErrorMessages[oauthError] && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {oauthErrorMessages[oauthError]}
          </div>
        )}

        {/* Google Sign-In Button - Only shown when enabled */}
        {isGoogleOAuthEnabled && (
          <>
            <Button type="button" variant="outline" className="w-full gap-2" onClick={handleGoogleSignIn}>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
          </>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your username" {...field} autoComplete="username" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary">
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      {...field}
                      autoComplete="current-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* reCAPTCHA - only show if there's no error to avoid clutter, or always show? */}
            <div className="py-2 flex justify-center">
              <ReCaptcha ref={recaptchaRef} onChange={handleRecaptchaChange} onExpired={handleRecaptchaExpired} />
            </div>
            {form.formState.errors.recaptchaToken && (
              <p className="mt-2 text-center text-sm text-destructive">
                {form.formState.errors.recaptchaToken.message}
              </p>
            )}

            {loginError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {loginError.message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoginPending || (!isRecaptchaDisabled && !recaptchaToken)}
            >
              {isLoginPending ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
