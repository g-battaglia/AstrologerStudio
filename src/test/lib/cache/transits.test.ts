/**
 * Unit Tests for Transit Cache
 *
 * Tests the IndexedDB-based cache for transit data.
 * Uses fake-indexeddb to simulate IndexedDB in the test environment.
 *
 * @module src/lib/cache/transits
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
import { getCachedTransitMonth, setCachedTransitMonth, clearTransitCache } from '@/lib/cache/transits'
import type { TransitDayData } from '@/lib/api/transits'

// Helper to create a mock Point
const createMockPoint = (name: string, signNum: number): import('@/types/astrology').Point => ({
  name,
  quality: 'Cardinal',
  element: 'Fire',
  sign: 'Aries',
  sign_num: signNum,
  position: 10.5,
  abs_pos: 10.5 + (signNum - 1) * 30,
  emoji: '♈',
  point_type: 'Planet',
  house: 'First_House',
  retrograde: false,
})

// Sample transit day data for testing
const createSampleTransitDayData = (date: string): TransitDayData => ({
  date,
  transitSubject: {
    name: 'Transit',
    year: 2025,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
    second: 0,
    city: 'Rome',
    nation: 'IT',
    timezone: 'Europe/Rome',
    longitude: 12.4964,
    latitude: 41.9028,
    // Core planets (required)
    sun: createMockPoint('Sun', 10),
    moon: createMockPoint('Moon', 4),
    mercury: createMockPoint('Mercury', 10),
    venus: createMockPoint('Venus', 11),
    mars: createMockPoint('Mars', 4),
    jupiter: createMockPoint('Jupiter', 3),
    saturn: createMockPoint('Saturn', 12),
    uranus: createMockPoint('Uranus', 1),
    neptune: createMockPoint('Neptune', 12),
    pluto: createMockPoint('Pluto', 10),
    // Houses (required)
    first_house: createMockPoint('First_House', 1),
    second_house: createMockPoint('Second_House', 2),
    third_house: createMockPoint('Third_House', 3),
    fourth_house: createMockPoint('Fourth_House', 4),
    fifth_house: createMockPoint('Fifth_House', 5),
    sixth_house: createMockPoint('Sixth_House', 6),
    seventh_house: createMockPoint('Seventh_House', 7),
    eighth_house: createMockPoint('Eighth_House', 8),
    ninth_house: createMockPoint('Ninth_House', 9),
    tenth_house: createMockPoint('Tenth_House', 10),
    eleventh_house: createMockPoint('Eleventh_House', 11),
    twelfth_house: createMockPoint('Twelfth_House', 12),
  },
  aspects: [
    {
      p1_name: 'Sun',
      p2_name: 'Moon',
      aspect: 'Conjunction',
      orbit: 2.5,
      aspect_degrees: 0,
      diff: 2.5,
      p1: 0,
      p2: 1,
    },
  ],
  houseComparison: {
    first_points_in_second_houses: [],
    second_points_in_first_houses: [],
  },
})

// Create a full month of transit data (31 days for January)
const createFullMonthData = (yearMonth: string, days: number): TransitDayData[] => {
  const [year, month] = yearMonth.split('-').map(Number)
  return Array.from({ length: days }, (_, i) => {
    const day = i + 1
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00.000Z`
    return createSampleTransitDayData(dateStr)
  })
}

describe('Transit Cache', () => {
  beforeEach(async () => {
    // Clear cache before each test to ensure clean state
    await clearTransitCache()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('No External Side Effects', () => {
    it('should not access Prisma or any real database', async () => {
      // This test verifies that the transit cache module operates
      // purely with IndexedDB and has no side effects on external systems
      const { prisma } = await import('@/lib/db/prisma')

      const subjectId = 'test-subject-1'
      const monthStr = '2025-01'
      const data = createFullMonthData(monthStr, 31)

      // Perform all cache operations
      await setCachedTransitMonth(subjectId, monthStr, data)
      await getCachedTransitMonth(subjectId, monthStr)
      await clearTransitCache()

      // Verify Prisma was never called
      expect(prisma.$connect).not.toHaveBeenCalled()
      expect(prisma.$disconnect).not.toHaveBeenCalled()
    })
  })

  describe('setCachedTransitMonth', () => {
    it('should store transit data successfully', async () => {
      const subjectId = 'subject-001'
      const monthStr = '2025-01'
      const data = createFullMonthData(monthStr, 31)

      await setCachedTransitMonth(subjectId, monthStr, data)

      const result = await getCachedTransitMonth(subjectId, monthStr)
      expect(result).not.toBeNull()
      expect(result).toEqual(data)
    })

    it('should update existing cache entry', async () => {
      const subjectId = 'subject-002'
      const monthStr = '2025-02'
      const originalData = createFullMonthData(monthStr, 28)
      const updatedData = createFullMonthData(monthStr, 28).map((d) => ({
        ...d,
        aspects: [],
      }))

      await setCachedTransitMonth(subjectId, monthStr, originalData)
      await setCachedTransitMonth(subjectId, monthStr, updatedData)

      const result = await getCachedTransitMonth(subjectId, monthStr)
      expect(result).toEqual(updatedData)
    })

    it('should store timestamp with cache entry', async () => {
      const subjectId = 'subject-003'
      const monthStr = '2025-03'
      const data = createFullMonthData(monthStr, 31)

      await setCachedTransitMonth(subjectId, monthStr, data)

      // Retrieve and verify the data is fresh (timestamp within range)
      // If data is returned, the timestamp was valid and cache is fresh
      const result = await getCachedTransitMonth(subjectId, monthStr)
      expect(result).not.toBeNull()
    })

    it('should store data with correct key format (subjectId_YYYY-MM)', async () => {
      const subjectId = 'subject-key-format'
      const monthStr = '2025-04'
      const data = createFullMonthData(monthStr, 30)

      await setCachedTransitMonth(subjectId, monthStr, data)

      // Different subject should not find the same data
      const resultDifferentSubject = await getCachedTransitMonth('other-subject', monthStr)
      expect(resultDifferentSubject).toBeNull()

      // Same subject, different month should not find the data
      const resultDifferentMonth = await getCachedTransitMonth(subjectId, '2025-05')
      expect(resultDifferentMonth).toBeNull()

      // Same subject and month should find the data
      const resultSame = await getCachedTransitMonth(subjectId, monthStr)
      expect(resultSame).toEqual(data)
    })
  })

  describe('getCachedTransitMonth', () => {
    describe('cache miss', () => {
      it('should return null for non-existent cache entry', async () => {
        const result = await getCachedTransitMonth('nonexistent-subject', '2099-01')

        expect(result).toBeNull()
      })

      it('should return null for different subject', async () => {
        const subjectId = 'subject-a'
        const monthStr = '2025-05'
        const data = createFullMonthData(monthStr, 31)

        await setCachedTransitMonth(subjectId, monthStr, data)

        // Query with different subject
        const result = await getCachedTransitMonth('subject-b', monthStr)
        expect(result).toBeNull()
      })

      it('should return null for different month', async () => {
        const subjectId = 'subject-c'
        const monthStr = '2025-06'
        const data = createFullMonthData(monthStr, 30)

        await setCachedTransitMonth(subjectId, monthStr, data)

        // Query with different month
        const result = await getCachedTransitMonth(subjectId, '2025-07')
        expect(result).toBeNull()
      })
    })

    describe('cache hit', () => {
      it('should return cached data for exact match', async () => {
        const subjectId = 'subject-hit-1'
        const monthStr = '2025-07'
        const data = createFullMonthData(monthStr, 31)

        await setCachedTransitMonth(subjectId, monthStr, data)

        const result = await getCachedTransitMonth(subjectId, monthStr)
        expect(result).not.toBeNull()
        expect(result).toEqual(data)
      })

      it('should return fresh cached data immediately after save', async () => {
        const subjectId = 'subject-hit-2'
        const monthStr = '2025-08'
        const data = createFullMonthData(monthStr, 31)

        await setCachedTransitMonth(subjectId, monthStr, data)

        const result = await getCachedTransitMonth(subjectId, monthStr)
        expect(result).toEqual(data)
      })
    })

    describe('cache expiration', () => {
      it('should return null for expired cache entry (beyond 5-day TTL)', async () => {
        const subjectId = 'subject-expired'
        const monthStr = '2025-09'
        const data = createFullMonthData(monthStr, 30)

        await setCachedTransitMonth(subjectId, monthStr, data)

        // Mock Date.now to simulate 6 days later (beyond 5-day TTL)
        const sixDaysInMs = 6 * 24 * 60 * 60 * 1000
        const originalDateNow = Date.now
        vi.spyOn(Date, 'now').mockReturnValue(originalDateNow() + sixDaysInMs)

        const result = await getCachedTransitMonth(subjectId, monthStr)
        expect(result).toBeNull()

        vi.restoreAllMocks()
      })

      it('should delete expired cache entry when accessed', async () => {
        const subjectId = 'subject-expired-deletion'
        const monthStr = '2025-09'
        const data = createFullMonthData(monthStr, 30)

        await setCachedTransitMonth(subjectId, monthStr, data)

        // Move beyond 5-day TTL
        const sixDaysInMs = 6 * 24 * 60 * 60 * 1000
        const originalDateNow = Date.now
        vi.spyOn(Date, 'now').mockReturnValue(originalDateNow() + sixDaysInMs)

        const expiredResult = await getCachedTransitMonth(subjectId, monthStr)
        expect(expiredResult).toBeNull()

        vi.restoreAllMocks()

        // If stale entry was not deleted, this would return data again
        const afterCleanupResult = await getCachedTransitMonth(subjectId, monthStr)
        expect(afterCleanupResult).toBeNull()
      })

      it('should return data for cache within TTL (4 days)', async () => {
        const subjectId = 'subject-fresh'
        const monthStr = '2025-10'
        const data = createFullMonthData(monthStr, 31)

        await setCachedTransitMonth(subjectId, monthStr, data)

        // Mock Date.now to simulate 4 days later (within 5-day TTL)
        const fourDaysInMs = 4 * 24 * 60 * 60 * 1000
        const originalDateNow = Date.now
        vi.spyOn(Date, 'now').mockReturnValue(originalDateNow() + fourDaysInMs)

        const result = await getCachedTransitMonth(subjectId, monthStr)
        expect(result).toEqual(data)

        vi.restoreAllMocks()
      })
    })

    describe('incomplete data validation', () => {
      it('should return null for incomplete month data (missing days)', async () => {
        const subjectId = 'subject-incomplete'
        const monthStr = '2025-01' // January has 31 days
        // Only provide 15 days instead of 31
        const incompleteData = createFullMonthData(monthStr, 15)

        await setCachedTransitMonth(subjectId, monthStr, incompleteData)

        const result = await getCachedTransitMonth(subjectId, monthStr)
        expect(result).toBeNull()
      })

      it('should return data for complete month (all days present)', async () => {
        const subjectId = 'subject-complete'
        const monthStr = '2025-02' // February 2025 has 28 days (non-leap year)
        const completeData = createFullMonthData(monthStr, 28)

        await setCachedTransitMonth(subjectId, monthStr, completeData)

        const result = await getCachedTransitMonth(subjectId, monthStr)
        expect(result).toEqual(completeData)
      })

      it('should handle leap year February correctly', async () => {
        const subjectId = 'subject-leap'
        const monthStr = '2024-02' // February 2024 is leap year (29 days)
        // Only 28 days - should be incomplete for leap year
        const incompleteLeapData = createFullMonthData(monthStr, 28)

        await setCachedTransitMonth(subjectId, monthStr, incompleteLeapData)

        const result = await getCachedTransitMonth(subjectId, monthStr)
        expect(result).toBeNull() // Missing 1 day for leap year
      })

      it('should return data for complete leap year February', async () => {
        const subjectId = 'subject-leap-complete'
        const monthStr = '2024-02' // February 2024 is leap year (29 days)
        const completeLeapData = createFullMonthData(monthStr, 29)

        await setCachedTransitMonth(subjectId, monthStr, completeLeapData)

        const result = await getCachedTransitMonth(subjectId, monthStr)
        expect(result).toEqual(completeLeapData)
      })
    })
  })

  describe('clearTransitCache', () => {
    it('should clear all cached entries', async () => {
      // Store multiple entries
      await setCachedTransitMonth('subject-1', '2025-01', createFullMonthData('2025-01', 31))
      await setCachedTransitMonth('subject-2', '2025-02', createFullMonthData('2025-02', 28))
      await setCachedTransitMonth('subject-1', '2025-03', createFullMonthData('2025-03', 31))

      // Verify data exists before clear
      const beforeClear = await getCachedTransitMonth('subject-1', '2025-01')
      expect(beforeClear).not.toBeNull()

      await clearTransitCache()

      // Verify all data is gone
      const after1 = await getCachedTransitMonth('subject-1', '2025-01')
      const after2 = await getCachedTransitMonth('subject-2', '2025-02')
      const after3 = await getCachedTransitMonth('subject-1', '2025-03')
      expect(after1).toBeNull()
      expect(after2).toBeNull()
      expect(after3).toBeNull()
    })

    it('should not throw when clearing empty cache', async () => {
      // Cache is already empty from beforeEach
      const result = await clearTransitCache()
      expect(result).toBe(true)
    })

    it('should allow re-caching after clear', async () => {
      const subjectId = 'subject-recache'
      const monthStr = '2025-04'
      const data = createFullMonthData(monthStr, 30)

      await setCachedTransitMonth(subjectId, monthStr, data)
      await clearTransitCache()

      // Should be able to cache again
      await setCachedTransitMonth(subjectId, monthStr, data)

      const result = await getCachedTransitMonth(subjectId, monthStr)
      expect(result).toEqual(data)
    })
  })

  describe('Error Handling', () => {
    it('should gracefully handle cache miss by returning null', async () => {
      const result = await getCachedTransitMonth('nonexistent', '2099-12')
      expect(result).toBeNull()
    })

    it('should complete without error when setCachedTransitMonth is called', async () => {
      const result = await setCachedTransitMonth('subject', '2025-01', createFullMonthData('2025-01', 31))
      // setCachedTransitMonth returns void/undefined
      expect(result).toBeUndefined()
    })

    it('should complete without error when clearTransitCache is called on empty cache', async () => {
      const result = await clearTransitCache()
      expect(result).toBe(true)
    })

    it('should return null when getCachedTransitMonth encounters an error', async () => {
      vi.resetModules()

      // Mock indexedDB.open to throw an error
      const originalOpen = indexedDB.open
      indexedDB.open = vi.fn(() => {
        throw new Error('IndexedDB error')
      }) as unknown as typeof indexedDB.open

      const { getCachedTransitMonth: getCachedTransitMonthWithError } = await import('@/lib/cache/transits')

      const result = await getCachedTransitMonthWithError('subject', '2025-01')
      expect(result).toBeNull()

      // Restore original
      indexedDB.open = originalOpen
    })

    it('should silently fail when setCachedTransitMonth encounters an error', async () => {
      vi.resetModules()

      // Mock indexedDB.open to throw an error
      const originalOpen = indexedDB.open
      indexedDB.open = vi.fn(() => {
        throw new Error('IndexedDB error')
      }) as unknown as typeof indexedDB.open

      const { setCachedTransitMonth: setCachedTransitMonthWithError } = await import('@/lib/cache/transits')

      // Should not throw, just silently fail
      const result = await setCachedTransitMonthWithError('subject', '2025-01', createFullMonthData('2025-01', 31))
      expect(result).toBeUndefined()

      // Restore original
      indexedDB.open = originalOpen
    })

    it('should silently fail when clearTransitCache encounters an error', async () => {
      vi.resetModules()

      // Mock indexedDB.open to throw an error
      const originalOpen = indexedDB.open
      indexedDB.open = vi.fn(() => {
        throw new Error('IndexedDB error')
      }) as unknown as typeof indexedDB.open

      const { clearTransitCache: clearTransitCacheWithError } = await import('@/lib/cache/transits')

      // Should not throw, just silently fail
      const result = await clearTransitCacheWithError()
      expect(result).toBe(false)

      // Restore original
      indexedDB.open = originalOpen
    })
  })

  describe('Integration', () => {
    it('should handle full lifecycle: set, get, clear', async () => {
      const subjectId = 'subject-lifecycle'
      const monthStr = '2025-05'
      const data = createFullMonthData(monthStr, 31)

      // Initially empty
      let result = await getCachedTransitMonth(subjectId, monthStr)
      expect(result).toBeNull()

      // Set cache
      await setCachedTransitMonth(subjectId, monthStr, data)

      // Get cache - should hit
      result = await getCachedTransitMonth(subjectId, monthStr)
      expect(result).toEqual(data)

      // Clear cache
      await clearTransitCache()

      // Get cache - should miss
      result = await getCachedTransitMonth(subjectId, monthStr)
      expect(result).toBeNull()
    })

    it('should handle multiple subjects independently', async () => {
      const monthStr = '2025-06'
      const subjects = ['subject-a', 'subject-b', 'subject-c']
      const data = createFullMonthData(monthStr, 30)

      // Set all subjects
      for (const subjectId of subjects) {
        await setCachedTransitMonth(subjectId, monthStr, data)
      }

      // Verify all subjects are cached independently
      for (const subjectId of subjects) {
        const result = await getCachedTransitMonth(subjectId, monthStr)
        expect(result).toEqual(data)
      }
    })

    it('should handle multiple months for same subject independently', async () => {
      const subjectId = 'subject-multi-month'
      const months = [
        { str: '2025-01', days: 31 },
        { str: '2025-02', days: 28 },
        { str: '2025-03', days: 31 },
      ]

      // Set all months
      for (const month of months) {
        const data = createFullMonthData(month.str, month.days)
        await setCachedTransitMonth(subjectId, month.str, data)
      }

      // Verify all months are cached independently
      for (const month of months) {
        const result = await getCachedTransitMonth(subjectId, month.str)
        expect(result).not.toBeNull()
        expect(result!.length).toBe(month.days)
      }
    })
  })
})
