'use client'

import * as React from 'react'

type Theme = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'astrologer-theme-preference'

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (value: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return null
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Theme state tracks the user's preference (light, dark, or system)
  const [theme, setThemeState] = React.useState<Theme>(() => {
    const stored = getStoredTheme()
    return stored ?? 'system'
  })

  // Resolved theme tracks the actual applied theme (only light or dark)
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>('light')

  // Apply the theme to the document
  const applyTheme = React.useCallback((targetTheme: 'light' | 'dark') => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(targetTheme)
    root.style.colorScheme = targetTheme
    setResolvedTheme(targetTheme)
  }, [])

  // Sync effect
  React.useEffect(() => {
    const systemTheme = getSystemTheme()
    const activeTheme = theme === 'system' ? systemTheme : theme

    applyTheme(activeTheme)
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light')
      }
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme, applyTheme])

  const setTheme = React.useCallback((value: Theme) => {
    setThemeState(value)
  }, [])

  const toggleTheme = React.useCallback(() => {
    setThemeState((current) => {
      if (current === 'system') return 'light'
      if (current === 'light') return 'dark'
      return 'system'
    })
  }, [])

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
