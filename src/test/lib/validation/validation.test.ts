/**
 * Unit Tests for API Validation Schemas
 *
 * Tests the Zod validation schemas and helper functions used for
 * validating API request bodies. These schemas ensure data integrity
 * before database operations.
 *
 * @module src/lib/validation/api
 */
import { describe, it, expect } from 'vitest'
import {
  createSavedChartSchema,
  updateSavedChartSchema,
  updateSubjectNotesSchema,
  validateBody,
  formatValidationErrors,
} from '@/lib/validation/api'
import { z } from 'zod'

// ============================================================================
// createSavedChartSchema Tests
// ============================================================================

describe('createSavedChartSchema', () => {
  /**
   * Tests for saved chart creation validation.
   * Saved charts store user's favorite chart configurations.
   */

  it('should validate a complete valid chart', () => {
    // All required fields with valid values
    const validChart = {
      name: 'My Natal Chart',
      type: 'natal',
      chartData: { planets: [], houses: [] },
      notes: 'Personal notes about this chart',
      tags: ['personal', 'important'],
    }

    const result = createSavedChartSchema.safeParse(validChart)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('My Natal Chart')
      expect(result.data.type).toBe('natal')
    }
  })

  it('should accept all valid chart types', () => {
    // Verify each chart type is accepted
    const validTypes = ['natal', 'transit', 'synastry', 'composite', 'solar-return', 'lunar-return']

    for (const type of validTypes) {
      const chart = {
        name: 'Test Chart',
        type,
        chartData: {},
      }
      const result = createSavedChartSchema.safeParse(chart)

      expect(result.success, `Type "${type}" should be valid`).toBe(true)
    }
  })

  it('should reject invalid chart types', () => {
    const invalidChart = {
      name: 'Test Chart',
      type: 'invalid_type',
      chartData: {},
    }

    const result = createSavedChartSchema.safeParse(invalidChart)

    expect(result.success).toBe(false)
  })

  it('should reject empty name', () => {
    // Name is required for identification
    const chart = {
      name: '',
      type: 'natal',
      chartData: {},
    }

    const result = createSavedChartSchema.safeParse(chart)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Name is required')
    }
  })

  it('should reject name exceeding max length', () => {
    // Prevent excessively long names
    const chart = {
      name: 'a'.repeat(201),
      type: 'natal',
      chartData: {},
    }

    const result = createSavedChartSchema.safeParse(chart)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('200')
    }
  })

  it('should accept chartData as string', () => {
    // Chart data can be stored as JSON string
    const chart = {
      name: 'Test Chart',
      type: 'natal',
      chartData: '{"planets": []}',
    }

    const result = createSavedChartSchema.safeParse(chart)

    expect(result.success).toBe(true)
  })

  it('should limit notes length', () => {
    const chart = {
      name: 'Test Chart',
      type: 'natal',
      chartData: {},
      notes: 'a'.repeat(10001),
    }

    const result = createSavedChartSchema.safeParse(chart)

    expect(result.success).toBe(false)
  })

  it('should limit number of tags', () => {
    // Prevent tag abuse
    const chart = {
      name: 'Test Chart',
      type: 'natal',
      chartData: {},
      tags: Array(21).fill('tag'),
    }

    const result = createSavedChartSchema.safeParse(chart)

    expect(result.success).toBe(false)
  })
})

// ============================================================================
// updateSavedChartSchema Tests
// ============================================================================

describe('updateSavedChartSchema', () => {
  /**
   * Tests for saved chart update validation.
   * All fields are optional for partial updates.
   */

  it('should accept partial updates', () => {
    // Only updating the name
    const update = { name: 'Updated Name' }

    const result = updateSavedChartSchema.safeParse(update)

    expect(result.success).toBe(true)
  })

  it('should accept empty object for no changes', () => {
    const result = updateSavedChartSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('should allow setting notes to null', () => {
    // Nullable fields can be explicitly cleared
    const update = { notes: null }

    const result = updateSavedChartSchema.safeParse(update)

    expect(result.success).toBe(true)
  })
})

// ============================================================================
// updateSubjectNotesSchema Tests
// ============================================================================

describe('updateSubjectNotesSchema', () => {
  /**
   * Tests for subject notes validation.
   * Notes are free-form text with length limits.
   */

  it('should accept valid notes', () => {
    const data = { notes: 'Some notes about this subject' }

    const result = updateSubjectNotesSchema.safeParse(data)

    expect(result.success).toBe(true)
  })

  it('should accept null to clear notes', () => {
    const data = { notes: null }

    const result = updateSubjectNotesSchema.safeParse(data)

    expect(result.success).toBe(true)
  })

  it('should reject notes exceeding max length', () => {
    const data = { notes: 'a'.repeat(50001) }

    const result = updateSubjectNotesSchema.safeParse(data)

    expect(result.success).toBe(false)
  })
})

// ============================================================================
// validateBody Helper Tests
// ============================================================================

describe('validateBody', () => {
  /**
   * Tests for the generic body validation helper.
   * Wraps Zod parsing with a consistent result format.
   */

  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().positive(),
  })

  it('should return success with parsed data for valid input', () => {
    const input = { name: 'John', age: 30 }

    const result = validateBody(input, testSchema)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ name: 'John', age: 30 })
    }
  })

  it('should return errors for invalid input', () => {
    const input = { name: '', age: -5 }

    const result = validateBody(input, testSchema)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors).toBeInstanceOf(z.ZodError)
      expect(result.errors.issues.length).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// formatValidationErrors Helper Tests
// ============================================================================

describe('formatValidationErrors', () => {
  /**
   * Tests for the error formatting helper.
   * Converts Zod errors to a clean API response format.
   */

  it('should format Zod errors for API response', () => {
    const schema = z.object({
      email: z.string().email('Invalid email'),
      age: z.number().min(0, 'Age must be positive'),
    })

    const parseResult = schema.safeParse({ email: 'not-email', age: -1 })

    if (!parseResult.success) {
      const formatted = formatValidationErrors(parseResult.error)

      expect(formatted.error).toBe('Validation failed')
      expect(formatted.details).toBeInstanceOf(Array)
      expect(formatted.details.length).toBe(2)

      // Check that each error has field and message
      for (const detail of formatted.details) {
        expect(detail).toHaveProperty('field')
        expect(detail).toHaveProperty('message')
      }
    }
  })

  it('should handle nested field paths', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          name: z.string().min(1, 'Name required'),
        }),
      }),
    })

    const parseResult = schema.safeParse({ user: { profile: { name: '' } } })

    if (!parseResult.success) {
      const formatted = formatValidationErrors(parseResult.error)

      // Nested paths should be joined with dots
      expect(formatted.details[0]?.field).toBe('user.profile.name')
    }
  })
})
