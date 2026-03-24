require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

async function checkModels() {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`;
    try {
        // Usiamo il fetch nativo di Node 22
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            console.error("Errore API:", data.error.message);
            return;
        }

        console.log("--- MODELLI DISPONIBILI PER TE ---");
        data.models.forEach(m => {
            console.log(`> ${m.name.replace('models/', '')}`);
        });
        console.log("----------------------------------");
    } catch (e) {
        console.error("Errore di connessione:", e.message);
    }
}

checkModels();