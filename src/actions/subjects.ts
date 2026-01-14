'use server'

/**
 * NOTE: DODO PAYMENTS - This file checks subject limits based on subscription plan
 */

import { prisma } from '@/lib/db/prisma'
import { revalidatePath } from 'next/cache'
import { mapPrismaSubjectToSubject } from '@/lib/db/mappers'
import { logger } from '@/lib/logging/server'
import { withAuth, NotFoundError, ForbiddenError } from '@/lib/security/auth'
import { parseBirthDateTime } from '@/lib/utils/date'
import { canCreateSubject, getPlanLimits } from '@/lib/subscription/plan-limits' // DODO PAYMENTS: Plan limits
import type { CreateSubjectInput, UpdateSubjectInput, Subject } from '@/types/subjects'

/**
 * Get all subjects owned by the current user
 *
 * @returns Array of subjects ordered by creation date (newest first)
 * @throws Error if user is not authenticated
 */
export async function getSubjects(): Promise<Subject[]> {
  return withAuth(async (session) => {
    const subjects = await prisma.subject.findMany({
      where: { ownerId: session.userId },
      orderBy: { createdAt: 'desc' },
    })

    return subjects.map(mapPrismaSubjectToSubject)
  })
}

/**
 * Get a single subject by ID
 *
 * @param id - Subject UUID
 * @returns Subject if found and owned by current user, null otherwise
 * @throws Error if user is not authenticated
 */
export async function getSubjectById(id: string): Promise<Subject | null> {
  return withAuth(async (session) => {
    const subject = await prisma.subject.findFirst({
      where: {
        id,
        ownerId: session.userId,
      },
    })

    if (!subject) {
      return null
    }

    return mapPrismaSubjectToSubject(subject)
  })
}

/**
 * Create a new subject
 *
 * @param data - Subject creation data
 * @returns Newly created subject
 * @throws Error if user is not authenticated or data is invalid
 */
export async function createSubject(data: CreateSubjectInput): Promise<Subject> {
  return withAuth(async (session) => {
    // DODO PAYMENTS: Check subject limit for free plan
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { subscriptionPlan: true, _count: { select: { subjects: true } } },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const currentCount = user._count.subjects
    if (!canCreateSubject(user.subscriptionPlan, currentCount)) {
      const limits = getPlanLimits(user.subscriptionPlan)
      throw new ForbiddenError(
        `Subject limit reached. Your plan allows ${limits.maxSubjects} subjects. Upgrade to create more.`,
      )
    }

    // Validate birth date
    if (!data.birthDate || isNaN(Date.parse(data.birthDate))) {
      throw new Error('Invalid birth date')
    }

    // Parse birth datetime using centralized utility
    let birthDatetime: Date
    try {
      birthDatetime = parseBirthDateTime(data.birthDate, data.birthTime)
      logger.debug('Creating subject with birthDatetime:', birthDatetime.toISOString())
    } catch (error) {
      logger.error('Date parsing error:', error)
      throw new Error('Invalid birth date/time format')
    }

    const subject = await prisma.subject.create({
      data: {
        name: data.name,
        birthDatetime,
        city: data.city,
        nation: data.nation,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        rodensRating: data.rodens_rating,

        tags: data.tags ? JSON.stringify(data.tags) : null,
        notes: data.notes,
        ownerId: session.userId,
      },
    })

    revalidatePath('/subjects')

    return mapPrismaSubjectToSubject(subject)
  })
}

/**
 * Find or create a subject (prevents duplicates based on name + birthDatetime)
 *
 * Used primarily by the save-subject flow from public chart pages.
 * Returns existing subject if one with matching name + birthDatetime exists.
 *
 * @param data - Subject creation data
 * @returns Existing or newly created subject
 * @throws Error if user is not authenticated or data is invalid
 */
export async function findOrCreateSubject(data: CreateSubjectInput): Promise<Subject> {
  return withAuth(async (session) => {
    // Parse birth datetime first
    if (!data.birthDate || isNaN(Date.parse(data.birthDate))) {
      throw new Error('Invalid birth date')
    }

    let birthDatetime: Date
    try {
      birthDatetime = parseBirthDateTime(data.birthDate, data.birthTime)
    } catch (error) {
      logger.error('Date parsing error:', error)
      throw new Error('Invalid birth date/time format')
    }

    // Check for existing subject with same name and birthDatetime
    const existing = await prisma.subject.findFirst({
      where: {
        ownerId: session.userId,
        name: data.name,
        birthDatetime,
      },
    })

    if (existing) {
      logger.info(`Found existing subject: ${existing.id} for name="${data.name}"`)
      return mapPrismaSubjectToSubject(existing)
    }

    // DODO PAYMENTS: Check subject limit for free plan
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { subscriptionPlan: true, _count: { select: { subjects: true } } },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const currentCount = user._count.subjects
    if (!canCreateSubject(user.subscriptionPlan, currentCount)) {
      const limits = getPlanLimits(user.subscriptionPlan)
      throw new ForbiddenError(
        `Subject limit reached. Your plan allows ${limits.maxSubjects} subjects. Upgrade to create more.`,
      )
    }

    const subject = await prisma.subject.create({
      data: {
        name: data.name,
        birthDatetime,
        city: data.city,
        nation: data.nation,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        rodensRating: data.rodens_rating,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        notes: data.notes,
        ownerId: session.userId,
      },
    })

    revalidatePath('/subjects')

    return mapPrismaSubjectToSubject(subject)
  })
}

/**
 * Update an existing subject
 *
 * @param data - Subject update data (must include id)
 * @returns Updated subject
 * @throws Error if user is not authenticated, unauthorized, or data is invalid
 */
export async function updateSubject(data: UpdateSubjectInput): Promise<Subject> {
  return withAuth(async (session) => {
    // Verify ownership with single optimized query
    const existing = await prisma.subject.findFirst({
      where: {
        id: data.id,
        ownerId: session.userId,
      },
      select: { id: true },
    })

    if (!existing) {
      throw new NotFoundError('Subject not found or unauthorized')
    }

    let birthDatetime: Date | undefined

    // Only parse birth date if provided
    if (data.birthDate) {
      try {
        birthDatetime = parseBirthDateTime(data.birthDate, data.birthTime)
      } catch {
        throw new Error('Invalid birth date/time format')
      }
    }

    const subject = await prisma.subject.update({
      where: { id: data.id },
      data: {
        name: data.name,
        birthDatetime,
        city: data.city,
        nation: data.nation,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        rodensRating: data.rodens_rating,

        tags: data.tags ? JSON.stringify(data.tags) : undefined,
        notes: data.notes,
      },
    })

    revalidatePath('/subjects')

    return mapPrismaSubjectToSubject(subject)
  })
}

/**
 * Delete a subject
 *
 * @param id - Subject UUID to delete
 * @returns Object with deleted subject's id
 * @throws Error if user is not authenticated or unauthorized
 */
export async function deleteSubject(id: string): Promise<{ id: string }> {
  return withAuth(async (session) => {
    // Use deleteMany with conditions to verify ownership and delete in one query
    const result = await prisma.subject.deleteMany({
      where: {
        id,
        ownerId: session.userId,
      },
    })

    if (result.count === 0) {
      throw new NotFoundError('Subject not found or unauthorized')
    }

    revalidatePath('/subjects')

    return { id }
  })
}

/**
 * Delete multiple subjects
 *
 * @param ids - Array of Subject UUIDs to delete
 * @returns Object with count of deleted records
 * @throws Error if user is not authenticated
 */
export async function deleteSubjects(ids: string[]): Promise<{ count: number }> {
  return withAuth(async (session) => {
    const result = await prisma.subject.deleteMany({
      where: {
        id: { in: ids },
        ownerId: session.userId,
      },
    })

    revalidatePath('/subjects')

    return { count: result.count }
  })
}

/**
 * Import multiple subjects with deduplication
 *
 * Checks for existing subjects with matching name + birthDatetime before importing.
 * Duplicates are skipped and reported in the response.
 *
 * @param subjects - Array of subject creation data
 * @returns Import results with created, skipped, failed counts and error messages
 */
export async function importSubjects(
  subjects: CreateSubjectInput[],
): Promise<{ created: number; skipped: number; failed: number; errors: string[] }> {
  return withAuth(async (session) => {
    // DODO PAYMENTS: Check subject limit for free plan
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { subscriptionPlan: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const limits = getPlanLimits(user.subscriptionPlan)

    // Fetch existing subjects for deduplication
    const existingSubjects = await prisma.subject.findMany({
      where: { ownerId: session.userId },
      select: { name: true, birthDatetime: true },
    })

    // Build signature set for O(1) lookup
    const existingSignatures = new Set(
      existingSubjects.map((s) => `${s.name.toLowerCase().trim()}|${s.birthDatetime.toISOString()}`),
    )

    // DODO PAYMENTS: Calculate remaining quota
    const currentCount = existingSubjects.length
    let remainingQuota = limits.maxSubjects === Infinity ? Infinity : limits.maxSubjects - currentCount

    let createdCount = 0
    let skippedCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (const data of subjects) {
      try {
        // Validate required fields
        if (!data.birthDate || isNaN(Date.parse(data.birthDate))) {
          throw new Error(`Invalid birth date for "${data.name}"`)
        }

        // Parse birth datetime
        let birthDatetime: Date
        try {
          birthDatetime = parseBirthDateTime(data.birthDate, data.birthTime)
        } catch {
          throw new Error(`Invalid date/time format for "${data.name}"`)
        }

        // Check for duplicates
        const signature = `${data.name.toLowerCase().trim()}|${birthDatetime.toISOString()}`
        if (existingSignatures.has(signature)) {
          skippedCount++
          continue
        }

        // DODO PAYMENTS: Check remaining quota
        if (remainingQuota <= 0) {
          failedCount++
          errors.push(`Subject limit reached. Upgrade to import more subjects.`)
          continue
        }

        // Decrement remaining quota
        remainingQuota--

        // Create subject
        await prisma.subject.create({
          data: {
            name: data.name,
            birthDatetime,
            city: data.city,
            nation: data.nation,
            latitude: data.latitude,
            longitude: data.longitude,
            timezone: data.timezone,
            rodensRating: data.rodens_rating,
            tags: data.tags ? JSON.stringify(data.tags) : null,
            notes: data.notes,
            ownerId: session.userId,
          },
        })

        // Add to signatures to prevent duplicates within same batch
        existingSignatures.add(signature)
        createdCount++
      } catch (error) {
        failedCount++
        errors.push((error as Error).message)
      }
    }

    if (createdCount > 0) {
      revalidatePath('/subjects')
    }

    return { created: createdCount, skipped: skippedCount, failed: failedCount, errors }
  })
}
