/**
 * Unit Tests for Auth Actions
 *
 * Tests the authentication server actions including login, logout,
 * password reset, and user session management.
 *
 * @module src/actions/auth
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock prisma
const mockPrismaUser = {
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
}
const mockPrismaVerificationToken = {
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
}
const mockPrismaTransaction = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      get findUnique() {
        return mockPrismaUser.findUnique
      },
      get findFirst() {
        return mockPrismaUser.findFirst
      },
      get update() {
        return mockPrismaUser.update
      },
    },
    verificationToken: {
      get findUnique() {
        return mockPrismaVerificationToken.findUnique
      },
      get create() {
        return mockPrismaVerificationToken.create
      },
      get update() {
        return mockPrismaVerificationToken.update
      },
      get updateMany() {
        return mockPrismaVerificationToken.updateMany
      },
    },
    $transaction: (args: unknown) => mockPrismaTransaction(args),
  },
}))

// Mock recaptcha
const mockVerifyRecaptcha = vi.fn()
vi.mock('@/lib/security/recaptcha', () => ({
  verifyRecaptcha: (token: string) => mockVerifyRecaptcha(token),
}))

// Mock rate limiting
const mockCheckRateLimit = vi.fn()
const mockCheckAccountLockout = vi.fn()
const mockRecordFailedLogin = vi.fn()
const mockClearFailedLogins = vi.fn()
const mockGetClientIp = vi.fn()

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  checkAccountLockout: (username: string) => mockCheckAccountLockout(username),
  recordFailedLogin: (username: string) => mockRecordFailedLogin(username),
  clearFailedLogins: (username: string) => mockClearFailedLogins(username),
  getClientIp: (headers: unknown) => mockGetClientIp(headers),
  RATE_LIMITS: {
    ip: { windowMs: 60000, max: 10 },
    user: { windowMs: 60000, max: 5 },
  },
}))

// Mock session
const mockCreateSession = vi.fn()
const mockDeleteSession = vi.fn()
const mockGetSession = vi.fn()

vi.mock('@/lib/security/session', () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  deleteSession: () => mockDeleteSession(),
  getSession: () => mockGetSession(),
}))

// Mock bcryptjs
const mockBcryptCompare = vi.fn()
const mockBcryptHash = vi.fn()

vi.mock('bcryptjs', () => ({
  default: {
    compare: (...args: unknown[]) => mockBcryptCompare(...args),
    hash: (...args: unknown[]) => mockBcryptHash(...args),
  },
  compare: (...args: unknown[]) => mockBcryptCompare(...args),
  hash: (...args: unknown[]) => mockBcryptHash(...args),
}))

// Mock next/navigation
const mockRedirect = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (path: string) => mockRedirect(path),
}))

// Mock next/headers
const mockHeaders = vi.fn()
vi.mock('next/headers', () => ({
  headers: () => mockHeaders(),
}))

// Mock mail
const mockSendPasswordResetEmail = vi.fn()
const mockIsEmailConfigured = vi.fn()
vi.mock('@/lib/mail/mail', () => ({
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
  isEmailConfigured: () => mockIsEmailConfigured(),
}))

// Mock auth helper (withAuth)
const mockWithAuth = vi.fn()
vi.mock('@/lib/security/auth', () => ({
  withAuth: (fn: (session: { userId: string; username: string }) => Promise<unknown>) => mockWithAuth(fn),
}))

// Mock logger
vi.mock('@/lib/logging/server', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock subscription sync
vi.mock('@/lib/subscription/config', () => ({
  isDodoPaymentsEnabled: () => false,
}))

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Creates a FormData object for login tests
 */
function createLoginFormData(
  username: string = 'testuser',
  password: string = 'TestPass123!',
  recaptchaToken: string = 'valid-token',
): FormData {
  const fd = new FormData()
  fd.append('username', username)
  fd.append('password', password)
  fd.append('recaptchaToken', recaptchaToken)
  return fd
}

/**
 * Base user object for tests
 */
const baseUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  password: 'hashed-password',
  emailVerified: new Date(),
  customerId: null,
  lastLoginAt: null,
  loginCount: 0,
}

/**
 * Sets up common success path mocks
 */
function setupSuccessfulLoginMocks() {
  mockHeaders.mockResolvedValue(new Headers())
  mockGetClientIp.mockReturnValue('127.0.0.1')
  mockCheckRateLimit.mockReturnValue({ success: true })
  mockCheckAccountLockout.mockReturnValue({ locked: false })
  mockVerifyRecaptcha.mockResolvedValue(true)
  mockPrismaUser.findUnique.mockResolvedValue(baseUser)
  mockBcryptCompare.mockResolvedValue(true)
  mockCreateSession.mockResolvedValue(undefined)
  mockPrismaUser.update.mockResolvedValue(baseUser)
}

// ============================================================================
// TESTS
// ============================================================================

describe('Auth Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset common mocks to defaults
    mockHeaders.mockResolvedValue(new Headers())
    mockGetClientIp.mockReturnValue('127.0.0.1')
    mockCheckRateLimit.mockReturnValue({ success: true })
    mockCheckAccountLockout.mockReturnValue({ locked: false })
    mockVerifyRecaptcha.mockResolvedValue(true)
    mockIsEmailConfigured.mockReturnValue(true)
    mockPrismaTransaction.mockResolvedValue([{}, {}])
  })

  // ==========================================================================
  // LOGIN TESTS
  // ==========================================================================

  describe('login', () => {
    describe('validation', () => {
      it('should return error when username is empty', async () => {
        const { login } = await import('@/actions/auth')
        const fd = createLoginFormData('', 'password', 'token')

        const result = await login(undefined, fd)

        expect(result.error).toBe('Username is required')
      })

      it('should return error when password is empty', async () => {
        const { login } = await import('@/actions/auth')
        const fd = createLoginFormData('user', '', 'token')

        const result = await login(undefined, fd)

        expect(result.error).toBe('Password is required')
      })

      it('should return error when recaptchaToken is empty', async () => {
        const { login } = await import('@/actions/auth')
        const fd = createLoginFormData('user', 'pass', '')

        const result = await login(undefined, fd)

        expect(result.error).toBe('reCAPTCHA verification required')
      })
    })

    describe('failure cases', () => {
      it.each([
        {
          name: 'user not found',
          setup: () => {
            mockPrismaUser.findUnique.mockResolvedValue(null)
          },
          expectedError: 'Invalid credentials',
        },
        {
          name: 'wrong password',
          setup: () => {
            mockPrismaUser.findUnique.mockResolvedValue(baseUser)
            mockBcryptCompare.mockResolvedValue(false)
          },
          expectedError: 'Invalid credentials',
        },
        {
          name: 'rate limited',
          setup: () => {
            mockCheckRateLimit.mockReturnValue({ success: false })
          },
          expectedError: 'Too many login attempts from this IP',
        },
        {
          name: 'locked out',
          setup: () => {
            mockCheckAccountLockout.mockReturnValue({ locked: true, remainingSeconds: 600 })
          },
          expectedError: 'Account temporarily locked',
        },
        {
          name: 'recaptcha failed',
          setup: () => {
            mockVerifyRecaptcha.mockResolvedValue(false)
          },
          expectedError: 'reCAPTCHA verification failed',
        },
        {
          name: 'email not verified',
          setup: () => {
            mockPrismaUser.findUnique.mockResolvedValue({
              ...baseUser,
              emailVerified: null,
            })
            mockBcryptCompare.mockResolvedValue(true)
          },
          expectedError: 'verify your email',
        },
        {
          name: 'OAuth user without password',
          setup: () => {
            mockPrismaUser.findUnique.mockResolvedValue({
              ...baseUser,
              password: null,
            })
          },
          expectedError: 'Invalid credentials',
        },
      ])('should return error for $name', async ({ setup, expectedError }) => {
        const { login } = await import('@/actions/auth')
        setup()
        const fd = createLoginFormData('test', 'pass', 'token')

        const result = await login(undefined, fd)

        expect(result.error).toContain(expectedError)
      })
    })

    describe('success case', () => {
      it('should call createSession and clearFailedLogins on successful login', async () => {
        const { login } = await import('@/actions/auth')
        setupSuccessfulLoginMocks()
        const fd = createLoginFormData('testuser', 'TestPass123!', 'valid-token')

        const result = await login(undefined, fd)

        expect(result.success).toBe(true)
        expect(mockClearFailedLogins).toHaveBeenCalledWith('testuser')
        expect(mockCreateSession).toHaveBeenCalledWith(baseUser.id, baseUser.username)
      })

      it('should update login analytics on successful login', async () => {
        const { login } = await import('@/actions/auth')
        setupSuccessfulLoginMocks()
        const fd = createLoginFormData()

        await login(undefined, fd)

        expect(mockPrismaUser.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: baseUser.id },
            data: expect.objectContaining({
              lastLoginAt: expect.any(Date),
              loginCount: { increment: 1 },
            }),
          }),
        )
      })

      it('should record failed login attempt when user not found', async () => {
        const { login } = await import('@/actions/auth')
        mockPrismaUser.findUnique.mockResolvedValue(null)
        const fd = createLoginFormData('nonexistent', 'pass', 'token')

        await login(undefined, fd)

        expect(mockRecordFailedLogin).toHaveBeenCalledWith('nonexistent')
      })

      it('should record failed login attempt when password is wrong', async () => {
        const { login } = await import('@/actions/auth')
        mockPrismaUser.findUnique.mockResolvedValue(baseUser)
        mockBcryptCompare.mockResolvedValue(false)
        const fd = createLoginFormData('testuser', 'wrongpass', 'token')

        await login(undefined, fd)

        expect(mockRecordFailedLogin).toHaveBeenCalledWith('testuser')
      })
    })
  })

  // ==========================================================================
  // LOGOUT TESTS
  // ==========================================================================

  describe('logout', () => {
    it('should call deleteSession then redirect to /login', async () => {
      const { logout } = await import('@/actions/auth')
      const callOrder: string[] = []

      mockDeleteSession.mockImplementation(() => {
        callOrder.push('deleteSession')
        return Promise.resolve()
      })
      mockRedirect.mockImplementation((path: string) => {
        callOrder.push(`redirect:${path}`)
      })

      await logout()

      expect(callOrder).toEqual(['deleteSession', 'redirect:/login'])
      expect(mockDeleteSession).toHaveBeenCalledTimes(1)
      expect(mockRedirect).toHaveBeenCalledWith('/login')
    })
  })

  // ==========================================================================
  // GET CURRENT USER TESTS
  // ==========================================================================

  describe('getCurrentUser', () => {
    it('should return user payload when session exists', async () => {
      const { getCurrentUser } = await import('@/actions/auth')
      mockGetSession.mockResolvedValue({
        userId: 'user-123',
        username: 'testuser',
        expiresAt: new Date(),
      })

      const result = await getCurrentUser()

      expect(result).toEqual({
        id: 'user-123',
        username: 'testuser',
      })
    })

    it('should return null when no session exists', async () => {
      const { getCurrentUser } = await import('@/actions/auth')
      mockGetSession.mockResolvedValue(null)

      const result = await getCurrentUser()

      expect(result).toBeNull()
    })
  })

  // ==========================================================================
  // REQUEST PASSWORD RESET TESTS
  // ==========================================================================

  describe('requestPasswordReset', () => {
    it('should return success even for non-existent user (anti-enumeration)', async () => {
      const { requestPasswordReset } = await import('@/actions/auth')
      mockPrismaUser.findFirst.mockResolvedValue(null)

      const result = await requestPasswordReset('nonexistent@example.com', 'valid-token')

      expect(result.success).toBe(true)
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('should create token and send email for existing user', async () => {
      const { requestPasswordReset } = await import('@/actions/auth')
      mockPrismaUser.findFirst.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      })
      mockPrismaVerificationToken.create.mockResolvedValue({})
      mockPrismaVerificationToken.updateMany.mockResolvedValue({})
      mockSendPasswordResetEmail.mockResolvedValue(true)

      const result = await requestPasswordReset('test@example.com', 'valid-token')

      expect(result.success).toBe(true)
      expect(mockPrismaVerificationToken.create).toHaveBeenCalled()
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith('test@example.com', expect.any(String), 'testuser')
    })

    it('should invalidate existing tokens before creating new one', async () => {
      const { requestPasswordReset } = await import('@/actions/auth')
      mockPrismaUser.findFirst.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      })
      mockPrismaVerificationToken.create.mockResolvedValue({})
      mockPrismaVerificationToken.updateMany.mockResolvedValue({})
      mockSendPasswordResetEmail.mockResolvedValue(true)

      await requestPasswordReset('test@example.com', 'valid-token')

      expect(mockPrismaVerificationToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-123',
            type: 'password_reset',
            usedAt: null,
          },
        }),
      )
    })

    it('should return error when recaptcha fails', async () => {
      const { requestPasswordReset } = await import('@/actions/auth')
      mockVerifyRecaptcha.mockResolvedValue(false)

      const result = await requestPasswordReset('test@example.com', 'invalid-token')

      expect(result.error).toContain('reCAPTCHA verification failed')
    })

    it('should return error when rate limited', async () => {
      const { requestPasswordReset } = await import('@/actions/auth')
      mockCheckRateLimit.mockReturnValue({ success: false })

      const result = await requestPasswordReset('test@example.com', 'valid-token')

      expect(result.error).toContain('Too many password reset attempts')
    })

    it('should return error when email is not configured', async () => {
      const { requestPasswordReset } = await import('@/actions/auth')
      mockIsEmailConfigured.mockReturnValue(false)

      const result = await requestPasswordReset('test@example.com', 'valid-token')

      expect(result.error).toContain('Email service is not configured')
    })
  })

  // ==========================================================================
  // VALIDATE RESET TOKEN TESTS
  // ==========================================================================

  describe('validateResetToken', () => {
    it('should return valid:true for valid unused token', async () => {
      const { validateResetToken } = await import('@/actions/auth')
      mockPrismaVerificationToken.findUnique.mockResolvedValue({
        id: 'token-123',
        token: 'hashed-token',
        type: 'password_reset',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000), // Future
      })

      const result = await validateResetToken('valid-token')

      expect(result.valid).toBe(true)
    })

    it('should return valid:false for non-existent token', async () => {
      const { validateResetToken } = await import('@/actions/auth')
      mockPrismaVerificationToken.findUnique.mockResolvedValue(null)

      const result = await validateResetToken('invalid-token')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid or expired')
    })

    it('should return valid:false for already used token', async () => {
      const { validateResetToken } = await import('@/actions/auth')
      mockPrismaVerificationToken.findUnique.mockResolvedValue({
        id: 'token-123',
        token: 'hashed-token',
        type: 'password_reset',
        usedAt: new Date(), // Already used
        expiresAt: new Date(Date.now() + 60000),
      })

      const result = await validateResetToken('used-token')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('already been used')
    })

    it('should return valid:false for expired token', async () => {
      const { validateResetToken } = await import('@/actions/auth')
      mockPrismaVerificationToken.findUnique.mockResolvedValue({
        id: 'token-123',
        token: 'hashed-token',
        type: 'password_reset',
        usedAt: null,
        expiresAt: new Date(Date.now() - 60000), // Past
      })

      const result = await validateResetToken('expired-token')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('expired')
    })

    it('should return valid:false for wrong token type', async () => {
      const { validateResetToken } = await import('@/actions/auth')
      mockPrismaVerificationToken.findUnique.mockResolvedValue({
        id: 'token-123',
        token: 'hashed-token',
        type: 'email_verification', // Wrong type
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      })

      const result = await validateResetToken('wrong-type-token')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid reset link')
    })
  })

  // ==========================================================================
  // RESET PASSWORD TESTS
  // ==========================================================================

  describe('resetPassword', () => {
    const validPassword = 'NewPass123!'

    describe('password validation', () => {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

      it.each([
        { password: 'short1!A', shouldPass: true, reason: 'meets all requirements' },
        { password: 'NoNumbers!', shouldPass: false, reason: 'missing digit' },
        { password: 'nonumber1!', shouldPass: false, reason: 'missing uppercase' },
        { password: 'NOLOWER1!', shouldPass: false, reason: 'missing lowercase' },
        { password: 'NoSpecial1', shouldPass: false, reason: 'missing special character' },
        { password: 'Ab1!xyz', shouldPass: false, reason: 'too short (7 chars)' },
        { password: 'ValidPass1!', shouldPass: true, reason: 'valid password' },
      ])('password "$password" - $reason', ({ password, shouldPass }) => {
        const result = passwordRegex.test(password)
        expect(result).toBe(shouldPass)
      })
    })

    it('should return error for weak password', async () => {
      const { resetPassword } = await import('@/actions/auth')

      const result = await resetPassword('valid-token', 'weakpass')

      expect(result.error).toContain('Password must be at least 8 characters')
    })

    it('should return error for invalid token', async () => {
      const { resetPassword } = await import('@/actions/auth')
      mockPrismaVerificationToken.findUnique.mockResolvedValue(null)

      const result = await resetPassword('invalid-token', validPassword)

      expect(result.error).toContain('Invalid or expired')
    })

    it('should return success for valid token and strong password', async () => {
      const { resetPassword } = await import('@/actions/auth')
      mockPrismaVerificationToken.findUnique.mockResolvedValue({
        id: 'token-123',
        token: 'hashed-token',
        type: 'password_reset',
        userId: 'user-123',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      })
      mockBcryptHash.mockResolvedValue('new-hashed-password')
      mockPrismaTransaction.mockResolvedValue([{}, {}])

      const result = await resetPassword('valid-token', validPassword)

      expect(result.success).toBe(true)
      expect(mockBcryptHash).toHaveBeenCalledWith(validPassword, 12)
    })

    it('should update user password and mark token as used in transaction', async () => {
      const { resetPassword } = await import('@/actions/auth')
      mockPrismaVerificationToken.findUnique.mockResolvedValue({
        id: 'token-123',
        token: 'hashed-token',
        type: 'password_reset',
        userId: 'user-123',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      })
      mockBcryptHash.mockResolvedValue('new-hashed-password')

      await resetPassword('valid-token', validPassword)

      expect(mockPrismaTransaction).toHaveBeenCalledWith(expect.any(Array))
    })
  })

  // ==========================================================================
  // CHANGE PASSWORD TESTS
  // ==========================================================================

  describe('changePassword', () => {
    const mockSession = { userId: 'user-123', username: 'testuser' }

    beforeEach(() => {
      // Setup withAuth mock to execute the function with a session
      mockWithAuth.mockImplementation(
        async (fn: (session: { userId: string; username: string }) => Promise<unknown>) => {
          return fn(mockSession)
        },
      )
    })

    it('should return error for weak new password', async () => {
      const { changePassword } = await import('@/actions/auth')

      const result = await changePassword('CurrentPass1!', 'weak')

      expect(result.error).toContain('Password must be at least 8 characters')
    })

    it('should return error when user not found', async () => {
      const { changePassword } = await import('@/actions/auth')
      mockPrismaUser.findUnique.mockResolvedValue(null)

      const result = await changePassword('CurrentPass1!', 'NewPass123!')

      expect(result.error).toBe('User not found.')
    })

    it('should return error for OAuth user without password', async () => {
      const { changePassword } = await import('@/actions/auth')
      mockPrismaUser.findUnique.mockResolvedValue({ password: null })

      const result = await changePassword('CurrentPass1!', 'NewPass123!')

      expect(result.error).toContain('Create Password')
    })

    it('should return error when current password is incorrect', async () => {
      const { changePassword } = await import('@/actions/auth')
      mockPrismaUser.findUnique.mockResolvedValue({ password: 'hashed-password' })
      mockBcryptCompare.mockResolvedValue(false)

      const result = await changePassword('WrongPass1!', 'NewPass123!')

      expect(result.error).toBe('Current password is incorrect.')
    })

    it('should update password on success', async () => {
      const { changePassword } = await import('@/actions/auth')
      mockPrismaUser.findUnique.mockResolvedValue({ password: 'hashed-password' })
      mockBcryptCompare.mockResolvedValue(true)
      mockBcryptHash.mockResolvedValue('new-hashed-password')
      mockPrismaUser.update.mockResolvedValue({})

      const result = await changePassword('CurrentPass1!', 'NewPass123!')

      expect(result.success).toBe(true)
      expect(mockBcryptHash).toHaveBeenCalledWith('NewPass123!', 12)
      expect(mockPrismaUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockSession.userId },
          data: { password: 'new-hashed-password' },
        }),
      )
    })

    it('should return error when database update fails', async () => {
      const { changePassword } = await import('@/actions/auth')
      mockPrismaUser.findUnique.mockResolvedValue({ password: 'hashed-password' })
      mockBcryptCompare.mockResolvedValue(true)
      mockBcryptHash.mockResolvedValue('new-hashed-password')
      mockPrismaUser.update.mockRejectedValue(new Error('Database error'))

      const result = await changePassword('CurrentPass1!', 'NewPass123!')

      expect(result.error).toBe('An error occurred. Please try again.')
    })

    it('should return Unauthorized when session is invalid', async () => {
      const { changePassword } = await import('@/actions/auth')
      mockWithAuth.mockRejectedValue(new Error('Unauthorized'))

      const result = await changePassword('CurrentPass1!', 'NewPass123!')

      expect(result.error).toBe('Unauthorized')
      expect(result.success).toBe(false)
    })
  })

  // ==========================================================================
  // CREATE PASSWORD TESTS
  // ==========================================================================

  describe('createPassword', () => {
    const mockSession = { userId: 'user-123', username: 'testuser' }

    beforeEach(() => {
      mockWithAuth.mockImplementation(
        async (fn: (session: { userId: string; username: string }) => Promise<unknown>) => {
          return fn(mockSession)
        },
      )
    })

    it('should return error for weak password', async () => {
      const { createPassword } = await import('@/actions/auth')

      const result = await createPassword('weak')

      expect(result.error).toContain('Password must be at least 8 characters')
    })

    it('should return error when user not found', async () => {
      const { createPassword } = await import('@/actions/auth')
      mockPrismaUser.findUnique.mockResolvedValue(null)

      const result = await createPassword('NewPass123!')

      expect(result.error).toBe('User not found.')
    })

    it('should return error when user already has password', async () => {
      const { createPassword } = await import('@/actions/auth')
      mockPrismaUser.findUnique.mockResolvedValue({ password: 'existing-hash' })

      const result = await createPassword('NewPass123!')

      expect(result.error).toContain('already have a password')
    })

    it('should create password for OAuth user without password', async () => {
      const { createPassword } = await import('@/actions/auth')
      mockPrismaUser.findUnique.mockResolvedValue({ password: null })
      mockBcryptHash.mockResolvedValue('new-hashed-password')
      mockPrismaUser.update.mockResolvedValue({})

      const result = await createPassword('NewPass123!')

      expect(result.success).toBe(true)
      expect(mockBcryptHash).toHaveBeenCalledWith('NewPass123!', 12)
      expect(mockPrismaUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockSession.userId },
          data: expect.objectContaining({
            password: 'new-hashed-password',
            emailVerified: expect.any(Date),
          }),
        }),
      )
    })

    it('should return error when database update fails', async () => {
      const { createPassword } = await import('@/actions/auth')
      mockPrismaUser.findUnique.mockResolvedValue({ password: null })
      mockBcryptHash.mockResolvedValue('new-hashed-password')
      mockPrismaUser.update.mockRejectedValue(new Error('Database error'))

      const result = await createPassword('NewPass123!')

      expect(result.error).toBe('An error occurred. Please try again.')
    })

    it('should return Unauthorized when session is invalid', async () => {
      const { createPassword } = await import('@/actions/auth')
      mockWithAuth.mockRejectedValue(new Error('Unauthorized'))

      const result = await createPassword('NewPass123!')

      expect(result.error).toBe('Unauthorized')
      expect(result.success).toBe(false)
    })
  })
})
