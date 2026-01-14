import type { Subject as PrismaSubject } from '@prisma/client'
import type { Subject } from '@/types/subjects'

/**
 * Maps a Prisma Subject to the application Subject type
 * Reduces code duplication across subject actions
 *
 * @param prismaSubject - Subject from Prisma database
 * @returns Subject formatted for application use
 *
 * @remarks
 * - Converts Date to ISO string
 * - Handles null values with defaults
 * - Parses JSON tags field
 *
 * @example
 * ```ts
 * const dbSubject = await prisma.subject.findUnique({ where: { id } })
 * const subject = mapPrismaSubjectToSubject(dbSubject)
 * ```
 */
export function mapPrismaSubjectToSubject(prismaSubject: PrismaSubject): Subject {
  return {
    ...prismaSubject,
    birth_datetime: prismaSubject.birthDatetime.toISOString(),
    city: prismaSubject.city ?? '',
    nation: prismaSubject.nation ?? '',
    latitude: prismaSubject.latitude ?? 0,
    longitude: prismaSubject.longitude ?? 0,
    timezone: prismaSubject.timezone ?? 'UTC',
    rodens_rating: prismaSubject.rodensRating as Subject['rodens_rating'],
    tags: prismaSubject.tags ? JSON.parse(prismaSubject.tags) : null,
  }
}
