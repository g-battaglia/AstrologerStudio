/**
 * @fileoverview Aspect-related utilities for astrological charts.
 *
 * This module consolidates all aspect-related business logic including:
 * - Aspect definitions and default orbs
 * - Aspect symbols for display
 * - Aspect color and styling utilities
 *
 * @module aspects
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Definition of an astrological aspect with its default orb.
 */
export interface AspectDefinition {
  /** Name of the aspect (lowercase, e.g., 'conjunction') */
  name: string
  /** Default orb in degrees for this aspect type */
  defaultOrb: number
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Canonical list of all aspects and their default orbs.
 *
 * Major (Ptolemaic) aspects have larger orbs:
 * - Conjunction: 10°
 * - Opposition: 10°
 * - Trine: 8°
 * - Square: 5°
 * - Sextile: 6°
 *
 * Minor aspects have smaller orbs (typically 1°).
 */
export const ALL_ASPECTS: AspectDefinition[] = [
  { name: 'conjunction', defaultOrb: 10 },
  { name: 'opposition', defaultOrb: 10 },
  { name: 'trine', defaultOrb: 8 },
  { name: 'square', defaultOrb: 5 },
  { name: 'sextile', defaultOrb: 6 },
  { name: 'quintile', defaultOrb: 1 },
  { name: 'semi-sextile', defaultOrb: 1 },
  { name: 'semi-square', defaultOrb: 1 },
  { name: 'sesquiquadrate', defaultOrb: 1 },
  { name: 'biquintile', defaultOrb: 1 },
  { name: 'quincunx', defaultOrb: 1 },
]

/**
 * Default active aspects with their orbs.
 * Convenience helper for preferences and other places that need { name, orb }.
 */
export const DEFAULT_ACTIVE_ASPECTS = ALL_ASPECTS.map((a) => ({ name: a.name, orb: a.defaultOrb }))

/**
 * Unicode symbols for astrological aspects.
 * Used in grids, timeline displays, and chart tooltips.
 */
export const ASPECT_SYMBOLS: Record<string, string> = {
  conjunction: '☌',
  opposition: '☍',
  trine: '△',
  square: '□',
  sextile: '⚹',
  quincunx: '⚻',
  'semi-sextile': '⚺',
  'semi-square': '∠',
  sesquiquadrate: '⚼',
  quintile: 'Q',
  'bi-quintile': 'bQ',
  biquintile: 'bQ',
}

// ============================================================================
// Symbol Functions
// ============================================================================

/**
 * Gets the unicode symbol for an aspect type.
 *
 * @param aspectName - The name of the aspect (e.g., 'conjunction', 'trine')
 * @returns The unicode symbol or the first character capitalized as fallback
 *
 * @example
 * getAspectSymbol('conjunction') // Returns '☌'
 * getAspectSymbol('trine') // Returns '△'
 * getAspectSymbol('unknown') // Returns 'U'
 */
export function getAspectSymbol(aspectName: string): string {
  const key = aspectName.toLowerCase()
  return ASPECT_SYMBOLS[key] || aspectName.charAt(0).toUpperCase()
}

// ============================================================================
// Color Functions
// ============================================================================

/**
 * Gets the Tailwind CSS background color class for an aspect type.
 *
 * Colors follow traditional astrological conventions:
 * - Harmonious aspects (trine, sextile): Green
 * - Challenging aspects (square, opposition): Red
 * - Conjunction: Blue (neutral, depends on planets)
 * - Minor aspects: Softer versions of above or distinct colors
 *
 * @param aspectName - The name of the aspect
 * @returns Tailwind CSS class for background color (e.g., 'bg-blue-500')
 *
 * @example
 * getAspectColor('conjunction') // Returns 'bg-blue-500'
 * getAspectColor('trine') // Returns 'bg-green-500'
 * getAspectColor('square') // Returns 'bg-red-500'
 */
export function getAspectColor(aspectName: string): string {
  const name = aspectName.toLowerCase()

  // Major aspects
  if (name === 'conjunction') return 'bg-blue-500'
  if (name === 'opposition') return 'bg-red-500'
  if (name === 'square') return 'bg-red-500'
  if (name === 'trine') return 'bg-green-500'
  if (name === 'sextile') return 'bg-green-500'

  // Minor aspects
  if (name === 'semi-sextile') return 'bg-blue-400'
  if (name === 'semi-square' || name === 'sesquiquadrate') return 'bg-red-400'
  if (name === 'quincunx') return 'bg-purple-500'
  if (name === 'quintile' || name === 'bi-quintile' || name === 'biquintile') return 'bg-orange-500'

  return 'bg-gray-500'
}

/**
 * Gets the Tailwind CSS text color class for an aspect symbol.
 *
 * Follows the same color conventions as getAspectColor but for text.
 *
 * @param aspectName - The name of the aspect
 * @returns Tailwind CSS class for text color (e.g., 'text-blue-600')
 *
 * @example
 * getAspectTextColor('conjunction') // Returns 'text-blue-600'
 * getAspectTextColor('trine') // Returns 'text-green-600'
 */
export function getAspectTextColor(aspectName: string): string {
  const name = aspectName.toLowerCase()

  // Major aspects
  if (name === 'conjunction') return 'text-blue-600'
  if (name === 'opposition') return 'text-red-600'
  if (name === 'square') return 'text-red-600'
  if (name === 'trine') return 'text-green-600'
  if (name === 'sextile') return 'text-green-600'

  // Minor aspects
  if (name === 'semi-sextile') return 'text-blue-500'
  if (name === 'semi-square' || name === 'sesquiquadrate') return 'text-red-500'
  if (name === 'quincunx') return 'text-purple-500'
  if (name === 'quintile' || name === 'bi-quintile' || name === 'biquintile') return 'text-orange-600'

  return 'text-gray-600'
}

/**
 * Gets the Tailwind CSS text size class for an aspect symbol.
 *
 * Normalizes visual weight of different symbols since some unicode
 * characters are naturally larger or smaller than others.
 *
 * @param aspectName - The name of the aspect
 * @returns Tailwind CSS class for text size (e.g., 'text-lg', 'text-xl')
 *
 * @example
 * getAspectTextSize('opposition') // Returns 'text-xl' (☍ is small)
 * getAspectTextSize('biquintile') // Returns 'text-xs' (bQ is large)
 */
export function getAspectTextSize(aspectName: string): string {
  const name = aspectName.toLowerCase()

  // bQ is naturally large, make it smaller
  if (name === 'biquintile' || name === 'bi-quintile') return 'text-xs'

  // Opposition symbol is naturally small, make it larger
  if (name === 'opposition') return 'text-xl'

  // Default size for most symbols
  return 'text-lg'
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if an aspect is a major (Ptolemaic) aspect.
 *
 * Major aspects are: conjunction, opposition, trine, square, sextile.
 * These are considered the most significant in traditional astrology.
 *
 * @param aspectName - The name of the aspect
 * @returns True if the aspect is major
 *
 * @example
 * isMajorAspect('trine') // Returns true
 * isMajorAspect('quincunx') // Returns false
 */
export function isMajorAspect(aspectName: string): boolean {
  const major = ['conjunction', 'opposition', 'trine', 'square', 'sextile']
  return major.includes(aspectName.toLowerCase())
}

/**
 * Gets the default orb for an aspect type.
 *
 * @param aspectName - The name of the aspect
 * @returns The default orb in degrees, or 1 if aspect is unknown
 *
 * @example
 * getDefaultOrb('conjunction') // Returns 10
 * getDefaultOrb('quincunx') // Returns 1
 */
export function getDefaultOrb(aspectName: string): number {
  const aspect = ALL_ASPECTS.find((a) => a.name === aspectName.toLowerCase())
  return aspect?.defaultOrb ?? 1
}
