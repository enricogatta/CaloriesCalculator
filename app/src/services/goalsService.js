import { supabase } from './supabaseClient'

/**
 * Obiettivi dell'utente; data è null se non li ha mai salvati.
 * @param {string} userId
 */
export async function getGoals(userId) {
  const { data, error } = await supabase
    .from('goals')
    .select('calories, protein, carbs, fat')
    .eq('user_id', userId)
    .maybeSingle()
  return { data, error }
}

/**
 * Crea o aggiorna la riga obiettivi (una per utente).
 * @param {string} userId
 * @param {{calories:number, protein:number, carbs:number, fat:number}} goals
 */
export async function saveGoals(userId, goals) {
  const { error } = await supabase
    .from('goals')
    .upsert(
      { user_id: userId, ...goals, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  return { error }
}
