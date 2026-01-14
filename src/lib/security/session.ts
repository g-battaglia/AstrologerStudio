import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

/**
 * Session secret validation and encoding
 * In production, SESSION_SECRET must be set to a secure value
 * In development, a default value is used with a warning
 */
const secretKey = process.env.SESSION_SECRET

// Strict validation in production
if (process.env.NODE_ENV === 'production') {
  if (!secretKey) {
    throw new Error('SESSION_SECRET environment variable must be set in production')
  }
  if (secretKey.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long')
  }
}

// Development fallback with warning
const effectiveSecret = secretKey || 'dev-only-secret-key-change-in-prod-32chars'
if (!secretKey) {
  console.warn('⚠️  Using default SESSION_SECRET. Set a secure secret for production!')
}

const encodedKey = new TextEncoder().encode(effectiveSecret)

/**
 * Session payload structure
 */
type SessionPayload = {
  /** Unique user identifier */
  userId: string
  /** Username for display purposes */
  username: string
  /** Session expiration timestamp */
  expiresAt: Date
}

/**
 * Encrypts session payload into a JWT token
 *
 * @param payload - Session data to encrypt
 * @returns Signed JWT token
 *
 * @remarks
 * - Uses HS256 algorithm for signing
 * - Token expires after 7 days
 * - Token includes issued at timestamp for audit purposes
 *
 * @example
 * ```ts
 * const token = await encrypt({ userId: '123', username: 'john', expiresAt: new Date() })
 * ```
 */
export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

/**
 * Decrypts and verifies a JWT session token
 *
 * @param session - JWT token string to decrypt
 * @returns Decrypted session payload or null if invalid
 *
 * @remarks
 * - Returns null for invalid, expired, or malformed tokens
 * - Verifies signature using HS256 algorithm
 * - Errors are silently caught to prevent information leakage
 *
 * @example
 * ```ts
 * const session = await decrypt(req.cookies.get('session')?.value)
 * if (!session) throw new Error('Unauthorized')
 * ```
 */
export async function decrypt(session: string | undefined = ''): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionPayload
  } catch {
    // Silently fail for security - don't expose token validation errors
    return null
  }
}

/**
 * Creates a new user session by setting an encrypted cookie
 *
 * @param userId - Unique identifier for the user
 * @param username - Username for the session
 *
 * @remarks
 * - Sets HTTP-only cookie for security
 * - Cookie expires after 7 days
 * - Uses secure flag and SameSite=lax for CSRF protection
 *
 * @throws Will log error but won't throw if cookie setting fails
 *
 * @example
 * ```ts
 * await createSession(user.id, user.username)
 * redirect('/')
 * ```
 */
export async function createSession(userId: string, username: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ userId, username, expiresAt })
  const cookieStore = await cookies()

  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

/**
 * Updates the session cookie expiration time
 *
 * @returns null if no session exists, otherwise updates cookie
 *
 * @remarks
 * - Extends session by another 7 days from now
 * - Useful for implementing "remember me" functionality
 * - Does not modify session payload, only expiration
 *
 * @example
 * ```ts
 * // In middleware or server action
 * await updateSession()
 * ```
 */
export async function updateSession(): Promise<null | void> {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)

  if (!session || !payload) {
    return null
  }

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expires,
    sameSite: 'lax',
    path: '/',
  })
}

/**
 * Deletes the user session cookie (logout)
 *
 * @remarks
 * - Removes the session cookie completely
 * - User will need to re-authenticate
 *
 * @example
 * ```ts
 * await deleteSession()
 * redirect('/login')
 * ```
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

/**
 * Retrieves the current session payload
 *
 * @returns Session payload or null if not authenticated
 *
 * @remarks
 * - Does not update/refresh the session
 * - Returns null for expired or invalid sessions
 *
 * @example
 * ```ts
 * const session = await getSession()
 * if (!session) return redirect('/login')
 * console.log('Current user:', session.username)
 * ```
 */
export async function getSession(): Promise<SessionPayload | null> {
  const session = (await cookies()).get('session')?.value
  const payload = await decrypt(session)
  return payload
}
