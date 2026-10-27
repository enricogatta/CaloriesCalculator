import { supabase } from './supabaseClient'

const FOOD_COLUMNS =
  'id, name, default_quantity_type, calories_per_unit, protein_per_unit, carbs_per_unit, fat_per_unit, grams_per_unit'

// Postgres numeric può arrivare come stringa: i calcoli vogliono numeri
const toFood = (row) => ({
  ...row,
  calories_per_unit: Number(row.calories_per_unit) || 0,
  protein_per_unit: Number(row.protein_per_unit) || 0,
  carbs_per_unit: Number(row.carbs_per_unit) || 0,
  fat_per_unit: Number(row.fat_per_unit) || 0,
  grams_per_unit: row.grams_per_unit == null ? null : Number(row.grams_per_unit),
})

/**
 * Libreria cibi dell'utente (l'RLS filtra sull'utente), in ordine alfabetico.
 * @returns {Promise<{data: Array|null, error}>}
 */
export async function getFoods() {
  const { data, error } = await supabase
    .from('foods')
    .select(FOOD_COLUMNS)
    .order('name', { ascending: true })
  return { data: data ? data.map(toFood) : null, error }
}

/**
 * Crea o aggiorna il cibo con stesso nome e unità (vincolo user_id, name, default_quantity_type).
 * @param {string} userId
 * @param {object} fields - name, default_quantity_type, *_per_unit, grams_per_unit
 */
export async function upsertFood(userId, fields) {
  const { data, error } = await supabase
    .from('foods')
    .upsert({ user_id: userId, ...fields }, { onConflict: 'user_id,name,default_quantity_type' })
    .select(FOOD_COLUMNS)
    .single()
  return { data: data ? toFood(data) : null, error }
}

/**
 * Nuovo cibo. Se esiste già con stesso nome e unità restituisce l'errore 23505.
 * @param {string} userId
 * @param {object} fields
 */
export async function createFood(userId, fields) {
  const { data, error } = await supabase
    .from('foods')
    .insert({ user_id: userId, ...fields })
    .select(FOOD_COLUMNS)
    .single()
  return { data: data ? toFood(data) : null, error }
}

/**
 * @param {string} foodId
 * @param {object} fields - solo i campi modificabili: name, *_per_unit, grams_per_unit
 */
export async function updateFood(foodId, fields) {
  const { data, error } = await supabase
    .from('foods')
    .update(fields)
    .eq('id', foodId)
    .select(FOOD_COLUMNS)
    .single()
  return { data: data ? toFood(data) : null, error }
}

/** @param {string} foodId */
export async function deleteFood(foodId) {
  const { error } = await supabase.from('foods').delete().eq('id', foodId)
  return { error }
}

/**
 * Quanti piatti registrati usano questo cibo.
 * @param {string} foodId
 * @returns {Promise<{count: number|null, error}>}
 */
export async function countFoodUsage(foodId) {
  const { count, error } = await supabase
    .from('meal_items')
    .select('id', { count: 'exact', head: true })
    .eq('food_id', foodId)
  return { count, error }
}

/**
 * Ricalcola grammi e macro dei piatti che usano il cibo (funzione SQL).
 * @param {string} foodId
 * @returns {Promise<{data: number|null, error}>} piatti aggiornati
 */
export async function recalculateFoodItems(foodId) {
  const { data, error } = await supabase.rpc('recalculate_food_items', { p_food_id: foodId })
  return { data, error }
}
