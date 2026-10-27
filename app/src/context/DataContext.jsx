import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DataContext } from '../hooks/useData'
import { useAuth } from '../hooks/useAuth'
import { getFoods } from '../services/foodsService'
import { getGoals } from '../services/goalsService'
import { DEFAULT_GOALS } from '../utils/nutrition'

// Riaprendo l'app dopo almeno un minuto in background i dati si ricaricano da soli
const STALE_AFTER_MS = 60_000

const byName = (a, b) => a.name.localeCompare(b.name, 'it')

/**
 * DataProvider
 * Carica una volta libreria cibi e obiettivi dell'utente e li condivide fra le
 * pagine. Il diario e le statistiche caricano i propri dati per data.
 */
export function DataProvider({ children }) {
  const { user } = useAuth()
  const [foods, setFoods] = useState([])
  const [goals, setGoals] = useState(DEFAULT_GOALS)
  const [status, setStatus] = useState('loading')
  const [refreshToken, setRefreshToken] = useState(0)
  const lastLoadRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([getFoods(), getGoals(user.id)]).then(([foodsResult, goalsResult]) => {
      if (cancelled) return
      lastLoadRef.current = Date.now()
      if (foodsResult.error || goalsResult.error) {
        setStatus('error')
        return
      }
      setFoods(foodsResult.data)
      setGoals(goalsResult.data ?? DEFAULT_GOALS)
      setStatus('ready')
    })
    return () => { cancelled = true }
  }, [user.id, refreshToken])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastLoadRef.current > STALE_AFTER_MS) setRefreshToken(t => t + 1)
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  const refreshAll = useCallback(() => setRefreshToken(t => t + 1), [])

  const upsertFoodLocal = useCallback((food) => {
    setFoods(prev => [...prev.filter(f => f.id !== food.id), food].sort(byName))
  }, [])

  const removeFoodLocal = useCallback((foodId) => {
    setFoods(prev => prev.filter(f => f.id !== foodId))
  }, [])

  const value = useMemo(
    () => ({ foods, goals, status, refreshToken, refreshAll, setGoals, upsertFoodLocal, removeFoodLocal }),
    [foods, goals, status, refreshToken, refreshAll, upsertFoodLocal, removeFoodLocal],
  )
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
