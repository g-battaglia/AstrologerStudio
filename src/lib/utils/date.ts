/**
 * Date/Time parsing utilities for astrological subjects
 * Centralizes date handling to avoid duplication and ensure consistency
 */

/**
 * Parse birth date and time into a UTC Date object
 *
 * @param date - Date string (can be ISO format or YYYY-MM-DD)
 * @param time - Optional time string in HH:MM:SS format
 * @returns Date object in UTC
 * @throws Error if date/time is invalid
 *
 * @example
 * ```ts
 * const birthDatetime = parseBirthDateTime('1990-01-15', '14:30:00')
 * // Returns: Date for 1990-01-15T14:30:00Z
 * ```
 */
export function parseBirthDateTime(date: string, time?: string): Date {
  if (!date) {
    throw new Error('Birth date is required')
  }

  // Extract date part if full ISO format provided
  let datePart = date
  if (datePart.includes('T')) {
    const split = datePart.split('T')[0]
    if (!split) {
      throw new Error('Invalid date format')
    }
    datePart = split
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    throw new Error('Date must be in YYYY-MM-DD format')
  }

  // Default time to midnight if not provided
  const timePart = time || '00:00:00'

  // Validate time format (HH:MM:SS)
  if (!/^\d{2}:\d{2}:\d{2}$/.test(timePart)) {
    throw new Error('Time must be in HH:MM:SS format')
  }

  // Validate time components
  const [hours, minutes, seconds] = timePart.split(':').map(Number)
  if (
    hours === undefined ||
    minutes === undefined ||
    seconds === undefined ||
    hours > 23 ||
    minutes > 59 ||
    seconds > 59
  ) {
    throw new Error('Invalid time values')
  }

  // Combine date and time with Z suffix to force UTC interpretation
  const isoString = `${datePart}T${timePart}Z`
  const result = new Date(isoString)

  if (isNaN(result.getTime())) {
    throw new Error('Invalid birth date/time combination')
  }

  return result
}

/**
 * Format a Date object to date and time strings for form display
 *
 * @param datetime - Date object to format
 * @returns Object with date (YYYY-MM-DD) and time (HH:MM:SS) strings
 *
 * @example
 * ```ts
 * const { date, time } = formatDateTimeForForm(new Date('1990-01-15T14:30:00Z'))
 * // Returns: { date: '1990-01-15', time: '14:30:00' }
 * ```
 */
export function formatDateTimeForForm(datetime: Date): { date: string; time: string } {
  const d = new Date(datetime)

  if (isNaN(d.getTime())) {
    return { date: '', time: '' }
  }

  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const hours = String(d.getUTCHours()).padStart(2, '0')
  const minutes = String(d.getUTCMinutes()).padStart(2, '0')
  const seconds = String(d.getUTCSeconds()).padStart(2, '0')

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}:${seconds}`,
  }
}

/**
 * Validate that a date is not in the future (with small tolerance)
 *
 * @param date - Date to validate
 * @param toleranceMs - Tolerance in milliseconds (default 2 seconds)
 * @returns true if date is valid (not future)
 */
export function isValidPastDate(date: Date, toleranceMs = 2000): boolean {
  return date.getTime() <= Date.now() + toleranceMs
}

/**
 * Date format types supported by the application
 */
export type DateFormat = 'US' | 'EU' | 'ISO'

/**
 * Time format types supported by the application
 */
export type TimeFormat = '12h' | '24h'

/**
 * Format a time according to user preferences
 *
 * @param date - Date object or ISO string
 * @param format - Time format preference: 12h (AM/PM) or 24h
 * @returns Formatted time string
 *
 * @example
 * ```ts
 * formatDisplayTime(new Date('2025-12-15T14:30:00Z'), '24h')  // "14:30"
 * formatDisplayTime(new Date('2025-12-15T14:30:00Z'), '12h')  // "2:30 PM"
 * ```
 */
export function formatDisplayTime(date: Date | string, format: TimeFormat = '24h'): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) {
    return '—'
  }

  const hours24 = d.getUTCHours()
  const minutes = String(d.getUTCMinutes()).padStart(2, '0')

  if (format === '12h') {
    const hours12 = hours24 % 12 || 12
    const ampm = hours24 < 12 ? 'AM' : 'PM'
    return `${hours12}:${minutes} ${ampm}`
  }

  return `${String(hours24).padStart(2, '0')}:${minutes}`
}

/**
 * Format a date for display according to user preferences
 *
 * @param date - Date object or ISO string to format
 * @param format - Date format preference: US (MM/DD/YYYY), EU (DD/MM/YYYY), ISO (YYYY-MM-DD)
 * @param options - Optional formatting options
 * @returns Formatted date string
 *
 * @example
 * ```ts
 * formatDisplayDate(new Date('2025-12-15'), 'US')   // "12/15/2025"
 * formatDisplayDate(new Date('2025-12-15'), 'EU')   // "15/12/2025"
 * formatDisplayDate(new Date('2025-12-15'), 'ISO')  // "2025-12-15"
 * formatDisplayDate('2025-12-15T14:30:00Z', 'EU', { includeTime: true, timeFormat: '12h' })  // "15/12/2025 2:30 PM"
 * ```
 */
export function formatDisplayDate(
  date: Date | string,
  format: DateFormat = 'EU',
  options?: { includeTime?: boolean; timeFormat?: TimeFormat; style?: 'short' | 'medium' },
): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) {
    return '—'
  }

  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()

  let datePart: string
  switch (format) {
    case 'US':
      datePart = `${month}/${day}/${year}`
      break
    case 'ISO':
      datePart = `${year}-${month}-${day}`
      break
    case 'EU':
    default:
      datePart = `${day}/${month}/${year}`
      break
  }

  if (options?.includeTime) {
    const timePart = formatDisplayTime(d, options.timeFormat ?? '24h')
    return `${datePart} ${timePart}`
  }

  return datePart
}

// ─────────────────────────────────────────────────────────────────────────────
// Form Input Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats an ISO date string to YYYY-MM-DD format for HTML date inputs.
 *
 * @param isoString - ISO date string (e.g., "2024-01-15T10:30:00.000Z")
 * @returns Date in YYYY-MM-DD format, or empty string if invalid
 *
 * @example
 * ```ts
 * formatDateForInput('2024-01-15T10:30:00.000Z')  // "2024-01-15"
 * formatDateForInput(undefined)                   // ""
 * ```
 */
export function formatDateForInput(isoString: string | undefined): string {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0] ?? ''
}

/**
 * Parses a date input value and returns an ISO string.
 *
 * @param value - Date string from input (YYYY-MM-DD format)
 * @returns ISO string or empty string if invalid
 *
 * @example
 * ```ts
 * parseDateInput('2024-01-15')  // "2024-01-15T00:00:00.000Z"
 * parseDateInput('')            // ""
 * ```
 */
export function parseDateInput(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  return d.toISOString()
}

/**
 * Normalizes a time value to HH:MM:SS format.
 * HTML time inputs may return only HH:MM, this ensures seconds are included.
 *
 * @param value - Time string from input (HH:MM or HH:MM:SS)
 * @returns Time in HH:MM:SS format, or empty string if invalid
 *
 * @example
 * ```ts
 * normalizeTimeValue('14:30')     // "14:30:00"
 * normalizeTimeValue('14:30:45')  // "14:30:45"
 * normalizeTimeValue('')          // ""
 * ```
 */
export function normalizeTimeValue(value: string): string {
  if (!value) return ''
  const parts = value.split(':')
  while (parts.length < 3) parts.push('00')
  return parts.slice(0, 3).join(':')
}
