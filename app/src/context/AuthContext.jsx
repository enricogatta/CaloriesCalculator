import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { AuthContext } from '../hooks/useAuth'

/**
 * AuthProvider
 * Tiene la sessione Supabase e la aggiorna a login, logout e rinnovo del token.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ user: session?.user ?? null, loading: false })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false })
    })
    return () => subscription.unsubscribe()
  }, [])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const value = useMemo(() => ({ ...state, signOut }), [state, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
