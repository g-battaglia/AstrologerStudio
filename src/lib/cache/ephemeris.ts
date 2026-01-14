import type { EphemerisArray } from '@/types/ephemeris'
import { clientLogger } from '@/lib/logging/client'

const DB_NAME = 'ephemeris-db'
const DB_VERSION = 1
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

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
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
          resolve(null)
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
  } catch (error) {
    clientLogger.error('Error writing to ephemeris cache:', error)
  }
}

/**
 * Clear all cached ephemeris data
 */
export async function clearEphemerisCache(): Promise<void> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => {
        clientLogger.info('Ephemeris cache cleared')
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    clientLogger.error('Error clearing ephemeris cache:', error)
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
