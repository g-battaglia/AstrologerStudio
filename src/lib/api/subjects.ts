import {
  getSubjects,
  createSubject as createSubjectAction,
  updateSubject as updateSubjectAction,
  deleteSubject as deleteSubjectAction,
  deleteSubjects as deleteSubjectsAction,
  importSubjects as importSubjectsAction,
} from '@/actions/subjects'
import type { Subject, CreateSubjectInput, UpdateSubjectInput } from '@/types/subjects'

export async function fetchRandomSubjects(_count = 50, _signal?: AbortSignal): Promise<Subject[]> {
  // For now, we just return the user's subjects from the DB
  // The 'random' part was for the mock data demo
  return await getSubjects()
}

// Delete subject endpoint
export async function deleteSubject(id: string, _token?: string): Promise<{ id: string }> {
  return await deleteSubjectAction(id)
}

// Update subject endpoint
export async function updateSubject(data: UpdateSubjectInput, _token?: string): Promise<Subject> {
  return await updateSubjectAction(data)
}

// Create subject endpoint
export async function createSubject(data: CreateSubjectInput, _token?: string): Promise<Subject> {
  return await createSubjectAction(data)
}

export async function deleteSubjects(ids: string[], _token?: string): Promise<{ count: number }> {
  return await deleteSubjectsAction(ids)
}

/**
 * Import subjects from CSV with deduplication
 *
 * @param subjects - Array of subject data to import
 * @returns Import results with counts of created, skipped (duplicates), and failed entries
 */
export async function importSubjects(
  subjects: CreateSubjectInput[],
  _token?: string,
): Promise<{ created: number; skipped: number; failed: number; errors: string[] }> {
  return await importSubjectsAction(subjects)
}
