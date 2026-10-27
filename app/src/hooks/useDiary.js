import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { useData } from './useData'
import { analyzeFood } from '../services/analyzeApi'
import { upsertFood } from '../services/foodsService'
import {
  addMealItem,
  createMeal,
  deleteMealItem,
  deleteMeals,
  deleteMealsByDate,
  getLoggedDates,
  getMealCardsByDate,
  updateMealItem,
} from '../services/mealsService'
import { addDays, startOfWeek } from '../utils/dates'
import { findFood, normalizeFoodName, perUnitFromAnalysis, portionFromFood } from '../utils/nutrition'

const DB_ERROR = { code: 'db_error', message: 'Salvataggio non riuscito. Controlla la connessione e riprova.' }

/**
 * Pasti di un giorno e azioni del diario.
 * I giorni già visti restano in memoria: tornandoci si vedono subito, poi si aggiornano.
 * @param {string} date - 'YYYY-MM-DD'
 */
export function useDiary(date) {
  const { user } = useAuth()
  const { foods, refreshToken, upsertFoodLocal } = useData()
  const [byDate, setByDate] = useState({})
  const [week, setWeek] = useState({ start: null, dates: new Set() })
  const [version, setVersion] = useState(0)

  const weekStart = startOfWeek(date)

  useEffect(() => {
    let cancelled = false
    getMealCardsByDate(user.id, date).then(({ data, error }) => {
      if (cancelled) return
      setByDate(prev => ({ ...prev, [date]: { cards: data ?? prev[date]?.cards ?? [], error } }))
    })
    return () => { cancelled = true }
  }, [user.id, date, refreshToken, version])

  useEffect(() => {
    let cancelled = false
    getLoggedDates(user.id, weekStart, addDays(weekStart, 6)).then(({ data }) => {
      if (!cancelled && data) setWeek({ start: weekStart, dates: data })
    })
    return () => { cancelled = true }
  }, [user.id, weekStart, refreshToken, version])

  const current = byDate[date]
  const cards = current?.cards ?? []
  const reload = () => setVersion(v => v + 1)

  /**
   * Aggiunge o modifica un piatto. I valori arrivano dalla libreria se il cibo
   * c'è già (stesso nome e unità), altrimenti da Gemini, e il cibo viene salvato.
   * @returns {Promise<{error: {code: string, message: string}|null}>}
   */
  async function saveDish({ category, card, dish, foodName, quantity, quantityType }) {
    // Un cibo già in libreria si usa così com'è, anche a 0 kcal (acqua, bibite zero):
    // i valori sbagliati si correggono dalla pagina Alimenti
    let food = findFood(foods, foodName, quantityType)

    if (!food) {
      const { data: analysis, error } = await analyzeFood({ meal: foodName, quantity, quantityType })
      if (error) return { error }

      const { data: saved, error: saveError } = await upsertFood(user.id, {
        name: normalizeFoodName(foodName),
        default_quantity_type: quantityType,
        ...perUnitFromAnalysis(analysis, quantity, quantityType),
      })
      if (saveError) return { error: DB_ERROR }
      upsertFoodLocal(saved)
      food = saved
    }

    const item = {
      food_id: food.id,
      quantity: Number(quantity),
      quantity_type: quantityType,
      ...portionFromFood(food, quantity),
    }

    if (dish) {
      const { error } = await updateMealItem(dish.id, item)
      if (error) return { error: DB_ERROR }
    } else {
      const targetCard = card ?? cards.find(c => c.category === category)
      let mealId = targetCard?.mealIds[0]
      if (!mealId) {
        const { data: meal, error } = await createMeal(user.id, category, date)
        if (error) return { error: DB_ERROR }
        mealId = meal.id
      }
      const { error } = await addMealItem({ ...item, meal_id: mealId, position: targetCard?.dishes.length ?? 0 })
      if (error) return { error: DB_ERROR }
    }

    reload()
    return { error: null }
  }

  /** Elimina un piatto; se era l'ultimo del suo pasto elimina anche il pasto. */
  async function deleteDish(card, dish) {
    const siblings = card.dishes.filter(d => d.mealId === dish.mealId)
    const { error } = siblings.length === 1
      ? await deleteMeals([dish.mealId])
      : await deleteMealItem(dish.id)
    reload()
    return { error }
  }

  /** Elimina un'intera card (tutti i pasti di quella categoria nel giorno). */
  async function deleteCard(card) {
    const { error } = await deleteMeals(card.mealIds)
    reload()
    return { error }
  }

  async function clearDay() {
    const { error } = await deleteMealsByDate(user.id, date)
    reload()
    return { error }
  }

  return {
    cards,
    loading: !current,
    error: current?.error ?? null,
    loggedDates: week.start === weekStart ? week.dates : new Set(),
    reload,
    saveDish,
    deleteDish,
    deleteCard,
    clearDay,
  }
}
