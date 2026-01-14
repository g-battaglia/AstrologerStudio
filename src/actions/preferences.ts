'use server'

import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/security/session'
import { revalidatePath } from 'next/cache'
import { DEFAULT_ACTIVE_ASPECTS, isMajorAspect } from '@/lib/astrology/aspects'
import { logger } from '@/lib/logging/server'

/**
 * Chart preferences data structure
 */
export interface ChartPreferencesData {
  /** Visual theme (classic, dark, light, etc.) */
  theme: string

  /** Date display format (US, EU, ISO) */
  date_format: 'US' | 'EU' | 'ISO'
  /** Time display format (12h, 24h) */
  time_format: '12h' | '24h'
  /** Show aspect icons on aspect lines */
  show_aspect_icons: boolean

  show_degree_indicators: boolean
  /** Element/quality distribution calculation method */
  distribution_method: string
  /** List of celestial points to include */
  active_points: string[]
  /** Aspect configuration */
  active_aspects: { name: string; orb: number }[]
  /** Custom weights for distribution */
  custom_distribution_weights: Record<string, number>

  /** Zodiac system (Tropical or Sidereal) */
  default_zodiac_system: string
  /** Sidereal mode (ayanamsa) if zodiac system is Sidereal */
  /** Sidereal mode (ayanamsa) if zodiac system is Sidereal */
  default_sidereal_mode: string
  /** House system (Placidus, etc.) */
  house_system: string
  /** Perspective type (Geocentric, Heliocentric) */
  perspective_type: string
  /** Rulership system (classical, modern) */
  rulership_mode: 'classical' | 'modern'
}

/**
 * Get chart rendering preferences for current user
 *
 * @returns User's chart preferences or null if not found/not authenticated
 *
 * @remarks
 * - Returns null if user is not authenticated
 * - Returns null if user has no preferences set
 * - Parses JSON fields (active_points, active_aspects)
 *
 * Get user's chart preferences, creating defaults if they don't exist
 */
export async function getChartPreferences(): Promise<ChartPreferencesData | null> {
  try {
    const session = await getSession()
    if (!session?.userId) return null

    let prefs = await prisma.chartPreferences.findUnique({
      where: { userId: session.userId },
    })

    const defaultActivePoints = [
      'Sun',
      'Moon',
      'Mercury',
      'Venus',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
      'Pluto',
      'True_North_Lunar_Node',
      'True_South_Lunar_Node',
      'Ascendant',
      'Medium_Coeli',
    ]

    const defaultDistributionWeights = {
      sun: 2,
      moon: 2,
      mercury: 1.5,
      venus: 1.5,
      mars: 1.5,
      jupiter: 1,
      saturn: 1,
      ascendant: 2,
      medium_coeli: 1.5,
    }

    // If no preferences exist, create them
    // If no preferences exist, create them
    if (!prefs) {
      // Verify user exists before creating preferences to avoid FK violation
      const userExists = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true },
      })

      if (!userExists) {
        return null
      }

      prefs = await prisma.chartPreferences.create({
        data: {
          userId: session.userId,
          theme: 'classic',
          show_aspect_icons: true,

          distribution_method: 'weighted',
          active_points: JSON.stringify(defaultActivePoints),
          active_aspects: JSON.stringify(DEFAULT_ACTIVE_ASPECTS.filter((a) => isMajorAspect(a.name))),
          custom_distribution_weights: JSON.stringify(defaultDistributionWeights),

          default_zodiac_system: 'Tropical',
          default_sidereal_mode: 'LAHIRI',
          house_system: 'P',

          perspective_type: 'Apparent Geocentric',
          rulership_mode: 'classical',
        },
      })
    } else {
      // Check if critical fields are missing or empty
      const needsUpdate =
        !prefs.active_points ||
        !prefs.active_aspects ||
        !prefs.house_system ||
        !prefs.perspective_type ||
        !prefs.default_zodiac_system

      if (needsUpdate) {
        prefs = await prisma.chartPreferences.update({
          where: { userId: session.userId },
          data: {
            active_points: !prefs.active_points ? JSON.stringify(defaultActivePoints) : prefs.active_points,
            active_aspects: !prefs.active_aspects
              ? JSON.stringify(DEFAULT_ACTIVE_ASPECTS.filter((a) => isMajorAspect(a.name)))
              : prefs.active_aspects,
            house_system: prefs.house_system || 'P',
            perspective_type: prefs.perspective_type || 'Apparent Geocentric',
            default_zodiac_system: prefs.default_zodiac_system || 'Tropical',
            theme: prefs.theme || 'classic',

            distribution_method: prefs.distribution_method || 'weighted',
            rulership_mode: prefs.rulership_mode || 'classical',
          },
        })
      }
    }

    return {
      theme: prefs.theme,
      date_format: (prefs.date_format as 'US' | 'EU' | 'ISO') ?? 'EU',
      time_format: (prefs.time_format as '12h' | '24h') ?? '24h',
      show_aspect_icons: prefs.show_aspect_icons ?? true,

      show_degree_indicators: prefs.show_degree_indicators ?? true,
      distribution_method: prefs.distribution_method,
      active_points: prefs.active_points ? JSON.parse(prefs.active_points) : [],
      active_aspects: prefs.active_aspects ? JSON.parse(prefs.active_aspects) : [],
      custom_distribution_weights: prefs.custom_distribution_weights
        ? JSON.parse(prefs.custom_distribution_weights)
        : {},

      default_zodiac_system: prefs.default_zodiac_system,
      default_sidereal_mode: prefs.default_sidereal_mode,
      house_system: mapLegacyHouseSystem(prefs.house_system),
      perspective_type: mapLegacyPerspective(prefs.perspective_type),
      rulership_mode: (prefs.rulership_mode as 'classical' | 'modern') || 'classical',
    } as ChartPreferencesData
  } catch (error) {
    logger.error('Failed to get chart preferences', error)
    return null
  }
}

function mapLegacyHouseSystem(value: string | null): string {
  if (!value) {
    throw new Error('house_system preference is required but not set in database')
  }

  // Map legacy full names to codes
  switch (value) {
    case 'Placidus':
      return 'P'
    case 'Koch':
      return 'K'
    case 'Whole_Sign':
      return 'W'
    case 'Equal':
      return 'A'
    case 'Regiomontanus':
      return 'R'
    case 'Campanus':
      return 'C'
    case 'Porphyry':
      return 'O'
    case 'Morinus':
      return 'M'
    case 'Topocentric':
      return 'T'
    case 'Alcabitius':
      return 'B'
    default:
      return value // Assume it's already a code if not matching legacy names
  }
}

function mapLegacyPerspective(value: string | null): string {
  if (!value) {
    throw new Error('perspective_type preference is required but not set in database')
  }

  if (value === 'Geocentric') return 'Apparent Geocentric'
  return value
}

import { omitKeys } from '@/lib/utils/object'

/**
 * Update or create chart preferences for current user
 *
 * @param data - Partial preferences data to update
 * @throws Error if user is not authenticated
 *
 * @remarks
 * - Uses upsert to create if not exists or update if exists
 * - Serializes complex fields (active_points, active_aspects) to JSON
 * - Revalidates all chart-related pages
 *
 * @example
 * ```ts
 * await updateChartPreferences({
 *   theme: 'dark',
 *   language: 'EN',
 * })
 * ```
 */
export async function updateChartPreferences(data: Partial<ChartPreferencesData>): Promise<void> {
  try {
    const session = await getSession()
    if (!session) throw new Error('Unauthorized')

    const { active_points, active_aspects, custom_distribution_weights } = data

    // Only omit fields that need JSON.stringify - everything else passes through via ...rest
    const rest = omitKeys(data, ['active_points', 'active_aspects', 'custom_distribution_weights'] as const)

    const customWeightsString = custom_distribution_weights ? JSON.stringify(custom_distribution_weights) : undefined

    // Verify user exists before upserting preferences to avoid FK violation
    const userExists = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true },
    })

    if (!userExists) {
      throw new Error('User not found')
    }

    await prisma.chartPreferences.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        ...rest,
        active_points: active_points ? JSON.stringify(active_points) : undefined,
        active_aspects: active_aspects ? JSON.stringify(active_aspects) : undefined,
        custom_distribution_weights: customWeightsString,
      },
      update: {
        ...rest,
        active_points: active_points ? JSON.stringify(active_points) : undefined,
        active_aspects: active_aspects ? JSON.stringify(active_aspects) : undefined,
        custom_distribution_weights: customWeightsString,
      },
    })

    // Revalidate all chart-related pages
    revalidatePath('/settings')
    revalidatePath('/now-chart')
    revalidatePath('/subjects/[id]/natal')
    revalidatePath('/subjects/[id]/transits')
    revalidatePath('/subjects/[id]/synastry')
  } catch (error) {
    logger.error('Failed to update chart preferences', error)
    console.error('Full error details:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      throw error
    }
    // Re-throw with original error message for debugging
    throw new Error(`Failed to update preferences: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
