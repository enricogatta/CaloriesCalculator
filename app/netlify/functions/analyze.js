import { z } from 'zod'
import { getAdmin, getUser, json, log } from './_shared/supabase.js'

const FALLBACK_API_KEY = (process.env.GEMINI_API_KEY || '').trim()
// Solo questo utente può usare la chiave di riserva del server
const FALLBACK_USER_ID = (process.env.GEMINI_FALLBACK_USER_ID || '').trim()

const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-2.0-flash')
  .split(',')
  .map(m => m.trim())
  .filter(Boolean)
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 15000)
const GEMINI_MAX_RETRIES = Number(process.env.GEMINI_MAX_RETRIES || 2)
const CACHE_TTL_MS = Number(process.env.NUTRITION_CACHE_TTL_MS || 24 * 60 * 60 * 1000)

// La cache vive solo finché l'istanza resta calda. I valori nutrizionali non
// dipendono dall'utente, quindi è condivisa fra tutti.
const responseCache = new Map()
const inFlightRequests = new Map()

const Body = z.object({
  meal: z.string().trim().min(2).max(100),
  quantity: z.number().positive().max(5000),
  quantityType: z.enum(['grams', 'unit', 'teaspoon', 'tablespoon']),
})

const MESSAGES = {
  unauthorized: 'Sessione scaduta. Esci e accedi di nuovo.',
  invalid_input: 'Controlla alimento e quantità: il nome va da 2 a 100 caratteri, la quantità fra 0 e 5000.',
  invalid_food: 'Non riconosco questo nome come alimento. Controlla come l\'hai scritto.',
  missing_api_key: 'Per analizzare alimenti nuovi serve una chiave API Gemini. Aggiungila nelle Impostazioni.',
  invalid_api_key: 'La chiave API Gemini non è valida o non ha i permessi. Aggiornala nelle Impostazioni.',
  ai_busy: 'Il servizio AI è sovraccarico. Riprova fra qualche secondo.',
  ai_error: 'Non sono riuscito ad analizzare l\'alimento. Riprova.',
  server_error: 'Errore del server. Riprova più tardi.',
}

const fail = (code, status) => json({ error: code, message: MESSAGES[code] }, status)

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const buildRequestKey = (meal, quantity, quantityType) =>
  `${meal.toLowerCase()}|${quantity.toFixed(3)}|${quantityType}`

const isClearlyInvalidMeal = (meal) => !/[a-zA-Zàèéìòù]/.test(meal)

const getQuantityDescription = (quantity, quantityType) => {
  if (quantityType === 'grams') return `${quantity}g`
  if (quantityType === 'unit') return `${quantity} unità`
  if (quantityType === 'teaspoon') return `${quantity} cucchiaino`
  return `${quantity} cucchiaio`
}

const extractJsonObject = (text) => {
  const cleaned = String(text || '').replace(/```json|```/gi, '').trim()
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1)
  }
  return cleaned
}

const buildPrompt = (meal, quantityDesc) => `Agisci come un database nutrizionale scientifico e certificato.
Analizza esattamente ${quantityDesc} di "${meal}".

PRIMA DI TUTTO: Verifica se "${meal}" è un alimento reale e commestibile.
- Se NON è un cibo (es. "ciao", "test", "123", parole senza senso, o non commestibili), rispondi ESCLUSIVAMENTE con: {"error": "invalid_food"}
- Se è un cibo valido, procedi con l'analisi nutrizionale.

REGOLE RIGIDE per alimenti validi:
1. Interpreta correttamente la quantità: se è "unità", stima il peso medio (es. 1 pizza ~300g, 1 panino ~120g, 1 mela ~150g). Se è cucchiaino/cucchiaio, usa ~5g/15g per liquidi o ~3g/10g per solidi.
2. Usa esclusivamente valori medi standard tratti da tabelle nutrizionali ufficiali (es. USDA).
3. Sii estremamente deterministico: per lo stesso alimento e la stessa quantità, devi fornire SEMPRE gli stessi valori ogni volta che ti viene chiesto.
4. Non aggiungere variazioni "creative". Rapporta sempre i valori alla quantità richiesta.
5. Rispondi ESCLUSIVAMENTE con questo oggetto JSON puro:
{"food": "${meal}", "grams": num, "calories": num, "protein": num, "carbs": num, "fat": num}.
- "grams" deve essere il peso stimato in grammi della quantità fornita.
Usa solo numeri puri, non stringhe. Niente testo aggiuntivo, commenti o blocchi di codice markdown.`

const parseGeminiError = (statusCode, payload, fallbackMessage) => {
  const message = payload?.error?.message || fallbackMessage || 'Errore sconosciuto da Gemini.'
  const code = payload?.error?.status || 'UNKNOWN'
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code
  error.retryable = [429, 500, 502, 503, 504].includes(statusCode) || code === 'UNAVAILABLE' || code === 'RESOURCE_EXHAUSTED'
  error.invalidKey = statusCode === 401 || statusCode === 403 || /api key/i.test(message)
  return error
}

const toNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const callGeminiModel = async (model, prompt, apiKey) => {
  // La chiave va nell'header, non nell'URL: le query string finiscono nei log
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
      signal: controller.signal,
    })

    const responseText = await response.text()
    let payload
    try { payload = responseText ? JSON.parse(responseText) : {} } catch { payload = {} }

    if (!response.ok || payload?.error) {
      throw parseGeminiError(response.status || 500, payload, response.statusText)
    }

    const aiResponseText = payload?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!aiResponseText) {
      const error = new Error('Gemini non ha restituito contenuto valido.')
      error.statusCode = 502
      error.retryable = false
      throw error
    }

    const parsed = JSON.parse(extractJsonObject(aiResponseText))
    return {
      food: parsed.food,
      grams: toNumber(parsed.grams),
      calories: toNumber(parsed.calories),
      protein: toNumber(parsed.protein),
      carbs: toNumber(parsed.carbs),
      fat: toNumber(parsed.fat),
      error: parsed.error,
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Timeout Gemini oltre ${GEMINI_TIMEOUT_MS}ms.`)
      timeoutError.statusCode = 504
      timeoutError.retryable = true
      throw timeoutError
    }
    if (typeof error.retryable !== 'boolean') error.retryable = false
    if (!error.statusCode) error.statusCode = 500
    throw error
  } finally {
    clearTimeout(timeoutHandle)
  }
}

const callGeminiWithRetry = async (prompt, apiKey) => {
  let lastError
  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt += 1) {
      try {
        return await callGeminiModel(model, prompt, apiKey)
      } catch (error) {
        lastError = error
        log({ evt: 'gemini_error', model, attempt, status: error.statusCode, msg: error.message })
        // Con una chiave non valida è inutile provare altri modelli
        if (error.invalidKey) throw error
        if (!error.retryable) break
        if (attempt < GEMINI_MAX_RETRIES) await sleep(Math.min(1500 * attempt, 4000))
      }
    }
  }
  throw lastError || new Error('Richiesta Gemini fallita senza dettagli.')
}

// Chiave dell'utente dal profilo; quella del server solo per FALLBACK_USER_ID.
// La query con la secret key è filtrata esplicitamente sull'utente verificato.
const resolveApiKey = async (userId) => {
  const { data, error } = await getAdmin()
    .from('profiles')
    .select('gemini_api_key')
    .eq('id', userId)
    .maybeSingle()
  if (error) log({ evt: 'profile_read_error', userId, msg: error.message })

  const ownKey = (data?.gemini_api_key || '').trim()
  if (ownKey) return ownKey
  if (FALLBACK_USER_ID && userId === FALLBACK_USER_ID) return FALLBACK_API_KEY
  return ''
}

export default async (req) => {
  // 1. metodo
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  // 2. identità, prima di qualsiasi query
  let user
  try {
    user = await getUser(req)
  } catch (error) {
    log({ evt: 'auth_error', msg: error.message })
    return fail('server_error', 500)
  }
  if (!user) return fail('unauthorized', 401)

  // 3. validazione input
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return fail('invalid_input', 400)
  const { meal, quantity, quantityType } = parsed.data
  if (isClearlyInvalidMeal(meal)) return fail('invalid_food', 400)

  // 4. chiave Gemini da usare per questo utente
  const apiKey = await resolveApiKey(user.id)
  if (!apiKey) return fail('missing_api_key', 400)

  const requestKey = buildRequestKey(meal, quantity, quantityType)
  const cached = responseCache.get(requestKey)
  if (cached && cached.expiresAt > Date.now()) return json(cached.data)

  let requestPromise = inFlightRequests.get(requestKey)
  const isOwner = !requestPromise
  if (isOwner) {
    const prompt = buildPrompt(meal, getQuantityDescription(quantity, quantityType))
    requestPromise = callGeminiWithRetry(prompt, apiKey)
    inFlightRequests.set(requestKey, requestPromise)
  }

  try {
    const data = await requestPromise
    if (data?.error === 'invalid_food') return fail('invalid_food', 400)

    responseCache.set(requestKey, { data, expiresAt: Date.now() + CACHE_TTL_MS })
    log({ evt: 'analyze_ok', userId: user.id, quantityType })
    return json(data)
  } catch (error) {
    log({ evt: 'analyze_error', userId: user.id, status: error.statusCode, msg: error.message })
    if (error.invalidKey) return fail('invalid_api_key', 502)
    if ([429, 503, 504].includes(error.statusCode)) return fail('ai_busy', 503)
    return fail('ai_error', 502)
  } finally {
    if (isOwner) inFlightRequests.delete(requestKey)
  }
}
