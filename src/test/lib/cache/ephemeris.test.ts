/**
 * Unit Tests for Ephemeris Cache
 *
 * Tests the IndexedDB-based cache for ephemeris data.
 * Uses fake-indexeddb to simulate IndexedDB in the test environment.
 *
 * @module src/lib/cache/ephemeris
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'

// Mock Prisma to prevent any accidental database connections
// This ensures no external side-effects to real DB
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}))

// Mock the client logger to avoid console noise during tests
vi.mock('@/lib/logging/client', () => ({
  clientLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getLevel: vi.fn(() => 'silent'),
  },
}))

// Import after mocks are set up
import { getCachedEphemeris, setCachedEphemeris, clearEphemerisCache, getCacheInfo } from '@/lib/cache/ephemeris'
import type { EphemerisArray } from '@/types/ephemeris'

// Sample ephemeris data for testing
const sampleEphemerisData: EphemerisArray = [
  {
    date: '2025-01-01T12:00:00',
    planets: [
      {
        name: 'Sun',
        quality: 'Cardinal',
        element: 'Earth',
        sign: 'Capricorn',
        sign_num: 10,
        position: 10.5,
        abs_pos: 280.5,
        emoji: '♑',
        point_type: 'Planet',
        house: 'First_House',
        retrograde: false,
      },
    ],
    houses: [
      {
        name: 'First_House',
        quality: 'Cardinal',
        element: 'Fire',
        sign: 'Aries',
        sign_num: 1,
        position: 0.0,
        abs_pos: 0.0,
        emoji: '♈',
        point_type: 'House',
        house: 'First_House',
        retrograde: false,
      },
    ],
  },
]

describe('Ephemeris Cache', () => {
  beforeEach(async () => {
    // Clear cache before each test to ensure clean state
    await clearEphemerisCache()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('No External Side Effects', () => {
    it('should not access Prisma or any real database', async () => {
      // This test verifies that the ephemeris cache module operates
      // purely with IndexedDB and has no side effects on external systems
      const { prisma } = await import('@/lib/db/prisma')

      const startDate = new Date('2025-01-01')
      const endDate = new Date('2025-01-31')

      // Perform all cache operations
      await setCachedEphemeris(startDate, endDate, sampleEphemerisData)
      await getCachedEphemeris(startDate, endDate)
      await getCacheInfo()
      await clearEphemerisCache()

      // Verify Prisma was never called
      expect(prisma.$connect).not.toHaveBeenCalled()
      expect(prisma.$disconnect).not.toHaveBeenCalled()
    })
  })

  describe('setCachedEphemeris', () => {
    it('should store ephemeris data successfully', async () => {
      const startDate = new Date('2025-01-01')
      const endDate = new Date('2025-01-31')

      await setCachedEphemeris(startDate, endDate, sampleEphemerisData)

      const result = await getCachedEphemeris(startDate, endDate)
      expect(result).not.toBeNull()
      expect(result).toEqual(sampleEphemerisData)
    })

    it('should store data with correct versioning', async () => {
      const startDate = new Date('2025-02-01')
      const endDate = new Date('2025-02-28')

      await setCachedEphemeris(startDate, endDate, sampleEphemerisData)

      const cacheInfo = await getCacheInfo()
      expect(cacheInfo.count).toBe(1)
      // The version is stored internally with DB_VERSION = 1
    })

    it('should update existing cache entry', async () => {
      const startDate = new Date('2025-03-01')
      const endDate = new Date('2025-03-31')

      const firstEntry = sampleEphemerisData[0]!
      const updatedData: EphemerisArray = [
        {
          date: '2025-03-15T12:00:00',
          planets: firstEntry.planets,
          houses: firstEntry.houses,
        },
      ]

      await setCachedEphemeris(startDate, endDate, sampleEphemerisData)
      await setCachedEphemeris(startDate, endDate, updatedData)

      const result = await getCachedEphemeris(startDate, endDate)
      expect(result).toEqual(updatedData)

      // Should still have only one entry
      const cacheInfo = await getCacheInfo()
      expect(cacheInfo.count).toBe(1)
    })

    it('should store timestamp with cache entry', async () => {
      const startDate = new Date('2025-04-01')
      const endDate = new Date('2025-04-30')
      const beforeSave = Date.now()

      await setCachedEphemeris(startDate, endDate, sampleEphemerisData)

      const cacheInfo = await getCacheInfo()
      expect(cacheInfo.ranges[0]!.timestamp).toBeGreaterThanOrEqual(beforeSave)
      expect(cacheInfo.ranges[0]!.timestamp).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('getCachedEphemeris', () => {
    describe('cache miss', () => {
      it('should return null for non-existent cache entry', async () => {
        const startDate = new Date('2099-01-01')
        const endDate = new Date('2099-12-31')

        const result = await getCachedEphemeris(startDate, endDate)

        expect(result).toBeNull()
      })

      it('should return null for different date range', async () => {
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-31')

        await setCachedEphemeris(startDate, endDate, sampleEphemerisData)

        // Query with different dates
        const differentStart = new Date('2025-02-01')
        const differentEnd = new Date('2025-02-28')
        const result = await getCachedEphemeris(differentStart, differentEnd)

        expect(result).toBeNull()
      })
    })

    describe('cache hit', () => {
      it('should return cached data for exact date range match', async () => {
        const startDate = new Date('2025-05-01')
        const endDate = new Date('2025-05-31')

        await setCachedEphemeris(startDate, endDate, sampleEphemerisData)

        const result = await getCachedEphemeris(startDate, endDate)

        expect(result).not.toBeNull()
        expect(result).toEqual(sampleEphemerisData)
      })

      it('should return fresh cached data', async () => {
        const startDate = new Date('2025-06-01')
        const endDate = new Date('2025-06-30')

        await setCachedEphemeris(startDate, endDate, sampleEphemerisData)

        // Immediately retrieve - should be fresh
        const result = await getCachedEphemeris(startDate, endDate)
        expect(result).toEqual(sampleEphemerisData)
      })
    })

    describe('cache expiration', () => {
      it('should return null for expired cache entry', async () => {
        const startDate = new Date('2025-07-01')
        const endDate = new Date('2025-07-31')

        await setCachedEphemeris(startDate, endDate, sampleEphemerisData)

        // Mock Date.now to simulate 31 days later (beyond 30-day TTL)
        const thirtyOneDaysInMs = 31 * 24 * 60 * 60 * 1000
        const originalDateNow = Date.now
        vi.spyOn(Date, 'now').mockReturnValue(originalDateNow() + thirtyOneDaysInMs)

        const result = await getCachedEphemeris(startDate, endDate)

        expect(result).toBeNull()

        vi.restoreAllMocks()
      })

      it('should delete expired cache entry when accessed', async () => {
        const startDate = new Date('2025-07-01')
        const endDate = new Date('2025-07-31')

        await setCachedEphemeris(startDate, endDate, sampleEphemerisData)

        // Move beyond 30-day TTL
        const thirtyOneDaysInMs = 31 * 24 * 60 * 60 * 1000
        const originalDateNow = Date.now
        vi.spyOn(Date, 'now').mockReturnValue(originalDateNow() + thirtyOneDaysInMs)

        const expiredResult = await getCachedEphemeris(startDate, endDate)
        expect(expiredResult).toBeNull()

        vi.restoreAllMocks()

        // If the stale entry was not deleted, this would return data again
        const afterCleanupResult = await getCachedEphemeris(startDate, endDate)
        expect(afterCleanupResult).toBeNull()
      })

      it('should return data for cache within TTL', async () => {
        const startDate = new Date('2025-08-01')
        const endDate = new Date('2025-08-31')

        await setCachedEphemeris(startDate, endDate, sampleEphemerisData)

        // Mock Date.now to simulate 29 days later (within 30-day TTL)
        const twentyNineDaysInMs = 29 * 24 * 60 * 60 * 1000
        const originalDateNow = Date.now
        vi.spyOn(Date, 'now').mockReturnValue(originalDateNow() + twentyNineDaysInMs)

        const result = await getCachedEphemeris(startDate, endDate)

        expect(result).toEqual(sampleEphemerisData)

        vi.restoreAllMocks()
      })
    })
  })

  describe('clearEphemerisCache', () => {
    it('should clear all cached entries', async () => {
      // Store multiple entries
      await setCachedEphemeris(new Date('2025-01-01'), new Date('2025-01-31'), sampleEphemerisData)
      await setCachedEphemeris(new Date('2025-02-01'), new Date('2025-02-28'), sampleEphemerisData)
      await setCachedEphemeris(new Date('2025-03-01'), new Date('2025-03-31'), sampleEphemerisData)

      const infoBefore = await getCacheInfo()
      expect(infoBefore.count).toBe(3)

      await clearEphemerisCache()

      const infoAfter = await getCacheInfo()
      expect(infoAfter.count).toBe(0)
      expect(infoAfter.ranges).toEqual([])
    })

    it('should not throw when clearing empty cache', async () => {
      // Cache is already empty from beforeEach
      const result = await clearEphemerisCache()
      expect(result).toBe(true)
    })

    it('should allow re-caching after clear', async () => {
      const startDate = new Date('2025-09-01')
      const endDate = new Date('2025-09-30')

      await setCachedEphemeris(startDate, endDate, sampleEphemerisData)
      await clearEphemerisCache()

      // Should be able to cache again
      await setCachedEphemeris(startDate, endDate, sampleEphemerisData)

      const result = await getCachedEphemeris(startDate, endDate)
      expect(result).toEqual(sampleEphemerisData)
    })
  })

  describe('getCacheInfo', () => {
    it('should return empty info for new cache', async () => {
      const info = await getCacheInfo()

      expect(info.count).toBe(0)
      expect(info.ranges).toEqual([])
    })

    it('should return correct count for single entry', async () => {
      await setCachedEphemeris(new Date('2025-01-01'), new Date('2025-01-31'), sampleEphemerisData)

      const info = await getCacheInfo()

      expect(info.count).toBe(1)
    })

    it('should return correct count for multiple entries', async () => {
      await setCachedEphemeris(new Date('2025-01-01'), new Date('2025-01-31'), sampleEphemerisData)
      await setCachedEphemeris(new Date('2025-02-01'), new Date('2025-02-28'), sampleEphemerisData)
      await setCachedEphemeris(new Date('2025-03-01'), new Date('2025-03-31'), sampleEphemerisData)

      const info = await getCacheInfo()

      expect(info.count).toBe(3)
    })

    it('should return correct date ranges', async () => {
      const startDate1 = new Date('2025-01-01')
      const endDate1 = new Date('2025-01-31')
      const startDate2 = new Date('2025-02-01')
      const endDate2 = new Date('2025-02-28')

      await setCachedEphemeris(startDate1, endDate1, sampleEphemerisData)
      await setCachedEphemeris(startDate2, endDate2, sampleEphemerisData)

      const info = await getCacheInfo()

      expect(info.count).toBe(2)
      expect(info.ranges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            startDate: startDate1.toISOString(),
            endDate: endDate1.toISOString(),
            timestamp: expect.any(Number),
          }),
          expect.objectContaining({
            startDate: startDate2.toISOString(),
            endDate: endDate2.toISOString(),
            timestamp: expect.any(Number),
          }),
        ]),
      )
    })

    it('should include timestamps for each range', async () => {
      const beforeSave = Date.now()
      await setCachedEphemeris(new Date('2025-04-01'), new Date('2025-04-30'), sampleEphemerisData)

      const info = await getCacheInfo()

      expect(info.ranges[0]!.timestamp).toBeGreaterThanOrEqual(beforeSave)
      expect(info.ranges[0]!.timestamp).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('Error Handling', () => {
    it('should gracefully handle cache miss by returning null', async () => {
      // The error handling is tested by verifying the module returns null
      // when data doesn't exist (similar behavior to error case)
      const result = await getCachedEphemeris(new Date('2099-01-01'), new Date('2099-12-31'))
      expect(result).toBeNull()
    })

    it('should return empty info for getCacheInfo on empty cache', async () => {
      // Verify getCacheInfo returns proper empty structure when no data
      const result = await getCacheInfo()
      expect(result).toEqual({ count: 0, ranges: [] })
    })

    it('should complete without error when setCachedEphemeris is called', async () => {
      const result = await setCachedEphemeris(new Date('2025-01-01'), new Date('2025-01-31'), sampleEphemerisData)
      // setCachedEphemeris returns void/undefined
      expect(result).toBeUndefined()
    })

    it('should complete without error when clearEphemerisCache is called on empty cache', async () => {
      const result = await clearEphemerisCache()
      expect(result).toBe(true)
    })

    it('should return null when getCachedEphemeris encounters an error', async () => {
      // Reset modules to get fresh module state
      vi.resetModules()

      // Mock indexedDB.open to throw an error
      const originalOpen = indexedDB.open
      indexedDB.open = vi.fn(() => {
        throw new Error('IndexedDB error')
      }) as unknown as typeof indexedDB.open

      // Re-import to get fresh module with mocked indexedDB
      const { getCachedEphemeris: getCachedEphemerisWithError } = await import('@/lib/cache/ephemeris')

      const result = await getCachedEphemerisWithError(new Date('2025-01-01'), new Date('2025-01-31'))
      expect(result).toBeNull()

      // Restore original
      indexedDB.open = originalOpen
    })

    it('should silently fail when setCachedEphemeris encounters an error', async () => {
      vi.resetModules()

      // Mock indexedDB.open to throw an error
      const originalOpen = indexedDB.open
      indexedDB.open = vi.fn(() => {
        throw new Error('IndexedDB error')
      }) as unknown as typeof indexedDB.open

      const { setCachedEphemeris: setCachedEphemerisWithError } = await import('@/lib/cache/ephemeris')

      // Should not throw, just silently fail
      const result = await setCachedEphemerisWithError(
        new Date('2025-01-01'),
        new Date('2025-01-31'),
        sampleEphemerisData,
      )
      expect(result).toBeUndefined()

      // Restore original
      indexedDB.open = originalOpen
    })

    it('should silently fail when clearEphemerisCache encounters an error', async () => {
      vi.resetModules()

      // Mock indexedDB.open to throw an error
      const originalOpen = indexedDB.open
      indexedDB.open = vi.fn(() => {
        throw new Error('IndexedDB error')
      }) as unknown as typeof indexedDB.open

      const { clearEphemerisCache: clearEphemerisCacheWithError } = await import('@/lib/cache/ephemeris')

      // Should not throw, just silently fail
      const result = await clearEphemerisCacheWithError()
      expect(result).toBe(false)

      // Restore original
      indexedDB.open = originalOpen
    })

    it('should return default empty result when getCacheInfo encounters an error', async () => {
      vi.resetModules()

      // Mock indexedDB.open to throw an error
      const originalOpen = indexedDB.open
      indexedDB.open = vi.fn(() => {
        throw new Error('IndexedDB error')
      }) as unknown as typeof indexedDB.open

      const { getCacheInfo: getCacheInfoWithError } = await import('@/lib/cache/ephemeris')

      const result = await getCacheInfoWithError()
      expect(result).toEqual({ count: 0, ranges: [] })

      // Restore original
      indexedDB.open = originalOpen
    })
  })

  describe('Integration', () => {
    it('should handle full lifecycle: set, get, info, clear', async () => {
      const startDate = new Date('2025-10-01')
      const endDate = new Date('2025-10-31')

      // Initially empty
      let result = await getCachedEphemeris(startDate, endDate)
      expect(result).toBeNull()

      let info = await getCacheInfo()
      expect(info.count).toBe(0)

      // Set cache
      await setCachedEphemeris(startDate, endDate, sampleEphemerisData)

      // Get cache - should hit
      result = await getCachedEphemeris(startDate, endDate)
      expect(result).toEqual(sampleEphemerisData)

      // Info should show entry
      info = await getCacheInfo()
      expect(info.count).toBe(1)

      // Clear cache
      await clearEphemerisCache()

      // Get cache - should miss
      result = await getCachedEphemeris(startDate, endDate)
      expect(result).toBeNull()

      // Info should be empty
      info = await getCacheInfo()
      expect(info.count).toBe(0)
    })

    it('should handle multiple date ranges independently', async () => {
      const ranges = [
        { start: new Date('2025-01-01'), end: new Date('2025-01-31') },
        { start: new Date('2025-02-01'), end: new Date('2025-02-28') },
        { start: new Date('2025-03-01'), end: new Date('2025-03-31') },
      ]

      // Set all ranges
      for (const range of ranges) {
        await setCachedEphemeris(range.start, range.end, sampleEphemerisData)
      }

      // Verify all ranges are cached independently
      for (const range of ranges) {
        const result = await getCachedEphemeris(range.start, range.end)
        expect(result).toEqual(sampleEphemerisData)
      }

      const info = await getCacheInfo()
      expect(info.count).toBe(3)
    })
  })
})
