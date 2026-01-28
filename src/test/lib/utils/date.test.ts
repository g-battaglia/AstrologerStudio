/**
 * Unit Tests for Date Utilities
 *
 * Tests the date/time parsing and formatting functions used throughout
 * the application for handling astrological birth data.
 *
 * @module src/lib/utils/date
 */
import { describe, it, expect } from 'vitest'
import {
  parseBirthDateTime,
  formatDateTimeForForm,
  formatDisplayDate,
  formatDisplayTime,
  isValidPastDate,
  formatDateForInput,
  normalizeTimeValue,
} from '@/lib/utils/date'

// ============================================================================
// parseBirthDateTime Tests
// ============================================================================

describe('parseBirthDateTime', () => {
  /**
   * Tests for the core birth date/time parsing function.
   * This function is critical for converting user input into UTC Date objects
   * for astrological calculations.
   */

  it('should parse a valid date and time to UTC Date', () => {
    // Standard case: date and time provided in expected format
    const result = parseBirthDateTime('1990-01-15', '14:30:00')

    expect(result).toBeInstanceOf(Date)
    expect(result.getUTCFullYear()).toBe(1990)
    expect(result.getUTCMonth()).toBe(0) // January is 0
    expect(result.getUTCDate()).toBe(15)
    expect(result.getUTCHours()).toBe(14)
    expect(result.getUTCMinutes()).toBe(30)
    expect(result.getUTCSeconds()).toBe(0)
  })

  it('should default to midnight when time is not provided', () => {
    // Many users don't know their exact birth time
    // Default to midnight UTC for chart calculations
    const result = parseBirthDateTime('2000-06-21')

    expect(result.getUTCHours()).toBe(0)
    expect(result.getUTCMinutes()).toBe(0)
    expect(result.getUTCSeconds()).toBe(0)
  })

  it('should extract date from full ISO string format', () => {
    // Handle case when date includes time component (from database)
    const result = parseBirthDateTime('1985-03-20T10:15:00.000Z', '10:15:00')

    expect(result.getUTCFullYear()).toBe(1985)
    expect(result.getUTCMonth()).toBe(2) // March is 2
    expect(result.getUTCDate()).toBe(20)
  })

  it('should throw error for empty date', () => {
    // Date is always required for astrological calculations
    expect(() => parseBirthDateTime('')).toThrow('Birth date is required')
  })

  it('should throw error for invalid date format', () => {
    // Reject non-standard date formats
    expect(() => parseBirthDateTime('15/01/1990')).toThrow('Date must be in YYYY-MM-DD format')
    expect(() => parseBirthDateTime('1990-1-15')).toThrow('Date must be in YYYY-MM-DD format')
  })

  it('should throw error for invalid time format', () => {
    // Time must be in HH:MM:SS format
    expect(() => parseBirthDateTime('1990-01-15', '14:30')).toThrow('Time must be in HH:MM:SS format')
    expect(() => parseBirthDateTime('1990-01-15', '2:30:00')).toThrow('Time must be in HH:MM:SS format')
  })

  it('should throw error for invalid time values', () => {
    // Validate that time components are within valid ranges
    expect(() => parseBirthDateTime('1990-01-15', '25:00:00')).toThrow('Invalid time values')
    expect(() => parseBirthDateTime('1990-01-15', '12:60:00')).toThrow('Invalid time values')
    expect(() => parseBirthDateTime('1990-01-15', '12:00:60')).toThrow('Invalid time values')
  })
})

// ============================================================================
// formatDateTimeForForm Tests
// ============================================================================

describe('formatDateTimeForForm', () => {
  /**
   * Tests for converting Date objects back to form input values.
   * Used when populating edit forms with existing subject data.
   */

  it('should format a Date to date and time strings', () => {
    const date = new Date('1990-01-15T14:30:45Z')
    const result = formatDateTimeForForm(date)

    expect(result.date).toBe('1990-01-15')
    expect(result.time).toBe('14:30:45')
  })

  it('should pad single-digit values with zeros', () => {
    // Ensure consistent format for HTML date inputs
    const date = new Date('2000-03-05T09:05:03Z')
    const result = formatDateTimeForForm(date)

    expect(result.date).toBe('2000-03-05')
    expect(result.time).toBe('09:05:03')
  })

  it('should return empty strings for invalid Date', () => {
    // Handle edge case of invalid date gracefully
    const result = formatDateTimeForForm(new Date('invalid'))

    expect(result.date).toBe('')
    expect(result.time).toBe('')
  })
})

// ============================================================================
// formatDisplayDate Tests
// ============================================================================

describe('formatDisplayDate', () => {
  /**
   * Tests for date display formatting according to user locale preferences.
   * Supports US (MM/DD/YYYY), EU (DD/MM/YYYY), and ISO (YYYY-MM-DD) formats.
   */

  it('should format date in EU format by default', () => {
    const date = new Date('2025-12-15T00:00:00Z')
    const result = formatDisplayDate(date)

    expect(result).toBe('15/12/2025')
  })

  it('should format date in US format', () => {
    const date = new Date('2025-12-15T00:00:00Z')
    const result = formatDisplayDate(date, 'US')

    expect(result).toBe('12/15/2025')
  })

  it('should format date in ISO format', () => {
    const date = new Date('2025-12-15T00:00:00Z')
    const result = formatDisplayDate(date, 'ISO')

    expect(result).toBe('2025-12-15')
  })

  it('should include time when option is set', () => {
    const date = new Date('2025-12-15T14:30:00Z')
    const result = formatDisplayDate(date, 'EU', { includeTime: true, timeFormat: '24h' })

    expect(result).toBe('15/12/2025 14:30')
  })

  it('should accept string dates', () => {
    // Support both Date objects and ISO strings
    const result = formatDisplayDate('2025-12-15T00:00:00Z', 'EU')

    expect(result).toBe('15/12/2025')
  })

  it('should return dash for invalid date', () => {
    // Return placeholder for invalid dates instead of crashing
    const result = formatDisplayDate(new Date('invalid'))

    expect(result).toBe('—')
  })
})

// ============================================================================
// formatDisplayTime Tests
// ============================================================================

describe('formatDisplayTime', () => {
  /**
   * Tests for time display formatting.
   * Supports 24-hour and 12-hour (AM/PM) formats.
   */

  it('should format time in 24-hour format by default', () => {
    const date = new Date('2025-12-15T14:30:00Z')
    const result = formatDisplayTime(date)

    expect(result).toBe('14:30')
  })

  it('should format time in 12-hour format with PM', () => {
    const date = new Date('2025-12-15T14:30:00Z')
    const result = formatDisplayTime(date, '12h')

    expect(result).toBe('2:30 PM')
  })

  it('should format time in 12-hour format with AM', () => {
    const date = new Date('2025-12-15T09:15:00Z')
    const result = formatDisplayTime(date, '12h')

    expect(result).toBe('9:15 AM')
  })

  it('should handle midnight correctly in 12-hour format', () => {
    // Midnight is 12:00 AM, not 0:00 AM
    const date = new Date('2025-12-15T00:00:00Z')
    const result = formatDisplayTime(date, '12h')

    expect(result).toBe('12:00 AM')
  })

  it('should handle noon correctly in 12-hour format', () => {
    // Noon is 12:00 PM
    const date = new Date('2025-12-15T12:00:00Z')
    const result = formatDisplayTime(date, '12h')

    expect(result).toBe('12:00 PM')
  })

  it('should return dash for invalid date', () => {
    const result = formatDisplayTime(new Date('invalid'))

    expect(result).toBe('—')
  })
})

// ============================================================================
// isValidPastDate Tests
// ============================================================================

describe('isValidPastDate', () => {
  /**
   * Tests for birth date validation.
   * Birth dates must be in the past (with small tolerance for clock sync).
   */

  it('should return true for past dates', () => {
    const pastDate = new Date('1990-01-15T00:00:00Z')

    expect(isValidPastDate(pastDate)).toBe(true)
  })

  it('should return false for future dates', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24) // Tomorrow

    expect(isValidPastDate(futureDate)).toBe(false)
  })

  it('should allow dates within tolerance window', () => {
    // Account for slight time differences between client and server
    const almostNow = new Date(Date.now() + 1000) // 1 second in future

    expect(isValidPastDate(almostNow, 2000)).toBe(true) // 2 second tolerance
  })
})

// ============================================================================
// Form Input Helpers Tests
// ============================================================================

describe('formatDateForInput', () => {
  /**
   * Tests for converting database dates to HTML date input format.
   */

  it('should format ISO string to YYYY-MM-DD', () => {
    const result = formatDateForInput('2024-01-15T10:30:00.000Z')

    expect(result).toBe('2024-01-15')
  })

  it('should return empty string for undefined', () => {
    const result = formatDateForInput(undefined)

    expect(result).toBe('')
  })

  it('should return empty string for invalid date', () => {
    const result = formatDateForInput('not-a-date')

    expect(result).toBe('')
  })
})

describe('normalizeTimeValue', () => {
  /**
   * Tests for normalizing time input values to HH:MM:SS format.
   * HTML time inputs may return only HH:MM, but we need seconds for consistency.
   */

  it('should add seconds to HH:MM format', () => {
    const result = normalizeTimeValue('14:30')

    expect(result).toBe('14:30:00')
  })

  it('should preserve HH:MM:SS format', () => {
    const result = normalizeTimeValue('14:30:45')

    expect(result).toBe('14:30:45')
  })

  it('should return empty string for empty input', () => {
    const result = normalizeTimeValue('')

    expect(result).toBe('')
  })
})
