'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { adminLogin } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ReCAPTCHA from 'react-google-recaptcha'
import { Loader2, Lock, User, AlertCircle } from 'lucide-react'

// Check if reCAPTCHA is disabled (for self-hosted environments)
const isRecaptchaDisabled = process.env.NEXT_PUBLIC_DISABLE_RECAPTCHA === 'true'

/**
 * Admin Login Form with reCAPTCHA
 */
export function AdminLoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)

      // Get reCAPTCHA token (skip if disabled)
      if (!isRecaptchaDisabled) {
        const recaptchaToken = recaptchaRef.current?.getValue()
        if (!recaptchaToken) {
          setError('Please complete the reCAPTCHA verification')
          setIsLoading(false)
          return
        }
        formData.append('recaptchaToken', recaptchaToken)
      } else {
        // Send a dummy token when reCAPTCHA is disabled
        formData.append('recaptchaToken', 'disabled')
      }

      const result = await adminLogin(formData)

      if (result.success) {
        router.push('/admin')
        router.refresh()
      } else {
        setError(result.error)
        recaptchaRef.current?.reset()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
      recaptchaRef.current?.reset()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="username" className="text-slate-200">
          Username
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
            placeholder="Enter your username"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-200">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
            placeholder="Enter your password"
          />
        </div>
      </div>

      {!isRecaptchaDisabled && (
        <div className="flex justify-center">
          <ReCAPTCHA ref={recaptchaRef} sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''} theme="dark" />
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-5"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign in to Admin Panel'
        )}
      </Button>
    </form>
  )
}
