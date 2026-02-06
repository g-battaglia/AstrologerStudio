import { clientLogger } from '@/lib/logging/client'
import { writeWithQuotaRecovery } from './quota-handler'

const DB_NAME = 'interpretations-db'
const DB_VERSION = 2 // Bumped to ensure index migration runs for existing databases
const STORE_NAME = 'interpretations'

/** Cache TTL in milliseconds (7 days) */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Check if cached data is still fresh
 */
function isCacheFresh(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL_MS
}

/**
 * Delete a cache entry by chart ID
 */
function deleteCacheEntry(db: IDBDatabase, chartId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(chartId)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

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

    request.onupgradeneeded = () => {
      const db = request.result
      const transaction = request.transaction

      if (!transaction) {
        clientLogger.warn('Interpretation cache upgrade transaction missing')
        return
      }

      const store = db.objectStoreNames.contains(STORE_NAME)
        ? transaction.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: 'chartId' })

      if (!store.indexNames.contains('timestamp')) {
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

    const performWrite = (): Promise<void> => {
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
    }

    await writeWithQuotaRecovery(db, STORE_NAME, performWrite)
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

        // Check if cache entry has expired
        if (!isCacheFresh(result.timestamp)) {
          clientLogger.debug('Interpretation cache expired for:', chartId)
          deleteCacheEntry(db, chartId)
            .catch((deleteError) => {
              clientLogger.warn('Failed to delete expired interpretation cache entry', { chartId, deleteError })
            })
            .finally(() => {
              resolve(null)
            })
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
export async function clearAllInterpretations(): Promise<boolean> {
  try {
    const db = await initDB()

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => {
        clientLogger.info('Interpretation cache cleared')
        resolve(true)
      }

      request.onerror = () => {
        clientLogger.error('Error clearing interpretation cache:', request.error)
        resolve(false)
      }
    })
  } catch (error) {
    clientLogger.error('Error clearing interpretation cache:', error)
    return false
  }
}

/**
 * Clean up expired interpretation entries
 * Returns the number of entries deleted
 */
export async function cleanupExpiredInterpretations(): Promise<number> {
  try {
    const db = await initDB()
    const now = Date.now()
    const expiryThreshold = now - CACHE_TTL_MS

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      if (!store.indexNames.contains('timestamp')) {
        clientLogger.warn('Timestamp index missing in interpretation cache, skipping expired-entry cleanup')
        resolve(0)
        return
      }

      const index = store.index('timestamp')

      // Get all entries with timestamp less than threshold (expired)
      const range = IDBKeyRange.upperBound(expiryThreshold)
      const request = index.openCursor(range)

      let deletedCount = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          deletedCount++
          cursor.continue()
        } else {
          if (deletedCount > 0) {
            clientLogger.info(`Cleaned up ${deletedCount} expired interpretation entries`)
          }
          resolve(deletedCount)
        }
      }

      request.onerror = () => {
        clientLogger.error('Error cleaning up interpretation cache:', request.error)
        resolve(0)
      }
    })
  } catch (error) {
    clientLogger.error('Error cleaning up interpretation cache:', error)
    return 0
  }
}
