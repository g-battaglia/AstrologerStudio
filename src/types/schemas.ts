import { z } from 'zod'

export const RODEN_RATING_MAP = {
  AAA: 'BC/BR in hand',
  AA: 'Quoted BC/BR',
  A: 'From memory',
  AAX: 'Official source: untimed',
  AN: 'News report',
  AX: 'Documented source, untimed',
  B: 'Bio/autobiography',
  CQ: 'Accuracy in question',
  CR: 'Rectified from approximate time',
  CU: 'Original source not known',
  DD: 'Conflicting/unverified',
  DDT: 'Dirty data, conflicting times',
  TA: 'Timed official source',
  TC: 'Timed, original source unknown',
  TD: 'Timed documented source (i.e., news)',
  TH: 'Timed historic source',
  X: 'Date without time of birth',
  XR: 'Rectified without time of birth',
  XX: 'Date in question',
} as const

export const rodens_rating = z.enum(Object.keys(RODEN_RATING_MAP) as [keyof typeof RODEN_RATING_MAP])

export const SubjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  birth_datetime: z.string(),
  city: z.string(),
  nation: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  rodens_rating: rodens_rating.optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  notes: z.string().optional().nullable(),
  ownerId: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

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
  house: z.null(),
  retrograde: z.null(),
})

export const EphemerisSchema = z.object({
  date: z.string().datetime(),
  planets: z.array(PlanetSchema),
  houses: z.array(HouseSchema),
})

export const EphemerisArraySchema = z.array(EphemerisSchema)

export type Subject = z.infer<typeof SubjectSchema>
export type Planet = z.infer<typeof PlanetSchema>
export type House = z.infer<typeof HouseSchema>
export type Ephemeris = z.infer<typeof EphemerisSchema>
export type EphemerisArray = z.infer<typeof EphemerisArraySchema>
export type RodensRating = z.infer<typeof rodens_rating>
