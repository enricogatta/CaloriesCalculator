const API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-2.0-flash')
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 15000);
const GEMINI_MAX_RETRIES = Number(process.env.GEMINI_MAX_RETRIES || 2);
const CACHE_TTL_MS = Number(process.env.NUTRITION_CACHE_TTL_MS || 24 * 60 * 60 * 1000);

// Cache persists within the same warm function instance
const responseCache = new Map();
const inFlightRequests = new Map();

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
};

const reply = (statusCode, body) => ({
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const buildRequestKey = (meal, quantity, quantityType) => {
    const normalizedMeal = String(meal || '').trim().toLowerCase();
    const normalizedQuantity = Number(quantity).toFixed(3);
    const normalizedQuantityType = String(quantityType || '').trim().toLowerCase();
    return `${normalizedMeal}|${normalizedQuantity}|${normalizedQuantityType}`;
};

const isClearlyInvalidMeal = (meal) => {
    const text = String(meal || '').trim();
    if (!text || text.length < 2) return true;
    if (!/[a-zA-Zàèéìòù]/.test(text)) return true;
    return false;
};

const getQuantityDescription = (quantity, quantityType) => {
    if (quantityType === 'grams') return `${quantity}g`;
    if (quantityType === 'unit') return `${quantity} unità`;
    if (quantityType === 'teaspoon') return `${quantity} cucchiaino`;
    if (quantityType === 'tablespoon') return `${quantity} cucchiaio`;
    return `${quantity} ${quantityType}`;
};

const extractJsonObject = (text) => {
    const cleaned = String(text || '').replace(/```json|```/gi, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        return cleaned.slice(firstBrace, lastBrace + 1);
    }
    return cleaned;
};

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
Usa solo numeri puri, non stringhe. Niente testo aggiuntivo, commenti o blocchi di codice markdown.`;

const parseGeminiError = (statusCode, payload, fallbackMessage) => {
    const message = payload?.error?.message || fallbackMessage || 'Errore sconosciuto da Gemini.';
    const code = payload?.error?.status || 'UNKNOWN';
    const retryable = [429, 500, 502, 503, 504].includes(statusCode) || code === 'UNAVAILABLE' || code === 'RESOURCE_EXHAUSTED';
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    error.retryable = retryable;
    return error;
};

const callGeminiModel = async (model, prompt) => {
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${API_KEY}`;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            signal: controller.signal
        });

        const responseText = await response.text();
        let payload;
        try { payload = responseText ? JSON.parse(responseText) : {}; } catch { payload = {}; }

        if (!response.ok || payload?.error) {
            throw parseGeminiError(response.status || 500, payload, response.statusText);
        }

        const aiResponseText = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!aiResponseText) {
            const error = new Error('Gemini non ha restituito contenuto valido.');
            error.statusCode = 502;
            error.retryable = false;
            throw error;
        }

        const jsonText = extractJsonObject(aiResponseText);
        const parsed = JSON.parse(jsonText);

        return {
            food: parsed.food,
            grams: Number(parsed.grams) || 0,
            calories: Number(parsed.calories) || 0,
            protein: Number(parsed.protein) || 0,
            carbs: Number(parsed.carbs) || 0,
            fat: Number(parsed.fat) || 0,
            error: parsed.error
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            const timeoutError = new Error(`Timeout Gemini oltre ${GEMINI_TIMEOUT_MS}ms.`);
            timeoutError.statusCode = 504;
            timeoutError.retryable = true;
            throw timeoutError;
        }
        if (typeof error.retryable !== 'boolean') error.retryable = false;
        if (!error.statusCode) error.statusCode = 500;
        throw error;
    } finally {
        clearTimeout(timeoutHandle);
    }
};

const callGeminiWithRetry = async (prompt) => {
    let lastError;
    for (const model of GEMINI_MODELS) {
        for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt += 1) {
            try {
                if (attempt > 1) console.log(`Retry modello ${model} (tentativo ${attempt}/${GEMINI_MAX_RETRIES})`);
                return await callGeminiModel(model, prompt);
            } catch (error) {
                lastError = error;
                console.error(`Errore Gemini su ${model} (tentativo ${attempt}/${GEMINI_MAX_RETRIES}):`, error.message);
                if (!error.retryable) break;
                if (attempt < GEMINI_MAX_RETRIES) {
                    await sleep(Math.min(1500 * attempt, 4000));
                }
            }
        }
    }
    throw lastError || new Error('Richiesta Gemini fallita senza dettagli.');
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return reply(405, { error: 'Method not allowed' });
    }

    let parsedBody = {};
    try { parsedBody = JSON.parse(event.body || '{}'); } catch { parsedBody = {}; }

    const { meal, quantity, quantityType } = parsedBody;
    console.log(`--- Richiesta: ${quantity} ${quantityType} di ${meal} ---`);

    if (!API_KEY) {
        return reply(500, { error: 'GEMINI_API_KEY mancante nel backend.' });
    }

    const numericQuantity = Number(quantity);
    const cleanedMeal = String(meal || '').trim();
    const cleanedQuantityType = String(quantityType || '').trim();

    if (!cleanedMeal || !Number.isFinite(numericQuantity) || numericQuantity <= 0 || !cleanedQuantityType) {
        return reply(400, { error: 'Input non valido. Controlla meal, quantity e quantityType.' });
    }

    if (isClearlyInvalidMeal(cleanedMeal)) {
        return reply(400, { error: 'invalid_food' });
    }

    const requestKey = buildRequestKey(cleanedMeal, numericQuantity, cleanedQuantityType);
    const cached = responseCache.get(requestKey);
    if (cached && cached.expiresAt > Date.now()) {
        console.log(`Cache hit: ${requestKey}`);
        return reply(200, cached.data);
    }

    if (inFlightRequests.has(requestKey)) {
        console.log(`Deduplica richiesta in corso: ${requestKey}`);
        try {
            const inFlightData = await inFlightRequests.get(requestKey);
            return reply(200, inFlightData);
        } catch (error) {
            return reply(error.statusCode || 500, { error: error.message });
        }
    }

    try {
        const quantityDesc = getQuantityDescription(numericQuantity, cleanedQuantityType);
        const prompt = buildPrompt(cleanedMeal, quantityDesc);

        const requestPromise = callGeminiWithRetry(prompt);
        inFlightRequests.set(requestKey, requestPromise);

        const finalData = await requestPromise;

        if (finalData?.error === 'invalid_food') {
            return reply(400, { error: 'invalid_food' });
        }

        responseCache.set(requestKey, { data: finalData, expiresAt: Date.now() + CACHE_TTL_MS });
        console.log(`--- Risposta inviata: ${JSON.stringify(finalData)} ---`);
        return reply(200, finalData);
    } catch (error) {
        console.error('Errore nella function:', error.message);
        const statusCode = error.statusCode || 500;
        if (statusCode === 429 || statusCode === 503 || statusCode === 504) {
            return reply(503, { error: 'Servizio AI temporaneamente sovraccarico. Riprova tra pochi secondi.' });
        }
        if (statusCode === 401 || statusCode === 403) {
            return reply(502, { error: 'Chiave API Gemini non valida o senza permessi.' });
        }
        return reply(statusCode, { error: error.message || "Errore durante l'analisi del cibo." });
    } finally {
        inFlightRequests.delete(requestKey);
    }
};
