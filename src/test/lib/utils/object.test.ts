/**
 * Unit Tests for Object Utilities
 *
 * Tests the object manipulation functions used for data sanitization
 * before passing to APIs or database operations.
 *
 * @module src/lib/utils/object
 */
import { describe, it, expect } from 'vitest'
import { omitKeys } from '@/lib/utils/object'

describe('omitKeys', () => {
  /**
   * Tests for the omitKeys utility function.
   * This function creates a shallow copy of an object without specified keys.
   * Commonly used to remove sensitive data before API calls.
   */

  it('should remove a single key from object', () => {
    // Basic use case: remove one property
    const input = { name: 'Alice', password: 'secret', role: 'admin' }
    const result = omitKeys(input, ['password'] as const)

    expect(result).toEqual({ name: 'Alice', role: 'admin' })
    expect('password' in result).toBe(false)
  })

  it('should remove multiple keys from object', () => {
    // Remove several sensitive fields at once
    const input = { id: 1, name: 'Bob', password: 'secret', apiKey: 'key123', email: 'bob@example.com' }
    const result = omitKeys(input, ['password', 'apiKey'] as const)

    expect(result).toEqual({ id: 1, name: 'Bob', email: 'bob@example.com' })
    expect('password' in result).toBe(false)
    expect('apiKey' in result).toBe(false)
  })

  it('should not mutate the original object', () => {
    // Immutability is important for predictable behavior
    const original = { name: 'Charlie', secret: 'data' }
    const originalCopy = { ...original }

    omitKeys(original, ['secret'] as const)

    // Original should be unchanged
    expect(original).toEqual(originalCopy)
    expect(original.secret).toBe('data')
  })

  it('should handle empty keys array', () => {
    // Edge case: nothing to remove
    const input = { a: 1, b: 2 }
    const result = omitKeys(input, [] as const)

    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('should handle empty object', () => {
    // Edge case: empty source object
    const input = {}
    // @ts-expect-error - Testing runtime behavior with empty object
    const result = omitKeys(input, ['nonexistent'] as const)

    expect(result).toEqual({})
  })

  it('should handle non-existent keys gracefully', () => {
    // Keys that don't exist should be safely ignored
    const input = { a: 1, b: 2 }
    // @ts-expect-error - Testing runtime behavior with non-existent key
    const result = omitKeys(input, ['c'] as const)

    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('should perform shallow copy only', () => {
    // Nested objects are not deep-cloned
    const nested = { value: 'nested' }
    const input = { name: 'Test', nested, toRemove: 'x' }
    const result = omitKeys(input, ['toRemove'] as const)

    // Nested object should be the same reference
    expect(result.nested).toBe(nested)
  })
})
