// Subject domain-related types and helpers
// Keep this file free of runtime code; types and re-exports only.

// Re-export Subject and related zod-derived types
export type { Subject, RodensRating } from './schemas'

// Form input types (re-export from validation schemas)
export type { UpdateSubjectInput, CreateSubjectInput } from '@/lib/validation/subject'

// Raw type used to adapt randomuser.me payloads into Subject
export interface RawRandomUser {
  login: { uuid: string; username: string }
  dob: { date: string }
  location?: {
    city?: string
    country?: string
    coordinates?: { latitude: string; longitude: string }
  }
}
