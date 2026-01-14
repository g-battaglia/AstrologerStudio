'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReCaptcha, isRecaptchaDisabled } from '@/components/ui/ReCaptcha'
import ReCAPTCHA from 'react-google-recaptcha'
import { requestPasswordReset } from '@/actions/auth'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'

const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  recaptchaToken: z.string().min(1, 'reCAPTCHA verification required'),
})

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const recaptchaRef = useRef<ReCAPTCHA>(null)

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      identifier: '',
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

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await requestPasswordReset(data.identifier, data.recaptchaToken)

      if (result.error) {
        setError(result.error)
        recaptchaRef.current?.reset()
        form.setValue('recaptchaToken', '')
      } else {
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

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
              If an account exists with that email or username, we&apos;ve sent password reset instructions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              The link will expire in 1 hour. If you don&apos;t see the email, check your spam folder.
            </p>
            <div className="flex justify-center">
              <Button asChild variant="outline">
                <Link href="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Forgot Password?</CardTitle>
          <CardDescription className="text-center">
            Enter your email or username and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email or Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your email or username" {...field} autoComplete="username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="py-2">
                <ReCaptcha ref={recaptchaRef} onChange={handleRecaptchaChange} onExpired={handleRecaptchaExpired} />
                {form.formState.errors.recaptchaToken && (
                  <p className="mt-2 text-center text-sm text-destructive">
                    {form.formState.errors.recaptchaToken.message}
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || (!isRecaptchaDisabled && !recaptchaToken)}
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
                  <ArrowLeft className="mr-1 inline h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
