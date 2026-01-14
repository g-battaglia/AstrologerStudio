import { z } from 'zod'

// Planet and House schemas as used by the backend.astrologerstudio API
export const PlanetSchema = z.object({
  name: z.string(),
  quality: z.string(),
  element: z.string(),
  sign: z.string(),
  sign_num: z.number(),
  position: z.number(),
  abs_pos: z.number(),
  emoji: z.string(),
  point_type: z.string(),
  house: z.string(),
  retrograde: z.boolean(),
})

export const HouseSchema = z.object({
  name: z.string(),
  quality: z.string(),
  element: z.string(),
  sign: z.string(),
  sign_num: z.number(),
  position: z.number(),
  abs_pos: z.number(),
  emoji: z.string(),
  point_type: z.string(),
  house: z.string(), // Changed from z.null() to match API response
  retrograde: z.boolean(), // Changed from z.null() to match API response
})

// Accept datetime strings with or without timezone offset, seconds required, fractional part optional
// Examples accepted:
//   2025-09-18T12:00:00
//   2025-09-18T12:00:00.123
//   2025-09-18T12:00:00Z
//   2025-09-18T12:00:00+02:00
//   2025-09-18T12:00:00-0500
const DateTimeString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/, 'Invalid datetime string')

export const EphemerisSchema = z.object({
  date: DateTimeString,
  planets: z.array(PlanetSchema),
  houses: z.array(HouseSchema),
})

export const EphemerisArraySchema = z.array(EphemerisSchema)

export type Planet = z.infer<typeof PlanetSchema>
export type House = z.infer<typeof HouseSchema>
export type Ephemeris = z.infer<typeof EphemerisSchema>
export type EphemerisArray = z.infer<typeof EphemerisArraySchema>
