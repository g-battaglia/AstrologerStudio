import { z } from 'zod'

/**
 * API request validation schemas
 * Centralized validation for all API routes
 */

// Chart types enum
const chartTypeValues = ['natal', 'transit', 'synastry', 'composite', 'solar_return', 'lunar_return'] as const
type ChartType = (typeof chartTypeValues)[number]

// ============ Saved Charts ============

export const createSavedChartSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters').trim(),
  type: z.enum(chartTypeValues, {
    message: 'Invalid chart type',
  }),
  chartData: z.union([z.string(), z.record(z.string(), z.unknown())], {
    message: 'Chart data is required',
  }),
  settings: z
    .union([z.string(), z.record(z.string(), z.unknown())])
    .optional()
    .nullable(),
  notes: z.string().max(10000, 'Notes must be less than 10000 characters').optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional().nullable(),
})

export const updateSavedChartSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters').trim().optional(),
  notes: z.string().max(10000, 'Notes must be less than 10000 characters').optional().nullable(),
  chartData: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  settings: z
    .union([z.string(), z.record(z.string(), z.unknown())])
    .optional()
    .nullable(),
  tags: z.array(z.string().max(50)).max(20).optional().nullable(),
})

export type CreateSavedChartInput = z.infer<typeof createSavedChartSchema>
export type UpdateSavedChartInput = z.infer<typeof updateSavedChartSchema>

// ============ Subject Notes ============

export const updateSubjectNotesSchema = z.object({
  notes: z.string().max(50000, 'Notes must be less than 50000 characters').nullable(),
})

export type UpdateSubjectNotesInput = z.infer<typeof updateSubjectNotesSchema>

// ============ AI Interpretation ============

export const aiInterpretRequestSchema = z.object({
  chartData: z.record(z.string(), z.unknown(), {
    message: 'Chart data is required',
  }),
  chartType: z.enum(chartTypeValues, {
    message: 'Invalid chart type',
  }),
  systemPrompt: z.string().max(5000, 'System prompt too long').optional(),
  chartTypePrompt: z.string().max(5000, 'Chart type prompt too long').optional(),
  language: z.string().length(2, 'Language must be a 2-letter code').toLowerCase().optional().default('en'),
  include_house_comparison: z.boolean().optional().default(true),
  relationshipType: z.string().optional(),
})

export type AIInterpretRequestInput = z.infer<typeof aiInterpretRequestSchema>
export type { ChartType }

// ============ Helper Functions ============

/**
 * Validate request body against a schema
 * Returns parsed data or validation errors
 */
export function validateBody<T extends z.ZodSchema>(
  body: unknown,
  schema: T,
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError<z.infer<T>> } {
  const result = schema.safeParse(body)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

/**
 * Format Zod errors for API response
 */
export function formatValidationErrors(errors: z.ZodError): {
  error: string
  details: Array<{ field: string; message: string }>
} {
  return {
    error: 'Validation failed',
    details: errors.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  }
}
