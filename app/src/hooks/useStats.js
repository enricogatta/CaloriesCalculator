import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { useData } from './useData'
import { getDailyTotals } from '../services/mealsService'
import { addDays, dateRange, startOfWeek, todayStr } from '../utils/dates'
import { EMPTY_TOTALS, sumMacros } from '../utils/nutrition'

const average = (totalsList) => {
  if (totalsList.length === 0) return { ...EMPTY_TOTALS }
  const sum = sumMacros(totalsList)
  const n = totalsList.length
  return { calories: sum.calories / n, protein: sum.protein / n, carbs: sum.carbs / n, fat: sum.fat / n }
}

/**
 * Andamento degli ultimi `days` giorni, oggi incluso.
 * - bars: una barra per giorno (7 e 30 giorni) o per settimana (90 giorni),
 *   con la media dei giorni registrati; value null se non c'è niente
 * - averages: media giornaliera sui soli giorni registrati
 * @param {number} days - 7, 30 o 90
 */
export function useStats(days) {
  const { user } = useAuth()
  const { refreshToken } = useData()
  const [result, setResult] = useState({ key: null, totals: null, error: null })

  const to = todayStr()
  const from = addDays(to, -(days - 1))
  const key = `${from}|${to}|${refreshToken}`

  useEffect(() => {
    let cancelled = false
    getDailyTotals(user.id, from, to).then(({ data, error }) => {
      if (!cancelled) setResult({ key, totals: data, error })
    })
    return () => { cancelled = true }
  }, [user.id, from, to, key])

  const loading = result.key !== key
  const totals = result.totals ?? new Map()
  const loggedDays = dateRange(from, to).filter(d => totals.has(d))
  const groupByWeek = days > 30

  const groups = new Map()
  for (const date of dateRange(from, to)) {
    const groupKey = groupByWeek ? startOfWeek(date) : date
    const group = groups.get(groupKey) ?? { date: groupKey, logged: [] }
    if (totals.has(date)) group.logged.push(totals.get(date))
    groups.set(groupKey, group)
  }

  const bars = [...groups.values()].map(group => ({
    date: group.date,
    loggedDays: group.logged.length,
    value: group.logged.length > 0 ? average(group.logged).calories : null,
  }))

  return {
    loading,
    error: loading ? null : result.error,
    bars,
    groupByWeek,
    loggedDayCount: loggedDays.length,
    averages: average(loggedDays.map(d => totals.get(d))),
  }
}
