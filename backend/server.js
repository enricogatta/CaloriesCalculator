const express = require('express');
const cors = require('cors');
require('dotenv').config();
 
const app = express();
app.use(cors());
app.use(express.json());
 
const API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-2.0-flash')
    .split(',')
    .map(model => model.trim())
    .filter(Boolean);
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 15000);
const GEMINI_MAX_RETRIES = Number(process.env.GEMINI_MAX_RETRIES || 2);
const CACHE_TTL_MS = Number(process.env.NUTRITION_CACHE_TTL_MS || 24 * 60 * 60 * 1000);

const responseCache = new Map();
const inFlightRequests = new Map();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const buildRequestKey = (meal, quantity, quantityType) => {
    const normalizedMeal = String(meal || '').trim().toLowerCase();
    const normalizedQuantity = Number(quantity).toFixed(3);
    const normalizedQuantityType = String(quantityType || '').trim().toLowerCase();
    return `${normalizedMeal}|${normalizedQuantity}|${normalizedQuantityType}`;
};

const isClearlyInvalidMeal = (meal) => {
    const text = String(meal || '').trim();

    if (!text || text.length < 2) {
        return true;
    }

    if (!/[a-zA-Zàèéìòù]/.test(text)) {
        return true;
    }

    return false;
};

const getQuantityDescription = (quantity, quantityType) => {
    if (quantityType === 'grams') {
        return `${quantity}g`;
    }
    if (quantityType === 'unit') {
        return `${quantity} unità`;
    }
    if (quantityType === 'teaspoon') {
        return `${quantity} cucchiaino`;
    }
    if (quantityType === 'tablespoon') {
        return `${quantity} cucchiaio`;
    }
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
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            }),
            signal: controller.signal
        });

        const responseText = await response.text();
        let payload;

        try {
            payload = responseText ? JSON.parse(responseText) : {};
        } catch {
            payload = {};
        }

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

        if (typeof error.retryable !== 'boolean') {
            error.retryable = false;
        }
        if (!error.statusCode) {
            error.statusCode = 500;
        }

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
                if (attempt > 1) {
                    console.log(`Retry modello ${model} (tentativo ${attempt}/${GEMINI_MAX_RETRIES})`);
                }

                const data = await callGeminiModel(model, prompt);
                return data;
            } catch (error) {
                lastError = error;
                const isLastAttempt = attempt === GEMINI_MAX_RETRIES;

                console.error(`Errore Gemini su ${model} (tentativo ${attempt}/${GEMINI_MAX_RETRIES}):`, error.message);

                if (!error.retryable) {
                    break;
                }

                if (!isLastAttempt) {
                    const backoffMs = Math.min(1500 * attempt, 4000);
                    await sleep(backoffMs);
                }
            }
        }
    }

    throw lastError || new Error('Richiesta Gemini fallita senza dettagli.');
};
 
app.post('/api/analyze', async (req, res) => {
    const { meal, quantity, quantityType } = req.body || {};
    console.log(`--- Richiesta ricevuta: ${quantity} ${quantityType} di ${meal} ---`);

    if (!API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY mancante nel backend.' });
    }

    const numericQuantity = Number(quantity);
    const cleanedMeal = String(meal || '').trim();
    const cleanedQuantityType = String(quantityType || '').trim();

    if (!cleanedMeal || !Number.isFinite(numericQuantity) || numericQuantity <= 0 || !cleanedQuantityType) {
        return res.status(400).json({ error: 'Input non valido. Controlla meal, quantity e quantityType.' });
    }

    if (isClearlyInvalidMeal(cleanedMeal)) {
        return res.status(400).json({ error: 'invalid_food' });
    }

    const requestKey = buildRequestKey(cleanedMeal, numericQuantity, cleanedQuantityType);
    const cached = responseCache.get(requestKey);
    if (cached && cached.expiresAt > Date.now()) {
        console.log(`Cache hit: ${requestKey}`);
        return res.json(cached.data);
    }

    if (inFlightRequests.has(requestKey)) {
        console.log(`Deduplica richiesta in corso: ${requestKey}`);
        try {
            const inFlightData = await inFlightRequests.get(requestKey);
            return res.json(inFlightData);
        } catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
 
    try {
        const quantityDesc = getQuantityDescription(numericQuantity, cleanedQuantityType);
        const prompt = buildPrompt(cleanedMeal, quantityDesc);

        const requestPromise = callGeminiWithRetry(prompt);
        inFlightRequests.set(requestKey, requestPromise);

        const finalData = await requestPromise;

        if (finalData?.error === 'invalid_food') {
            return res.status(400).json({ error: 'invalid_food' });
        }

        responseCache.set(requestKey, {
            data: finalData,
            expiresAt: Date.now() + CACHE_TTL_MS
        });

        console.log("Risposta ottenuta con successo:", finalData);
        console.log(`--- Risposta inviata: ${JSON.stringify(finalData)} ---`);
        res.json(finalData);
    } catch (error) {
        console.error("Errore nel server:", error.message);
        const statusCode = error.statusCode || 500;
        if (statusCode === 429 || statusCode === 503 || statusCode === 504) {
            return res.status(503).json({ error: 'Servizio AI temporaneamente sovraccarico. Riprova tra pochi secondi.' });
        }

        if (statusCode === 401 || statusCode === 403) {
            return res.status(502).json({ error: 'Chiave API Gemini non valida o senza permessi.' });
        }

        return res.status(statusCode).json({ error: error.message || "Errore durante l'analisi del cibo." });
    } finally {
        inFlightRequests.delete(requestKey);
    }
});
 
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server in ascolto sulla porta ${PORT}`);
    console.log(`API Gemini pronta per l'analisi dei pasti.`);
});