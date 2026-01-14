import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils/cn'

describe('utils', () => {
  describe('cn', () => {
    it('merges classnames correctly', () => {
      const result = cn('px-2', 'py-4', 'bg-red-500')
      expect(result).toBeTruthy()
      expect(result).toContain('px-2')
    })

    it('handles conditional classnames', () => {
      const isActive = true
      const result = cn('base', isActive && 'active')
      expect(result).toContain('base')
      expect(result).toContain('active')
    })

    it('filters out falsy values', () => {
      const result = cn('base', false, null, undefined, 'valid')
      expect(result).toContain('base')
      expect(result).toContain('valid')
    })
  })
})
