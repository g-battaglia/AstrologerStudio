'use server'

import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { createAdminSession, deleteAdminSession, getAdminSession, getClientIp } from '@/lib/security/admin-session'
import { verifyRecaptcha } from '@/lib/security/recaptcha'
import { withAdminAuth, withSuperAdminAuth } from '@/lib/security/admin-auth'
import { checkAccountLockout, recordFailedLogin, clearFailedLogins } from '@/lib/security/rate-limit'
import { logger } from '@/lib/logging/server'

/**
 * Admin Server Actions
 * All actions for admin functionality: auth, user management, statistics
 */

// ============================================================================
// Types
// ============================================================================

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

// ============================================================================
// Validation Schemas
// ============================================================================

const AdminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  recaptchaToken: z.string().min(1, 'reCAPTCHA verification required'),
})

// ============================================================================
// Authentication Actions
// ============================================================================

/**
 * Admin login with reCAPTCHA verification
 */
export async function adminLogin(formData: FormData): Promise<ActionResult> {
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const recaptchaToken = formData.get('recaptchaToken') as string

  // Validate input
  const validation = AdminLoginSchema.safeParse({ username, password, recaptchaToken })
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message || 'Invalid input' }
  }

  // Verify reCAPTCHA
  const isRecaptchaValid = await verifyRecaptcha(recaptchaToken)
  if (!isRecaptchaValid) {
    return { success: false, error: 'reCAPTCHA verification failed. Please try again.' }
  }

  // Account lockout check (brute-force protection)
  const lockoutStatus = checkAccountLockout(validation.data.username)
  if (lockoutStatus.locked) {
    const minutes = Math.ceil((lockoutStatus.remainingSeconds || 0) / 60)
    return {
      success: false,
      error: `Account temporarily locked due to multiple failed login attempts. Please try again in ${minutes} minutes.`,
    }
  }

  // Find admin user
  const admin = await prisma.adminUser.findUnique({
    where: { username: validation.data.username },
  })

  if (!admin) {
    // Record failed attempt for brute-force tracking
    recordFailedLogin(validation.data.username)
    // Don't reveal if username exists
    return { success: false, error: 'Invalid credentials' }
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(validation.data.password, admin.password)
  if (!isPasswordValid) {
    // Record failed attempt for brute-force tracking
    recordFailedLogin(validation.data.username)
    // Log failed attempt
    const ipAddress = await getClientIp()
    await prisma.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'login_failed',
        details: JSON.stringify({ reason: 'invalid_password' }),
        ipAddress,
      },
    })
    return { success: false, error: 'Invalid credentials' }
  }

  // Clear failed login attempts on successful login
  clearFailedLogins(validation.data.username)

  // Create session
  await createAdminSession(admin.id, admin.username, admin.role as 'admin' | 'superadmin')

  return { success: true }
}

/**
 * Admin logout
 */
export async function adminLogout(): Promise<ActionResult> {
  await deleteAdminSession()
  return { success: true }
}

/**
 * Get current admin session info (for UI)
 */
export async function getAdminSessionInfo() {
  const session = await getAdminSession()
  if (!session) return null
  return {
    username: session.username,
    role: session.role,
  }
}

// ============================================================================
// Dashboard Statistics
// ============================================================================

export type DashboardStats = {
  totalUsers: number
  usersToday: number
  usersThisWeek: number
  usersThisMonth: number
  totalAIGenerations: number
  aiGenerationsToday: number
  usersByPlan: { plan: string; count: number }[]

  // Engagement metrics
  activeUsersToday: number
  activeUsersThisWeek: number
  activeUsersThisMonth: number

  // Retention metrics
  retentionRate7d: number
  avgLoginsPerUser: number

  // Feature adoption
  usersWithSubjects: number
  usersWithSavedCharts: number
  usersWithAIUsage: number
  inactiveUsers30d: number

  // Chart breakdown (saved charts)
  savedChartsByType: { type: string; count: number }[]

  // Chart calculation stats
  totalCalculations: number
  calculationsToday: number
  calculationsThisWeek: number
  calculationsThisMonth: number
  calculationsByType: { type: string; count: number }[]
  calculationsTodayByType: { type: string; count: number }[]
  calculationsByTypeThisWeek: { type: string; count: number }[]
  calculationsByTypeThisMonth: { type: string; count: number }[]
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<ActionResult<DashboardStats>> {
  return withAdminAuth(async (session) => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]!
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfDay)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Additional date boundaries for engagement metrics
    const sevenDaysAgo = new Date(startOfDay)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const thirtyDaysAgo = new Date(startOfDay)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      // Basic user stats
      totalUsers,
      usersToday,
      usersThisWeek,
      usersThisMonth,
      usersByPlan,
      aiUsageToday,
      // Active users (by lastActiveAt)
      activeUsersToday,
      activeUsersThisWeek,
      activeUsersThisMonth,
      // Feature adoption
      usersWithSubjects,
      usersWithSavedCharts,
      usersWithAIUsage,
      // Inactive users
      inactiveUsers30d,
      // Saved charts by type
      savedChartsByType,
      // Retention calculation - users eligible (created >7 days ago)
      eligibleForRetention,
      // Retention calculation - users who returned
      returnedUsers,
      // Average logins per user
      avgLogins,
      // Chart calculations stats
      calculationsByTypeRaw,
      calculationsTodayByTypeRaw,
      calculationsThisWeekByTypeRaw,
      calculationsThisMonthByTypeRaw,
      totalCalcsResult,
    ] = await Promise.all([
      // Basic stats
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.groupBy({
        by: ['subscriptionPlan'],
        _count: true,
      }),
      prisma.userAIUsage.aggregate({
        where: { date: today },
        _sum: { count: true },
      }),

      // Active users today
      prisma.user.count({
        where: { lastActiveAt: { gte: startOfDay } },
      }),

      // Active users this week
      prisma.user.count({
        where: { lastActiveAt: { gte: sevenDaysAgo } },
      }),

      // Active users this month
      prisma.user.count({
        where: { lastActiveAt: { gte: thirtyDaysAgo } },
      }),

      // Users with at least 1 subject
      prisma.user.count({
        where: { subjects: { some: {} } },
      }),

      // Users with at least 1 saved chart
      prisma.user.count({
        where: { savedCharts: { some: {} } },
      }),

      // Users who used AI at least once
      prisma.user.count({
        where: { aiGenerationsTotal: { gt: 0 } },
      }),

      // Inactive users (no activity in 30+ days)
      prisma.user.count({
        where: {
          OR: [{ lastActiveAt: { lt: thirtyDaysAgo } }, { lastActiveAt: null }],
        },
      }),

      // Saved charts grouped by type
      prisma.savedChart.groupBy({
        by: ['type'],
        _count: true,
      }),

      // For retention: users created more than 7 days ago
      prisma.user.count({
        where: { createdAt: { lt: sevenDaysAgo } },
      }),

      // For retention: users created >7 days ago AND active in last 7 days
      prisma.user.count({
        where: {
          createdAt: { lt: sevenDaysAgo },
          lastActiveAt: { gte: sevenDaysAgo },
        },
      }),

      // Average logins per user
      prisma.user.aggregate({
        _avg: { loginCount: true },
      }),

      // Chart calculations by type (all time)
      prisma.chartCalculationUsage.groupBy({
        by: ['chartType'],
        _sum: { count: true },
      }),

      // Chart calculations today by type
      prisma.chartCalculationUsage.groupBy({
        by: ['chartType'],
        where: { date: today },
        _sum: { count: true },
      }),

      // Chart calculations this week by type
      prisma.chartCalculationUsage.groupBy({
        by: ['chartType'],
        where: { date: { gte: sevenDaysAgo.toISOString().split('T')[0]! } },
        _sum: { count: true },
      }),

      // Chart calculations this month by type
      prisma.chartCalculationUsage.groupBy({
        by: ['chartType'],
        where: { date: { gte: thirtyDaysAgo.toISOString().split('T')[0]! } },
        _sum: { count: true },
      }),

      // Total calculations all time
      prisma.chartCalculationUsage.aggregate({
        _sum: { count: true },
      }),
    ])

    // Get total AI generations from all users
    const totalAIGenerationsResult = await prisma.user.aggregate({
      _sum: { aiGenerationsTotal: true },
    })

    // Calculate retention rate
    const retentionRate7d = eligibleForRetention > 0 ? Math.round((returnedUsers / eligibleForRetention) * 100) : 0

    // Calculate calculations today total
    const calculationsToday = calculationsTodayByTypeRaw.reduce((sum, c) => sum + (c._sum.count || 0), 0)
    const calculationsThisWeek = calculationsThisWeekByTypeRaw.reduce((sum, c) => sum + (c._sum.count || 0), 0)
    const calculationsThisMonth = calculationsThisMonthByTypeRaw.reduce((sum, c) => sum + (c._sum.count || 0), 0)

    // Log this action
    const ipAddress = await getClientIp()
    await prisma.adminAuditLog.create({
      data: {
        adminId: session.adminId,
        action: 'view_dashboard',
        ipAddress,
      },
    })

    return {
      success: true,
      data: {
        totalUsers,
        usersToday,
        usersThisWeek,
        usersThisMonth,
        totalAIGenerations: totalAIGenerationsResult._sum.aiGenerationsTotal || 0,
        aiGenerationsToday: aiUsageToday._sum.count || 0,
        usersByPlan: usersByPlan.map((p) => ({
          plan: p.subscriptionPlan,
          count: p._count,
        })),

        // Engagement metrics
        activeUsersToday,
        activeUsersThisWeek,
        activeUsersThisMonth,

        // Retention
        retentionRate7d,
        avgLoginsPerUser: Math.round((avgLogins._avg.loginCount || 0) * 10) / 10,

        // Feature usage
        usersWithSubjects,
        usersWithSavedCharts,
        usersWithAIUsage,
        inactiveUsers30d,

        // Chart breakdown (saved)
        savedChartsByType: savedChartsByType.map((c) => ({
          type: c.type,
          count: c._count,
        })),

        // Chart calculation stats
        totalCalculations: totalCalcsResult._sum.count || 0,
        calculationsToday,
        calculationsThisWeek,
        calculationsThisMonth,
        calculationsByType: calculationsByTypeRaw.map((c) => ({
          type: c.chartType,
          count: c._sum.count || 0,
        })),
        calculationsTodayByType: calculationsTodayByTypeRaw.map((c) => ({
          type: c.chartType,
          count: c._sum.count || 0,
        })),
        calculationsByTypeThisWeek: calculationsThisWeekByTypeRaw.map((c) => ({
          type: c.chartType,
          count: c._sum.count || 0,
        })),
        calculationsByTypeThisMonth: calculationsThisMonthByTypeRaw.map((c) => ({
          type: c.chartType,
          count: c._sum.count || 0,
        })),
      },
    }
  })
}

// ============================================================================
// User Management
// ============================================================================

export type ChartTypeKey =
  | 'natal'
  | 'transit'
  | 'synastry'
  | 'composite'
  | 'solar-return'
  | 'lunar-return'
  | 'timeline'
  | 'now'

export type CalculationsByType = Record<ChartTypeKey, number>

export type UserListItem = {
  id: string
  username: string
  email: string | null
  subscriptionPlan: string
  aiGenerationsTotal: number
  createdAt: Date
  lastLoginAt: Date | null
  loginCount: number
  lastActiveAt: Date | null
  subjectsCount: number
  savedChartsCount: number
  calculationsTotal: number
  calculationsByType: CalculationsByType
  pdfExportsTotal: number
}

export type UsersListResult = {
  users: UserListItem[]
  total: number
  page: number
  pageSize: number
}

/**
 * Get paginated list of users
 */
export async function getUsers(
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  planFilter?: string,
  sortBy: 'createdAt' | 'lastLoginAt' | 'lastActiveAt' = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
): Promise<ActionResult<UsersListResult>> {
  return withAdminAuth(async (session) => {
    const where: Prisma.UserWhereInput = {
      ...(search && {
        OR: [
          { username: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(planFilter && { subscriptionPlan: planFilter }),
    }

    // Build orderBy clause with proper NULL handling for nullable DateTime fields
    // For DESC: NULLs should be last (most recent first, never-active users last)
    // For ASC: NULLs should be last (oldest first, never-active users last)
    const isNullableField = sortBy === 'lastLoginAt' || sortBy === 'lastActiveAt'
    const orderByClause = isNullableField
      ? [{ [sortBy]: { sort: sortOrder, nulls: 'last' as const } }, { createdAt: sortOrder }]
      : [{ [sortBy]: sortOrder }, { id: sortOrder }]

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          subscriptionPlan: true,
          aiGenerationsTotal: true,
          createdAt: true,
          lastLoginAt: true,
          loginCount: true,
          lastActiveAt: true,
          _count: {
            select: {
              subjects: true,
              savedCharts: true,
            },
          },
        },
        orderBy: orderByClause,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ])

    // Log this action
    const ipAddress = await getClientIp()
    await prisma.adminAuditLog.create({
      data: {
        adminId: session.adminId,
        action: 'view_users',
        details: JSON.stringify({ page, search, planFilter }),
        ipAddress,
      },
    })

    // Get calculation counts for these users grouped by chartType
    const userIds = users.map((u) => u.id)
    const calculationCountsByType = await prisma.chartCalculationUsage.groupBy({
      by: ['userId', 'chartType'],
      where: { userId: { in: userIds } },
      _sum: { count: true },
    })

    // Build a map: userId -> chartType -> count
    const defaultCounts: CalculationsByType = {
      natal: 0,
      transit: 0,
      synastry: 0,
      composite: 0,
      'solar-return': 0,
      'lunar-return': 0,
      timeline: 0,
      now: 0,
    }

    const calcByTypeMap = new Map<string, CalculationsByType>()
    const calcTotalMap = new Map<string, number>()

    for (const c of calculationCountsByType) {
      const userId = c.userId
      const chartType = c.chartType as ChartTypeKey
      const count = c._sum.count || 0

      if (!calcByTypeMap.has(userId)) {
        calcByTypeMap.set(userId, { ...defaultCounts })
        calcTotalMap.set(userId, 0)
      }

      const userCounts = calcByTypeMap.get(userId)!
      if (chartType in userCounts) {
        userCounts[chartType] = count
      }
      calcTotalMap.set(userId, (calcTotalMap.get(userId) || 0) + count)
    }

    // Get PDF export counts for these users
    const pdfExportCounts = await prisma.pDFExportUsage.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _sum: { count: true },
    })
    const pdfCountMap = new Map<string, number>(pdfExportCounts.map((c) => [c.userId, c._sum.count || 0]))

    return {
      success: true,
      data: {
        users: users.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          subscriptionPlan: u.subscriptionPlan,
          aiGenerationsTotal: u.aiGenerationsTotal,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
          loginCount: u.loginCount,
          lastActiveAt: u.lastActiveAt,
          subjectsCount: u._count.subjects,
          savedChartsCount: u._count.savedCharts,
          calculationsTotal: calcTotalMap.get(u.id) || 0,
          calculationsByType: calcByTypeMap.get(u.id) || { ...defaultCounts },
          pdfExportsTotal: pdfCountMap.get(u.id) || 0,
        })),
        total,
        page,
        pageSize,
      },
    }
  })
}

export type UserDetail = {
  id: string
  username: string
  email: string | null
  firstName: string | null
  lastName: string | null
  authProvider: string
  subscriptionPlan: string
  subscriptionId: string | null
  trialEndsAt: Date | null
  subscriptionEndsAt: Date | null
  aiGenerationsTotal: number
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date | null
  loginCount: number
  lastActiveAt: Date | null
  subjectsCount: number
  savedChartsCount: number
  todayAIUsage: number
  pdfExportsTotal: number
}

/**
 * Get detailed user information
 */
export async function getUserDetails(userId: string): Promise<ActionResult<UserDetail>> {
  return withAdminAuth(async (session) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            subjects: true,
            savedCharts: true,
          },
        },
      },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const today = new Date().toISOString().split('T')[0]!
    const todayUsage = await prisma.userAIUsage.findUnique({
      where: { userId_date: { userId, date: today } },
    })

    // Get PDF export total for this user
    const pdfExportResult = await prisma.pDFExportUsage.aggregate({
      where: { userId },
      _sum: { count: true },
    })

    // Log this action
    const ipAddress = await getClientIp()
    await prisma.adminAuditLog.create({
      data: {
        adminId: session.adminId,
        action: 'view_user_details',
        details: JSON.stringify({ userId }),
        ipAddress,
      },
    })

    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        authProvider: user.authProvider,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionId: user.subscriptionId,
        trialEndsAt: user.trialEndsAt,
        subscriptionEndsAt: user.subscriptionEndsAt,
        aiGenerationsTotal: user.aiGenerationsTotal,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        loginCount: user.loginCount,
        lastActiveAt: user.lastActiveAt,
        subjectsCount: user._count.subjects,
        savedChartsCount: user._count.savedCharts,
        todayAIUsage: todayUsage?.count || 0,
        pdfExportsTotal: pdfExportResult._sum.count || 0,
      },
    }
  })
}

/**
 * Update user's subscription plan (admin action)
 */
export async function updateUserPlan(userId: string, newPlan: string): Promise<ActionResult> {
  return withAdminAuth(async (session) => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const oldPlan = user.subscriptionPlan

    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionPlan: newPlan },
    })

    // Log this action
    const ipAddress = await getClientIp()
    await prisma.adminAuditLog.create({
      data: {
        adminId: session.adminId,
        action: 'update_user_plan',
        details: JSON.stringify({ userId, oldPlan, newPlan }),
        ipAddress,
      },
    })

    return { success: true }
  })
}

/**
 * Delete a user account (superadmin only)
 *
 * Cancels any active Dodo Payments subscription before deleting.
 */
export async function deleteUser(userId: string): Promise<ActionResult> {
  return withSuperAdminAuth(async (session) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        subscriptionId: true,
        subscriptionPlan: true,
      },
    })
    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Cancel Dodo Payments subscription if active
    if (
      user.subscriptionId &&
      user.subscriptionPlan &&
      user.subscriptionPlan !== 'free' &&
      user.subscriptionPlan !== 'lifetime'
    ) {
      try {
        // Dynamic import to avoid issues if Dodo Payments module is not installed
        const { cancelSubscription } = await import('@/dodopayments/lib/server')
        const result = await cancelSubscription(user.subscriptionId, { immediate: true })

        if (!result.success) {
          logger.warn(`Failed to cancel Dodo Payments subscription for user ${userId}: ${result.error}`)
          // Continue with deletion anyway - subscription will expire naturally
        } else {
          logger.info(`Dodo Payments subscription cancelled for user ${userId}`)
        }
      } catch (error) {
        logger.warn(`Dodo Payments module not available for subscription cancellation: ${error}`)
        // Continue with deletion - Dodo Payments might not be installed
      }
    }

    // Delete the user (cascades to related data)
    await prisma.user.delete({ where: { id: userId } })

    // Log this action
    const ipAddress = await getClientIp()
    await prisma.adminAuditLog.create({
      data: {
        adminId: session.adminId,
        action: 'delete_user',
        details: JSON.stringify({ userId, username: user.username, email: user.email }),
        ipAddress,
      },
    })

    return { success: true }
  })
}

// ============================================================================
// AI Usage Statistics
// ============================================================================

export type AIUsageStats = {
  dailyUsage: { date: string; count: number }[]
  topUsers: { userId: string; username: string; count: number }[]
  usageByPlan: { plan: string; totalCount: number; userCount: number }[]
}

/**
 * Get AI usage statistics
 */
export async function getAIUsageStats(days: number = 30): Promise<ActionResult<AIUsageStats>> {
  return withAdminAuth(async (session) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Daily usage for last N days
    const dailyUsage = await prisma.userAIUsage.groupBy({
      by: ['date'],
      where: { date: { gte: startDateStr } },
      _sum: { count: true },
      orderBy: { date: 'asc' },
    })

    // Top users by AI usage (all time)
    const topUsersRaw = await prisma.user.findMany({
      where: { aiGenerationsTotal: { gt: 0 } },
      select: {
        id: true,
        username: true,
        aiGenerationsTotal: true,
      },
      orderBy: { aiGenerationsTotal: 'desc' },
      take: 10,
    })

    // Usage breakdown by subscription plan
    const usageByPlanRaw = await prisma.user.groupBy({
      by: ['subscriptionPlan'],
      _sum: { aiGenerationsTotal: true },
      _count: true,
    })

    // Log this action
    const ipAddress = await getClientIp()
    await prisma.adminAuditLog.create({
      data: {
        adminId: session.adminId,
        action: 'view_ai_usage',
        details: JSON.stringify({ days }),
        ipAddress,
      },
    })

    return {
      success: true,
      data: {
        dailyUsage: dailyUsage.map((d) => ({
          date: d.date,
          count: d._sum.count || 0,
        })),
        topUsers: topUsersRaw.map((u) => ({
          userId: u.id,
          username: u.username,
          count: u.aiGenerationsTotal,
        })),
        usageByPlan: usageByPlanRaw.map((p) => ({
          plan: p.subscriptionPlan,
          totalCount: p._sum.aiGenerationsTotal || 0,
          userCount: p._count,
        })),
      },
    }
  })
}

// ============================================================================
// Admin User Management (superadmin only)
// ============================================================================

/**
 * Create a new admin user (superadmin only)
 */
export async function createAdminUser(
  username: string,
  password: string,
  email: string | null,
  role: 'admin' | 'superadmin',
): Promise<ActionResult<{ id: string }>> {
  return withSuperAdminAuth(async (session) => {
    // Check if username already exists
    const existing = await prisma.adminUser.findUnique({ where: { username } })
    if (existing) {
      return { success: false, error: 'Username already exists' }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    const admin = await prisma.adminUser.create({
      data: {
        username,
        password: hashedPassword,
        email,
        role,
      },
    })

    // Log this action
    const ipAddress = await getClientIp()
    await prisma.adminAuditLog.create({
      data: {
        adminId: session.adminId,
        action: 'create_admin',
        details: JSON.stringify({ newAdminId: admin.id, username, role }),
        ipAddress,
      },
    })

    return { success: true, data: { id: admin.id } }
  })
}

// ============================================================================
// Calculation Usage Management
// ============================================================================

export type ClearHistoryTimeRange = 'day' | 'week' | 'month' | 'all'

export type CalculationUsageByPeriod = {
  today: number
  thisWeek: number
  thisMonth: number
  allTime: number
  byTypeToday: { type: string; count: number }[]
  byTypeThisWeek: { type: string; count: number }[]
  byTypeThisMonth: { type: string; count: number }[]
}

/**
 * Get calculation usage broken down by time period
 */
export async function getCalculationUsageByPeriod(): Promise<ActionResult<CalculationUsageByPeriod>> {
  return withAdminAuth(async () => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]!

    // Calculate date boundaries
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const weekStart = sevenDaysAgo.toISOString().split('T')[0]!

    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const monthStart = thirtyDaysAgo.toISOString().split('T')[0]!

    const [todayTotal, weekTotal, monthTotal, allTimeTotal, byTypeToday, byTypeThisWeek, byTypeThisMonth] =
      await Promise.all([
        // Today total
        prisma.chartCalculationUsage.aggregate({
          where: { date: today },
          _sum: { count: true },
        }),
        // This week total
        prisma.chartCalculationUsage.aggregate({
          where: { date: { gte: weekStart } },
          _sum: { count: true },
        }),
        // This month total
        prisma.chartCalculationUsage.aggregate({
          where: { date: { gte: monthStart } },
          _sum: { count: true },
        }),
        // All time total
        prisma.chartCalculationUsage.aggregate({
          _sum: { count: true },
        }),
        // By type today
        prisma.chartCalculationUsage.groupBy({
          by: ['chartType'],
          where: { date: today },
          _sum: { count: true },
        }),
        // By type this week
        prisma.chartCalculationUsage.groupBy({
          by: ['chartType'],
          where: { date: { gte: weekStart } },
          _sum: { count: true },
        }),
        // By type this month
        prisma.chartCalculationUsage.groupBy({
          by: ['chartType'],
          where: { date: { gte: monthStart } },
          _sum: { count: true },
        }),
      ])

    return {
      success: true,
      data: {
        today: todayTotal._sum.count || 0,
        thisWeek: weekTotal._sum.count || 0,
        thisMonth: monthTotal._sum.count || 0,
        allTime: allTimeTotal._sum.count || 0,
        byTypeToday: byTypeToday.map((c) => ({ type: c.chartType, count: c._sum.count || 0 })),
        byTypeThisWeek: byTypeThisWeek.map((c) => ({ type: c.chartType, count: c._sum.count || 0 })),
        byTypeThisMonth: byTypeThisMonth.map((c) => ({ type: c.chartType, count: c._sum.count || 0 })),
      },
    }
  })
}

export type TopUserByCalculations = {
  userId: string
  username: string
  email: string | null
  subscriptionPlan: string
  calculationsTotal: number
  calculationsToday: number
  calculationsThisWeek: number
  calculationsThisMonth: number
}

/**
 * Get top users ranked by calculation usage
 */
export async function getTopUsersByCalculations(limit: number = 20): Promise<ActionResult<TopUserByCalculations[]>> {
  return withAdminAuth(async () => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]!

    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const weekStart = sevenDaysAgo.toISOString().split('T')[0]!

    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const monthStart = thirtyDaysAgo.toISOString().split('T')[0]!

    // Get all-time totals by user
    const allTimeTotals = await prisma.chartCalculationUsage.groupBy({
      by: ['userId'],
      _sum: { count: true },
      orderBy: { _sum: { count: 'desc' } },
      take: limit,
    })

    if (allTimeTotals.length === 0) {
      return { success: true, data: [] }
    }

    const userIds = allTimeTotals.map((t) => t.userId)

    // Get users info
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, email: true, subscriptionPlan: true },
    })
    const usersMap = new Map(users.map((u) => [u.id, u]))

    // Get today's counts
    const todayCounts = await prisma.chartCalculationUsage.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, date: today },
      _sum: { count: true },
    })
    const todayMap = new Map(todayCounts.map((c) => [c.userId, c._sum.count || 0]))

    // Get week counts
    const weekCounts = await prisma.chartCalculationUsage.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, date: { gte: weekStart } },
      _sum: { count: true },
    })
    const weekMap = new Map(weekCounts.map((c) => [c.userId, c._sum.count || 0]))

    // Get month counts
    const monthCounts = await prisma.chartCalculationUsage.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, date: { gte: monthStart } },
      _sum: { count: true },
    })
    const monthMap = new Map(monthCounts.map((c) => [c.userId, c._sum.count || 0]))

    const result: TopUserByCalculations[] = allTimeTotals
      .map((t) => {
        const user = usersMap.get(t.userId)
        if (!user) return null
        return {
          userId: t.userId,
          username: user.username,
          email: user.email,
          subscriptionPlan: user.subscriptionPlan,
          calculationsTotal: t._sum.count || 0,
          calculationsToday: todayMap.get(t.userId) || 0,
          calculationsThisWeek: weekMap.get(t.userId) || 0,
          calculationsThisMonth: monthMap.get(t.userId) || 0,
        }
      })
      .filter((r): r is TopUserByCalculations => r !== null)

    return { success: true, data: result }
  })
}

/**
 * Clear calculation usage history by time range (superadmin only)
 */
export async function clearCalculationHistory(
  timeRange: ClearHistoryTimeRange,
): Promise<ActionResult<{ deletedCount: number }>> {
  return withSuperAdminAuth(async (session) => {
    const now = new Date()
    let deletedCount = 0
    let dateFilter: string | undefined

    switch (timeRange) {
      case 'day': {
        // Delete only today's records
        const today = now.toISOString().split('T')[0]!
        const result = await prisma.chartCalculationUsage.deleteMany({
          where: { date: today },
        })
        deletedCount = result.count
        dateFilter = today
        break
      }
      case 'week': {
        // Delete last 7 days
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const weekStart = sevenDaysAgo.toISOString().split('T')[0]!
        const result = await prisma.chartCalculationUsage.deleteMany({
          where: { date: { gte: weekStart } },
        })
        deletedCount = result.count
        dateFilter = `>= ${weekStart}`
        break
      }
      case 'month': {
        // Delete last 30 days
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const monthStart = thirtyDaysAgo.toISOString().split('T')[0]!
        const result = await prisma.chartCalculationUsage.deleteMany({
          where: { date: { gte: monthStart } },
        })
        deletedCount = result.count
        dateFilter = `>= ${monthStart}`
        break
      }
      case 'all': {
        // Delete all records
        const result = await prisma.chartCalculationUsage.deleteMany({})
        deletedCount = result.count
        dateFilter = 'all'
        break
      }
    }

    // Log this action
    const ipAddress = await getClientIp()
    await prisma.adminAuditLog.create({
      data: {
        adminId: session.adminId,
        action: 'clear_calculation_history',
        details: JSON.stringify({ timeRange, dateFilter, deletedCount }),
        ipAddress,
      },
    })

    return { success: true, data: { deletedCount } }
  })
}

/**
 * Search users for autocomplete
 */
export async function searchUsers(
  query: string,
): Promise<ActionResult<{ id: string; username: string; email: string | null }[]>> {
  return withAdminAuth(async () => {
    if (!query || query.length < 2) {
      return { success: true, data: [] }
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
      take: 20,
    })

    return { success: true, data: users }
  })
}

export type CalculationStatsResult = {
  totalCalculations: number
  calculationsToday: number
  calculationsThisWeek: number
  calculationsThisMonth: number
  calculationsByType: { type: string; count: number }[]
  calculationsTodayByType: { type: string; count: number }[]
  calculationsByTypeThisWeek: { type: string; count: number }[]
  calculationsByTypeThisMonth: { type: string; count: number }[]
}

/**
 * Get detailed calculation stats, optionally filtered by user
 */
export async function getCalculationStats(userId?: string): Promise<ActionResult<CalculationStatsResult>> {
  return withAdminAuth(async () => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]!

    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const weekStart = sevenDaysAgo.toISOString().split('T')[0]!

    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const monthStart = thirtyDaysAgo.toISOString().split('T')[0]!

    // Base where clause
    const where: Prisma.ChartCalculationUsageWhereInput = {
      ...(userId && { userId }),
    }

    const [
      totalCalculations,
      calculationsToday,
      calculationsThisWeek,
      calculationsThisMonth,
      calculationsByTypeRaw,
      calculationsTodayByTypeRaw,
      calculationsThisWeekByTypeRaw,
      calculationsThisMonthByTypeRaw,
    ] = await Promise.all([
      // Total
      prisma.chartCalculationUsage.aggregate({
        where,
        _sum: { count: true },
      }),
      // Today
      prisma.chartCalculationUsage.aggregate({
        where: { ...where, date: today },
        _sum: { count: true },
      }),
      // This week
      prisma.chartCalculationUsage.aggregate({
        where: { ...where, date: { gte: weekStart } },
        _sum: { count: true },
      }),
      // This month
      prisma.chartCalculationUsage.aggregate({
        where: { ...where, date: { gte: monthStart } },
        _sum: { count: true },
      }),
      // By type (all time)
      prisma.chartCalculationUsage.groupBy({
        by: ['chartType'],
        where,
        _sum: { count: true },
      }),
      // By type (today)
      prisma.chartCalculationUsage.groupBy({
        by: ['chartType'],
        where: { ...where, date: today },
        _sum: { count: true },
      }),
      // By type (week)
      prisma.chartCalculationUsage.groupBy({
        by: ['chartType'],
        where: { ...where, date: { gte: weekStart } },
        _sum: { count: true },
      }),
      // By type (month)
      prisma.chartCalculationUsage.groupBy({
        by: ['chartType'],
        where: { ...where, date: { gte: monthStart } },
        _sum: { count: true },
      }),
    ])

    return {
      success: true,
      data: {
        totalCalculations: totalCalculations._sum.count || 0,
        calculationsToday: calculationsToday._sum.count || 0,
        calculationsThisWeek: calculationsThisWeek._sum.count || 0,
        calculationsThisMonth: calculationsThisMonth._sum.count || 0,
        calculationsByType: calculationsByTypeRaw.map((c) => ({
          type: c.chartType,
          count: c._sum.count || 0,
        })),
        calculationsTodayByType: calculationsTodayByTypeRaw.map((c) => ({
          type: c.chartType,
          count: c._sum.count || 0,
        })),
        calculationsByTypeThisWeek: calculationsThisWeekByTypeRaw.map((c) => ({
          type: c.chartType,
          count: c._sum.count || 0,
        })),
        calculationsByTypeThisMonth: calculationsThisMonthByTypeRaw.map((c) => ({
          type: c.chartType,
          count: c._sum.count || 0,
        })),
      },
    }
  })
}
