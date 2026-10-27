import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeContext } from '../hooks/useTheme'
import { readStorage, writeStorage } from '../utils/storage'

// Chiave e colori allineati a public/theme-init.js, che applica il tema prima del primo paint
const STORAGE_KEY = 'cc-theme'
const THEME_COLORS = { dark: '#000000', light: '#f2f2f7' }
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

/**
 * ThemeProvider
 * Preferenza chiaro / scuro / sistema salvata sul dispositivo. Con "sistema"
 * segue il tema del telefono anche mentre l'app è aperta.
 */
export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() => readStorage(STORAGE_KEY) || 'system')
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches)

  useEffect(() => {
    const query = darkQuery()
    const onChange = (event) => setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const isDark = preference === 'dark' || (preference === 'system' && systemDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', isDark ? THEME_COLORS.dark : THEME_COLORS.light)
  }, [isDark])

  const setPreference = useCallback((value) => {
    setPreferenceState(value)
    writeStorage(STORAGE_KEY, value)
  }, [])

  const value = useMemo(() => ({ preference, isDark, setPreference }), [preference, isDark, setPreference])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
