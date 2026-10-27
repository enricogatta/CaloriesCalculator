import { supabase } from './supabaseClient'

// La chiave Gemini non è leggibile dal browser (column privileges su profiles):
// il frontend sa solo se esiste, e può scriverla o cancellarla.

/** @returns {Promise<{data: boolean|null, error}>} */
export async function hasGeminiApiKey() {
  const { data, error } = await supabase.rpc('has_gemini_api_key')
  return { data: error ? null : Boolean(data), error }
}

/**
 * @param {string} userId
 * @param {string} apiKey
 */
export async function saveGeminiApiKey(userId, apiKey) {
  const { error } = await supabase
    .from('profiles')
    .update({ gemini_api_key: apiKey })
    .eq('id', userId)
  return { error }
}

/** @param {string} userId */
export async function removeGeminiApiKey(userId) {
  const { error } = await supabase
    .from('profiles')
    .update({ gemini_api_key: null })
    .eq('id', userId)
  return { error }
}
