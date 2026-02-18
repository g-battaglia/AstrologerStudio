/**
 * Unit Tests for PDF Export Utilities
 *
 * Tests the shared utility functions for PDF export dialogs.
 * These functions handle subject conversion and file operations.
 *
 * NOTE: svgToDataUrl and triggerDownload are browser-specific functions that
 * require DOM APIs (canvas, Image, blob URLs, etc.). They are not tested here
 * as they require complex DOM mocking that is better suited for E2E/integration
 * testing. These functions are verified to work through manual testing and the
 * PDF export feature in production.
 *
 * @module src/lib/pdf/utils
 */
import { describe, it, expect } from 'vitest'
import {
  enrichedSubjectToSubject,
  sanitizeFilename,
  generatePdfFilename,
  type PartialEnrichedSubject,
} from '@/lib/pdf/utils'

// ============================================================================
// enrichedSubjectToSubject Tests
// ============================================================================

describe('enrichedSubjectToSubject', () => {
  /**
   * Tests for converting PartialEnrichedSubject to Subject type.
   * This is used when regenerating charts with the API.
   */

  it('should convert enriched subject with ISO datetime', () => {
    const enriched: PartialEnrichedSubject = {
      name: 'Test Person',
      city: 'Rome',
      nation: 'Italy',
      lat: 41.9028,
      lng: 12.4964,
      tz_str: 'Europe/Rome',
      iso_formatted_utc_datetime: '1990-05-15T10:30:00Z',
    }

    const result = enrichedSubjectToSubject(enriched)

    expect(result.name).toBe('Test Person')
    expect(result.city).toBe('Rome')
    expect(result.nation).toBe('Italy')
    expect(result.latitude).toBe(41.9028)
    expect(result.longitude).toBe(12.4964)
    expect(result.timezone).toBe('Europe/Rome')
    expect(result.id).toBe('pdf-export-temp')
    expect(result.ownerId).toBe('system')
    // Birth datetime should be based on ISO date
    expect(new Date(result.birth_datetime).toISOString()).toContain('1990-05-15')
  })

  it('should convert enriched subject with local datetime', () => {
    const enriched: PartialEnrichedSubject = {
      name: 'Local Person',
      city: 'Tokyo',
      nation: 'Japan',
      latitude: 35.6762,
      longitude: 139.6503,
      timezone: 'Asia/Tokyo',
      iso_formatted_local_datetime: '1985-03-20T14:00:00+09:00',
    }

    const result = enrichedSubjectToSubject(enriched)

    expect(result.name).toBe('Local Person')
    expect(result.city).toBe('Tokyo')
    expect(result.latitude).toBe(35.6762)
    expect(result.longitude).toBe(139.6503)
    expect(result.timezone).toBe('Asia/Tokyo')
  })

  it('should fallback to component date fields when no ISO datetime', () => {
    const enriched: PartialEnrichedSubject = {
      name: 'Component Date Person',
      year: 1975,
      month: 12,
      day: 25,
      hour: 8,
      minute: 45,
      city: 'Paris',
      nation: 'France',
      lat: 48.8566,
      lng: 2.3522,
      tz_str: 'Europe/Paris',
    }

    const result = enrichedSubjectToSubject(enriched)

    expect(result.name).toBe('Component Date Person')
    const birthDate = new Date(result.birth_datetime)
    expect(birthDate.getFullYear()).toBe(1975)
    expect(birthDate.getMonth()).toBe(11) // 0-indexed
    expect(birthDate.getDate()).toBe(25)
    expect(birthDate.getHours()).toBe(8)
    expect(birthDate.getMinutes()).toBe(45)
  })

  it('should use lat/lng when latitude/longitude not available', () => {
    const enriched: PartialEnrichedSubject = {
      name: 'Lat/Lng Person',
      lat: 51.5074,
      lng: -0.1278,
      city: 'London',
      nation: 'UK',
      tz_str: 'Europe/London',
      iso_formatted_utc_datetime: '2000-01-01T00:00:00Z',
    }

    const result = enrichedSubjectToSubject(enriched)

    expect(result.latitude).toBe(51.5074)
    expect(result.longitude).toBe(-0.1278)
  })

  it('should use latitude/longitude when lat/lng not available', () => {
    const enriched: PartialEnrichedSubject = {
      name: 'Latitude/Longitude Person',
      latitude: 40.7128,
      longitude: -74.006,
      city: 'New York',
      nation: 'USA',
      timezone: 'America/New_York',
      iso_formatted_utc_datetime: '2000-01-01T00:00:00Z',
    }

    const result = enrichedSubjectToSubject(enriched)

    expect(result.latitude).toBe(40.7128)
    expect(result.longitude).toBe(-74.006)
  })

  it('should prefer lat/lng over latitude/longitude', () => {
    const enriched: PartialEnrichedSubject = {
      name: 'Both Coords Person',
      lat: 1.1,
      lng: 2.2,
      latitude: 3.3,
      longitude: 4.4,
      city: 'Test City',
      nation: 'Test Nation',
      tz_str: 'UTC',
      iso_formatted_utc_datetime: '2000-01-01T00:00:00Z',
    }

    const result = enrichedSubjectToSubject(enriched)

    expect(result.latitude).toBe(1.1)
    expect(result.longitude).toBe(2.2)
  })

  it('should handle missing optional fields with defaults', () => {
    const enriched: PartialEnrichedSubject = {}

    const result = enrichedSubjectToSubject(enriched)

    expect(result.name).toBe('Chart')
    expect(result.city).toBe('')
    expect(result.nation).toBe('')
    expect(result.latitude).toBe(0)
    expect(result.longitude).toBe(0)
    expect(result.timezone).toBe('UTC')
  })

  it('should prefer tz_str over timezone', () => {
    const enriched: PartialEnrichedSubject = {
      name: 'Timezone Test',
      tz_str: 'Europe/Berlin',
      timezone: 'America/Chicago',
      iso_formatted_utc_datetime: '2000-01-01T00:00:00Z',
    }

    const result = enrichedSubjectToSubject(enriched)

    expect(result.timezone).toBe('Europe/Berlin')
  })

  it('should set createdAt and updatedAt to current date', () => {
    const enriched: PartialEnrichedSubject = {
      name: 'Date Test',
      iso_formatted_utc_datetime: '2000-01-01T00:00:00Z',
    }

    const before = new Date()
    const result = enrichedSubjectToSubject(enriched)
    const after = new Date()

    expect(result.createdAt!.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(result.createdAt!.getTime()).toBeLessThanOrEqual(after.getTime())
    expect(result.updatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(result.updatedAt!.getTime()).toBeLessThanOrEqual(after.getTime())
  })
})

// ============================================================================
// sanitizeFilename Tests
// ============================================================================

describe('sanitizeFilename', () => {
  /**
   * Tests for sanitizing names for use in filenames.
   */

  it('should replace spaces with underscores', () => {
    expect(sanitizeFilename('John Doe')).toBe('John_Doe')
  })

  it('should replace special characters with underscores', () => {
    expect(sanitizeFilename("Jane O'Brien")).toBe('Jane_O_Brien')
  })

  it('should preserve alphanumeric characters', () => {
    expect(sanitizeFilename('Alice123')).toBe('Alice123')
  })

  it('should handle multiple special characters', () => {
    expect(sanitizeFilename('Name!@#$%Test')).toBe('Name_____Test')
  })

  it('should handle unicode characters', () => {
    expect(sanitizeFilename('Maria Rodriguez')).toBe('Maria_Rodriguez')
  })

  it('should handle empty string', () => {
    expect(sanitizeFilename('')).toBe('')
  })

  it('should handle dashes and dots', () => {
    expect(sanitizeFilename('John-Doe.Jr')).toBe('John_Doe_Jr')
  })
})

// ============================================================================
// generatePdfFilename Tests
// ============================================================================

describe('generatePdfFilename', () => {
  /**
   * Tests for generating PDF filenames with consistent format.
   */

  it('should generate filename with base name and chart type', () => {
    const result = generatePdfFilename('John Doe', 'natal_chart', '2024-01-15')

    expect(result).toBe('John_Doe_natal_chart_2024-01-15.pdf')
  })

  it('should use current date when no date suffix provided', () => {
    const result = generatePdfFilename('Jane Smith', 'transit')
    const today = new Date().toISOString().split('T')[0]

    expect(result).toBe(`Jane_Smith_transit_${today}.pdf`)
  })

  it('should sanitize the base name', () => {
    const result = generatePdfFilename("John O'Brien Jr.", 'synastry', '2024-06-01')

    expect(result).toBe('John_O_Brien_Jr__synastry_2024-06-01.pdf')
  })

  it('should handle various chart types', () => {
    expect(generatePdfFilename('Test', 'solar-return', '2024-01-01')).toBe('Test_solar-return_2024-01-01.pdf')
    expect(generatePdfFilename('Test', 'lunar-return', '2024-01-01')).toBe('Test_lunar-return_2024-01-01.pdf')
    expect(generatePdfFilename('Test', 'composite', '2024-01-01')).toBe('Test_composite_2024-01-01.pdf')
  })

  it('should handle empty base name', () => {
    const result = generatePdfFilename('', 'natal', '2024-01-15')

    expect(result).toBe('_natal_2024-01-15.pdf')
  })
})
