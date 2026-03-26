const express = require('express');
const cors = require('cors');
require('dotenv').config();
 
const app = express();
app.use(cors());
app.use(express.json());
 
const API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
 
app.post('/api/analyze', async (req, res) => {
    const { meal, grams } = req.body;
    console.log(`--- Richiesta reale per: ${grams}g di ${meal} ---`);
 
    // --- PROMPT AGGIORNATO PER VALIDAZIONE ALIMENTI ---
    const prompt = `Agisci come un database nutrizionale scientifico e certificato.
    Analizza esattamente ${grams}g di "${meal}".

    PRIMA DI TUTTO: Verifica se "${meal}" è un alimento reale e commestibile.
    - Se NON è un cibo (es. "ciao", "test", "123", parole senza senso, o non commestibili), rispondi ESCLUSIVAMENTE con: {"error": "invalid_food"}
    - Se è un cibo valido, procedi con l'analisi nutrizionale.

    REGOLE RIGIDE per alimenti validi:
    1. Usa esclusivamente valori medi standard tratti da tabelle nutrizionali ufficiali (es. USDA).
    2. Sii estremamente deterministico: per lo stesso alimento e lo stesso peso, devi fornire SEMPRE gli stessi valori ogni volta che ti viene chiesto.
    3. Non aggiungere variazioni "creative". Se l'alimento è un ingrediente puro (es. Yogurt Greco), usa il valore standard per 100g e rapportalo a ${grams}g.
    4. Rispondi ESCLUSIVAMENTE con questo oggetto JSON puro:
    {"food": "${meal}", "calories": num, "protein": num, "carbs": num, "fat": num}.
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
        res.json(finalData);
 
    } catch (error) {
        console.error("Errore nel server:", error.message);
        res.status(500).json({ error: "Errore durante l'analisi del cibo." });
    }
});
 
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server in ascolto sulla porta ${PORT}`);
    console.log(`API Gemini pronta per l'analisi dei pasti.`);
});