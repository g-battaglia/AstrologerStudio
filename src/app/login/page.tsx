import { Suspense } from 'react'
import type { Metadata } from 'next'
import { AuthPage } from '@/components/auth/AuthPage'
import { getSession } from '@/lib/security/session'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to access your astrology charts and subjects',
}

/**
 * Public login page
 *
 * If user is already authenticated, redirect to dashboard
 */
export default async function Page(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await getSession()
  const searchParams = await props.searchParams
  let redirectUrl = typeof searchParams.redirect === 'string' ? searchParams.redirect : '/dashboard'

  // Security: Robust Open Redirect Protection
  // 1. Must start with /
  // 2. Must NOT start with // (protocol relative)
  // 3. Must NOT start with /\ (backslashes can be interpreted as path separators)
  // 4. Must NOT contain CRLF characters (header injection protection)
  const isValidRedirect =
    redirectUrl.startsWith('/') &&
    !redirectUrl.startsWith('//') &&
    !redirectUrl.startsWith('/\\') &&
    !/[\r\n]/.test(redirectUrl)

  if (!isValidRedirect) {
    redirectUrl = '/dashboard'
  }

  if (session) {
    redirect(redirectUrl)
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthPage defaultTab="login" />
    </Suspense>
  )
}
