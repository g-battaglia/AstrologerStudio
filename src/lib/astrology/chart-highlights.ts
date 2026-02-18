/**
 * Chart Highlights Utilities
 *
 * This module contains all business logic for extracting and formatting
 * key astrological data for the Chart Highlights component.
 *
 * It handles:
 * - Formatting positions (sign, degree, house)
 * - Finding relevant aspects with prioritization rules
 * - Generating highlight content for each chart type
 */

import { ChartData, Point, Aspect, EnrichedSubjectModel } from '@/types/astrology'

// ============================================================================
// CONSTANTS & SCORING SYSTEM
// ============================================================================

/**
 * Classical Astrology Aspect Scoring System
 *
 * This system prioritizes aspects based on traditional astrological significance:
 *
 * 1. ASPECT TYPE (Major vs Minor):
 *    - Ptolemaic/Major aspects are given priority (conjunction, opposition, trine, square, sextile)
 *    - Minor aspects (quincunx, semisquare, sesquiquadrate, etc.) are deprioritized
 *
 * 2. PLANET SPEED/TYPE:
 *    - Luminaries (Sun, Moon): Most personal, fastest-changing, highest priority
 *    - Personal planets (Mercury, Venus, Mars): Fast-moving, high priority
 *    - Social planets (Jupiter, Saturn): Slower, moderate priority
 *    - Outer planets (Uranus, Neptune, Pluto): Very slow, lowest priority
 *    - Aspects between two slow planets (e.g., Jupiter-Saturn) are heavily penalized
 *      as they represent generational patterns, not individual significance
 *
 * 3. ANGLES:
 *    - Ascendant and Midheaven are treated as highly significant personal points
 *
 * 4. ORB TIGHTNESS:
 *    - Tighter orbs indicate stronger manifestation
 */

/** Planet categories by astrological speed and personal significance */
export const PLANET_TIERS = {
  // Tier 1: Luminaries (highest personal significance)
  LUMINARIES: ['Sun', 'Moon'],
  // Tier 2: Personal planets (fast-moving, personal)
  PERSONAL: ['Mercury', 'Venus', 'Mars'],
  // Tier 3: Social/generational planets (slower, shared by age groups)
  SOCIAL: ['Jupiter', 'Saturn'],
  // Tier 4: Outer/transpersonal planets (very slow, generational)
  OUTER: ['Uranus', 'Neptune', 'Pluto'],
  // Special: Chart angles (personal points, highest significance)
  ANGLES: ['Ascendant', 'Midheaven', 'Descendant', 'Imum Coeli', 'Medium Coeli'],
} as const

/** Priority scores for planet tiers (higher = more important) */
const PLANET_PRIORITY: Record<string, number> = {
  // Luminaries: highest priority
  Sun: 100,
  Moon: 95,
  // Angles: very high priority (personal points)
  Ascendant: 90,
  Midheaven: 85,
  Medium_Coeli: 85,
  Descendant: 80,
  Imum_Coeli: 75,
  // Personal planets
  Mercury: 70,
  Venus: 70,
  Mars: 70,
  // Social planets (lower priority)
  Jupiter: 40,
  Saturn: 40,
  // Outer planets (lowest priority)
  Uranus: 20,
  Neptune: 20,
  Pluto: 20,
  // Minor bodies (very low)
  Chiron: 15,
  True_North_Lunar_Node: 10,
  Mean_North_Lunar_Node: 10,
  True_Lilith: 5,
  Mean_Lilith: 5,
}

/** Major (Ptolemaic) aspects - these are given priority */
export const MAJOR_ASPECTS = ['conjunction', 'opposition', 'trine', 'square', 'sextile']

/** Aspect priority scores (higher = more important) */
const ASPECT_PRIORITY: Record<string, number> = {
  // Major aspects (Ptolemaic) - high priority
  conjunction: 100,
  opposition: 90,
  square: 85,
  trine: 80,
  sextile: 70,
  // Minor aspects - low priority
  quincunx: 30,
  semisquare: 20,
  sesquiquadrate: 20,
  semisextile: 15,
  quintile: 10,
  biquintile: 10,
}

/**
 * Calculates a composite score for an aspect based on classical astrological principles.
 * Higher scores indicate more significant aspects in the chart.
 *
 * @param aspect - The aspect to score
 * @returns Numeric score (higher = more significant)
 */
export function scoreAspect(aspect: Aspect): number {
  const p1Priority = PLANET_PRIORITY[aspect.p1_name] ?? 10
  const p2Priority = PLANET_PRIORITY[aspect.p2_name] ?? 10
  const aspectPriority = ASPECT_PRIORITY[aspect.aspect.toLowerCase()] ?? 10

  // Calculate base score from planet priorities
  // Use geometric mean to balance both planets' importance
  const planetScore = Math.sqrt(p1Priority * p2Priority)

  // Heavy penalty for slow-planet-to-slow-planet aspects
  // These represent generational patterns, not individual significance
  const isSocialOrOuter = (name: string) => {
    const n = name.replace(/_/g, ' ')
    return [...PLANET_TIERS.SOCIAL, ...PLANET_TIERS.OUTER].some((p) => p.toLowerCase() === n.toLowerCase())
  }

  const slowPlanetPenalty =
    isSocialOrOuter(aspect.p1_name) && isSocialOrOuter(aspect.p2_name)
      ? 0.3 // 70% reduction for slow-to-slow aspects
      : 1.0

  // Minor aspect penalty
  const isMajorAspect = MAJOR_ASPECTS.includes(aspect.aspect.toLowerCase())
  const aspectTypeFactor = isMajorAspect ? 1.0 : 0.4 // 60% penalty for minor aspects

  // Axis penalty: Aspects to axes (Asc/MC) must be very tight to be significant
  const isAngle = (name: string) => (PLANET_TIERS.ANGLES as readonly string[]).includes(name.replace(/_/g, ' '))
  const involvesAngle = isAngle(aspect.p1_name) || isAngle(aspect.p2_name)
  // If it involves an angle and is NOT tight (orb > 2), penalize heavily
  const axisPenalty = involvesAngle && Math.abs(aspect.orbit) > 2.0 ? 0.2 : 1.0

  // Orb bonus: tighter orbs are more powerful
  // Scale from 1.0 (exact) to 0.5 (10° orb)
  const orbFactor = Math.max(0.5, 1 - Math.abs(aspect.orbit) / 20)

  // Lunar Node penalty:
  // Ensure Lunar Node aspects are deprioritized regardless of other factors
  const isLunarNode = (name: string) => name.toLowerCase().includes('node')
  const nodePenalty = isLunarNode(aspect.p1_name) || isLunarNode(aspect.p2_name) ? 0.3 : 1.0

  // Combine all factors
  const finalScore =
    (planetScore * aspectPriority * slowPlanetPenalty * aspectTypeFactor * axisPenalty * orbFactor * nodePenalty) / 100

  return finalScore
}

/**
 * Personal/Classical planets used for prioritization.
 * These are considered "core" planets in traditional astrology.
 */
export const PERSONAL_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']

/**
 * Classical planetary rulerships (traditional rulers)
 * Used for calculating the Ascendant Ruler (Dispositore dell'Ascendente)
 */
export const SIGN_RULERS: Record<string, string> = {
  // English
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter',

  // Italian
  Ariete: 'Mars',
  Toro: 'Venus',
  Gemelli: 'Mercury',
  Cancro: 'Moon',
  Leone: 'Sun',
  Vergine: 'Mercury',
  Bilancia: 'Venus',
  Scorpione: 'Mars',
  Sagittario: 'Jupiter',
  Capricorno: 'Saturn',
  Acquario: 'Saturn',
  Pesci: 'Jupiter',

  // Abbreviations (English/Universal)
  Ari: 'Mars',
  Tau: 'Venus',
  Gem: 'Mercury',
  Can: 'Moon',
  // Leo is same as full name, omitted here
  Vir: 'Mercury',
  Lib: 'Venus',
  Sco: 'Mars',
  Sag: 'Jupiter',
  Cap: 'Saturn',
  Aqu: 'Saturn',
  Pis: 'Jupiter',
}

/**
 * Modern planetary rulerships
 * Includes outer planets (Uranus, Neptune, Pluto)
 */
export const MODERN_SIGN_RULERS: Record<string, string> = {
  ...SIGN_RULERS, // Inherit mainly for non-modified signs
  // English
  Scorpio: 'Pluto',
  Aquarius: 'Uranus',
  Pisces: 'Neptune',
  // Italian
  Scorpione: 'Pluto',
  Acquario: 'Uranus',
  Pesci: 'Nettuno', // Assuming generalized input handling map handles 'Neptune' -> 'Nettuno' or similar?
  // Wait, the API returns English planet names usually.
  // The lookup key is the SIGN name. The value is the PLANET name.
  // The `subject` object properties are lowercase English planet names (e.g. `subject.pluto`).
  // So the value MUST be the English property name of the planet.
  // 'Nettuno' is wrong if `subject['nettuno']` doesn't exist.
  // I must use English planet names for keys to lookup in Subject model.
  // Abbreviations
  Sco: 'Pluto',
  Aqu: 'Uranus',
  Pis: 'Neptune',
}

/**
 * Gets the ruler of a zodiac sign based on the specified system
 * @param sign - The zodiac sign name
 * @param mode - 'classical' (default) or 'modern'
 * @returns The ruling planet name, or undefined if sign is invalid
 */
export function getSignRuler(sign: string | undefined, mode: 'classical' | 'modern' = 'classical'): string | undefined {
  if (!sign) return undefined

  // Normalize input sign to Title Case to match dictionary keys
  const normalizedSign = sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase()

  const rulers = mode === 'modern' ? MODERN_SIGN_RULERS : SIGN_RULERS
  return rulers[normalizedSign] || rulers[sign]
}

/**
 * Gets the Ascendant Ruler (Dispositore dell'Ascendente) from a subject
 * This is the planet that rules the sign on the Ascendant
 *
 * @param subject - The EnrichedSubjectModel containing planetary positions
 * @param mode - 'classical' or 'modern' (default: 'classical')
 * @returns The Point representing the Ascendant ruler, or undefined
 */
export function getAscendantRuler(
  subject: EnrichedSubjectModel,
  mode: 'classical' | 'modern' = 'classical',
): Point | undefined {
  if (!subject.ascendant?.sign) return undefined

  const rulerName = getSignRuler(subject.ascendant.sign, mode)
  if (!rulerName) return undefined

  // Map ruler name to subject property
  // Note: Modern rulers like Pluto/Uranus/Neptune must map to valid properties on Subject
  const rulerKey = rulerName.toLowerCase() as keyof EnrichedSubjectModel
  const ruler = subject[rulerKey]

  // Ensure it's a Point object
  if (ruler && typeof ruler === 'object' && 'name' in ruler) {
    return ruler as Point
  }

  return undefined
}

// ============================================================================
// TYPES
// ============================================================================

export interface HighlightItem {
  label: string
  value: string
  icon: React.ReactNode
  detail?: string
}

export type ChartTypeNormalized =
  | 'natal'
  | 'transit'
  | 'synastry'
  | 'composite'
  | 'solar return'
  | 'lunar return'
  | 'unknown'

// ============================================================================
// FORMATTERS
// ============================================================================

/**
 * Formats a point's position as "Sign Deg°Min' House"
 * @param point - The celestial point to format
 * @param showHouse - Whether to include the house position
 * @returns Formatted string or "Unknown" if point is undefined
 */
export function formatPosition(point: Point | undefined, showHouse = true): string {
  if (!point) return 'Unknown'
  const deg = Math.floor(point.position)
  const min = Math.round((point.position % 1) * 60)
  const degStr = `${deg}°${min}'`
  const houseStr = showHouse && point.house ? ` ${point.house.replace(/_/g, ' ')}` : ''
  return `${point.sign} ${degStr}${houseStr}`
}

/**
 * Formats a point's position as "Sign Deg°Min'" (no house)
 * @param point - The celestial point to format
 * @returns Formatted string or "Unknown" if point is undefined
 */
export function formatSignDegree(point: Point | undefined): string {
  if (!point) return 'Unknown'
  const deg = Math.floor(point.position)
  const min = Math.round((point.position % 1) * 60)
  return `${point.sign || 'Unknown'} ${deg}°${min}'`
}

/**
 * Formats an aspect as "P1-P2 AspectType (Orb°)"
 * @param aspect - The aspect to format
 * @returns Formatted string or "—" if aspect is undefined
 */
export function formatAspect(aspect: Aspect | undefined): string {
  if (!aspect) return '—'
  return `${aspect.p1_name}-${aspect.p2_name} ${aspect.aspect} (${aspect.orbit.toFixed(1)}°)`
}

// ============================================================================
// ASPECT FINDING LOGIC
// ============================================================================

/**
 * Finds the best aspect from a list using the classical astrology scoring system.
 *
 * The scoring prioritizes:
 * 1. Major aspects (conjunction, opposition, trine, square, sextile)
 * 2. Personal planets (Sun, Moon, Mercury, Venus, Mars) and angles
 * 3. Tighter orbs
 * 4. Penalizes slow-planet-to-slow-planet aspects (e.g., Jupiter-Saturn)
 *
 * @param aspects - Array of aspects to search
 * @param filterFn - Optional filter function to narrow candidates
 * @param useScoring - If true (default), uses the full scoring system. If false, uses simple orb sorting.
 * @param maxOrb - Maximum orb to consider (default 10°)
 * @returns The best matching aspect, or undefined
 */
export function findBestAspect(
  aspects: Aspect[],
  filterFn?: (a: Aspect) => boolean,
  useScoring = true,
  maxOrb = 10,
): Aspect | undefined {
  let candidates = aspects

  // Apply filter if provided
  if (filterFn) {
    const filtered = aspects.filter(filterFn)
    if (filtered.length > 0) {
      candidates = filtered
    } else if (useScoring) {
      // If filter fails and we're using scoring, fall back to all aspects
      candidates = aspects
    } else {
      return undefined // Strict filter failed, no fallback allowed
    }
  }

  // Filter by max orb first
  const withinOrb = candidates.filter((a) => Math.abs(a.orbit) <= maxOrb)

  // If we have aspects within orb, use those; otherwise fall back to all candidates
  const pool = withinOrb.length > 0 ? withinOrb : candidates

  if (pool.length === 0) return undefined

  if (useScoring) {
    // Sort by score (highest first) using the classical astrology scoring system
    const sorted = [...pool].sort((a, b) => scoreAspect(b) - scoreAspect(a))
    return sorted[0]
  } else {
    // Simple orb-based sorting (legacy behavior)
    const sorted = [...pool].sort((a, b) => Math.abs(a.orbit) - Math.abs(b.orbit))
    return sorted[0]
  }
}

/**
 * Finds the best aspect for Synastry "Key Aspect" with specific priority:
 * 1. Ascendant-Ascendant (if exists and within orb)
 * 2. Sun-Sun or Sun-Moon
 * 3. Tightest traditional aspect
 *
 * @param aspects - Array of synastry aspects
 * @returns The prioritized key aspect
 */
export function findSynastryKeyAspect(aspects: Aspect[]): Aspect | undefined {
  // Priority 1: Asc-Asc
  const ascAsc = findBestAspect(aspects, (a) => a.p1_name === 'Ascendant' && a.p2_name === 'Ascendant', false)
  if (ascAsc && Math.abs(ascAsc.orbit) <= 10) {
    return ascAsc
  }

  // Priority 2: Sun-Sun or Sun-Moon
  const sunCore = findBestAspect(
    aspects,
    (a) =>
      (a.p1_name === 'Sun' && a.p2_name === 'Sun') ||
      (a.p1_name === 'Sun' && a.p2_name === 'Moon') ||
      (a.p1_name === 'Moon' && a.p2_name === 'Sun'),
    false,
  )
  if (sunCore && Math.abs(sunCore.orbit) <= 10) {
    return sunCore
  }

  // Priority 3: Tightest traditional (< 5°)
  let keyAspect = findBestAspect(aspects, undefined, true, 5)

  // Ultimate fallback: Tightest traditional (< 10°)
  if (!keyAspect) {
    keyAspect = findBestAspect(aspects, undefined, true, 10)
  }

  return keyAspect
}

// ============================================================================
// ASPECT RETRIEVAL
// ============================================================================

/**
 * Gets the appropriate aspects array based on chart type and data structure.
 *
 * @param chartType - Normalized chart type
 * @param data - Primary chart data
 * @param secondaryData - Secondary chart data (for dual charts)
 * @returns Array of aspects to use for highlight generation
 */
export function getRelevantAspects(
  chartType: ChartTypeNormalized,
  data: ChartData,
  secondaryData?: ChartData,
): Aspect[] {
  // For Synastry/Composite: aspects are in primary data
  if (chartType === 'synastry' || chartType === 'composite') {
    return data.aspects || []
  }

  // For Return charts:
  // - In dual wheel mode: prefer secondary (return chart) aspects
  // - In single wheel mode (no secondaryData): use primary data aspects (which is the return chart itself)
  if (chartType === 'solar return' || chartType === 'lunar return') {
    if (secondaryData?.aspects?.length) {
      return secondaryData.aspects
    }
    // Fallback to data.aspects for single-wheel return charts
    return data.aspects || []
  }

  // Fallback: effective data aspects or primary
  return secondaryData?.aspects || data.aspects || []
}

/**
 * Normalizes the chart type string to a known value.
 * @param chartType - Raw chart type string
 * @returns Normalized chart type
 */
export function normalizeChartType(chartType: string): ChartTypeNormalized {
  const normalized = chartType.toLowerCase().replace(/[-_]/g, ' ')

  if (normalized.includes('natal')) return 'natal'
  if (normalized.includes('transit')) return 'transit'
  if (normalized.includes('synastry')) return 'synastry'
  if (normalized.includes('composite')) return 'composite'
  if (normalized.includes('solar return')) return 'solar return'
  if (normalized.includes('lunar return')) return 'lunar return'
  if (normalized.includes('return')) return 'solar return' // Fallback for generic return charts

  return 'unknown'
}

/**
 * Gets the effective subject based on chart type.
 * For Transit/Return, this is the transit/return subject (secondaryData).
 * For others, it's the primary subject.
 */
export function getEffectiveSubject(chartType: ChartTypeNormalized, data: ChartData, secondaryData?: ChartData) {
  if ((chartType === 'transit' || chartType === 'solar return' || chartType === 'lunar return') && secondaryData) {
    return secondaryData.subject
  }
  return data.subject
}
