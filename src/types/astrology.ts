/**
 * Subject model representing birth data for astrological calculations
 * Contains all information needed to generate a natal chart
 */
export interface SubjectModel {
  /** Person's name */
  name: string
  /** Birth year */
  year: number
  /** Birth month (1-12) */
  month: number
  /** Birth day (1-31) */
  day: number
  /** Birth hour (0-23) */
  hour: number
  /** Birth minute (0-59) */
  minute: number
  /** Birth second (0-59), optional */
  second?: number
  /** Birth city name */
  city: string
  /** Birth country/nation */
  nation: string
  /** Timezone offset or IANA timezone identifier */
  timezone?: string
  /** Timezone string (alternative format) */
  tz_str?: string
  /** Geographic longitude */
  longitude?: number
  /** Geographic latitude */
  latitude?: number
  /** Geographic altitude */
  altitude?: number | null
  /** Override automatic daylight saving time detection. */
  is_dst?: boolean | null
  geonames_username?: string | null
  /** Longitude (alternative field name) */
  lng?: number
  /** Latitude (alternative field name) */
  lat?: number
  /** Zodiac type (tropical/sidereal) */
  zodiac_type?: string
  /** Sidereal mode identifier if using sidereal zodiac */
  sidereal_mode?: string | null
  /** House system identifier (e.g., "P" for Placidus) */
  houses_system_identifier?: string
  /** House system full name */
  houses_system_name?: string
  /** Perspective type for chart calculation */
  perspective_type?: string
  /** ISO formatted local datetime string */
  iso_formatted_local_datetime?: string
  /** ISO formatted UTC datetime string */
  iso_formatted_utc_datetime?: string
  /** Julian day number */
  julian_day?: number
  /** Day of week name */
  day_of_week?: string
}

/**
 * Represents a celestial point (planet, asteroid, angle, etc.)
 */
export interface Point {
  /** Point name (e.g., "Sun", "Moon", "Ascendant") */
  name: string
  /** Quality (cardinal/fixed/mutable) */
  quality: string
  /** Element (fire/earth/air/water) */
  element: string
  /** Zodiac sign name */
  sign: string
  /** Sign number (0-11 or 1-12 depending on system) */
  sign_num: number
  /** Position within sign (0-30 degrees) */
  position: number
  /** Absolute position on zodiac wheel (0-360 degrees) */
  abs_pos: number
  /** Emoji representation of the point */
  emoji: string
  /** Type of point (Planet/House/Asteroid/etc.) */
  point_type: string
  /** House position (1-12 or null for houses themselves) */
  house: string | null
  /** Whether the point is in retrograde motion */
  retrograde: boolean
  /** Point's daily motion speed in degrees */
  speed?: number | null
  /** Declination angle north/south of celestial equator */
  declination?: number | null
}

/**
 * Lunar phase information
 */
export interface LunarPhase {
  /** Degrees between Sun and Moon */
  degrees_between_s_m: number
  /** Moon phase value (0-1, 0=new, 0.5=full) */
  moon_phase: number
  /** Emoji representing current moon phase */
  moon_emoji: string
  /** Human-readable moon phase name */
  moon_phase_name: string
}

/**
 * Aspect between two celestial points
 */
export interface Aspect {
  /** First point name */
  p1_name: string
  /** Owner of first point (for multi-subject charts) */
  p1_owner?: string
  /** Absolute position of first point */
  p1_abs_pos?: number
  /** Second point name */
  p2_name: string
  /** Owner of second point (for multi-subject charts) */
  p2_owner?: string
  /** Absolute position of second point */
  p2_abs_pos?: number
  /** Aspect type (conjunction, opposition, trine, etc.) */
  aspect: string
  /** Orb (deviation from exact aspect in degrees) */
  orbit: number
  /** Exact degrees of this aspect type (e.g., 120 for trine) */
  aspect_degrees: number
  /** Actual angular difference between points */
  diff: number
  /** First point data (can be index or Point object) */
  p1: number | Point
  /** Second point data (can be index or Point object) */
  p2: number | Point
  /** Aspect movement type (applying/separating) */
  aspect_movement?: string
}

/**
 * Distribution of points across the four elements
 */
export interface ElementDistribution {
  /** Count of points in fire signs */
  fire: number
  /** Count of points in earth signs */
  earth: number
  /** Count of points in air signs */
  air: number
  /** Count of points in water signs */
  water: number
  /** Percentage of points in fire signs */
  fire_percentage: number
  /** Percentage of points in earth signs */
  earth_percentage: number
  /** Percentage of points in air signs */
  air_percentage: number
  /** Percentage of points in water signs */
  water_percentage: number
}

/**
 * Distribution of points across the three qualities/modalities
 */
export interface QualityDistribution {
  /** Count of points in cardinal signs */
  cardinal: number
  /** Count of points in fixed signs */
  fixed: number
  /** Count of points in mutable signs */
  mutable: number
  /** Percentage of points in cardinal signs */
  cardinal_percentage: number
  /** Percentage of points in fixed signs */
  fixed_percentage: number
  /** Percentage of points in mutable signs */
  mutable_percentage: number
}

/**
 * Extended subject model with calculated astronomical data
 * Returned by API after processing birth data
 */
export interface EnrichedSubjectModel extends SubjectModel {
  // Core Planets
  sun: Point
  moon: Point
  mercury: Point
  venus: Point
  mars: Point
  jupiter: Point
  saturn: Point
  uranus: Point
  neptune: Point
  pluto: Point

  // Additional Points - Lunar Nodes
  mean_north_lunar_node?: Point
  true_north_lunar_node?: Point
  mean_south_lunar_node?: Point
  true_south_lunar_node?: Point

  // Additional Points - Centaurs & Minor Bodies
  chiron?: Point
  pholus?: Point

  // Additional Points - Lilith
  mean_lilith?: Point
  true_lilith?: Point

  // Additional Points - Asteroids
  ceres?: Point
  pallas?: Point
  juno?: Point
  vesta?: Point
  eris?: Point

  // Additional Points - Trans-Neptunian Objects
  sedna?: Point
  haumea?: Point
  makemake?: Point
  ixion?: Point
  orcus?: Point
  quaoar?: Point

  // Additional Points - Fixed Stars
  regulus?: Point
  spica?: Point

  // Additional Points - Arabic Parts
  pars_fortunae?: Point
  pars_spiritus?: Point
  pars_amoris?: Point
  pars_fidei?: Point

  // Additional Points - Other
  earth?: Point
  vertex?: Point
  anti_vertex?: Point

  // Chart Angles
  ascendant?: Point
  medium_coeli?: Point
  descendant?: Point
  imum_coeli?: Point

  // Houses
  first_house: Point
  second_house: Point
  third_house: Point
  fourth_house: Point
  fifth_house: Point
  sixth_house: Point
  seventh_house: Point
  eighth_house: Point
  ninth_house: Point
  tenth_house: Point
  eleventh_house: Point
  twelfth_house: Point

  // Optional lunar phase data
  lunar_phase?: LunarPhase
}

/**
 * Point positioned in another subject's house (for house comparison in dual charts)
 * Matches API's PointInHouseModel
 */
export interface PointInHouseModel {
  /** Name of the celestial point (e.g., "Sun", "First_House") */
  point_name: string
  /** Degree position within sign */
  point_degree: number
  /** Zodiacal sign containing the point */
  point_sign: string
  /** Name of the subject who owns this point */
  point_owner_name: string
  /** House number in owner's chart (null for house cusps) */
  point_owner_house_number: number | null
  /** House name in owner's chart (null for house cusps) */
  point_owner_house_name: string | null
  /** House number in target subject's chart */
  projected_house_number: number
  /** House name in target subject's chart */
  projected_house_name: string
  /** Name of the target subject */
  projected_house_owner_name: string
}

/**
 * Bidirectional house comparison analysis between two subjects
 */
export interface HouseComparison {
  /** Name of the first subject */
  first_subject_name: string
  /** Name of the second subject */
  second_subject_name: string
  /** First subject's points projected into second subject's houses */
  first_points_in_second_houses: PointInHouseModel[]
  /** Second subject's points projected into first subject's houses */
  second_points_in_first_houses: PointInHouseModel[]
  /** First subject's house cusps projected into second subject's houses */
  first_cusps_in_second_houses?: PointInHouseModel[]
  /** Second subject's house cusps projected into first subject's houses */
  second_cusps_in_first_houses?: PointInHouseModel[]
}

export type HouseComparisonPoint = PointInHouseModel

/**
 * Base fields shared by all chart data models
 */
interface BaseChartData {
  /** List of aspects between points */
  aspects: Aspect[]
  /** Element distribution statistics */
  element_distribution: ElementDistribution
  /** Quality/modality distribution statistics */
  quality_distribution: QualityDistribution
  /** Names of active celestial points */
  active_points: string[]
  /** Active aspect configurations */
  active_aspects: unknown[]
}

/**
 * Chart data model for single-subject astrological charts.
 * Used for Natal, Composite, and SingleReturnChart types.
 */
export interface SingleChartData extends BaseChartData {
  /** Type of single chart */
  chart_type: 'Natal' | 'Composite' | 'SingleReturnChart'
  /** Subject data with calculated positions */
  subject: EnrichedSubjectModel
}

/**
 * Chart data model for dual-subject astrological charts.
 * Used for Transit, Synastry, and DualReturnChart types.
 */
export interface DualChartData extends BaseChartData {
  /** Type of dual chart */
  chart_type: 'Transit' | 'Synastry' | 'DualReturnChart'
  /** Primary astrological subject (natal/base chart) */
  first_subject: EnrichedSubjectModel
  /** Secondary astrological subject (transit/partner/return) */
  second_subject: EnrichedSubjectModel
  /** House overlay analysis between subjects */
  house_comparison?: HouseComparison | null
  /** Compatibility scoring (synastry only) */
  relationship_score?: {
    score_value: number
    score_description?: string
    is_destiny_sign: boolean
    notes?: string
    score_breakdown?: Array<{
      rule: string
      description: string
      points: number
      details: string
    }>
  } | null
}

/**
 * Union type for chart data from context endpoints.
 * Discriminated union based on chart_type field.
 */
export type ContextChartData = SingleChartData | DualChartData

/**
 * Complete chart data including all calculations and metadata.
 *
 * This is the main type used throughout the frontend for chart data.
 * It's a flexible superset that accommodates both single-subject charts
 * (Natal, Composite) and dual-subject charts (Transit, Synastry, Returns).
 *
 * For stricter API typing, use SingleChartData or DualChartData.
 */
export interface ChartData {
  /** Type of chart (natal, transit, synastry, etc.) */
  chart_type: string
  /** Subject data with calculated positions */
  subject: EnrichedSubjectModel
  /** Lunar phase information */
  lunar_phase: LunarPhase
  /** List of aspects between points */
  aspects: Aspect[]
  /** Element distribution statistics */
  element_distribution: ElementDistribution
  /** Quality/modality distribution statistics */
  quality_distribution: QualityDistribution
  /** Names of active celestial points */
  active_points: string[]
  /** Active aspect configurations */
  active_aspects: unknown[]
  /** List of house names */
  houses_names_list: string[]
  /** Relationship compatibility score (for synastry charts) */
  relationship_score?: {
    score_value: number
    score_description?: string
    is_destiny_sign: boolean
    notes?: string
    score_breakdown?: Array<{
      rule: string
      description: string
      points: number
      details: string
    }>
  }
  /** First subject data (for dual charts like Synastry or Returns) */
  first_subject?: EnrichedSubjectModel
  /** Second subject data (for dual charts like Synastry or Returns) */
  second_subject?: EnrichedSubjectModel
  /** House comparison data for dual charts */
  house_comparison?: HouseComparison
}

/**
 * API response for chart generation requests
 */
export interface ChartResponse {
  /** Response status */
  status: 'OK' | 'ERROR'
  /** Error or info message */
  message?: string
  /** Chart calculation data */
  chart_data: ChartData
  /** SVG chart image (for combined charts) */
  chart?: string
  /** SVG chart wheel (for split charts) */
  chart_wheel?: string
  /** SVG aspect grid (for split charts) */
  chart_grid?: string
}

/**
 * Configuration options for chart rendering and calculation
 */
export interface ChartRequestOptions {
  /** Visual theme for chart rendering */
  theme?: 'classic' | 'dark' | 'light' | 'strawberry' | 'dark-high-contrast' | 'black-and-white'
  /** Language code for chart labels */
  language?: string
  /** Whether to split chart into separate wheel and grid */
  split_chart?: boolean
  /** Use transparent background in SVG */
  transparent_background?: boolean
  /** Show house position comparison (for multi-subject charts) */
  show_house_position_comparison?: boolean
  show_cusp_position_comparison?: boolean
  show_degree_indicators?: boolean
  include_house_comparison?: boolean
  /** Show aspect icons on aspect lines (default: true) */
  show_aspect_icons?: boolean
  /** Custom title text for the chart */
  custom_title?: string
  /** List of celestial points to include in calculation */
  active_points?: string[]
  /** Aspect configuration array */
  active_aspects?: unknown[]
  /** Method for calculating element/quality distribution */
  distribution_method?: 'weighted' | 'pure_count'
  /** Custom weights for distribution calculation */
  custom_distribution_weights?: Record<string, number>
  /** Zodiac system (Tropical or Sidereal) */
  zodiac_type?: 'Tropical' | 'Sidereal'
  /** Sidereal mode (ayanamsa) if zodiac system is Sidereal */
  sidereal_mode?: string
}

/**
 * Configuration options for planetary return charts
 */
export interface PlanetaryReturnRequestOptions extends ChartRequestOptions {
  /** Year for the return chart */
  year?: number
  /** Month for the return chart (optional) */
  month?: number
  /** Day for the return chart start date (1-31, optional) */
  day?: number
  /** ISO datetime for the return chart (optional) */
  iso_datetime?: string
  /** Location for the return chart */
  return_location?: {
    city: string
    nation: string
    longitude: number
    latitude: number
    timezone: string
  }
  /** Wheel type (single or dual) */
  wheel_type?: 'single' | 'dual'
}
