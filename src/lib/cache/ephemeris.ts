import type { EphemerisArray } from '@/types/ephemeris'
import { clientLogger } from '@/lib/logging/client'
import { writeWithQuotaRecovery } from './quota-handler'

const DB_NAME = 'ephemeris-db'
const DB_VERSION = 2 // Bumped to ensure index migration runs for existing databases
const STORE_NAME = 'ephemeris'
const CACHE_TTL_DAYS = 30 // Cache expires after 30 days

interface CachedEphemeris {
  key: string
  startDate: string
  endDate: string
  data: EphemerisArray
  timestamp: number
  version: number
}

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Initialize IndexedDB for ephemeris storage
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
        clientLogger.warn('Ephemeris cache upgrade transaction missing')
        return
      }

      const store = db.objectStoreNames.contains(STORE_NAME)
        ? transaction.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: 'key' })

      if (!store.indexNames.contains('timestamp')) {
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })

  return dbPromise
}

/**
 * Generate cache key from date range
 */
function getCacheKey(startDate: Date, endDate: Date): string {
  const start = startDate.toISOString().split('T')[0]
  const end = endDate.toISOString().split('T')[0]
  return `${start}_to_${end}`
}

/**
 * Check if cached data is still fresh (not expired)
 */
function isCacheFresh(timestamp: number): boolean {
  const now = Date.now()
  const age = now - timestamp
  const maxAge = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
  return age < maxAge
}

/**
 * Delete a cache entry by key
 */
function deleteCacheEntry(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(key)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Retrieve cached ephemeris data for a date range
 * Returns null if not found or expired
 */
export async function getCachedEphemeris(startDate: Date, endDate: Date): Promise<EphemerisArray | null> {
  try {
    const db = await initDB()
    const key = getCacheKey(startDate, endDate)

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(key)

      request.onsuccess = () => {
        const result = request.result as CachedEphemeris | undefined

        if (!result) {
          resolve(null)
          return
        }

        // Check if cache is still fresh
        if (!isCacheFresh(result.timestamp)) {
          clientLogger.debug('Ephemeris cache expired for:', key)
          deleteCacheEntry(db, key)
            .catch((deleteError) => {
              clientLogger.warn('Failed to delete expired ephemeris cache entry', { key, deleteError })
            })
            .finally(() => {
              resolve(null)
            })
          return
        }

        clientLogger.debug('Ephemeris cache hit for:', key)
        resolve(result.data)
      }

      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    clientLogger.error('Error reading from ephemeris cache:', error)
    return null
  }
}

/**
 * Store ephemeris data in cache
 */
export async function setCachedEphemeris(startDate: Date, endDate: Date, data: EphemerisArray): Promise<void> {
  try {
    const db = await initDB()
    const key = getCacheKey(startDate, endDate)

    const cached: CachedEphemeris = {
      key,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      data,
      timestamp: Date.now(),
      version: DB_VERSION,
    }

    const performWrite = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.put(cached)

        request.onsuccess = () => {
          clientLogger.debug('Cached ephemeris data for:', key)
          resolve()
        }

        request.onerror = () => reject(request.error)
      })
    }

    await writeWithQuotaRecovery(db, STORE_NAME, performWrite)
  } catch (error) {
    clientLogger.error('Error writing to ephemeris cache:', error)
  }
}

/**
 * Clear all cached ephemeris data
 */
export async function clearEphemerisCache(): Promise<boolean> {
  try {
    const db = await initDB()

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => {
        clientLogger.info('Ephemeris cache cleared')
        resolve(true)
      }

      request.onerror = () => {
        clientLogger.error('Error clearing ephemeris cache:', request.error)
        resolve(false)
      }
    })
  } catch (error) {
    clientLogger.error('Error clearing ephemeris cache:', error)
    return false
  }
}

/**
 * Get information about cached data
 */
export async function getCacheInfo(): Promise<{
  count: number
  ranges: Array<{ startDate: string; endDate: string; timestamp: number }>
}> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const results = request.result as CachedEphemeris[]
        resolve({
          count: results.length,
          ranges: results.map((r) => ({
            startDate: r.startDate,
            endDate: r.endDate,
            timestamp: r.timestamp,
          })),
        })
      }

      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    clientLogger.error('Error getting ephemeris cache info:', error)
    return { count: 0, ranges: [] }
  }
}

/**
 * Clean up expired ephemeris entries
 * Returns the number of entries deleted
 */
export async function cleanupExpiredEphemeris(): Promise<number> {
  try {
    const db = await initDB()
    const now = Date.now()
    const maxAge = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
    const expiryThreshold = now - maxAge

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      if (!store.indexNames.contains('timestamp')) {
        clientLogger.warn('Timestamp index missing in ephemeris cache, skipping expired-entry cleanup')
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
            clientLogger.info(`Cleaned up ${deletedCount} expired ephemeris entries`)
          }
          resolve(deletedCount)
        }
      }

      request.onerror = () => {
        clientLogger.error('Error cleaning up ephemeris cache:', request.error)
        resolve(0)
      }
    })
  } catch (error) {
    clientLogger.error('Error cleaning up ephemeris cache:', error)
    return 0
  }
}
