'use server'

import { astrologerApi } from '@/lib/api/astrologer'
import type { SubjectModel, ChartResponse, ChartRequestOptions } from '@/types/astrology'

/**
 * Default chart preferences for public/unauthenticated users
 * These are sensible defaults that provide a good demo experience
 */
import { headers } from 'next/headers'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/security/rate-limit'

/**
 * Default chart preferences for public/unauthenticated users
 * These are sensible defaults that provide a good demo experience
 */
const DEFAULT_PUBLIC_PREFERENCES = {
  theme: 'classic' as const,
  zodiac_type: 'Tropical' as const,
  house_system: 'P', // Placidus
  perspective_type: 'Apparent Geocentric',
  active_points: [
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
    'Mean_Node',
    'Chiron',
  ],
  // Aspects must be objects with name and orb - names must be lowercase
  active_aspects: [
    { name: 'conjunction', orb: 10 },
    { name: 'opposition', orb: 10 },
    { name: 'trine', orb: 8 },
    { name: 'square', orb: 8 },
    { name: 'sextile', orb: 6 },
  ],
}

/**
 * Public birth data input for chart generation
 */
export interface PublicBirthData {
  name: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  city: string
  nation: string
  latitude: number
  longitude: number
  timezone: string
}

/**
 * Converts public birth data to SubjectModel format
 */
function toSubjectModel(data: PublicBirthData): SubjectModel {
  return {
    name: data.name,
    year: data.year,
    month: data.month,
    day: data.day,
    hour: data.hour,
    minute: data.minute,
    second: 0,
    city: data.city,
    nation: data.nation,
    timezone: data.timezone,
    longitude: data.longitude,
    latitude: data.latitude,
    zodiac_type: DEFAULT_PUBLIC_PREFERENCES.zodiac_type,
    houses_system_identifier: DEFAULT_PUBLIC_PREFERENCES.house_system,
    perspective_type: DEFAULT_PUBLIC_PREFERENCES.perspective_type,
  }
}

/**
 * Generate a natal chart for public/unauthenticated users
 *
 * This action is publicly accessible and uses default chart preferences.
 * It allows users to test the SaaS before creating an account.
 *
 * @param birthData - Birth data for the chart
 * @param theme - Chart theme ('classic' or 'dark')
 * @returns Chart response with SVG and data
 */
export async function getPublicNatalChart(
  birthData: PublicBirthData,
  theme: 'classic' | 'dark' = 'classic'
): Promise<ChartResponse> {
  // Rate Limiting
  const headersList = await headers()
  const clientIp = getClientIp(headersList)
  // Use publicChart rate limiting (60 req/min for demo users)
  const rateLimit = checkRateLimit(`public_chart:${clientIp}`, RATE_LIMITS.publicChart)

  if (!rateLimit.success) {
    throw new Error('Too many requests. Please try again later.')
  }

  const subjectModel = toSubjectModel(birthData)

  const options: ChartRequestOptions = {
    theme,
    language: 'EN',
    transparent_background: true,
    show_house_position_comparison: false,
    show_cusp_position_comparison: false,
    show_degree_indicators: true,
    show_aspect_icons: true,
    distribution_method: 'weighted',
    active_points: DEFAULT_PUBLIC_PREFERENCES.active_points,
    active_aspects: DEFAULT_PUBLIC_PREFERENCES.active_aspects,
    split_chart: true,
  }

  return await astrologerApi.getNatalChart(subjectModel, options)
}

/**
 * Generate a "now" chart for public/unauthenticated users
 *
 * Shows the current planetary positions without requiring authentication.
 * This is the default chart shown when users land on the try page.
 *
 * @param theme - Chart theme ('classic' or 'dark')
 * @returns Chart response with SVG and data
 */
export async function getPublicNowChart(
  theme: 'classic' | 'dark' = 'classic'
): Promise<ChartResponse> {
  // Rate Limiting
  const headersList = await headers()
  const clientIp = getClientIp(headersList)
  // Use publicChart rate limiting (60 req/min for demo users)
  const rateLimit = checkRateLimit(`public_chart:${clientIp}`, RATE_LIMITS.publicChart)

  if (!rateLimit.success) {
    throw new Error('Too many requests. Please try again later.')
  }

  const options: ChartRequestOptions = {
    theme,
    language: 'EN',
    transparent_background: true,
    show_house_position_comparison: false,
    show_cusp_position_comparison: false,
    show_degree_indicators: true,
    show_aspect_icons: true,
    distribution_method: 'weighted',
    active_points: DEFAULT_PUBLIC_PREFERENCES.active_points,
    active_aspects: DEFAULT_PUBLIC_PREFERENCES.active_aspects,
    split_chart: true,
  }

  const response = await astrologerApi.getNowChart(options)

  // Override the name to show "Demo Chart" instead of API default "Now Chart"
  if (response.chart_data?.subject) {
    response.chart_data.subject.name = 'Demo Chart'
  }

  return response
}
