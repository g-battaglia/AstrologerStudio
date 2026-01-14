import { NextResponse } from 'next/server'
import { isGoogleOAuthEnabled, getGoogleAuthUrl } from '@/lib/security/oauth'

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow by redirecting to Google consent screen
 */
export async function GET(): Promise<NextResponse> {
  // Check if OAuth is enabled
  if (!isGoogleOAuthEnabled()) {
    return NextResponse.json({ error: 'Google OAuth is not enabled' }, { status: 403 })
  }

  try {
    const authUrl = await getGoogleAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.json({ error: 'Failed to initiate Google OAuth' }, { status: 500 })
  }
}
