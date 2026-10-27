import { z } from 'zod'
import { getAdmin, getUser, json, log } from './_shared/supabase.js'

const FALLBACK_API_KEY = (process.env.GROQ_API_KEY || '').trim()
// Solo questo utente può usare la chiave di riserva del server
const FALLBACK_USER_ID = (process.env.AI_FALLBACK_USER_ID || '').trim()

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
// Solo modelli che su Groq supportano json_schema con strict: true
const AI_MODELS = (process.env.AI_MODELS || 'openai/gpt-oss-120b,openai/gpt-oss-20b')
  .split(',')
  .map(m => m.trim())
  .filter(Boolean)
// Le function sincrone hanno un limite di durata: tutti i tentativi devono starci dentro
const AI_BUDGET_MS = Number(process.env.AI_BUDGET_MS || 9000)
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 8000)
// Su un 429 si riprova lo stesso modello solo se Groq chiede di aspettare poco
const MAX_RETRY_AFTER_MS = 2000
const CACHE_TTL_MS = Number(process.env.NUTRITION_CACHE_TTL_MS || 24 * 60 * 60 * 1000)

// La cache vive solo finché l'istanza resta calda. I valori per 100 g non
// dipendono né dall'utente né dalla quantità, quindi è condivisa fra tutti.
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
  missing_api_key: 'Per analizzare alimenti nuovi serve una chiave API Groq. Aggiungila nelle Impostazioni.',
  invalid_api_key: 'La chiave API Groq non è valida o è stata revocata. Aggiornala nelle Impostazioni.',
  ai_busy: 'Il servizio AI ha raggiunto il limite di richieste o è sovraccarico. Riprova fra qualche minuto.',
  ai_error: 'Non sono riuscito ad analizzare l\'alimento. Riprova.',
  server_error: 'Errore del server. Riprova più tardi.',
}

const fail = (code, status) => json({ error: code, message: MESSAGES[code] }, status)

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const isClearlyInvalidMeal = (meal) => !/[a-zA-Zàèéìòù]/.test(meal)

const UNIT_DESCRIPTIONS = {
  grams: 'in grammi',
  unit: 'a pezzi (unità)',
  teaspoon: 'a cucchiaini',
  tablespoon: 'a cucchiai',
}

const SYSTEM_PROMPT = `Sei un database nutrizionale. Ricevi il nome di un alimento e la misura con cui l'utente lo pesa.

1. Se il nome non è un alimento o una bevanda reale (es. "ciao", "test", parole senza senso, oggetti non commestibili), rispondi con is_food false e tutti i numeri a 0. Acqua, caffè, tè, sale e bibite zero sono alimenti validi anche se hanno 0 kcal.
2. Altrimenti is_food true e i valori medi per 100 g: kcal_100g, protein_100g, carbs_100g, fat_100g (grammi di macronutrienti in 100 g). Usa le tabelle di composizione ufficiali: prima CREA (Italia), poi USDA FoodData Central. Per i prodotti di marca usa l'etichetta tipica.
3. I valori si riferiscono all'alimento CRUDO, come si pesa di solito in Italia prima della cottura: pasta, riso, cereali e legumi secchi; carne e pesce crudi (es. petto di pollo crudo ~100-110 kcal e 23 g di proteine, non i ~165 kcal del cotto). Usa i valori del cotto solo se il nome dice cotto, lessato, alla griglia, arrosto, fritto o simili.
4. Per un piatto composto (es. "pasta al pomodoro", "pizza margherita") stima la composizione di una ricetta italiana standard.
5. unit_grams è il peso in grammi della parte edibile di UNA unità della misura indicata. A pezzi: l'alimento intero di dimensione media come si compra o si serve, mai una fetta o una parte (1 mela ~180, 1 banana ~120, 1 uovo ~60, 1 panino ~80, 1 pizza intera ~300). Cucchiaino: ~5 per i liquidi, ~4 per zucchero e polveri. Cucchiaio: ~15 per i liquidi, ~12 per zucchero e polveri. Se la misura è in grammi metti 1.
6. Sii deterministico: per lo stesso alimento dai sempre gli stessi valori.`

// Output vincolato (strict): il modello non può omettere campi né cambiarne il tipo
const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    is_food: { type: 'boolean' },
    unit_grams: { type: 'number' },
    kcal_100g: { type: 'number' },
    protein_100g: { type: 'number' },
    carbs_100g: { type: 'number' },
    fat_100g: { type: 'number' },
  },
  required: ['is_food', 'unit_grams', 'kcal_100g', 'protein_100g', 'carbs_100g', 'fat_100g'],
  additionalProperties: false,
}

// Limiti fisici per 100 g: il grasso puro ha 900 kcal, i macro non superano 100 g
const AiResult = z.object({
  is_food: z.literal(true),
  unit_grams: z.number().min(0).max(2000),
  kcal_100g: z.number().min(0).max(900),
  protein_100g: z.number().min(0).max(100),
  carbs_100g: z.number().min(0).max(100),
  fat_100g: z.number().min(0).max(100),
}).refine(r => r.protein_100g + r.carbs_100g + r.fat_100g <= 102, { message: 'macro oltre 100 g', path: ['macros'] })

const aiError = (status, message, retryAfter = null) => {
  const error = new Error(message)
  error.status = status
  error.retryAfterMs = retryAfter != null && retryAfter !== '' ? Number(retryAfter) * 1000 : null
  return error
}

const isKeyError = (error) => error.status === 401 || error.status === 403

/**
 * Controlla l'output del modello: niente valori mancanti, inventati o fuori scala.
 * @returns {{data?: object, issues?: string[]}}
 */
const parseResult = (content, quantityType) => {
  let raw
  try { raw = JSON.parse(content) } catch { return { issues: ['json'] } }
  if (raw?.is_food === false) return { data: { is_food: false } }

  const parsed = AiResult.safeParse(raw)
  if (!parsed.success) return { issues: parsed.error.issues.map(i => i.path.join('.') || i.message) }
  if (quantityType !== 'grams' && parsed.data.unit_grams <= 0) return { issues: ['unit_grams'] }
  return { data: parsed.data }
}

const callModel = async (model, meal, quantityType, apiKey, timeoutMs) => {
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Alimento: "${meal}"\nMisura: ${UNIT_DESCRIPTIONS[quantityType]}` },
        ],
        temperature: 0,
        ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'nutrition', strict: true, schema: RESULT_SCHEMA },
        },
      }),
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw aiError(response.status, payload?.error?.message || response.statusText, response.headers.get('retry-after'))
    }
    return payload?.choices?.[0]?.message?.content
  } catch (error) {
    if (error.name === 'AbortError') throw aiError(504, `Timeout oltre ${timeoutMs}ms`)
    if (!error.status) error.status = 502
    throw error
  } finally {
    clearTimeout(timeoutHandle)
  }
}

// Prova i modelli in ordine. Un modello che sbaglia l'output o è al limite
// lascia il posto al successivo; con una chiave non valida è inutile continuare.
const analyzeWithFallback = async (meal, quantityType, apiKey) => {
  const deadline = Date.now() + AI_BUDGET_MS
  let lastError = null

  for (const model of AI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const remaining = deadline - Date.now()
      if (remaining < 1000) throw lastError || aiError(504, 'Tempo a disposizione esaurito')

      try {
        const content = await callModel(model, meal, quantityType, apiKey, Math.min(AI_TIMEOUT_MS, remaining))
        const { data, issues } = parseResult(content, quantityType)
        if (data) return data
        log({ evt: 'ai_invalid_output', model, issues })
        lastError = aiError(502, 'Output del modello non valido')
        break
      } catch (error) {
        lastError = error
        log({ evt: 'ai_error', model, attempt, status: error.status, msg: error.message })
        if (isKeyError(error)) throw error
        const wait = error.retryAfterMs
        const canWait = wait != null && wait <= MAX_RETRY_AFTER_MS && deadline - Date.now() > wait + 1000
        if (error.status === 429 && attempt === 1 && canWait) {
          await sleep(wait)
          continue
        }
        break
      }
    }
  }
  throw lastError || aiError(502, 'Nessun modello configurato')
}

/** Grammi e macro della porzione dai valori per 100 g, senza arrotondare. */
const portionFromResult = (result, quantity, quantityType) => {
  const grams = quantityType === 'grams' ? quantity : result.unit_grams * quantity
  return {
    grams,
    calories: result.kcal_100g * grams / 100,
    protein: result.protein_100g * grams / 100,
    carbs: result.carbs_100g * grams / 100,
    fat: result.fat_100g * grams / 100,
  }
}

// Chiave dell'utente dal profilo; quella del server solo per FALLBACK_USER_ID.
// La query con la secret key è filtrata esplicitamente sull'utente verificato.
const resolveApiKey = async (userId) => {
  const { data, error } = await getAdmin()
    .from('profiles')
    .select('ai_api_key')
    .eq('id', userId)
    .maybeSingle()
  if (error) log({ evt: 'profile_read_error', userId, msg: error.message })

  const ownKey = (data?.ai_api_key || '').trim()
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

  // 4. chiave Groq da usare per questo utente
  const apiKey = await resolveApiKey(user.id)
  if (!apiKey) return fail('missing_api_key', 400)

  const requestKey = `${meal.toLowerCase()}|${quantityType}`
  const cached = responseCache.get(requestKey)
  if (cached && cached.expiresAt > Date.now()) {
    return json(portionFromResult(cached.data, quantity, quantityType))
  }

  let requestPromise = inFlightRequests.get(requestKey)
  const isOwner = !requestPromise
  if (isOwner) {
    requestPromise = analyzeWithFallback(meal, quantityType, apiKey)
    inFlightRequests.set(requestKey, requestPromise)
  }

  try {
    const result = await requestPromise
    if (!result.is_food) return fail('invalid_food', 400)

    responseCache.set(requestKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS })
    log({ evt: 'analyze_ok', userId: user.id, quantityType })
    return json(portionFromResult(result, quantity, quantityType))
  } catch (error) {
    log({ evt: 'analyze_error', userId: user.id, status: error.status, msg: error.message })
    if (isKeyError(error)) return fail('invalid_api_key', 502)
    if ([429, 503, 504].includes(error.status)) return fail('ai_busy', 503)
    return fail('ai_error', 502)
  } finally {
    if (isOwner) inFlightRequests.delete(requestKey)
  }
}
