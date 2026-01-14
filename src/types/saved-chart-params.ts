/**
 * Type definitions for saved chart parameters
 *
 * These types define the minimal parameters stored in the database
 * that are needed to recalculate a chart using the Astrologer API.
 */

/**
 * Location data needed for transit/return charts
 */
export interface ChartLocation {
  city: string
  nation: string
  latitude: number
  longitude: number
  timezone: string
}

/**
 * Parameters for a saved natal chart
 */
export interface NatalParams {
  type: 'natal'
  subjectId: string
}

/**
 * Parameters for a saved transit chart
 */
export interface TransitParams {
  type: 'transit'
  subjectId: string
  transitDate: string // ISO datetime
  transitLocation: ChartLocation
}

/**
 * Parameters for a saved synastry chart
 */
export interface SynastryParams {
  type: 'synastry'
  subject1Id: string
  subject2Id: string
}

/**
 * Parameters for a saved composite chart
 */
export interface CompositeParams {
  type: 'composite'
  subject1Id: string
  subject2Id: string
}

/**
 * Parameters for a saved solar return chart
 */
export interface SolarReturnParams {
  type: 'solar-return'
  subjectId: string
  year: number
  wheelType: 'single' | 'dual'
  returnLocation?: ChartLocation
}

/**
 * Parameters for a saved lunar return chart
 */
export interface LunarReturnParams {
  type: 'lunar-return'
  subjectId: string
  returnDatetime: string // ISO datetime of the lunar return
  wheelType: 'single' | 'dual'
  returnLocation?: ChartLocation
}

/**
 * Union type of all saved chart parameter types
 */
export type SavedChartParams =
  | NatalParams
  | TransitParams
  | SynastryParams
  | CompositeParams
  | SolarReturnParams
  | LunarReturnParams
