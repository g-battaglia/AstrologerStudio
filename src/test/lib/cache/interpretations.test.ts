/**
 * Unit Tests for Interpretation Cache
 *
 * Tests the IndexedDB-based cache for AI interpretations.
 * Uses fake-indexeddb to simulate IndexedDB in the test environment.
 *
 * @module src/lib/cache/interpretations
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'

// Mock Prisma to prevent any accidental database connections
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
import {
  generateChartId,
  saveInterpretationChunk,
  getInterpretation,
  deleteInterpretation,
  clearAllInterpretations,
} from '@/lib/cache/interpretations'

describe('Interpretation Cache', () => {
  beforeEach(() => {
    // Reset IndexedDB state before each test by deleting the database
    indexedDB.deleteDatabase('interpretations-db')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('generateChartId', () => {
    describe('determinism', () => {
      it('should generate the same ID for identical inputs', () => {
        const id1 = generateChartId('natal', 'John Doe', '1990-01-15')
        const id2 = generateChartId('natal', 'John Doe', '1990-01-15')

        expect(id1).toBe(id2)
      })

      it('should generate the same ID for identical inputs with second subject', () => {
        const id1 = generateChartId('synastry', 'John Doe', '1990-01-15', 'Jane Doe', '1992-05-20')
        const id2 = generateChartId('synastry', 'John Doe', '1990-01-15', 'Jane Doe', '1992-05-20')

        expect(id1).toBe(id2)
      })

      it('should be stable across multiple calls', () => {
        const ids = Array.from({ length: 10 }, () => generateChartId('transit', 'Test Subject', '2000-06-15'))

        // All IDs should be identical
        expect(new Set(ids).size).toBe(1)
      })
    })

    describe('uniqueness', () => {
      it('should generate different IDs for different chart types', () => {
        const natalId = generateChartId('natal', 'John Doe', '1990-01-15')
        const transitId = generateChartId('transit', 'John Doe', '1990-01-15')

        expect(natalId).not.toBe(transitId)
      })

      it('should generate different IDs for different subject names', () => {
        const id1 = generateChartId('natal', 'John Doe', '1990-01-15')
        const id2 = generateChartId('natal', 'Jane Doe', '1990-01-15')

        expect(id1).not.toBe(id2)
      })

      it('should generate different IDs for different dates', () => {
        const id1 = generateChartId('natal', 'John Doe', '1990-01-15')
        const id2 = generateChartId('natal', 'John Doe', '1990-01-16')

        expect(id1).not.toBe(id2)
      })

      it('should generate different IDs when second subject differs', () => {
        const id1 = generateChartId('synastry', 'John', '1990-01-15', 'Jane', '1992-05-20')
        const id2 = generateChartId('synastry', 'John', '1990-01-15', 'Sarah', '1992-05-20')

        expect(id1).not.toBe(id2)
      })

      it('should generate different IDs when second subject date differs', () => {
        const id1 = generateChartId('composite', 'John', '1990-01-15', 'Jane', '1992-05-20')
        const id2 = generateChartId('composite', 'John', '1990-01-15', 'Jane', '1992-05-21')

        expect(id1).not.toBe(id2)
      })
    })

    describe('format', () => {
      it('should return a string', () => {
        const id = generateChartId('natal', 'Test', '2000-01-01')

        expect(typeof id).toBe('string')
      })

      it('should join parts with hyphens for single subject', () => {
        const id = generateChartId('natal', 'John', '1990-01-15')

        expect(id).toBe('natal-John-1990-01-15')
      })

      it('should join all parts with hyphens for two subjects', () => {
        const id = generateChartId('synastry', 'John', '1990-01-15', 'Jane', '1992-05-20')

        expect(id).toBe('synastry-John-1990-01-15-Jane-1992-05-20')
      })

      it('should handle only second subject name (no date)', () => {
        const id = generateChartId('synastry', 'John', '1990-01-15', 'Jane')

        expect(id).toBe('synastry-John-1990-01-15-Jane')
      })
    })

    describe('edge cases', () => {
      it('should handle empty strings', () => {
        const id = generateChartId('', '', '')

        expect(id).toBe('--')
      })

      it('should handle special characters in names', () => {
        const id = generateChartId('natal', "John O'Brien", '1990-01-15')

        expect(id).toContain("O'Brien")
      })

      it('should handle unicode characters', () => {
        const id = generateChartId('natal', 'Jose Garcia', '1990-01-15')

        expect(id).toBe('natal-Jose Garcia-1990-01-15')
      })
    })
  })

  describe('IndexedDB Operations', () => {
    describe('saveInterpretationChunk', () => {
      it('should save a new interpretation', async () => {
        const chartId = 'test-chart-1'
        const content = 'This is a test interpretation.'

        await saveInterpretationChunk(chartId, content, false)

        const result = await getInterpretation(chartId)
        expect(result).not.toBeNull()
        expect(result?.content).toBe(content)
        expect(result?.isComplete).toBe(false)
      })

      it('should update existing interpretation', async () => {
        const chartId = 'test-chart-2'

        await saveInterpretationChunk(chartId, 'Initial content', false)
        await saveInterpretationChunk(chartId, 'Updated content', true)

        const result = await getInterpretation(chartId)
        expect(result?.content).toBe('Updated content')
        expect(result?.isComplete).toBe(true)
      })

      it('should save with timestamp', async () => {
        const chartId = 'test-chart-3'
        const beforeSave = Date.now()

        await saveInterpretationChunk(chartId, 'Content', false)

        const result = await getInterpretation(chartId)
        expect(result?.timestamp).toBeGreaterThanOrEqual(beforeSave)
        expect(result?.timestamp).toBeLessThanOrEqual(Date.now())
      })

      it('should save isComplete flag correctly', async () => {
        const chartId = 'test-chart-4'

        await saveInterpretationChunk(chartId, 'Incomplete', false)
        let result = await getInterpretation(chartId)
        expect(result?.isComplete).toBe(false)

        await saveInterpretationChunk(chartId, 'Complete', true)
        result = await getInterpretation(chartId)
        expect(result?.isComplete).toBe(true)
      })
    })

    describe('getInterpretation', () => {
      it('should return null for non-existent chart', async () => {
        const result = await getInterpretation('non-existent-chart')

        expect(result).toBeNull()
      })

      it('should delete expired interpretation entry when accessed', async () => {
        const chartId = 'expired-chart'
        await saveInterpretationChunk(chartId, 'Expired content', true)

        // Move beyond 7-day TTL
        const eightDaysInMs = 8 * 24 * 60 * 60 * 1000
        const originalDateNow = Date.now
        vi.spyOn(Date, 'now').mockReturnValue(originalDateNow() + eightDaysInMs)

        const expiredResult = await getInterpretation(chartId)
        expect(expiredResult).toBeNull()

        vi.restoreAllMocks()

        // If the stale entry was not deleted, this would return data again
        const afterCleanupResult = await getInterpretation(chartId)
        expect(afterCleanupResult).toBeNull()
      })

      it('should return saved interpretation', async () => {
        const chartId = 'get-test-chart'
        const content = 'Saved interpretation content'

        await saveInterpretationChunk(chartId, content, true)

        const result = await getInterpretation(chartId)
        expect(result).toEqual({
          chartId,
          content,
          isComplete: true,
          timestamp: expect.any(Number),
        })
      })

      it('should return correct data for multiple saved charts', async () => {
        await saveInterpretationChunk('chart-a', 'Content A', true)
        await saveInterpretationChunk('chart-b', 'Content B', false)

        const resultA = await getInterpretation('chart-a')
        const resultB = await getInterpretation('chart-b')

        expect(resultA?.content).toBe('Content A')
        expect(resultA?.isComplete).toBe(true)
        expect(resultB?.content).toBe('Content B')
        expect(resultB?.isComplete).toBe(false)
      })
    })

    describe('deleteInterpretation', () => {
      it('should delete an existing interpretation', async () => {
        const chartId = 'delete-test-chart'

        await saveInterpretationChunk(chartId, 'Content to delete', true)
        let result = await getInterpretation(chartId)
        expect(result).not.toBeNull()

        await deleteInterpretation(chartId)

        result = await getInterpretation(chartId)
        expect(result).toBeNull()
      })

      it('should resolve when deleting non-existent chart', async () => {
        await expect(deleteInterpretation('non-existent')).resolves.toBeUndefined()
      })

      it('should only delete specified chart', async () => {
        await saveInterpretationChunk('chart-1', 'Content 1', true)
        await saveInterpretationChunk('chart-2', 'Content 2', true)

        await deleteInterpretation('chart-1')

        const result1 = await getInterpretation('chart-1')
        const result2 = await getInterpretation('chart-2')

        expect(result1).toBeNull()
        expect(result2).not.toBeNull()
        expect(result2?.content).toBe('Content 2')
      })
    })

    describe('clearAllInterpretations', () => {
      it('should clear all interpretations', async () => {
        await saveInterpretationChunk('clear-chart-1', 'Content 1', true)
        await saveInterpretationChunk('clear-chart-2', 'Content 2', true)
        await saveInterpretationChunk('clear-chart-3', 'Content 3', false)

        await clearAllInterpretations()

        const result1 = await getInterpretation('clear-chart-1')
        const result2 = await getInterpretation('clear-chart-2')
        const result3 = await getInterpretation('clear-chart-3')

        expect(result1).toBeNull()
        expect(result2).toBeNull()
        expect(result3).toBeNull()
      })

      it('should return success when clearing empty cache', async () => {
        await expect(clearAllInterpretations()).resolves.toBe(true)
      })
    })

    describe('integration', () => {
      it('should handle full lifecycle: save, get, update, delete', async () => {
        const chartId = generateChartId('natal', 'Test Subject', '2000-01-01')

        // Initially empty
        expect(await getInterpretation(chartId)).toBeNull()

        // Save initial chunk
        await saveInterpretationChunk(chartId, 'Starting interpretation...', false)
        let result = await getInterpretation(chartId)
        expect(result?.content).toBe('Starting interpretation...')
        expect(result?.isComplete).toBe(false)

        // Update with more content
        await saveInterpretationChunk(chartId, 'Starting interpretation... More content added.', false)
        result = await getInterpretation(chartId)
        expect(result?.content).toBe('Starting interpretation... More content added.')

        // Mark as complete
        await saveInterpretationChunk(chartId, 'Complete interpretation text.', true)
        result = await getInterpretation(chartId)
        expect(result?.isComplete).toBe(true)

        // Delete
        await deleteInterpretation(chartId)
        expect(await getInterpretation(chartId)).toBeNull()
      })

      it('should use generateChartId output as valid key', async () => {
        const chartId = generateChartId('synastry', 'Person A', '1990-01-01', 'Person B', '1995-06-15')

        await saveInterpretationChunk(chartId, 'Synastry interpretation', true)

        const result = await getInterpretation(chartId)
        expect(result?.chartId).toBe(chartId)
        expect(result?.content).toBe('Synastry interpretation')
      })
    })

    describe('Error Handling', () => {
      it('should return null when getInterpretation encounters an error', async () => {
        vi.resetModules()

        // Mock indexedDB.open to throw an error
        const originalOpen = indexedDB.open
        indexedDB.open = vi.fn(() => {
          throw new Error('IndexedDB error')
        }) as unknown as typeof indexedDB.open

        const { getInterpretation: getInterpretationWithError } = await import('@/lib/cache/interpretations')

        const result = await getInterpretationWithError('chart-id')
        expect(result).toBeNull()

        // Restore original
        indexedDB.open = originalOpen
      })

      it('should silently fail when saveInterpretationChunk encounters an error', async () => {
        vi.resetModules()

        // Mock indexedDB.open to throw an error
        const originalOpen = indexedDB.open
        indexedDB.open = vi.fn(() => {
          throw new Error('IndexedDB error')
        }) as unknown as typeof indexedDB.open

        const { saveInterpretationChunk: saveInterpretationChunkWithError } =
          await import('@/lib/cache/interpretations')

        // Should not throw, just silently fail
        const result = await saveInterpretationChunkWithError('chart-id', 'content', false)
        expect(result).toBeUndefined()

        // Restore original
        indexedDB.open = originalOpen
      })

      it('should silently fail when deleteInterpretation encounters an error', async () => {
        vi.resetModules()

        // Mock indexedDB.open to throw an error
        const originalOpen = indexedDB.open
        indexedDB.open = vi.fn(() => {
          throw new Error('IndexedDB error')
        }) as unknown as typeof indexedDB.open

        const { deleteInterpretation: deleteInterpretationWithError } = await import('@/lib/cache/interpretations')

        // Should not throw, just silently fail
        const result = await deleteInterpretationWithError('chart-id')
        expect(result).toBeUndefined()

        // Restore original
        indexedDB.open = originalOpen
      })

      it('should silently fail when clearAllInterpretations encounters an error', async () => {
        vi.resetModules()

        // Mock indexedDB.open to throw an error
        const originalOpen = indexedDB.open
        indexedDB.open = vi.fn(() => {
          throw new Error('IndexedDB error')
        }) as unknown as typeof indexedDB.open

        const { clearAllInterpretations: clearAllInterpretationsWithError } =
          await import('@/lib/cache/interpretations')

        // Should not throw, just silently fail
        const result = await clearAllInterpretationsWithError()
        expect(result).toBe(false)

        // Restore original
        indexedDB.open = originalOpen
      })
    })
  })
})
