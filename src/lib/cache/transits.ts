import type { TransitDayData } from '@/lib/api/transits'
import { clientLogger } from '@/lib/logging/client'
import { getDaysInMonth, parse } from 'date-fns'

const DB_NAME = 'transit-db'
const DB_VERSION = 2 // Bumped to invalidate corrupted cache entries
const STORE_NAME = 'transits'
const CACHE_TTL_DAYS = 5 // Cache expires after 5 days

interface CachedTransitMonth {
  key: string // Format: subjectId_YYYY-MM
  subjectId: string
  month: string // YYYY-MM
  data: TransitDayData[]
  timestamp: number
  version: number
}

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Initialize IndexedDB for transit storage
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
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('subjectId', 'subjectId', { unique: false })
      }
    }
  })

  return dbPromise
}

/**
 * Generate cache key from subjectId and month
 */
function getCacheKey(subjectId: string, monthStr: string): string {
  return `${subjectId}_${monthStr}`
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
 * Retrieve cached transit data for a specific month
 */
export async function getCachedTransitMonth(
  subjectId: string,
  monthStr: string, // YYYY-MM
): Promise<TransitDayData[] | null> {
  try {
    const db = await initDB()
    const key = getCacheKey(subjectId, monthStr)

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(key)

      request.onsuccess = () => {
        const result = request.result as CachedTransitMonth | undefined

        if (!result) {
          resolve(null)
          return
        }

        // Check if cache is still fresh
        if (!isCacheFresh(result.timestamp)) {
          clientLogger.debug('Transit cache expired for:', key)
          resolve(null)
          return
        }

        // Validate completeness: ensure all days of the month are present
        const expectedDays = getDaysInMonth(parse(monthStr, 'yyyy-MM', new Date()))
        if (result.data.length < expectedDays) {
          clientLogger.debug(
            `Transit cache incomplete for ${key}: ${result.data.length}/${expectedDays} days, forcing re-fetch`,
          )
          resolve(null)
          return
        }

        resolve(result.data)
      }

      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    clientLogger.error('Error reading from transit cache:', error)
    return null
  }
}

/**
 * Store transit data for a month in cache
 */
export async function setCachedTransitMonth(
  subjectId: string,
  monthStr: string, // YYYY-MM
  data: TransitDayData[],
): Promise<void> {
  try {
    const db = await initDB()
    const key = getCacheKey(subjectId, monthStr)

    const cached: CachedTransitMonth = {
      key,
      subjectId,
      month: monthStr,
      data,
      timestamp: Date.now(),
      version: DB_VERSION,
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(cached)

      request.onsuccess = () => {
        // console.debug('Cached transit data for:', key)
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    clientLogger.error('Error writing to transit cache:', error)
  }
}

/**
 * Clear all cached transit data
 */
export async function clearTransitCache(): Promise<void> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => {
        clientLogger.info('Transit cache cleared')
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    clientLogger.error('Error clearing transit cache:', error)
  }
}
