'use server'

import { prisma } from '@/lib/db/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logger } from '@/lib/logging/server'
import { withAuth } from '@/lib/security/auth'

const userProfileSchema = z.object({
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
})

export type UserProfileInput = z.infer<typeof userProfileSchema>

export interface UserProfileData {
  id: string
  username: string
  email: string | null
  firstName: string | null
  lastName: string | null
  hasPassword: boolean
  authProvider: string
}

/**
 * Get current user profile details
 */
export async function getUserProfile(): Promise<UserProfileData | null> {
  return withAuth(async (session) => {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        password: true,
        authProvider: true,
      },
    })

    if (!user) return null

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      hasPassword: user.password !== null,
      authProvider: user.authProvider,
    }
  }).catch(() => null)
}


/**
 * Update current user profile
 */
export async function updateUserProfile(data: UserProfileInput): Promise<{ success: boolean; error?: string }> {
  return withAuth(async (session) => {
    const validation = userProfileSchema.safeParse(data)
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || 'Invalid input' }
    }

    try {
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          firstName: validation.data.firstName || null,
          lastName: validation.data.lastName || null,
        },
      })

      revalidatePath('/settings')
      return { success: true }
    } catch (error) {
      logger.error('Failed to update profile:', error)
      return { success: false, error: 'Failed to update profile' }
    }
  }).catch(() => ({ success: false, error: 'Unauthorized' }))
}
