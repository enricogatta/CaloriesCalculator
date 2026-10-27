import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

/**
 * Sessione corrente: { user, loading, signOut }. Va usato dentro AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth va usato dentro AuthProvider')
  return context
}
