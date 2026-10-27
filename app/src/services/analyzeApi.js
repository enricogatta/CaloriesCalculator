import { supabase } from './supabaseClient'

// Richieste identiche in corso vengono condivise invece di partire due volte
const pendingRequests = new Map()

const NETWORK_ERROR = {
  code: 'network',
  message: 'Connessione assente o instabile. Controlla la rete e riprova.',
}

async function requestAnalysis(body) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { data: null, error: { code: 'unauthorized', message: 'Sessione scaduta. Esci e accedi di nuovo.' } }
    }

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      return {
        data: null,
        error: {
          code: payload.error || 'server_error',
          message: payload.message || 'Errore del server. Riprova fra qualche secondo.',
        },
      }
    }
    return { data: payload, error: null }
  } catch {
    return { data: null, error: NETWORK_ERROR }
  }
}

/**
 * Valori nutrizionali di una porzione stimati dall'AI su Groq (Netlify Function analyze).
 * @param {{meal: string, quantity: number, quantityType: string}} body
 * @returns {Promise<{data: {grams:number, calories:number, protein:number, carbs:number, fat:number}|null,
 *   error: {code: string, message: string}|null}>}
 */
export function analyzeFood({ meal, quantity, quantityType }) {
  const key = `${meal.trim().toLowerCase()}|${Number(quantity).toFixed(3)}|${quantityType}`
  if (!pendingRequests.has(key)) {
    const promise = requestAnalysis({ meal: meal.trim(), quantity: Number(quantity), quantityType })
      .finally(() => pendingRequests.delete(key))
    pendingRequests.set(key, promise)
  }
  return pendingRequests.get(key)
}
