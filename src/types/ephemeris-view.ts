// Shared view-layer types for Ephemeris UI

export type EphemerisTableRow = {
  id: number
  date: string
  time: string
  // Core planets
  sun: string
  moon: string
  mercury: string
  venus: string
  mars: string
  jupiter: string
  saturn: string
  uranus: string
  neptune: string
  pluto: string
  // Lunar nodes
  mean_north_lunar_node: string
  true_north_lunar_node: string
  mean_south_lunar_node: string
  true_south_lunar_node: string
  // Centaurs & minor bodies
  chiron: string
  pholus: string
  // Lilith
  mean_lilith: string
  true_lilith: string
  // Earth
  earth: string
  // Asteroids
  ceres: string
  pallas: string
  juno: string
  vesta: string
  // Dwarf planets
  eris: string
  sedna: string
  haumea: string
  makemake: string
  ixion: string
  orcus: string
  quaoar: string
  // Fixed stars
  regulus: string
  spica: string
  // Axes
  ascendant: string
  medium_coeli: string
  descendant: string
  imum_coeli: string
  // Special points
  vertex: string
  anti_vertex: string
  // Arabic parts
  pars_fortunae: string
  pars_spiritus: string
  pars_amoris: string
  pars_fidei: string
}

export type PlanetKey =
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
  // Axes
  | 'Ascendant'
  | 'Medium_Coeli'
  | 'Descendant'
  | 'Imum_Coeli'
  // Special points
  | 'Vertex'
  | 'Anti_Vertex'
  // Arabic parts
  | 'Pars_Fortunae'
  | 'Pars_Spiritus'
  | 'Pars_Amoris'
  | 'Pars_Fidei'

export type EphemerisChartRow = {
  date: string
} & Partial<Record<PlanetKey, number>> &
  Partial<Record<`${PlanetKey}Label`, string>>

export type PlanetColors = Record<PlanetKey, { stroke: string; fill: string }>

/**
 * Centralized list of all planet/point keys.
 * Single source of truth for ephemeris views.
 */
export const ALL_PLANET_KEYS: readonly PlanetKey[] = [
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
  // Axes
  'Ascendant',
  'Medium_Coeli',
  'Descendant',
  'Imum_Coeli',
  // Special points
  'Vertex',
  'Anti_Vertex',
  // Arabic parts
  'Pars_Fortunae',
  'Pars_Spiritus',
  'Pars_Amoris',
  'Pars_Fidei',
] as const

/**
 * Convert PlanetKey (API name) to table column key (lowercase).
 * e.g., 'Mean_North_Lunar_Node' -> 'mean_north_lunar_node'
 */
export function toColumnKey(apiName: PlanetKey): keyof EphemerisTableRow {
  return apiName.toLowerCase() as keyof EphemerisTableRow
}
