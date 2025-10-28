'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext({
  theme: 'system', // 'light' | 'dark' | 'system'
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
})

function getSystemPrefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return null
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return null
  }
}

function applyHtmlClass(isDark) {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  if (isDark) el.classList.add('dark')
  else el.classList.remove('dark')
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('system')
  const [resolvedTheme, setResolvedTheme] = useState('light')

  // initialize from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme')
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeState(saved)
      } else {
        setThemeState('system')
      }
    } catch {
      // default to system
      setThemeState('system')
    }
  }, [])

  // react to system changes
  useEffect(() => {
    const mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
    const listener = () => {
      if (theme === 'system') {
        const systemDark = getSystemPrefersDark()
        const effectiveDark = systemDark === null ? true : !!systemDark // fallback to dark if no system
        setResolvedTheme(effectiveDark ? 'dark' : 'light')
        applyHtmlClass(effectiveDark)
      }
    }
    if (mql && mql.addEventListener) mql.addEventListener('change', listener)
    else if (mql && mql.addListener) mql.addListener(listener)
    return () => {
      if (mql && mql.removeEventListener) mql.removeEventListener('change', listener)
      else if (mql && mql.removeListener) mql.removeListener(listener)
    }
  }, [theme])

  // resolve theme whenever changed
  useEffect(() => {
    const systemDark = getSystemPrefersDark()
    const effectiveDark = theme === 'dark' ? true : theme === 'light' ? false : (systemDark === null ? true : !!systemDark)
    setResolvedTheme(effectiveDark ? 'dark' : 'light')
    applyHtmlClass(effectiveDark)
  }, [theme])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    try { localStorage.setItem('theme', next) } catch {}
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const order = ['system', 'dark', 'light']
      const idx = order.indexOf(prev)
      const next = order[(idx + 1) % order.length]
      try { localStorage.setItem('theme', next) } catch {}
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme, toggleTheme }), [theme, resolvedTheme, setTheme, toggleTheme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

