const express = require('express');
const cors = require('cors');
require('dotenv').config();
 
const app = express();
app.use(cors());
app.use(express.json());
 
const API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
 
app.post('/api/analyze', async (req, res) => {
    const { meal, quantity, quantityType } = req.body;
    console.log(`--- Richiesta ricevuta: ${quantity} ${quantityType} di ${meal} ---`);
 
    // Determina la descrizione della quantità
    let quantityDesc;
    if (quantityType === 'grams') {
        quantityDesc = `${quantity}g`;
    } else if (quantityType === 'unit') {
        quantityDesc = `${quantity} unità`;
    } else if (quantityType === 'teaspoon') {
        quantityDesc = `${quantity} cucchiaino`;
    } else if (quantityType === 'tablespoon') {
        quantityDesc = `${quantity} cucchiaio`;
    } else {
        quantityDesc = `${quantity} ${quantityType}`;
    }
 
    // --- PROMPT AGGIORNATO PER VALIDAZIONE ALIMENTI E QUANTITÀ ---
    const prompt = `Agisci come un database nutrizionale scientifico e certificato.
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
 
    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });
 
        const data = await response.json();
 
        // Se Google ci risponde con un errore (es. chiave sbagliata)
        if (data.error) {
            console.error("Errore da Google:", data.error.message);
            return res.status(500).json({ error: data.error.message });
        }
 
        // Estraiamo il testo dalla risposta di Gemini
        const aiResponseText = data.candidates[0].content.parts[0].text;
       
        // Puliamo il testo (rimuoviamo eventuali ```json)
        const cleanJsonText = aiResponseText.replace(/```json|```/g, "").trim();
        const finalData = JSON.parse(cleanJsonText);
 
        console.log("Risposta ottenuta con successo:", finalData);
        console.log(`--- Risposta inviata: ${JSON.stringify(finalData)} ---`);
        res.json(finalData);
 
    } catch (error) {
        console.error("Errore nel server:", error.message);
        res.status(500).json({ error: "Errore durante l'analisi del cibo." });
    }
});
 
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server in ascolto sulla porta ${PORT}`);
    console.log(`API Gemini pronta per l'analisi dei pasti.`);
});