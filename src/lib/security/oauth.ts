import 'server-only'

import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

/**
 * Google OAuth configuration
 * Uses environment variables for credentials and feature toggling
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

/**
 * Check if Google OAuth is enabled via environment variable
 * This is a public env var so it can be checked on client side
 */
export function isGoogleOAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH === 'true'
}

/**
 * Validate that Google OAuth credentials are configured
 */
function validateGoogleCredentials(): void {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.')
  }
}

/**
 * Get the OAuth redirect URI from configured APP_URL
 * Uses NEXT_PUBLIC_APP_URL to prevent host header injection
 */
export async function getRedirectUri(): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL must be configured')
  }

  return `${appUrl}/api/auth/google/callback`
}

/**
 * Generate Google OAuth consent URL with state parameter for CSRF protection
 * @returns The URL to redirect users to for Google sign-in
 */
export async function getGoogleAuthUrl(): Promise<string> {
  validateGoogleCredentials()

  const redirectUri = await getRedirectUri()

  // Generate secure state parameter for CSRF protection
  const state = randomBytes(32).toString('hex')

  // Store state in httpOnly cookie
  const cookieStore = await cookies()
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: state, // Add state parameter
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * Google OAuth tokens response
 */
interface GoogleTokens {
  access_token: string
  id_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

/**
 * Exchange authorization code for tokens
 * @param code - The authorization code from Google callback
 * @returns Google OAuth tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  validateGoogleCredentials()

  const redirectUri = await getRedirectUri()

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for tokens: ${error}`)
  }

  return response.json()
}

/**
 * Google user profile from API
 */
export interface GoogleUserInfo {
  id: string // Google's unique user ID (sub claim)
  email: string
  verified_email: boolean
  name: string
  given_name: string
  family_name?: string
  picture?: string
}

/**
 * Fetch user info from Google using access token
 * @param accessToken - Valid Google access token
 * @returns Google user profile
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch Google user info: ${error}`)
  }

  return response.json()
}
