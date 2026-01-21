'use server'

import { astrologerApi } from '@/lib/api/astrologer'
import { getSession } from '@/lib/security/session'
import { prisma } from '@/lib/db/prisma'
import type {
  SubjectModel,
  ChartResponse,
  ChartRequestOptions,
  PlanetaryReturnRequestOptions,
  EnrichedSubjectModel,
} from '@/types/astrology'
import type { Subject } from '@/types/subjects'
import { getChartPreferences, type ChartPreferencesData } from '@/actions/preferences'

/**
 * Track a chart calculation for analytics
 * Non-blocking: errors are logged but don't fail the chart calculation
 */
async function trackChartCalculation(userId: string, chartType: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0]!

  try {
    await prisma.chartCalculationUsage.upsert({
      where: {
        userId_date_chartType: { userId, date: today, chartType },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        userId,
        date: today,
        chartType,
        count: 1,
      },
    })
  } catch (error) {
    // Non-blocking: don't fail the chart if tracking fails
    console.error('Failed to track chart calculation:', error)
  }
}

/**
 * Converts local Subject type to API SubjectModel format
 *
 * @param subject - Subject from database
 * @returns SubjectModel formatted for API requests
 *
 * @remarks
 * - Extracts date components from ISO datetime string
 * - Uses UTC values to avoid timezone issues
 * - Includes all required location data
 */
/**
 * Converts Subject to basic SubjectModel (no config)
 */
function toBasicSubjectModel(subject: Subject): SubjectModel {
  const date = new Date(subject.birth_datetime)

  return {
    name: subject.name,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    city: subject.city,
    nation: subject.nation,
    timezone: subject.timezone,
    longitude: subject.longitude,
    latitude: subject.latitude,
  }
}

/**
 * Converts Subject to SubjectModel with user preferences applied
 */
function toSubjectModelWithPreferences(subject: Subject, prefs: ChartPreferencesData): SubjectModel {
  const basicModel = toBasicSubjectModel(subject)

  if (!prefs.default_zodiac_system) {
    throw new Error('Missing required preference: default_zodiac_system')
  }
  if (!prefs.house_system) {
    throw new Error('Missing required preference: house_system')
  }
  if (!prefs.perspective_type) {
    throw new Error('Missing required preference: perspective_type')
  }

  const zodiacType = prefs.default_zodiac_system
  const siderealMode = zodiacType === 'Sidereal' ? prefs.default_sidereal_mode || null : null

  return {
    ...basicModel,
    zodiac_type: zodiacType,
    sidereal_mode: siderealMode,
    houses_system_identifier: prefs.house_system,
    perspective_type: prefs.perspective_type,
  }
}

/**
 * Merges user preferences with request options
 */
function mergeOptionsWithPreferences(
  options: ChartRequestOptions | undefined,
  prefs: ChartPreferencesData,
): ChartRequestOptions {
  // Validate required preferences
  // active_points can be empty if user wants to hide all points
  if (!prefs.active_aspects || prefs.active_aspects.length === 0) {
    throw new Error('Missing required preference: active_aspects')
  }

  // Handle custom_distribution_weights - only include if it has keys
  const hasCustomWeights =
    prefs.custom_distribution_weights && Object.keys(prefs.custom_distribution_weights).length > 0

  return {
    theme: prefs.theme as ChartRequestOptions['theme'],
    language: 'EN',
    transparent_background: true,
    show_house_position_comparison: true,
    show_cusp_position_comparison: true,
    show_degree_indicators: prefs.show_degree_indicators,
    show_aspect_icons: prefs.show_aspect_icons,
    distribution_method: prefs.distribution_method as ChartRequestOptions['distribution_method'],
    active_points: prefs.active_points,
    active_aspects: prefs.active_aspects,
    custom_distribution_weights: hasCustomWeights ? prefs.custom_distribution_weights : undefined,
    split_chart: true,
    custom_title: undefined,
    ...options,
  }
}

export async function getNatalChart(subject: Subject, options?: ChartRequestOptions): Promise<ChartResponse> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  // Track calculation (non-blocking)
  trackChartCalculation(session.userId, 'natal')

  const prefs = await getChartPreferences()
  if (!prefs) throw new Error('User preferences not found')

  const mergedOptions = mergeOptionsWithPreferences(options, prefs)
  const subjectModel = toSubjectModelWithPreferences(subject, prefs)

  return await astrologerApi.getNatalChart(subjectModel, mergedOptions)
}

export async function getTransitChart(
  natalSubject: Subject,
  transitSubject: Subject,
  options?: ChartRequestOptions,
): Promise<ChartResponse> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  // Track calculation (non-blocking)
  trackChartCalculation(session.userId, 'transit')

  const prefs = await getChartPreferences()
  if (!prefs) throw new Error('User preferences not found')

  const mergedOptions = mergeOptionsWithPreferences(options, prefs)

  // Config goes on natal subject only
  const natalModel = toSubjectModelWithPreferences(natalSubject, prefs)
  const transitModel = toBasicSubjectModel(transitSubject)

  return await astrologerApi.getTransitChart(natalModel, transitModel, mergedOptions)
}

export async function getSynastryChart(
  subjectA: Subject,
  subjectB: Subject,
  options?: ChartRequestOptions,
): Promise<ChartResponse> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  // Track calculation (non-blocking)
  trackChartCalculation(session.userId, 'synastry')

  const prefs = await getChartPreferences()
  if (!prefs) throw new Error('User preferences not found')

  const mergedOptions = mergeOptionsWithPreferences(options, prefs)

  // Config goes on first subject
  const modelA = toSubjectModelWithPreferences(subjectA, prefs)
  const modelB = toBasicSubjectModel(subjectB)

  return await astrologerApi.getSynastryChart(modelA, modelB, mergedOptions)
}

export async function getCompositeChart(
  subjectA: Subject,
  subjectB: Subject,
  options?: ChartRequestOptions,
): Promise<ChartResponse> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  // Track calculation (non-blocking)
  trackChartCalculation(session.userId, 'composite')

  const prefs = await getChartPreferences()
  if (!prefs) throw new Error('User preferences not found')

  const mergedOptions = mergeOptionsWithPreferences(options, prefs)

  // Config goes on first subject
  const modelA = toSubjectModelWithPreferences(subjectA, prefs)
  const modelB = toBasicSubjectModel(subjectB)

  const response = await astrologerApi.getCompositeChart(modelA, modelB, mergedOptions)

  // Ensure first_subject and second_subject are present in the response
  // This is required for AI interpretation context generation
  if (response.status === 'OK' && response.chart_data) {
    if (!response.chart_data.first_subject) {
      response.chart_data.first_subject = modelA as EnrichedSubjectModel
    }
    if (!response.chart_data.second_subject) {
      response.chart_data.second_subject = modelB as EnrichedSubjectModel
    }
  }

  return response
}

export async function getNowChart(options?: ChartRequestOptions): Promise<ChartResponse> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  // Track calculation (non-blocking)
  trackChartCalculation(session.userId, 'now')

  const prefs = await getChartPreferences()
  if (!prefs) throw new Error('User preferences not found')

  const mergedOptions = mergeOptionsWithPreferences(options, prefs)

  return await astrologerApi.getNowChart(mergedOptions)
}

export async function getSolarReturnChart(
  subject: Subject,
  options?: PlanetaryReturnRequestOptions,
): Promise<ChartResponse> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  // Track calculation (non-blocking)
  trackChartCalculation(session.userId, 'solar-return')

  const prefs = await getChartPreferences()
  if (!prefs) throw new Error('User preferences not found')

  const mergedOptions = mergeOptionsWithPreferences(options, prefs)
  const subjectModel = toSubjectModelWithPreferences(subject, prefs)

  return await astrologerApi.getSolarReturnChart(subjectModel, {
    ...mergedOptions,
    year: options?.year,
    month: options?.month,
    iso_datetime: options?.iso_datetime,
    return_location: options?.return_location,
    wheel_type: options?.wheel_type,
  })
}

export async function getLunarReturnChart(
  subject: Subject,
  options?: PlanetaryReturnRequestOptions,
): Promise<ChartResponse> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  // Track calculation (non-blocking)
  trackChartCalculation(session.userId, 'lunar-return')

  const prefs = await getChartPreferences()
  if (!prefs) throw new Error('User preferences not found')

  const mergedOptions = mergeOptionsWithPreferences(options, prefs)
  const subjectModel = toSubjectModelWithPreferences(subject, prefs)

  return await astrologerApi.getLunarReturnChart(subjectModel, {
    ...mergedOptions,
    year: options?.year,
    month: options?.month,
    iso_datetime: options?.iso_datetime,
    return_location: options?.return_location,
    wheel_type: options?.wheel_type,
  })
}
