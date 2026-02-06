import { clientLogger } from '@/lib/logging/client'
import { cleanupExpiredEphemeris } from './ephemeris'
import { cleanupExpiredTransits } from './transits'
import { cleanupExpiredInterpretations } from './interpretations'

/**
 * Flag to ensure cleanup only runs once per session
 */
let hasRunCleanup = false

/**
 * Runs cleanup on all IndexedDB caches to remove expired entries.
 * This is designed to be called once on app startup.
 *
 * @returns Total number of entries cleaned up across all caches
 */
export async function cleanupExpiredCaches(): Promise<number> {
  // Only run once per session
  if (hasRunCleanup) {
    return 0
  }
  hasRunCleanup = true

  try {
    clientLogger.debug('Starting cache cleanup...')

    // Run all cleanups in parallel
    const [ephemerisCount, transitCount, interpretationsCount] = await Promise.all([
      cleanupExpiredEphemeris(),
      cleanupExpiredTransits(),
      cleanupExpiredInterpretations(),
    ])

    const totalCleaned = ephemerisCount + transitCount + interpretationsCount

    if (totalCleaned > 0) {
      clientLogger.info(`Cache cleanup complete: ${totalCleaned} expired entries removed`, {
        ephemeris: ephemerisCount,
        transits: transitCount,
        interpretations: interpretationsCount,
      })
    }

    return totalCleaned
  } catch (error) {
    clientLogger.error('Error during cache cleanup:', error)
    return 0
  }
}

/**
 * Clears all client-side caches.
 * Use this for a complete cache reset (e.g., from settings UI).
 */
export async function clearAllCaches(): Promise<boolean> {
  try {
    const { clearEphemerisCache } = await import('./ephemeris')
    const { clearTransitCache } = await import('./transits')
    const { clearAllInterpretations } = await import('./interpretations')

    const [ephemerisCleared, transitCleared, interpretationsCleared] = await Promise.all([
      clearEphemerisCache(),
      clearTransitCache(),
      clearAllInterpretations(),
    ])

    const allCachesCleared = ephemerisCleared && transitCleared && interpretationsCleared

    if (allCachesCleared) {
      clientLogger.info('All client-side caches cleared')
      return true
    }

    clientLogger.warn('One or more client-side caches could not be cleared', {
      ephemerisCleared,
      transitCleared,
      interpretationsCleared,
    })
    return false
  } catch (error) {
    clientLogger.error('Failed to clear all client-side caches:', error)
    return false
  }
}
