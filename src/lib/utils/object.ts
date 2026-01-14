/**
 * Object utility functions
 */

/**
 * Returns a shallow copy of an object without the specified keys.
 *
 * Why:
 * - Used to sanitize objects before passing to APIs or Prisma, without introducing
 *   unused bindings (which would violate `@typescript-eslint/no-unused-vars`).
 *
 * Behavior:
 * - Does NOT mutate the input object.
 * - Performs a shallow omit (nested objects are not deep-cloned).
 *
 * @param obj - The source object
 * @param keys - Keys to omit from the result
 * @returns A new object without the specified keys
 *
 * @example
 * ```ts
 * const user = { name: 'Alice', password: 'secret', role: 'admin' }
 * const safe = omitKeys(user, ['password'] as const)
 * // => { name: 'Alice', role: 'admin' }
 * ```
 */
export function omitKeys<T extends object, const K extends readonly (keyof T)[]>(obj: T, keys: K): Omit<T, K[number]> {
  const copy = { ...(obj as unknown as Record<PropertyKey, unknown>) } as Record<PropertyKey, unknown> & T
  for (const key of keys) {
    delete copy[key]
  }
  return copy as Omit<T, K[number]>
}
