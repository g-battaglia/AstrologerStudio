'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { ReCaptcha, isRecaptchaDisabled } from '@/components/ui/ReCaptcha'
import ReCAPTCHA from 'react-google-recaptcha'
import { registerUser } from '@/actions/registration'
import Link from 'next/link'
import { ArrowLeft, Mail, ArrowRight } from 'lucide-react'

const isEmailRegistrationEnabled = process.env.NEXT_PUBLIC_ENABLE_EMAIL_REGISTRATION === 'true'

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    acceptTerms: z.literal(true, {
      message: 'You must accept the Terms of Service and Privacy Policy',
    }),
    recaptchaToken: z.string().min(1, 'reCAPTCHA verification required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterInput = z.infer<typeof registerSchema>

export default function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const recaptchaRef = useRef<ReCAPTCHA>(null)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: undefined as unknown as true,
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

  const handleNextStep = async () => {
    // Validate step 1 fields before proceeding
    const isValid = await form.trigger(['username', 'email'])
    if (isValid) {
      setStep(2)
    }
  }

  const handlePrevStep = () => {
    setStep(1)
  }

  const onSubmit = async (data: RegisterInput) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await registerUser({
        username: data.username,
        email: data.email,
        password: data.password,
        recaptchaToken: data.recaptchaToken,
      })

      if (result.error) {
        setError(result.error)
        recaptchaRef.current?.reset()
        form.setValue('recaptchaToken', '')
      } else {
        setRegisteredEmail(data.email)
        setSuccess(true)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
      recaptchaRef.current?.reset()
      form.setValue('recaptchaToken', '')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Registration disabled
  if (!isEmailRegistrationEnabled) {
    return (
      <div className="space-y-6 text-center py-8">
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold tracking-tight">Registration Disabled</h3>
          <p className="text-sm text-muted-foreground">Email registration is currently not available.</p>
        </div>
        <Button asChild variant="secondary" className="w-full">
          <Link href="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Link>
        </Button>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold tracking-tight">Check Your Email</h3>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a verification link to <strong>{registeredEmail}</strong>
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Please check your email and click the verification link to activate your account. The link will expire in 24
          hours.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Link>
        </Button>
      </div>
    )
  }

  // Registration form
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create Account</h1>
        <p className="text-sm text-muted-foreground">
          {step === 1 ? 'Enter your details to get started.' : 'Choose a secure password.'}
        </p>
      </div>

      <div className="grid gap-6">
        {/* Google Sign-In Button - Only shown when enabled and on step 1 */}
        {step === 1 && process.env.NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH === 'true' && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                window.location.href = '/api/auth/google'
              }}
            >
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
              Sign up with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>
          </>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Step 1: Username and Email */}
            {step === 1 && (
              <>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Choose a username" {...field} autoComplete="username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your@email.com" {...field} autoComplete="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="button" className="w-full" onClick={handleNextStep}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}

            {/* Step 2: Password */}
            {step === 2 && (
              <>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Min. 8 characters, uppercase, lowercase, number, special"
                          {...field}
                          autoComplete="new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm password" {...field} autoComplete="new-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <label className="flex items-start gap-2 rounded-md border p-3 cursor-pointer">
                        <FormControl>
                          <Checkbox
                            className="mt-0.5"
                            checked={field.value === true}
                            onCheckedChange={(checked) => field.onChange(checked === true ? true : undefined)}
                          />
                        </FormControl>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          I agree to the{' '}
                          <Link
                            href="/legal?tab=terms"
                            className="underline text-foreground hover:text-primary"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Terms of Service
                          </Link>{' '}
                          and{' '}
                          <Link
                            href="/legal?tab=privacy"
                            className="underline text-foreground hover:text-primary"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Privacy Policy
                          </Link>
                        </span>
                      </label>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="py-2 flex justify-center">
                  <ReCaptcha ref={recaptchaRef} onChange={handleRecaptchaChange} onExpired={handleRecaptchaExpired} />
                </div>
                {form.formState.errors.recaptchaToken && (
                  <p className="mt-2 text-center text-sm text-destructive">
                    {form.formState.errors.recaptchaToken.message}
                  </p>
                )}

                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={handlePrevStep}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isSubmitting || (!isRecaptchaDisabled && !recaptchaToken)}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Account'}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Form>
      </div>
    </div>
  )
}
