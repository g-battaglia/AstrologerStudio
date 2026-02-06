/**
 * Unit Tests for Admin Session Management
 *
 * Tests the admin session management functions including JWT encryption/decryption,
 * cookie handling, and database session tracking for admin authentication.
 *
 * @vitest-environment node
 * @module src/lib/security/admin-session
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SignJWT, jwtVerify } from 'jose'

// Test constants
const TEST_SECRET = 'test-admin-secret-key-minimum-32-chars!!'
const TEST_ADMIN_ID = 'admin-123'
const TEST_USERNAME = 'testadmin'
const TEST_ROLE = 'admin' as const
const TEST_SESSION_ID = 'session-456'

// Mock cookies and headers from next/headers - must be hoisted
const mockCookieGet = vi.fn()
const mockCookieSet = vi.fn()
const mockCookieDelete = vi.fn()
const mockHeadersGet = vi.fn()

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: mockCookieGet,
    set: mockCookieSet,
    delete: mockCookieDelete,
  })),
  headers: vi.fn(() => ({
    get: mockHeadersGet,
  })),
}))

// Mock prisma
const mockAdminSessionCreate = vi.fn()
const mockAdminSessionFindUnique = vi.fn()
const mockAdminSessionUpdate = vi.fn()
const mockAdminSessionUpdateMany = vi.fn()
const mockAdminAuditLogCreate = vi.fn()
const mockAdminUserUpdate = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    adminSession: {
      create: (...args: unknown[]) => mockAdminSessionCreate(...args),
      findUnique: (...args: unknown[]) => mockAdminSessionFindUnique(...args),
      update: (...args: unknown[]) => mockAdminSessionUpdate(...args),
      updateMany: (...args: unknown[]) => mockAdminSessionUpdateMany(...args),
    },
    adminAuditLog: {
      create: (...args: unknown[]) => mockAdminAuditLogCreate(...args),
    },
    adminUser: {
      update: (...args: unknown[]) => mockAdminUserUpdate(...args),
    },
  },
}))

// Helper to create a valid test admin JWT
async function createValidAdminJwt(
  payload: {
    adminId: string
    username: string
    role: 'admin' | 'superadmin'
    sessionId: string
    expiresAt: Date
  },
  secret: string = TEST_SECRET,
): Promise<string> {
  const encodedKey = new TextEncoder().encode(secret)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(encodedKey)
}

// Helper to create an expired admin JWT
async function createExpiredAdminJwt(
  payload: {
    adminId: string
    username: string
    role: 'admin' | 'superadmin'
    sessionId: string
    expiresAt: Date
  },
  secret: string = TEST_SECRET,
): Promise<string> {
  const encodedKey = new TextEncoder().encode(secret)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('-1s') // Already expired
    .sign(encodedKey)
}

describe('Admin Session Management', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    // Save original value and set test secret BEFORE module import
    originalEnv = process.env.ADMIN_SESSION_SECRET
    process.env.ADMIN_SESSION_SECRET = TEST_SECRET

    // Reset modules to force re-evaluation of admin-session.ts with new env var
    vi.resetModules()

    // Reset all mocks
    mockCookieGet.mockReset()
    mockCookieSet.mockReset()
    mockCookieDelete.mockReset()
    mockHeadersGet.mockReset()
    mockAdminSessionCreate.mockReset()
    mockAdminSessionFindUnique.mockReset()
    mockAdminSessionUpdate.mockReset()
    mockAdminSessionUpdateMany.mockReset()
    mockAdminAuditLogCreate.mockReset()
    mockAdminUserUpdate.mockReset()

    // Setup default header mocks
    mockHeadersGet.mockImplementation((name: string) => {
      if (name === 'x-forwarded-for') return '127.0.0.1'
      if (name === 'user-agent') return 'test-agent'
      return null
    })
  })

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.ADMIN_SESSION_SECRET = originalEnv
    } else {
      delete process.env.ADMIN_SESSION_SECRET
    }
  })

  describe('encryptAdminSession', () => {
    /**
     * Tests for the encryptAdminSession function.
     * This function creates a signed JWT from admin session payload.
     */

    it('should return a non-empty string', async () => {
      const { encryptAdminSession } = await import('@/lib/security/admin-session')
      const payload = {
        adminId: TEST_ADMIN_ID,
        username: TEST_USERNAME,
        role: TEST_ROLE,
        sessionId: TEST_SESSION_ID,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      }

      const token = await encryptAdminSession(payload)

      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('should return a JWT with 3 segments separated by dots', async () => {
      const { encryptAdminSession } = await import('@/lib/security/admin-session')
      const payload = {
        adminId: TEST_ADMIN_ID,
        username: TEST_USERNAME,
        role: TEST_ROLE,
        sessionId: TEST_SESSION_ID,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      }

      const token = await encryptAdminSession(payload)
      const segments = token.split('.')

      expect(segments).toHaveLength(3)
      // Each segment should be non-empty base64url strings
      segments.forEach((segment) => {
        expect(segment.length).toBeGreaterThan(0)
      })
    })

    it('should create a JWT that contains the original payload when decoded', async () => {
      const { encryptAdminSession } = await import('@/lib/security/admin-session')
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000)
      const payload = {
        adminId: TEST_ADMIN_ID,
        username: TEST_USERNAME,
        role: TEST_ROLE,
        sessionId: TEST_SESSION_ID,
        expiresAt,
      }

      const token = await encryptAdminSession(payload)

      // Verify the token with jose
      const encodedKey = new TextEncoder().encode(TEST_SECRET)
      const { payload: decoded } = await jwtVerify(token, encodedKey, {
        algorithms: ['HS256'],
      })

      expect(decoded.adminId).toBe(TEST_ADMIN_ID)
      expect(decoded.username).toBe(TEST_USERNAME)
      expect(decoded.role).toBe(TEST_ROLE)
      expect(decoded.sessionId).toBe(TEST_SESSION_ID)
    })

    it('should set expiration to approximately 8 hours', async () => {
      const { encryptAdminSession } = await import('@/lib/security/admin-session')
      const payload = {
        adminId: TEST_ADMIN_ID,
        username: TEST_USERNAME,
        role: TEST_ROLE,
        sessionId: TEST_SESSION_ID,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      }

      const beforeCall = Date.now()
      const token = await encryptAdminSession(payload)
      const afterCall = Date.now()

      // Verify the token with jose to get the exp claim
      const encodedKey = new TextEncoder().encode(TEST_SECRET)
      const { payload: decoded } = await jwtVerify(token, encodedKey, {
        algorithms: ['HS256'],
      })

      const expTime = (decoded.exp as number) * 1000 // Convert to milliseconds

      // 7.9 hours in milliseconds (matching actual implementation of 8h)
      const minExpiry = beforeCall + 7.9 * 60 * 60 * 1000
      // 8.1 hours in milliseconds
      const maxExpiry = afterCall + 8.1 * 60 * 60 * 1000

      expect(expTime).toBeGreaterThanOrEqual(minExpiry)
      expect(expTime).toBeLessThanOrEqual(maxExpiry)
    })
  })

  describe('decryptAdminSession', () => {
    /**
     * Tests for the decryptAdminSession function.
     * This function verifies and decodes admin JWT tokens.
     */

    it.each([
      {
        name: 'valid token',
        getToken: async () =>
          createValidAdminJwt({
            adminId: TEST_ADMIN_ID,
            username: TEST_USERNAME,
            role: TEST_ROLE,
            sessionId: TEST_SESSION_ID,
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
          }),
        expectedResult: 'returns payload',
      },
      {
        name: 'invalid token',
        getToken: async () => 'invalid-token',
        expectedResult: 'returns null',
      },
      {
        name: 'empty string',
        getToken: async () => '',
        expectedResult: 'returns null',
      },
      {
        name: 'undefined',
        getToken: async () => undefined,
        expectedResult: 'returns null',
      },
      {
        name: 'expired token',
        getToken: async () =>
          createExpiredAdminJwt({
            adminId: TEST_ADMIN_ID,
            username: TEST_USERNAME,
            role: TEST_ROLE,
            sessionId: TEST_SESSION_ID,
            expiresAt: new Date(Date.now() - 1000),
          }),
        expectedResult: 'returns null',
      },
    ])("'$name' - '$expectedResult'", async ({ getToken, expectedResult }) => {
      const { decryptAdminSession } = await import('@/lib/security/admin-session')
      const token = await getToken()

      const result = await decryptAdminSession(token)

      if (expectedResult === 'returns payload') {
        expect(result).not.toBeNull()
        expect(result?.adminId).toBe(TEST_ADMIN_ID)
        expect(result?.username).toBe(TEST_USERNAME)
        expect(result?.role).toBe(TEST_ROLE)
        expect(result?.sessionId).toBe(TEST_SESSION_ID)
      } else {
        expect(result).toBeNull()
      }
    })
  })

  describe('createAdminSession', () => {
    /**
     * Tests for the createAdminSession function.
     * This function creates a new admin session with database tracking.
     */

    beforeEach(() => {
      // Setup default mock returns for createAdminSession
      mockAdminSessionCreate.mockResolvedValue({
        id: TEST_SESSION_ID,
        adminId: TEST_ADMIN_ID,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      })
      mockAdminAuditLogCreate.mockResolvedValue({})
      mockAdminUserUpdate.mockResolvedValue({})
    })

    it('should call cookies().set() twice (clear stale + set new)', async () => {
      const { createAdminSession } = await import('@/lib/security/admin-session')

      await createAdminSession(TEST_ADMIN_ID, TEST_USERNAME, TEST_ROLE)

      // First call clears stale cookies on path "/", second call sets the actual cookie on "/admin"
      expect(mockCookieSet).toHaveBeenCalledTimes(2)
      const secondCall = mockCookieSet.mock.calls[1]
      expect(secondCall).toBeDefined()
      expect(secondCall![0]).toBe('admin_session')
    })

    it('should set cookie with path: "/admin"', async () => {
      const { createAdminSession } = await import('@/lib/security/admin-session')

      await createAdminSession(TEST_ADMIN_ID, TEST_USERNAME, TEST_ROLE)

      // Second call is the actual session cookie (first call is stale cookie clearing)
      const secondCall = mockCookieSet.mock.calls[1]
      expect(secondCall).toBeDefined()
      const cookieOptions = secondCall![2] as Record<string, unknown>
      expect(cookieOptions.path).toBe('/admin')
    })

    it('should set cookie with sameSite: "strict"', async () => {
      const { createAdminSession } = await import('@/lib/security/admin-session')

      await createAdminSession(TEST_ADMIN_ID, TEST_USERNAME, TEST_ROLE)

      // Second call is the actual session cookie
      const secondCall = mockCookieSet.mock.calls[1]
      expect(secondCall).toBeDefined()
      const cookieOptions = secondCall![2] as Record<string, unknown>
      expect(cookieOptions.sameSite).toBe('strict')
    })

    it('should set cookie with httpOnly: true', async () => {
      const { createAdminSession } = await import('@/lib/security/admin-session')

      await createAdminSession(TEST_ADMIN_ID, TEST_USERNAME, TEST_ROLE)

      // Second call is the actual session cookie
      const secondCall = mockCookieSet.mock.calls[1]
      expect(secondCall).toBeDefined()
      const cookieOptions = secondCall![2] as Record<string, unknown>
      expect(cookieOptions.httpOnly).toBe(true)
    })

    it('should call prisma.adminSession.create with correct data', async () => {
      const { createAdminSession } = await import('@/lib/security/admin-session')

      await createAdminSession(TEST_ADMIN_ID, TEST_USERNAME, TEST_ROLE)

      expect(mockAdminSessionCreate).toHaveBeenCalledTimes(1)
      const createCall = mockAdminSessionCreate.mock.calls[0]![0] as {
        data: { adminId: string; ipAddress: string; userAgent: string; expiresAt: Date }
      }
      expect(createCall.data.adminId).toBe(TEST_ADMIN_ID)
      expect(createCall.data.ipAddress).toBe('127.0.0.1')
      expect(createCall.data.userAgent).toBe('test-agent')
      expect(createCall.data.expiresAt).toBeInstanceOf(Date)
    })

    it('should call prisma.adminAuditLog.create with action: "login"', async () => {
      const { createAdminSession } = await import('@/lib/security/admin-session')

      await createAdminSession(TEST_ADMIN_ID, TEST_USERNAME, TEST_ROLE)

      expect(mockAdminAuditLogCreate).toHaveBeenCalledTimes(1)
      const auditCall = mockAdminAuditLogCreate.mock.calls[0]![0] as {
        data: { adminId: string; action: string; ipAddress: string }
      }
      expect(auditCall.data.adminId).toBe(TEST_ADMIN_ID)
      expect(auditCall.data.action).toBe('login')
      expect(auditCall.data.ipAddress).toBe('127.0.0.1')
    })

    it('should set the second argument as a valid JWT token', async () => {
      const { createAdminSession } = await import('@/lib/security/admin-session')

      await createAdminSession(TEST_ADMIN_ID, TEST_USERNAME, TEST_ROLE)

      // Second call is the actual session cookie with JWT token
      const secondCall = mockCookieSet.mock.calls[1]
      expect(secondCall).toBeDefined()
      const token = secondCall![1] as string
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })

    it('should set cookie expires within 8 hours range', async () => {
      const { createAdminSession } = await import('@/lib/security/admin-session')

      const beforeCall = Date.now()
      await createAdminSession(TEST_ADMIN_ID, TEST_USERNAME, TEST_ROLE)
      const afterCall = Date.now()

      // Second call is the actual session cookie
      const secondCall = mockCookieSet.mock.calls[1]
      expect(secondCall).toBeDefined()
      const cookieOptions = secondCall![2] as Record<string, unknown>
      const expiresTime = new Date(cookieOptions.expires as Date).getTime()

      // 7.9 hours in milliseconds
      const minExpiry = beforeCall + 7.9 * 60 * 60 * 1000
      // 8.1 hours in milliseconds
      const maxExpiry = afterCall + 8.1 * 60 * 60 * 1000

      expect(expiresTime).toBeGreaterThanOrEqual(minExpiry)
      expect(expiresTime).toBeLessThanOrEqual(maxExpiry)
    })
  })

  describe('getAdminSession', () => {
    /**
     * Tests for the getAdminSession function.
     * This function retrieves and validates the admin session from cookies and database.
     */

    it('should return payload when valid session cookie exists and session is not revoked', async () => {
      const { getAdminSession } = await import('@/lib/security/admin-session')
      const validJwt = await createValidAdminJwt({
        adminId: TEST_ADMIN_ID,
        username: TEST_USERNAME,
        role: TEST_ROLE,
        sessionId: TEST_SESSION_ID,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      })

      mockCookieGet.mockReturnValue({ value: validJwt })
      mockAdminSessionFindUnique.mockResolvedValue({
        id: TEST_SESSION_ID,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      })

      const result = await getAdminSession()

      expect(result).not.toBeNull()
      expect(result?.adminId).toBe(TEST_ADMIN_ID)
      expect(result?.username).toBe(TEST_USERNAME)
      expect(result?.role).toBe(TEST_ROLE)
      expect(result?.sessionId).toBe(TEST_SESSION_ID)
    })

    it('should return null when session has been revoked (revokedAt is not null)', async () => {
      const { getAdminSession } = await import('@/lib/security/admin-session')
      const validJwt = await createValidAdminJwt({
        adminId: TEST_ADMIN_ID,
        username: TEST_USERNAME,
        role: TEST_ROLE,
        sessionId: TEST_SESSION_ID,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      })

      mockCookieGet.mockReturnValue({ value: validJwt })
      mockAdminSessionFindUnique.mockResolvedValue({
        id: TEST_SESSION_ID,
        revokedAt: new Date(), // Session is revoked
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      })

      const result = await getAdminSession()

      expect(result).toBeNull()
    })

    it('should return null when session is not found in database', async () => {
      const { getAdminSession } = await import('@/lib/security/admin-session')
      const validJwt = await createValidAdminJwt({
        adminId: TEST_ADMIN_ID,
        username: TEST_USERNAME,
        role: TEST_ROLE,
        sessionId: TEST_SESSION_ID,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      })

      mockCookieGet.mockReturnValue({ value: validJwt })
      mockAdminSessionFindUnique.mockResolvedValue(null)

      const result = await getAdminSession()

      expect(result).toBeNull()
    })

    it('should return null when session cookie does not exist', async () => {
      const { getAdminSession } = await import('@/lib/security/admin-session')

      mockCookieGet.mockReturnValue(undefined)

      const result = await getAdminSession()

      expect(result).toBeNull()
    })

    it('should return null when session cookie has invalid token', async () => {
      const { getAdminSession } = await import('@/lib/security/admin-session')

      mockCookieGet.mockReturnValue({ value: 'invalid-token' })

      const result = await getAdminSession()

      expect(result).toBeNull()
    })

    it('should call cookies().get() with "admin_session"', async () => {
      const { getAdminSession } = await import('@/lib/security/admin-session')

      mockCookieGet.mockReturnValue(undefined)

      await getAdminSession()

      expect(mockCookieGet).toHaveBeenCalledWith('admin_session')
    })

    it('should return null when session has expired in database', async () => {
      const { getAdminSession } = await import('@/lib/security/admin-session')
      const validJwt = await createValidAdminJwt({
        adminId: TEST_ADMIN_ID,
        username: TEST_USERNAME,
        role: TEST_ROLE,
        sessionId: TEST_SESSION_ID,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      })

      mockCookieGet.mockReturnValue({ value: validJwt })
      mockAdminSessionFindUnique.mockResolvedValue({
        id: TEST_SESSION_ID,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000), // Already expired
      })

      const result = await getAdminSession()

      expect(result).toBeNull()
    })
  })

  describe('deleteAdminSession', () => {
    /**
     * Tests for the deleteAdminSession function.
     * This function removes the admin session cookie and revokes it in database.
     */

    it('should call cookies().delete() with "admin_session"', async () => {
      const { deleteAdminSession } = await import('@/lib/security/admin-session')

      mockCookieGet.mockReturnValue(undefined)

      await deleteAdminSession()

      expect(mockCookieDelete).toHaveBeenCalledTimes(1)
      expect(mockCookieDelete).toHaveBeenCalledWith('admin_session')
    })

    it('should revoke session in database when valid session exists', async () => {
      const { deleteAdminSession } = await import('@/lib/security/admin-session')
      const validJwt = await createValidAdminJwt({
        adminId: TEST_ADMIN_ID,
        username: TEST_USERNAME,
        role: TEST_ROLE,
        sessionId: TEST_SESSION_ID,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      })

      mockCookieGet.mockReturnValue({ value: validJwt })
      mockAdminSessionUpdate.mockResolvedValue({})
      mockAdminAuditLogCreate.mockResolvedValue({})

      await deleteAdminSession()

      expect(mockAdminSessionUpdate).toHaveBeenCalledWith({
        where: { id: TEST_SESSION_ID },
        data: { revokedAt: expect.any(Date) },
      })
    })

    it('should log logout action when valid session exists', async () => {
      const { deleteAdminSession } = await import('@/lib/security/admin-session')
      const validJwt = await createValidAdminJwt({
        adminId: TEST_ADMIN_ID,
        username: TEST_USERNAME,
        role: TEST_ROLE,
        sessionId: TEST_SESSION_ID,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      })

      mockCookieGet.mockReturnValue({ value: validJwt })
      mockAdminSessionUpdate.mockResolvedValue({})
      mockAdminAuditLogCreate.mockResolvedValue({})

      await deleteAdminSession()

      expect(mockAdminAuditLogCreate).toHaveBeenCalledWith({
        data: {
          adminId: TEST_ADMIN_ID,
          action: 'logout',
          ipAddress: '127.0.0.1',
        },
      })
    })

    it('should not throw when session update fails (already deleted)', async () => {
      const { deleteAdminSession } = await import('@/lib/security/admin-session')
      const validJwt = await createValidAdminJwt({
        adminId: TEST_ADMIN_ID,
        username: TEST_USERNAME,
        role: TEST_ROLE,
        sessionId: TEST_SESSION_ID,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      })

      mockCookieGet.mockReturnValue({ value: validJwt })
      mockAdminSessionUpdate.mockRejectedValue(new Error('Session not found'))
      mockAdminAuditLogCreate.mockResolvedValue({})

      // Should not throw
      await expect(deleteAdminSession()).resolves.not.toThrow()
      expect(mockCookieDelete).toHaveBeenCalledWith('admin_session')
    })

    it('should not throw when audit log fails', async () => {
      const { deleteAdminSession } = await import('@/lib/security/admin-session')
      const validJwt = await createValidAdminJwt({
        adminId: TEST_ADMIN_ID,
        username: TEST_USERNAME,
        role: TEST_ROLE,
        sessionId: TEST_SESSION_ID,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      })

      mockCookieGet.mockReturnValue({ value: validJwt })
      mockAdminSessionUpdate.mockResolvedValue({})
      mockAdminAuditLogCreate.mockRejectedValue(new Error('Log failed'))

      // Should not throw - audit log is best effort
      await expect(deleteAdminSession()).resolves.not.toThrow()
      expect(mockCookieDelete).toHaveBeenCalledWith('admin_session')
    })
  })

  describe('revokeAllAdminSessions', () => {
    /**
     * Tests for the revokeAllAdminSessions function.
     * This function revokes all active sessions for a given admin user.
     */

    it('should revoke all active sessions for given admin', async () => {
      const { revokeAllAdminSessions } = await import('@/lib/security/admin-session')
      mockAdminSessionUpdateMany.mockResolvedValue({ count: 3 })

      await revokeAllAdminSessions(TEST_ADMIN_ID)

      expect(mockAdminSessionUpdateMany).toHaveBeenCalledWith({
        where: {
          adminId: TEST_ADMIN_ID,
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      })
    })

    it('should not throw when no active sessions exist', async () => {
      const { revokeAllAdminSessions } = await import('@/lib/security/admin-session')
      mockAdminSessionUpdateMany.mockResolvedValue({ count: 0 })

      await expect(revokeAllAdminSessions(TEST_ADMIN_ID)).resolves.not.toThrow()
    })

    it('should only revoke non-revoked sessions', async () => {
      const { revokeAllAdminSessions } = await import('@/lib/security/admin-session')
      mockAdminSessionUpdateMany.mockResolvedValue({ count: 2 })

      await revokeAllAdminSessions('admin-xyz')

      const call = mockAdminSessionUpdateMany.mock.calls[0]![0] as {
        where: { adminId: string; revokedAt: null }
      }
      expect(call.where.revokedAt).toBeNull()
    })
  })
})
