'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { CATEGORY_COLORS, CATEGORY_COLORS_LIGHT } from './api'

type Theme = 'light' | 'dark'

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'dark',
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    // Default to dark — light mode is the opt-in
    const initial: Theme = saved ?? (prefersDark ? 'dark' : 'light')
    setTheme(initial)
    document.documentElement.classList.toggle('light', initial === 'light')
  }, [])

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('light', next === 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

/**
 * Returns the category color map for the current theme.
 * Use this instead of importing CATEGORY_COLORS directly when the
 * color is rendered as text/border/badge (needs WCAG AA contrast).
 */
export function useCategoryColors(): Record<string, string> {
  const { theme } = useTheme()
  return theme === 'light' ? CATEGORY_COLORS_LIGHT : CATEGORY_COLORS
}
