/**
 * @fileoverview Celestial point constants and color mappings.
 *
 * This module consolidates all planet/point related constants including:
 * - Complete list of celestial points
 * - Planet color mappings for charts and visualizations
 * - Point categorization utilities
 *
 * @module celestial-points
 */

// ============================================================================
// Types
// ============================================================================

/**
 * All possible celestial point names as used in the API.
 */
export type CelestialPointName =
  // Core planets
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'
  // Lunar nodes
  | 'Mean_North_Lunar_Node'
  | 'True_North_Lunar_Node'
  | 'Mean_South_Lunar_Node'
  | 'True_South_Lunar_Node'
  // Centaurs & minor bodies
  | 'Chiron'
  | 'Pholus'
  // Lilith
  | 'Mean_Lilith'
  | 'True_Lilith'
  // Earth
  | 'Earth'
  // Asteroids
  | 'Ceres'
  | 'Pallas'
  | 'Juno'
  | 'Vesta'
  // Dwarf planets
  | 'Eris'
  | 'Sedna'
  | 'Haumea'
  | 'Makemake'
  | 'Ixion'
  | 'Orcus'
  | 'Quaoar'
  // Fixed stars
  | 'Regulus'
  | 'Spica'
  // Chart angles
  | 'Ascendant'
  | 'Medium_Coeli'
  | 'Descendant'
  | 'Imum_Coeli'
  | 'Vertex'
  | 'Anti_Vertex'
  // Arabic parts
  | 'Pars_Fortunae'
  | 'Pars_Spiritus'
  | 'Pars_Amoris'
  | 'Pars_Fidei'

/**
 * Color definition for a celestial point (stroke and fill).
 */
export interface PointColor {
  stroke: string
  fill: string
}

/**
 * Complete color mapping for all celestial points.
 */
export type PointColorMap = Record<CelestialPointName, PointColor>

// ============================================================================
// Constants
// ============================================================================

/**
 * Complete list of all celestial point names.
 * Used for iteration, mapping, and validation.
 */
export const ALL_CELESTIAL_POINTS: CelestialPointName[] = [
  // Core planets
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
  // Lunar nodes
  'Mean_North_Lunar_Node',
  'True_North_Lunar_Node',
  'Mean_South_Lunar_Node',
  'True_South_Lunar_Node',
  // Centaurs & minor bodies
  'Chiron',
  'Pholus',
  // Lilith
  'Mean_Lilith',
  'True_Lilith',
  // Earth
  'Earth',
  // Asteroids
  'Ceres',
  'Pallas',
  'Juno',
  'Vesta',
  // Dwarf planets
  'Eris',
  'Sedna',
  'Haumea',
  'Makemake',
  'Ixion',
  'Orcus',
  'Quaoar',
  // Fixed stars
  'Regulus',
  'Spica',
  // Chart angles
  'Ascendant',
  'Medium_Coeli',
  'Descendant',
  'Imum_Coeli',
  'Vertex',
  'Anti_Vertex',
  // Arabic parts
  'Pars_Fortunae',
  'Pars_Spiritus',
  'Pars_Amoris',
  'Pars_Fidei',
]

/**
 * Unicode symbols/icons for celestial points.
 * Used in tables, grids, and timeline displays.
 */
export const PLANET_ICONS: Record<string, string> = {
  // Core planets
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  // Centaurs
  Chiron: '⚷',
  Pholus: '⚷',
  // Lunar nodes
  Mean_North_Lunar_Node: '☊',
  True_North_Lunar_Node: '☊',
  Mean_South_Lunar_Node: '☋',
  True_South_Lunar_Node: '☋',
  // Lilith
  Mean_Lilith: '⚸',
  True_Lilith: '⚸',
  // Earth
  Earth: '♁',
  // Asteroids
  Ceres: '⚳',
  Pallas: '⚴',
  Juno: '⚵',
  Vesta: '⚶',
  // Dwarf planets (use planet symbols or defaults)
  Eris: '⯰',
  Sedna: '⯲',
  Haumea: '🜨',
  Makemake: '🜧',
  Ixion: '⚷',
  Orcus: '⚷',
  Quaoar: '🝾',
  // Fixed stars
  Regulus: '★',
  Spica: '★',
  // Chart angles
  Ascendant: 'ASC',
  Medium_Coeli: 'MC',
  Descendant: 'DSC',
  Imum_Coeli: 'IC',
  Vertex: 'Vx',
  Anti_Vertex: 'AVx',
  // Arabic parts
  Pars_Fortunae: '⊗',
  Pars_Spiritus: '⊕',
  Pars_Amoris: '♡',
  Pars_Fidei: '✝',
}

/**
 * Gets the icon/symbol for a celestial point.
 *
 * @param pointName - The name of the celestial point
 * @returns Unicode symbol or abbreviation, or '•' as fallback
 *
 * @example
 * getPlanetIcon('Sun') // Returns '☉'
 * getPlanetIcon('Ascendant') // Returns 'ASC'
 */
export function getPlanetIcon(pointName: string): string {
  return PLANET_ICONS[pointName] ?? PLANET_ICONS[pointName.replace(/ /g, '_')] ?? '•'
}

/**
 * Gets the index of a celestial point in the canonical order.
 * Used for sorting points consistently across the application.
 *
 * @param name - The name of the celestial point
 * @returns Index in ALL_CELESTIAL_POINTS, or MAX_SAFE_INTEGER if not found
 *
 * @example
 * getCelestialPointIndex('Sun') // Returns 0
 * getCelestialPointIndex('Unknown') // Returns Number.MAX_SAFE_INTEGER
 */
export function getCelestialPointIndex(name: string): number {
  const idx = ALL_CELESTIAL_POINTS.indexOf(name as CelestialPointName)
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
}

/**
 * Canonical ordering of planets and points for consistent display.
 *
 * This follows traditional astrological conventions:
 * 1. Luminaries (Sun, Moon)
 * 2. Personal planets (Mercury, Venus, Mars)
 * 3. Social planets (Jupiter, Saturn)
 * 4. Transpersonal planets (Uranus, Neptune, Pluto)
 * 5. Minor bodies (Chiron, Lilith, Nodes)
 * 6. Chart angles (Ascendant, Midheaven, etc.)
 * 7. Calculated points (Vertex, Part of Fortune)
 */
export const PLANET_DISPLAY_ORDER = [
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

/**
 * Color palette for all celestial points.
 * Used in ephemeris charts, timeline visualizations, and other displays.
 *
 * Color choices follow intuitive associations:
 * - Sun: Amber/Gold
 * - Moon: Gray/Silver
 * - Mars: Red
 * - Venus: Pink
 * - Jupiter: Purple
 * - Saturn: Yellow
 * - etc.
 */
export const CELESTIAL_POINT_COLORS: PointColorMap = {
  // Core planets
  Sun: { stroke: '#f59e0b', fill: '#f59e0b' },
  Moon: { stroke: '#6b7280', fill: '#6b7280' },
  Mercury: { stroke: '#3b82f6', fill: '#3b82f6' },
  Venus: { stroke: '#ec4899', fill: '#ec4899' },
  Mars: { stroke: '#ef4444', fill: '#ef4444' },
  Jupiter: { stroke: '#8b5cf6', fill: '#8b5cf6' },
  Saturn: { stroke: '#eab308', fill: '#eab308' },
  Uranus: { stroke: '#06b6d4', fill: '#06b6d4' },
  Neptune: { stroke: '#60a5fa', fill: '#60a5fa' },
  Pluto: { stroke: '#10b981', fill: '#10b981' },

  // Lunar nodes
  Mean_North_Lunar_Node: { stroke: '#c084fc', fill: '#c084fc' },
  True_North_Lunar_Node: { stroke: '#a855f7', fill: '#a855f7' },
  Mean_South_Lunar_Node: { stroke: '#9333ea', fill: '#9333ea' },
  True_South_Lunar_Node: { stroke: '#7c3aed', fill: '#7c3aed' },

  // Centaurs & minor bodies
  Chiron: { stroke: '#22c55e', fill: '#22c55e' },
  Pholus: { stroke: '#16a34a', fill: '#16a34a' },

  // Lilith
  Mean_Lilith: { stroke: '#475569', fill: '#475569' },
  True_Lilith: { stroke: '#64748b', fill: '#64748b' },

  // Earth
  Earth: { stroke: '#059669', fill: '#059669' },

  // Asteroids
  Ceres: { stroke: '#84cc16', fill: '#84cc16' },
  Pallas: { stroke: '#a3e635', fill: '#a3e635' },
  Juno: { stroke: '#bef264', fill: '#bef264' },
  Vesta: { stroke: '#d9f99d', fill: '#d9f99d' },

  // Dwarf planets
  Eris: { stroke: '#f43f5e', fill: '#f43f5e' },
  Sedna: { stroke: '#e11d48', fill: '#e11d48' },
  Haumea: { stroke: '#be185d', fill: '#be185d' },
  Makemake: { stroke: '#db2777', fill: '#db2777' },
  Ixion: { stroke: '#ec4899', fill: '#ec4899' },
  Orcus: { stroke: '#f472b6', fill: '#f472b6' },
  Quaoar: { stroke: '#f9a8d4', fill: '#f9a8d4' },

  // Fixed stars
  Regulus: { stroke: '#fbbf24', fill: '#fbbf24' },
  Spica: { stroke: '#fcd34d', fill: '#fcd34d' },

  // Chart angles
  Ascendant: { stroke: '#f97316', fill: '#f97316' },
  Medium_Coeli: { stroke: '#facc15', fill: '#facc15' },
  Descendant: { stroke: '#fb923c', fill: '#fb923c' },
  Imum_Coeli: { stroke: '#fde047', fill: '#fde047' },

  // Special points
  Vertex: { stroke: '#14b8a6', fill: '#14b8a6' },
  Anti_Vertex: { stroke: '#2dd4bf', fill: '#2dd4bf' },

  // Arabic parts
  Pars_Fortunae: { stroke: '#0ea5e9', fill: '#0ea5e9' },
  Pars_Spiritus: { stroke: '#38bdf8', fill: '#38bdf8' },
  Pars_Amoris: { stroke: '#7dd3fc', fill: '#7dd3fc' },
  Pars_Fidei: { stroke: '#bae6fd', fill: '#bae6fd' },
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets the color for a celestial point.
 *
 * @param pointName - The name of the celestial point
 * @returns Color object with stroke and fill, or gray fallback
 *
 * @example
 * getPointColor('Sun') // Returns { stroke: '#f59e0b', fill: '#f59e0b' }
 * getPointColor('Unknown') // Returns { stroke: '#6b7280', fill: '#6b7280' }
 */
export function getPointColor(pointName: string): PointColor {
  const color = CELESTIAL_POINT_COLORS[pointName as CelestialPointName]
  return color ?? { stroke: '#6b7280', fill: '#6b7280' }
}

/**
 * Converts a point name to a table column key format.
 * Normalizes the name to lowercase.
 *
 * @param name - The celestial point name
 * @returns Lowercase key suitable for table columns
 *
 * @example
 * toColumnKey('Mean_North_Lunar_Node') // Returns 'mean_north_lunar_node'
 */
export function toColumnKey(name: CelestialPointName): string {
  return name.toLowerCase()
}

/**
 * Gets the display sort index for a celestial point.
 *
 * @param name - The name of the celestial point (underscores will be replaced with spaces)
 * @returns The index in PLANET_DISPLAY_ORDER, or 999 if not found (sorts to end)
 *
 * @example
 * getDisplaySortIndex('Sun') // Returns 0
 * getDisplaySortIndex('True_North_Lunar_Node') // Returns 12
 */
export function getDisplaySortIndex(name: string): number {
  const normalizedName = name.replace(/_/g, ' ')
  const index = PLANET_DISPLAY_ORDER.indexOf(normalizedName as (typeof PLANET_DISPLAY_ORDER)[number])
  return index === -1 ? 999 : index
}

/**
 * Checks if a celestial point is a classical/traditional planet.
 *
 * Classical planets are those visible to the naked eye and used
 * in traditional astrology: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn.
 *
 * @param pointName - The name of the celestial point
 * @returns True if the point is a classical planet
 *
 * @example
 * isClassicalPlanet('Mars') // Returns true
 * isClassicalPlanet('Uranus') // Returns false
 */
export function isClassicalPlanet(pointName: string): boolean {
  const classical = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']
  return classical.includes(pointName.replace(/_/g, ' '))
}

/**
 * Checks if a celestial point is a chart angle.
 *
 * @param pointName - The name of the celestial point
 * @returns True if the point is a chart angle (Asc, MC, Dsc, IC)
 *
 * @example
 * isChartAngle('Ascendant') // Returns true
 * isChartAngle('Sun') // Returns false
 */
export function isChartAngle(pointName: string): boolean {
  const angles = ['Ascendant', 'Medium_Coeli', 'Midheaven', 'Descendant', 'Imum_Coeli']
  const normalized = pointName.replace(/_/g, ' ')
  return angles.some((a) => a.replace(/_/g, ' ') === normalized)
}

// ============================================================================
// Chart Configuration Constants
// ============================================================================

/**
 * Available house systems for chart calculation.
 * Each system uses a different mathematical method to divide
 * the ecliptic into twelve houses.
 */
export const HOUSE_SYSTEMS = [
  { value: 'P', label: 'Placidus' },
  { value: 'K', label: 'Koch' },
  { value: 'W', label: 'Whole Sign' },
  { value: 'A', label: 'Equal' },
  { value: 'R', label: 'Regiomontanus' },
  { value: 'C', label: 'Campanus' },
  { value: 'O', label: 'Porphyry' },
  { value: 'M', label: 'Morinus' },
  { value: 'T', label: 'Topocentric' },
  { value: 'B', label: 'Alcabitius' },
] as const

/**
 * Available perspective types for planetary calculations.
 * - Geocentric: Earth-centered view (traditional)
 * - Heliocentric: Sun-centered view
 */
export const PERSPECTIVE_TYPES = [
  { value: 'Apparent Geocentric', label: 'Geocentric' },
  { value: 'Heliocentric', label: 'Heliocentric' },
] as const

/**
 * Available zodiac systems.
 * - Tropical: Based on seasons (Western astrology)
 * - Sidereal: Based on fixed stars (Vedic/Eastern astrology)
 */
export const ZODIAC_SYSTEMS = [
  { value: 'Tropical', label: 'Tropical' },
  { value: 'Sidereal', label: 'Sidereal' },
] as const

/**
 * Available sidereal modes (Ayanamsas).
 * Different precession corrections used in sidereal astrology.
 */
export const SIDEREAL_MODES = [
  'LAHIRI',
  'FAGAN_BRADLEY',
  'DELUCE',
  'RAMAN',
  'USHASHASHI',
  'KRISHNAMURTI',
  'DJWHAL_KHUL',
  'YUKTESHWAR',
  'JN_BHASIN',
  'BABYL_KUGLER1',
  'BABYL_KUGLER2',
  'BABYL_KUGLER3',
  'BABYL_HUBER',
  'BABYL_ETPSC',
  'ALDEBARAN_15TAU',
  'HIPPARCHOS',
  'SASSANIAN',
  'J2000',
  'J1900',
  'B1950',
] as const
