/**
 * CSV Import/Export utilities for Subject data
 *
 * Provides shared types and parsing logic for importing subjects from CSV files.
 * Used by both CLI script and UI dialog.
 *
 * @module lib/csv/subjects
 */

import type { CreateSubjectInput, RodensRating } from '@/types/subjects'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Raw row schema from CSV file.
 * All fields are strings because CSV doesn't preserve types.
 */
export interface SubjectCSVRow {
  /** Subject name (required) */
  name: string
  /** Birth date/time in ISO format: "YYYY-MM-DDTHH:mm:ssZ" or "YYYY-MM-DD" (required) */
  birthDatetime: string
  /** City of birth */
  city?: string
  /** Country of birth */
  nation?: string
  /** Latitude as decimal string, e.g. "41.9028" */
  latitude?: string
  /** Longitude as decimal string, e.g. "12.4964" */
  longitude?: string
  /** IANA timezone, e.g. "Europe/Rome" */
  timezone?: string
  /** Rodden rating code: AA, A, B, etc. */
  rodensRating?: string
  /** Comma-separated tags or JSON array */
  tags?: string
  /** Free-form notes */
  notes?: string
}

/**
 * Result of parsing a CSV row
 */
export interface ParseResult {
  success: boolean
  data?: CreateSubjectInput
  error?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a tags string into an array.
 * Handles both comma-separated values and JSON array format.
 *
 * @param tags - Raw tags string from CSV
 * @returns Array of trimmed tag strings, or null if empty
 *
 * @example
 * parseTags('family, friends')         // ['family', 'friends']
 * parseTags('["a","b"]')               // ['a', 'b']
 * parseTags('')                        // null
 */
export function parseTags(tags: string | undefined): string[] | null {
  if (!tags || !tags.trim()) return null

  const trimmed = tags.trim()

  // Try JSON array format first
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((t) => String(t).trim()).filter(Boolean)
      }
    } catch {
      // Fall through to comma-separated parsing
    }
  }

  // Comma-separated format
  return trimmed
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

/**
 * Extract time string (HH:MM:SS) from a Date object in UTC.
 *
 * @param date - Date object
 * @returns Time string in HH:MM:SS format
 */
export function extractUTCTime(date: Date): string {
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const mm = String(date.getUTCMinutes()).padStart(2, '0')
  const ss = String(date.getUTCSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

/**
 * Parse a single CSV row into CreateSubjectInput.
 * Validates required fields and converts types.
 *
 * @param row - Raw CSV row data
 * @param rowIndex - Row number for error messages (1-indexed)
 * @returns ParseResult with either data or error
 *
 * @example
 * const result = parseSubjectCSVRow({ name: "Mario", birthDatetime: "1990-01-01T12:00:00Z" }, 1)
 * if (result.success) {
 *   console.log(result.data)
 * }
 */
export function parseSubjectCSVRow(row: SubjectCSVRow, rowIndex: number): ParseResult {
  try {
    // Required field validation
    if (!row.name?.trim()) {
      throw new Error('Missing name')
    }
    if (!row.birthDatetime?.trim()) {
      throw new Error('Missing birthDatetime')
    }

    // Parse and validate date
    const birthDate = new Date(row.birthDatetime)
    if (isNaN(birthDate.getTime())) {
      throw new Error(`Invalid date format: "${row.birthDatetime}"`)
    }

    // Build CreateSubjectInput
    const data: CreateSubjectInput = {
      name: row.name.trim(),
      birthDate: birthDate.toISOString(),
      birthTime: extractUTCTime(birthDate),
      city: row.city?.trim() || '',
      nation: row.nation?.trim() || '',
      latitude: row.latitude ? parseFloat(row.latitude) : undefined,
      longitude: row.longitude ? parseFloat(row.longitude) : undefined,
      timezone: row.timezone?.trim() || 'UTC',
      rodens_rating: (row.rodensRating?.trim() as RodensRating) || null,
      tags: parseTags(row.tags),
      notes: row.notes?.trim() || '',
    }

    // Validate coordinates if provided
    if (data.latitude !== undefined && (data.latitude < -90 || data.latitude > 90)) {
      throw new Error(`Invalid latitude: ${data.latitude}`)
    }
    if (data.longitude !== undefined && (data.longitude < -180 || data.longitude > 180)) {
      throw new Error(`Invalid longitude: ${data.longitude}`)
    }

    return { success: true, data }
  } catch (err) {
    return {
      success: false,
      error: `Row ${rowIndex}: ${(err as Error).message}`,
    }
  }
}

/**
 * Create a unique signature for a subject to detect duplicates.
 * Uses name (lowercase) + birth datetime ISO string.
 *
 * @param name - Subject name
 * @param birthDatetime - Birth datetime as Date or ISO string
 * @returns Unique signature string
 */
export function createSubjectSignature(name: string, birthDatetime: Date | string): string {
  const dateStr = birthDatetime instanceof Date ? birthDatetime.toISOString() : new Date(birthDatetime).toISOString()
  return `${name.toLowerCase().trim()}|${dateStr}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Export CSV Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CSV column headers for subject export
 */
export const SUBJECT_CSV_HEADERS = [
  'name',
  'birthDatetime',
  'city',
  'nation',
  'latitude',
  'longitude',
  'timezone',
  'rodensRating',
  'tags',
  'notes',
] as const
