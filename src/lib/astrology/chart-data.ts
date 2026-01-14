/**
 * @fileoverview Utility functions for ChartDataView component.
 *
 * This module contains all the business logic for processing and transforming
 * astrological chart data for display in the ChartDataView component.
 * It handles planet ordering, distribution calculations, and data preparation
 * for radar charts.
 *
 * @module chartDataViewUtils
 */

import { ChartData, ChartResponse } from '@/types/astrology'

// ============================================================================
// Constants
// ============================================================================

/**
 * Canonical ordering of planets and points for consistent display.
 * This follows traditional astrological conventions, with luminaries first,
 * followed by personal planets, social planets, transpersonal planets,
 * and finally calculated points.
 */
export const PLANET_ORDER = [
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
  'Chiron',
  'Mean Lilith',
  'True North Lunar Node',
  'True South Lunar Node',
  'Ascendant',
  'Midheaven',
  'Descendant',
  'Imum Coeli',
  'Vertex',
  'Part of Fortune',
] as const

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a chart point with its astrological properties.
 * Note: Named ChartPoint to avoid conflict with CelestialPointName type.
 */
export interface ChartPoint {
  name: string
  emoji: string
  sign: string
  position: number
  house?: string
  retrograde?: boolean
  speed?: number
  element?: string
  quality?: string
}

/**
 * Element distribution counts.
 */
export interface ElementCounts {
  fire: number
  earth: number
  air: number
  water: number
}

/**
 * Quality distribution counts.
 */
export interface QualityCounts {
  cardinal: number
  fixed: number
  mutable: number
}

/**
 * Element distribution with percentages.
 */
export interface ElementDistribution extends ElementCounts {
  fire_percentage: number
  earth_percentage: number
  air_percentage: number
  water_percentage: number
}

/**
 * Quality distribution with percentages.
 */
export interface QualityDistribution extends QualityCounts {
  cardinal_percentage: number
  fixed_percentage: number
  mutable_percentage: number
}

/**
 * Data structure for a single point in the radar chart.
 */
export interface RadarDataPoint {
  /** The category label (e.g., 'Fire', 'Cardinal') */
  subject: string
  /** Primary chart value */
  primary: number
  /** Secondary chart value (for dual charts) */
  secondary: number
  /** Maximum value for the radar axis */
  fullMark: number
  /** Primary percentage for tooltip */
  percentage: number
  /** Secondary percentage for tooltip */
  secondaryPercentage: number
  /** Points belonging to this category in primary chart */
  points: ChartPoint[]
  /** Points belonging to this category in secondary chart */
  secondaryPoints: ChartPoint[]
}

/**
 * Theme-aware chart colors for rendering.
 */
export interface ChartColors {
  stroke: string
  fill: string
  text: string
  grid: string
}

// ============================================================================
// Sorting Functions
// ============================================================================

/**
 * Gets the sort index for a celestial point based on the canonical planet order.
 *
 * @param name - The name of the celestial point (underscores will be replaced with spaces)
 * @returns The index in PLANET_ORDER, or 999 if not found (sorts to end)
 *
 * @example
 * getSortIndex('Sun') // returns 0
 * getSortIndex('True_North_Lunar_Node') // returns 12
 * getSortIndex('Unknown Point') // returns 999
 */
export function getSortIndex(name: string): number {
  const normalizedName = name.replace(/_/g, ' ')
  const index = PLANET_ORDER.indexOf(normalizedName as (typeof PLANET_ORDER)[number])
  return index === -1 ? 999 : index
}

/**
 * Sorts an array of active point keys according to the canonical planet order.
 *
 * @param activePoints - Array of point key strings to sort
 * @param subject - The subject object containing point data
 * @returns A new sorted array of point keys
 *
 * @example
 * const sorted = sortActivePoints(['mars', 'sun', 'moon'], subject)
 * // Returns ['sun', 'moon', 'mars'] (sorted by PLANET_ORDER)
 */
export function sortActivePoints(
  activePoints: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subject: any,
): string[] {
  return [...activePoints].sort((a, b) => {
    const nameA = subject?.[a.toLowerCase().replace(/_/g, '_')]?.name || a
    const nameB = subject?.[b.toLowerCase().replace(/_/g, '_')]?.name || b
    return getSortIndex(nameA) - getSortIndex(nameB)
  })
}

// ============================================================================
// Point Filtering Functions
// ============================================================================

/**
 * Gets all celestial points that match a specific element or quality category.
 *
 * @param categoryType - The type of category to filter by ('element' or 'quality')
 * @param categoryValue - The value to match (e.g., 'Fire', 'Cardinal')
 * @param activePoints - Array of active point keys
 * @param subject - The subject object containing point data
 * @returns Array of matching ChartPoint objects, sorted by canonical order
 *
 * @example
 * // Get all Fire element points
 * const firePoints = getPointsForCategory('element', 'Fire', activePoints, subject)
 *
 * @example
 * // Get all Cardinal quality points
 * const cardinalPoints = getPointsForCategory('quality', 'Cardinal', activePoints, subject)
 */
export function getPointsForCategory(
  categoryType: 'element' | 'quality',
  categoryValue: string,
  activePoints: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subject: any,
): ChartPoint[] {
  return activePoints
    .map((key) => {
      const pointKey = key.toLowerCase().replace(/_/g, '_')
      return subject?.[pointKey] as ChartPoint | undefined
    })
    .filter((point): point is ChartPoint => point != null && point[categoryType] === categoryValue)
    .sort((a, b) => getSortIndex(a.name) - getSortIndex(b.name))
}

// ============================================================================
// Distribution Calculation Functions
// ============================================================================

/**
 * Calculates element distribution counts from subject points.
 *
 * Iterates through all active points and counts how many belong to each element.
 *
 * @param subject - The subject object containing point data
 * @param activePoints - Array of active point keys to analyze
 * @returns Object with counts for each element (fire, earth, air, water)
 *
 * @example
 * const counts = calculateElementDistFromPoints(subject, ['sun', 'moon', 'mars'])
 * // Returns { fire: 2, earth: 0, air: 0, water: 1 }
 */
export function calculateElementDistFromPoints(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subject: any,
  activePoints: string[],
): ElementCounts {
  const counts: ElementCounts = { fire: 0, earth: 0, air: 0, water: 0 }

  activePoints.forEach((key) => {
    const pointKey = key.toLowerCase().replace(/_/g, '_')
    const point = subject?.[pointKey]
    if (point?.element) {
      const element = point.element.toLowerCase() as keyof ElementCounts
      if (element in counts) counts[element]++
    }
  })

  return counts
}

/**
 * Calculates quality distribution counts from subject points.
 *
 * Iterates through all active points and counts how many belong to each quality.
 *
 * @param subject - The subject object containing point data
 * @param activePoints - Array of active point keys to analyze
 * @returns Object with counts for each quality (cardinal, fixed, mutable)
 *
 * @example
 * const counts = calculateQualityDistFromPoints(subject, ['sun', 'moon', 'mars'])
 * // Returns { cardinal: 1, fixed: 1, mutable: 1 }
 */
export function calculateQualityDistFromPoints(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subject: any,
  activePoints: string[],
): QualityCounts {
  const counts: QualityCounts = { cardinal: 0, fixed: 0, mutable: 0 }

  activePoints.forEach((key) => {
    const pointKey = key.toLowerCase().replace(/_/g, '_')
    const point = subject?.[pointKey]
    if (point?.quality) {
      const quality = point.quality.toLowerCase() as keyof QualityCounts
      if (quality in counts) counts[quality]++
    }
  })

  return counts
}

/**
 * Checks if an element distribution object has all zero percentages.
 *
 * Used to determine if distribution needs to be recalculated from points.
 *
 * @param dist - Element distribution object to check
 * @returns True if distribution is undefined or has all zero percentages
 */
export function isZeroElementDist(dist?: { fire_percentage?: number; earth_percentage?: number }): boolean {
  return !dist || (dist.fire_percentage === 0 && dist.earth_percentage === 0)
}

/**
 * Checks if a quality distribution object has all zero percentages.
 *
 * Used to determine if distribution needs to be recalculated from points.
 *
 * @param dist - Quality distribution object to check
 * @returns True if distribution is undefined or has all zero percentages
 */
export function isZeroQualityDist(dist?: { cardinal_percentage?: number; fixed_percentage?: number }): boolean {
  return !dist || (dist.cardinal_percentage === 0 && dist.fixed_percentage === 0)
}

/**
 * Computes element distribution with percentages for a chart.
 *
 * If the chart already has valid distribution data, returns it.
 * Otherwise, calculates distribution from the subject's active points.
 *
 * @param chartData - The chart data containing subject and active points
 * @returns Element distribution with both counts and percentages
 */
export function computeElementDistribution(
  chartData: ChartData,
): ChartData['element_distribution'] | ElementDistribution {
  if (!isZeroElementDist(chartData.element_distribution)) {
    return chartData.element_distribution
  }

  const counts = calculateElementDistFromPoints(chartData.subject, chartData.active_points)
  const total = counts.fire + counts.earth + counts.air + counts.water

  if (total === 0) return chartData.element_distribution

  return {
    fire: counts.fire,
    earth: counts.earth,
    air: counts.air,
    water: counts.water,
    fire_percentage: Math.round((counts.fire / total) * 100),
    earth_percentage: Math.round((counts.earth / total) * 100),
    air_percentage: Math.round((counts.air / total) * 100),
    water_percentage: Math.round((counts.water / total) * 100),
  }
}

/**
 * Computes quality distribution with percentages for a chart.
 *
 * If the chart already has valid distribution data, returns it.
 * Otherwise, calculates distribution from the subject's active points.
 *
 * @param chartData - The chart data containing subject and active points
 * @returns Quality distribution with both counts and percentages
 */
export function computeQualityDistribution(
  chartData: ChartData,
): ChartData['quality_distribution'] | QualityDistribution {
  if (!isZeroQualityDist(chartData.quality_distribution)) {
    return chartData.quality_distribution
  }

  const counts = calculateQualityDistFromPoints(chartData.subject, chartData.active_points)
  const total = counts.cardinal + counts.fixed + counts.mutable

  if (total === 0) return chartData.quality_distribution

  return {
    cardinal: counts.cardinal,
    fixed: counts.fixed,
    mutable: counts.mutable,
    cardinal_percentage: Math.round((counts.cardinal / total) * 100),
    fixed_percentage: Math.round((counts.fixed / total) * 100),
    mutable_percentage: Math.round((counts.mutable / total) * 100),
  }
}

// ============================================================================
// Radar Chart Data Preparation
// ============================================================================

/**
 * Prepares element distribution data for the radar chart.
 *
 * Creates an array of RadarDataPoint objects suitable for Recharts RadarChart,
 * including both primary and secondary chart data when available.
 *
 * @param primaryElementDist - Element distribution from the primary chart
 * @param secondaryElementDist - Optional element distribution from secondary chart
 * @param activePoints - Active points from the primary chart
 * @param primarySubject - Primary subject object
 * @param secondaryActivePoints - Optional active points from secondary chart
 * @param secondarySubject - Optional secondary subject object
 * @returns Array of RadarDataPoint objects for the four elements
 */
export function prepareElementsRadarData(
  primaryElementDist: ChartData['element_distribution'],
  secondaryElementDist: ElementDistribution | ChartData['element_distribution'] | undefined,
  activePoints: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  primarySubject: any,
  secondaryActivePoints?: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secondarySubject?: any,
): RadarDataPoint[] {
  const elements = ['Fire', 'Earth', 'Air', 'Water'] as const
  const elementKeys = ['fire', 'earth', 'air', 'water'] as const

  return elements.map((element, index) => {
    const key = elementKeys[index]
    const percentageKey = `${key}_percentage` as keyof typeof primaryElementDist

    return {
      subject: element,
      primary: primaryElementDist[percentageKey] as number,
      secondary: (secondaryElementDist?.[percentageKey] as number) ?? 0,
      fullMark: 100,
      percentage: primaryElementDist[percentageKey] as number,
      secondaryPercentage: (secondaryElementDist?.[percentageKey] as number) ?? 0,
      points: getPointsForCategory('element', element, activePoints, primarySubject),
      secondaryPoints:
        secondaryActivePoints && secondarySubject
          ? getPointsForCategory('element', element, secondaryActivePoints, secondarySubject)
          : [],
    }
  })
}

/**
 * Prepares quality distribution data for the radar chart.
 *
 * Creates an array of RadarDataPoint objects suitable for Recharts RadarChart,
 * including both primary and secondary chart data when available.
 *
 * @param primaryQualityDist - Quality distribution from the primary chart
 * @param secondaryQualityDist - Optional quality distribution from secondary chart
 * @param activePoints - Active points from the primary chart
 * @param primarySubject - Primary subject object
 * @param secondaryActivePoints - Optional active points from secondary chart
 * @param secondarySubject - Optional secondary subject object
 * @returns Array of RadarDataPoint objects for the three qualities
 */
export function prepareQualitiesRadarData(
  primaryQualityDist: ChartData['quality_distribution'],
  secondaryQualityDist: QualityDistribution | ChartData['quality_distribution'] | undefined,
  activePoints: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  primarySubject: any,
  secondaryActivePoints?: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secondarySubject?: any,
): RadarDataPoint[] {
  const qualities = ['Cardinal', 'Fixed', 'Mutable'] as const
  const qualityKeys = ['cardinal', 'fixed', 'mutable'] as const

  return qualities.map((quality, index) => {
    const key = qualityKeys[index]
    const percentageKey = `${key}_percentage` as keyof typeof primaryQualityDist

    return {
      subject: quality,
      primary: primaryQualityDist[percentageKey] as number,
      secondary: (secondaryQualityDist?.[percentageKey] as number) ?? 0,
      fullMark: 100,
      percentage: primaryQualityDist[percentageKey] as number,
      secondaryPercentage: (secondaryQualityDist?.[percentageKey] as number) ?? 0,
      points: getPointsForCategory('quality', quality, activePoints, primarySubject),
      secondaryPoints:
        secondaryActivePoints && secondarySubject
          ? getPointsForCategory('quality', quality, secondaryActivePoints, secondarySubject)
          : [],
    }
  })
}

// ============================================================================
// Chart Colors
// ============================================================================

/**
 * Gets theme-aware colors for chart rendering.
 *
 * @param isDark - Whether dark theme is active
 * @returns ChartColors object with appropriate color values
 */
export function getChartColors(isDark: boolean): ChartColors {
  return {
    stroke: isDark ? '#8884d8' : '#8884d8',
    fill: isDark ? '#8884d8' : '#8884d8',
    text: isDark ? '#e2e8f0' : '#64748b',
    grid: isDark ? '#475569' : '#e2e8f0',
  }
}

/**
 * Explicit color values for radar charts.
 *
 * CSS variables don't resolve correctly in radar fills,
 * so we use explicit HSL values matching the theme.
 */
export const CHART_THEME_COLORS = {
  /** Primary chart color (chart-1 blue) */
  primary: 'hsl(221.2 83.2% 53.3%)',
  /** Secondary chart color (chart-2 teal) */
  secondary: 'hsl(173 58% 39%)',
} as const

/**
 * Determines radar chart colors based on whether secondary data exists.
 *
 * @param hasSecondaryData - Whether a secondary chart is being displayed
 * @param chartColors - Base chart colors
 * @returns Object with primary and secondary fill/stroke colors
 */
export function getRadarColors(hasSecondaryData: boolean, chartColors: ChartColors) {
  return {
    primaryFill: hasSecondaryData ? CHART_THEME_COLORS.primary : chartColors.fill,
    primaryStroke: hasSecondaryData ? CHART_THEME_COLORS.primary : chartColors.stroke,
    secondaryFill: CHART_THEME_COLORS.secondary,
    secondaryStroke: CHART_THEME_COLORS.secondary,
  }
}

// ============================================================================
// Lunar Phase Helpers
// ============================================================================

/**
 * Extracts the appropriate lunar phase data based on chart type.
 *
 * For return charts, lunar phase comes from second_subject (the return chart).
 * For other charts, it comes from the primary lunar_phase or subject.
 *
 * @param chartData - The chart data object
 * @param effectiveChartType - The normalized chart type string
 * @returns Object containing lunar phase data and month, or undefined values
 */
export function getLunarPhaseData(chartData: ChartData, effectiveChartType: string) {
  const isReturnChart = effectiveChartType.toLowerCase().includes('return')

  const lunarPhaseData = isReturnChart
    ? chartData.second_subject?.lunar_phase || chartData.lunar_phase
    : chartData.lunar_phase || chartData.subject?.lunar_phase

  const monthData = isReturnChart ? chartData.second_subject?.month : chartData.subject?.month

  return {
    lunarPhase: lunarPhaseData,
    month: monthData,
  }
}

// ============================================================================
// Chart Data View Processor
// ============================================================================

/**
 * Result of processing chart data for the ChartDataView component.
 */
export interface ProcessedChartData {
  /** Effective chart type (derived or provided) */
  effectiveChartType: string
  /** Primary subject from chart data */
  primarySubject: ChartData['subject']
  /** Secondary subject if available */
  secondarySubject?: ChartData['second_subject']
  /** Sorted active points for primary chart */
  sortedActivePoints: string[]
  /** Sorted active points for secondary chart */
  sortedSecondaryActivePoints: string[]
  /** Processed secondary chart data */
  secondaryChartData?: ChartData
  /** Computed element distribution for secondary chart */
  secondaryElementDist?: ElementDistribution | ChartData['element_distribution']
  /** Computed quality distribution for secondary chart */
  secondaryQualityDist?: QualityDistribution | ChartData['quality_distribution']
  /** Prepared radar data for elements chart */
  elementsData: RadarDataPoint[]
  /** Prepared radar data for qualities chart */
  qualitiesData: RadarDataPoint[]
  /** Theme-aware chart colors */
  chartColors: ChartColors
  /** Radar-specific colors */
  radarColors: ReturnType<typeof getRadarColors>
}

/**
 * Processes all chart data for the ChartDataView component.
 *
 * This is the main entry point that orchestrates all data transformations,
 * computing distributions, sorting points, and preparing radar chart data.
 *
 * @param data - Primary chart response
 * @param secondaryData - Optional secondary chart response (for dual charts)
 * @param chartType - Optional chart type override
 * @param isDark - Whether dark theme is active
 * @returns Fully processed chart data ready for rendering
 *
 * @example
 * const processed = processChartData(natalData, undefined, 'Natal', false)
 *
 * @example
 * const processed = processChartData(synastryData, transitData, 'Synastry', true)
 */
export function processChartData(
  data: ChartResponse,
  secondaryData: ChartResponse | undefined,
  chartType: string | undefined,
  isDark: boolean,
): ProcessedChartData {
  const { chart_data } = data
  const { element_distribution, quality_distribution } = chart_data

  // Determine effective chart type
  const effectiveChartType = chartType || chart_data.chart_type || 'Natal'

  // Get subjects
  const primarySubject = chart_data.subject || chart_data.first_subject
  const secondarySubject = chart_data.second_subject

  // Process secondary data
  const secondaryChartData = secondaryData?.chart_data

  // Sort active points
  const sortedActivePoints = sortActivePoints(chart_data.active_points, primarySubject)
  const sortedSecondaryActivePoints = secondaryChartData
    ? sortActivePoints(secondaryChartData.active_points, secondaryChartData.subject)
    : []

  // Compute distributions for secondary chart
  const secondaryElementDist = secondaryChartData ? computeElementDistribution(secondaryChartData) : undefined
  const secondaryQualityDist = secondaryChartData ? computeQualityDistribution(secondaryChartData) : undefined

  // Get chart colors
  const chartColors = getChartColors(isDark)
  const radarColors = getRadarColors(!!secondaryData, chartColors)

  // Prepare radar chart data
  const elementsData = prepareElementsRadarData(
    element_distribution,
    secondaryElementDist,
    chart_data.active_points,
    primarySubject,
    secondaryChartData?.active_points,
    secondaryChartData?.subject,
  )

  const qualitiesData = prepareQualitiesRadarData(
    quality_distribution,
    secondaryQualityDist,
    chart_data.active_points,
    primarySubject,
    secondaryChartData?.active_points,
    secondaryChartData?.subject,
  )

  return {
    effectiveChartType,
    primarySubject,
    secondarySubject,
    sortedActivePoints,
    sortedSecondaryActivePoints,
    secondaryChartData,
    secondaryElementDist,
    secondaryQualityDist,
    elementsData,
    qualitiesData,
    chartColors,
    radarColors,
  }
}
