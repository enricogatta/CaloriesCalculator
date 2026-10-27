import { createContext, useContext } from 'react'

export const ThemeContext = createContext(null)

/**
 * Tema: { preference: 'light'|'dark'|'system', isDark, setPreference }.
 */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme va usato dentro ThemeProvider')
  return context
}
