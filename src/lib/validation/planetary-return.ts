import { z } from 'zod'

export const returnLocationSchema = z.object({
  city: z.string().min(1, 'City is required'),
  nation: z.string().min(1, 'Nation is required'),
  longitude: z.number(),
  latitude: z.number(),
  timezone: z.string(),
})

export const solarReturnSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  day: z.number().int().min(1).max(31).optional(),
  return_location: returnLocationSchema.optional(),
  wheel_type: z.enum(['single', 'dual']).default('dual'),
})

export const lunarReturnSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31).optional(),
  return_location: returnLocationSchema.optional(),
  wheel_type: z.enum(['single', 'dual']).default('dual'),
})

export type SolarReturnInput = z.infer<typeof solarReturnSchema>
export type LunarReturnInput = z.infer<typeof lunarReturnSchema>
