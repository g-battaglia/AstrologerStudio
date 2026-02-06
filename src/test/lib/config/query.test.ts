/**
 * Unit Tests for React Query Configuration
 *
 * Tests the centralized staleTime and gcTime constants used across
 * the application for consistent caching behavior.
 *
 * NOTE: We only test the RELATIONSHIPS between values, not exact values.
 * Testing exact values (e.g., "should be 60000ms") is brittle and adds
 * no value - if the value changes, the test just needs updating.
 * Instead, we test the invariants that matter for correctness.
 *
 * @module src/lib/config/query
 */
import { describe, it, expect } from 'vitest'
import {
  STALE_TIME_NONE,
  STALE_TIME_SHORT,
  STALE_TIME_MEDIUM,
  STALE_TIME_LONG,
  STALE_TIME_INFINITE,
  GC_TIME_DEFAULT,
  STALE_TIME,
  GC_TIME,
} from '@/lib/config/query'

// ============================================================================
// Value Ordering Tests - These ensure the configuration makes semantic sense
// ============================================================================

describe('STALE_TIME value ordering', () => {
  it('should have values in ascending order (NONE < SHORT < MEDIUM < LONG < INFINITE)', () => {
    expect(STALE_TIME_NONE).toBeLessThan(STALE_TIME_SHORT)
    expect(STALE_TIME_SHORT).toBeLessThan(STALE_TIME_MEDIUM)
    expect(STALE_TIME_MEDIUM).toBeLessThan(STALE_TIME_LONG)
    expect(STALE_TIME_LONG).toBeLessThan(STALE_TIME_INFINITE)
  })

  it('gcTime should be greater than medium staleTime (proper cache lifecycle)', () => {
    // gcTime should be longer than staleTime to allow stale-while-revalidate
    expect(GC_TIME_DEFAULT).toBeGreaterThan(STALE_TIME_MEDIUM)
  })

  it('STALE_TIME_NONE should be zero (immediately stale)', () => {
    expect(STALE_TIME_NONE).toBe(0)
  })

  it('STALE_TIME_INFINITE should be Infinity', () => {
    expect(STALE_TIME_INFINITE).toBe(Infinity)
  })
})

// ============================================================================
// Object Structure Tests - Ensure the consolidated objects match constants
// ============================================================================

describe('Consolidated objects', () => {
  it('STALE_TIME object should contain all expected keys matching constants', () => {
    expect(STALE_TIME.NONE).toBe(STALE_TIME_NONE)
    expect(STALE_TIME.SHORT).toBe(STALE_TIME_SHORT)
    expect(STALE_TIME.MEDIUM).toBe(STALE_TIME_MEDIUM)
    expect(STALE_TIME.LONG).toBe(STALE_TIME_LONG)
    expect(STALE_TIME.INFINITE).toBe(STALE_TIME_INFINITE)
  })

  it('GC_TIME object should contain DEFAULT matching constant', () => {
    expect(GC_TIME.DEFAULT).toBe(GC_TIME_DEFAULT)
  })
})

// ============================================================================
// Type Safety Tests - Ensure all values are valid numbers
// ============================================================================

describe('Type safety', () => {
  it('all staleTime values should be non-negative numbers', () => {
    const allValues = [
      STALE_TIME_NONE,
      STALE_TIME_SHORT,
      STALE_TIME_MEDIUM,
      STALE_TIME_LONG,
      STALE_TIME_INFINITE,
      GC_TIME_DEFAULT,
    ]

    allValues.forEach((value) => {
      expect(typeof value).toBe('number')
      expect(value).toBeGreaterThanOrEqual(0)
    })
  })
})
