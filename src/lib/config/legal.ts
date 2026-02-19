/**
 * Legal document version configuration
 *
 * Update these versions when you change Terms of Service or Privacy Policy.
 * Users who have not accepted the current versions will be prompted to re-accept.
 *
 * Format: YYYY-MM-DD (date of the document update)
 */
export const LEGAL_VERSIONS = {
  /** Current Terms of Service version */
  terms: '2026-02-19',

  /** Current Privacy Policy version */
  privacy: '2026-02-19',
} as const

export type LegalVersions = typeof LEGAL_VERSIONS
