import { clientLogger } from '@/lib/logging/client'

const DB_NAME = 'interpretations-db'
const DB_VERSION = 1
const STORE_NAME = 'interpretations'

interface CachedInterpretation {
  chartId: string
  content: string
  timestamp: number
  isComplete: boolean
}

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Initialize IndexedDB for interpretation storage
 */
function initDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'chartId' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })

  return dbPromise
}

/**
 * Generate a unique chart ID based on chart parameters
 */
export function generateChartId(
  chartType: string,
  subjectName: string,
  subjectDate: string,
  secondSubjectName?: string,
  secondSubjectDate?: string,
): string {
  const parts = [chartType, subjectName, subjectDate]
  if (secondSubjectName) {
    parts.push(secondSubjectName)
  }
  if (secondSubjectDate) {
    parts.push(secondSubjectDate)
  }
  return parts.join('-')
}

/**
 * Save or update interpretation content progressively
 * @param chartId Unique identifier for the chart
 * @param content Current accumulated text content
 * @param isComplete Whether generation has finished
 */
export async function saveInterpretationChunk(chartId: string, content: string, isComplete: boolean): Promise<void> {
  try {
    const db = await initDB()

    const cached: CachedInterpretation = {
      chartId,
      content,
      timestamp: Date.now(),
      isComplete,
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(cached)

      request.onsuccess = () => {
        clientLogger.debug('Saved interpretation chunk for:', chartId)
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    clientLogger.error('Error saving interpretation chunk:', error)
  }
}

/**
 * Retrieve cached interpretation for a chart
 * Returns null if not found
 */
export async function getInterpretation(chartId: string): Promise<CachedInterpretation | null> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(chartId)

      request.onsuccess = () => {
        const result = request.result as CachedInterpretation | undefined

        if (!result) {
          resolve(null)
          return
        }

        clientLogger.debug('Interpretation cache hit for:', chartId)
        resolve(result)
      }

      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    clientLogger.error('Error reading from interpretation cache:', error)
    return null
  }
}

/**
 * Delete cached interpretation for a chart
 */
export async function deleteInterpretation(chartId: string): Promise<void> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(chartId)

      request.onsuccess = () => {
        clientLogger.debug('Deleted interpretation for:', chartId)
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    clientLogger.error('Error deleting interpretation:', error)
  }
}

/**
 * Clear all cached interpretations
 */
export async function clearAllInterpretations(): Promise<void> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => {
        clientLogger.info('Interpretation cache cleared')
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    clientLogger.error('Error clearing interpretation cache:', error)
  }
}
