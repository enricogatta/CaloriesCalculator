import { createClient } from '@supabase/supabase-js'

// Sta in una sottocartella senza index.js: Netlify non la pubblica come function.
// Non importarlo mai da src/: la secret key finirebbe nel bundle del browser.

let adminClient = null

/**
 * Client admin con la secret key: l'RLS è spenta, ogni query va filtrata a mano
 * per l'utente verificato. Creato alla prima chiamata, così una variabile mancante
 * produce un errore gestito invece di far fallire l'import della function.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getAdmin() {
  if (!adminClient) {
    const url = process.env.SUPABASE_URL
    const secretKey = process.env.SUPABASE_SECRET_KEY
    if (!url || !secretKey) throw new Error('SUPABASE_URL o SUPABASE_SECRET_KEY mancanti')
    adminClient = createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return adminClient
}

/**
 * Verifica il JWT di Supabase dall'header Authorization (la firma, non solo la decodifica).
 * @param {Request} req
 * @returns {Promise<object|null>} l'utente, o null se il token manca o non è valido
 */
export async function getUser(req) {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  const { data, error } = await getAdmin().auth.getUser(token)
  return error ? null : data.user
}

/**
 * Risposta JSON.
 * @param {object} body
 * @param {number} status
 * @returns {Response}
 */
export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Log strutturato su una riga: mai chiavi, token o body completi.
 * @param {object} fields
 */
export function log(fields) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...fields }))
}
