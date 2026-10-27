import { supabase } from './supabaseClient'
import { MEAL_CATEGORIES, EMPTY_TOTALS, sumMacros } from '../utils/nutrition'

const MEAL_SELECT = `
  id, category, date, created_at,
  meal_items (
    id, position, quantity, quantity_type, grams,
    calories, protein, carbs, fat, food_id,
    foods ( id, name )
  )
`

const toDish = (mealId) => (item) => ({
  id: item.id,
  mealId,
  food: item.foods?.name ?? '',
  foodId: item.food_id,
  position: item.position,
  quantity: Number(item.quantity) || 0,
  quantityType: item.quantity_type,
  grams: Number(item.grams) || 0,
  calories: Number(item.calories) || 0,
  protein: Number(item.protein) || 0,
  carbs: Number(item.carbs) || 0,
  fat: Number(item.fat) || 0,
})

const categoryOrder = (category) => {
  const index = MEAL_CATEGORIES.indexOf(category)
  return index === -1 ? MEAL_CATEGORIES.length : index
}

/**
 * Raggruppa i pasti del giorno per categoria, nell'ordine Colazione → Spuntino.
 * Più righe meals con la stessa categoria (create in passato da richieste
 * concorrenti) diventano una sola card: mealIds le elenca tutte.
 * @param {Array} rows - risultato della select con MEAL_SELECT
 * @returns {Array<{category: string, mealIds: string[], dishes: Array, totals: object}>}
 */
function toMealCards(rows) {
  const byCategory = new Map()
  const sortedRows = [...rows].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
  for (const row of sortedRows) {
    const card = byCategory.get(row.category) ?? { category: row.category, mealIds: [], dishes: [] }
    card.mealIds.push(row.id)
    card.dishes.push(...row.meal_items.map(toDish(row.id)).sort((a, b) => a.position - b.position))
    byCategory.set(row.category, card)
  }
  return [...byCategory.values()]
    .filter(card => card.dishes.length > 0)
    .map(card => ({ ...card, totals: sumMacros(card.dishes) }))
    .sort((a, b) => categoryOrder(a.category) - categoryOrder(b.category))
}

/**
 * Pasti di un giorno, già raggruppati per categoria.
 * @param {string} userId
 * @param {string} date - 'YYYY-MM-DD'
 */
export async function getMealCardsByDate(userId, date) {
  const { data, error } = await supabase
    .from('meals')
    .select(MEAL_SELECT)
    .eq('user_id', userId)
    .eq('date', date)
  return { data: data ? toMealCards(data) : null, error }
}

/**
 * Date con almeno un pasto nell'intervallo (per i pallini della settimana).
 * @returns {Promise<{data: Set<string>|null, error}>}
 */
export async function getLoggedDates(userId, from, to) {
  const { data, error } = await supabase
    .from('meals')
    .select('date')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
  return { data: data ? new Set(data.map(row => row.date)) : null, error }
}

/**
 * Totali di kcal e macro per giorno nell'intervallo; i giorni senza pasti mancano.
 * @returns {Promise<{data: Map<string, object>|null, error}>}
 */
export async function getDailyTotals(userId, from, to) {
  const { data, error } = await supabase
    .from('meals')
    .select('date, meal_items ( calories, protein, carbs, fat )')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
  if (error) return { data: null, error }

  const totals = new Map()
  for (const row of data) {
    if (row.meal_items.length === 0) continue
    const dayTotals = sumMacros(row.meal_items)
    const previous = totals.get(row.date) ?? EMPTY_TOTALS
    totals.set(row.date, sumMacros([previous, dayTotals]))
  }
  return { data: totals, error: null }
}

/**
 * Nuovo pasto (card) per categoria e data.
 * @returns {Promise<{data: {id: string}|null, error}>}
 */
export async function createMeal(userId, category, date) {
  const { data, error } = await supabase
    .from('meals')
    .insert({ user_id: userId, category, date })
    .select('id')
    .single()
  return { data, error }
}

/** @param {object} item - meal_id, food_id, quantity, quantity_type, grams, calories, protein, carbs, fat, position */
export async function addMealItem(item) {
  const { error } = await supabase.from('meal_items').insert(item)
  return { error }
}

/** @param {string} itemId */
export async function updateMealItem(itemId, fields) {
  const { error } = await supabase.from('meal_items').update(fields).eq('id', itemId)
  return { error }
}

/** @param {string} itemId */
export async function deleteMealItem(itemId) {
  const { error } = await supabase.from('meal_items').delete().eq('id', itemId)
  return { error }
}

/**
 * Elimina pasti e, in cascata, i loro piatti.
 * @param {string[]} mealIds
 */
export async function deleteMeals(mealIds) {
  const { error } = await supabase.from('meals').delete().in('id', mealIds)
  return { error }
}

/** Elimina tutti i pasti di un giorno. */
export async function deleteMealsByDate(userId, date) {
  const { error } = await supabase.from('meals').delete().eq('user_id', userId).eq('date', date)
  return { error }
}
