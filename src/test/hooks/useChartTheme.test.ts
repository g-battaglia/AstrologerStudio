/**
 * Unit Tests for useChartTheme Hook
 *
 * Tests the hook that maps the application color theme to chart theme.
 * The hook implements a simple rule: dark → 'dark', anything else → 'classic'
 *
 * @vitest-environment jsdom
 * @module src/hooks/useChartTheme
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock the ThemeProvider's useTheme hook
const mockUseTheme = vi.fn()
vi.mock('@/components/ThemeProvider', () => ({
  useTheme: () => mockUseTheme(),
}))

// Import hook after mocks are set up
import { useChartTheme } from '@/hooks/useChartTheme'

describe('useChartTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return "dark" when resolvedTheme is "dark"', () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: 'dark' })

    const { result } = renderHook(() => useChartTheme())

    expect(result.current).toBe('dark')
  })

  it('should return "classic" for any non-dark theme (light, undefined, etc.)', () => {
    // Test representative cases of non-dark themes
    const nonDarkCases = [{ resolvedTheme: 'light' }, { resolvedTheme: undefined }, { resolvedTheme: '' }]

    nonDarkCases.forEach((themeConfig) => {
      mockUseTheme.mockReturnValue(themeConfig)

      const { result } = renderHook(() => useChartTheme())

      expect(result.current).toBe('classic')
    })
  })
})
