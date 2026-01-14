'use server'

import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import {
  createAdminSession,
  deleteAdminSession,
  getAdminSession,
  getClientIp,
} from '@/lib/security/admin-session'
import { verifyRecaptcha } from '@/lib/security/recaptcha'
import { withAdminAuth, withSuperAdminAuth } from '@/lib/security/admin-auth'

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

  // Find admin user
  const admin = await prisma.adminUser.findUnique({
    where: { username: validation.data.username },
  })

  if (!admin) {
    // Don't reveal if username exists
    return { success: false, error: 'Invalid credentials' }
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(validation.data.password, admin.password)
  if (!isPasswordValid) {
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
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<ActionResult<DashboardStats>> {
  return withAdminAuth(async (session) => {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfDay)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalUsers,
      usersToday,
      usersThisWeek,
      usersThisMonth,
      usersByPlan,
      aiUsageToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.groupBy({
        by: ['subscriptionPlan'],
        _count: true,
      }),
      prisma.userAIUsage.aggregate({
        where: { date: now.toISOString().split('T')[0] },
        _sum: { count: true },
      }),
    ])

    // Get total AI generations from all users
    const totalAIGenerationsResult = await prisma.user.aggregate({
      _sum: { aiGenerationsTotal: true },
    })

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
      },
    }
  })
}

// ============================================================================
// User Management
// ============================================================================

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
  sortBy: 'createdAt' | 'lastLoginAt' = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<ActionResult<UsersListResult>> {
  return withAdminAuth(async (session) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (planFilter) {
      where.subscriptionPlan = planFilter
    }

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
        orderBy: { [sortBy]: sortOrder },
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
      },
    }
  })
}

/**
 * Update user's subscription plan (admin action)
 */
export async function updateUserPlan(
  userId: string,
  newPlan: string
): Promise<ActionResult> {
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
 */
export async function deleteUser(userId: string): Promise<ActionResult> {
  return withSuperAdminAuth(async (session) => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { success: false, error: 'User not found' }
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
  role: 'admin' | 'superadmin'
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
