const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;
// Usiamo l'endpoint v1 stabile, non v1beta che ti dava errore
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

app.post('/api/analyze', async (req, res) => {
    const { meal, grams } = req.body;
    console.log(`--- Richiesta reale per: ${grams}g di ${meal} ---`);

    const prompt = `Analizza ${grams}g di ${meal}. 
    Rispondi esclusivamente con un oggetto JSON: 
    {"food": "${meal}", "calories": num, "protein": num, "carbs": num, "fat": num}. 
    Usa numeri puri, non stringhe. Niente testo extra.`;

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
    console.log(`🔑 Chiave caricata: ${API_KEY ? "SÌ" : "NO"}`);
});