import { supabase } from './supabaseClient'

// La chiave Groq non è leggibile dal browser (column privileges su profiles):
// il frontend sa solo se esiste, e può scriverla o cancellarla.

/** @returns {Promise<{data: boolean|null, error}>} */
export async function hasAiApiKey() {
  const { data, error } = await supabase.rpc('has_ai_api_key')
  return { data: error ? null : Boolean(data), error }
}

/**
 * @param {string} userId
 * @param {string} apiKey
 */
export async function saveAiApiKey(userId, apiKey) {
  const { error } = await supabase
    .from('profiles')
    .update({ ai_api_key: apiKey })
    .eq('id', userId)
  return { error }
}

/** @param {string} userId */
export async function removeAiApiKey(userId) {
  const { error } = await supabase
    .from('profiles')
    .update({ ai_api_key: null })
    .eq('id', userId)
  return { error }
}
