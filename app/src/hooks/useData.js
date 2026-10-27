import { createContext, useContext } from 'react'

export const DataContext = createContext(null)

/**
 * Dati condivisi fra le pagine: libreria cibi e obiettivi.
 * { foods, goals, status: 'loading'|'ready'|'error', refreshToken, refreshAll,
 *   setGoals, upsertFoodLocal, removeFoodLocal }
 * refreshToken cambia a ogni ricarica: le pagine lo usano per ricaricare i propri dati.
 */
export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData va usato dentro DataProvider')
  return context
}
