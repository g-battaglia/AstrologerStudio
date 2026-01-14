// Types ported from the Vue project (frontend.astrologerstudio/src/types/types.d.ts)
// Minimal, strongly-typed contract for the Birth Chart API payload

export type AstrologicalPoint = {
  name: string
  quality: string
  element: string
  sign: string
  sign_num: number
  position: number
  abs_pos: number
  emoji: string
  point_type: string
  house: string | null
  retrograde: boolean | null
}

export type LunarPhase = {
  degrees_between_s_m: number
  moon_phase: number
  sun_phase: number
  moon_emoji: string
  moon_phase_name: string
}

export type AstrologicalSubject = {
  name: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  city: string
  nation: string
  lng: number
  lat: number
  tz_str: string
  zodiac_type: string
  sidereal_mode: string | null
  houses_system_identifier: string
  houses_system_name: string
  perspective_type: string
  iso_formatted_local_datetime: string
  iso_formatted_utc_datetime: string
  julian_day: number
  utc_time: number
  local_time: number
  sun: AstrologicalPoint
  moon: AstrologicalPoint
  mercury: AstrologicalPoint
  venus: AstrologicalPoint
  mars: AstrologicalPoint
  jupiter: AstrologicalPoint
  saturn: AstrologicalPoint
  uranus: AstrologicalPoint
  neptune: AstrologicalPoint
  pluto: AstrologicalPoint
  chiron: AstrologicalPoint
  mean_lilith: AstrologicalPoint
  first_house: AstrologicalPoint
  second_house: AstrologicalPoint
  third_house: AstrologicalPoint
  fourth_house: AstrologicalPoint
  fifth_house: AstrologicalPoint
  sixth_house: AstrologicalPoint
  seventh_house: AstrologicalPoint
  eighth_house: AstrologicalPoint
  ninth_house: AstrologicalPoint
  tenth_house: AstrologicalPoint
  eleventh_house: AstrologicalPoint
  twelfth_house: AstrologicalPoint
  mean_node: AstrologicalPoint
  true_node: AstrologicalPoint
  lunar_phase: LunarPhase
  planets_names_list: string[]
  houses_names_list: string[]
}

export type BirthChartDataFetchedType = {
  chart: string
  aspects_grid: string
  data: AstrologicalSubject | false
}
