# CaloriesCalculator — Contesto Progetto per Claude

## Cos'è questo progetto

Web app per tracciare calorie e macronutrienti giornalieri. L'utente inserisce un alimento, la quantità e il tipo di unità; l'app chiama Google Gemini AI per ottenere i valori nutrizionali e li salva su Supabase. Supporta più giorni (navigazione date), categorie pasto (Colazione/Pranzo/Cena/Spuntino) e obiettivi macro personalizzati.

**URL produzione:** https://caloriescalculatorenri.netlify.app  
**Supabase project:** bfoslaydcsffzruubwrx.supabase.co  
**Repository GitHub:** enricogatta/CaloriesCalculator  
**Branch principale:** main  

---

## Stack tecnologico

| Layer | Tecnologia |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Backend | Netlify Functions (Node.js, CommonJS) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email + password) |
| AI | Google Gemini 2.5 Flash / 2.0 Flash |
| Deploy | Netlify (frontend + functions insieme) |

---

## Struttura file

```
CaloriesCalculator/
├── CLAUDE.md                          ← questo file
├── netlify.toml                       ← config build + redirect /api/* → functions
├── docs/
│   └── schema.sql                     ← schema DB Supabase completo (stato target)
├── netlify/
│   └── functions/
│       └── analyze.js                 ← unico endpoint backend (migrato da Express)
└── frontend/
    ├── .env.local                     ← variabili locali (NON committato)
    ├── public/
    │   ├── _redirects                 ← SPA fallback: /* → /index.html 200
    │   ├── icona.png
    │   └── manifest.json
    └── src/
        ├── main.jsx                   ← entry point → renderizza <AppRoot />
        ├── App.jsx                    ← logica principale (681 righe)
        ├── AppRoot.jsx                ← auth guard: mostra AuthPage o App
        ├── supabaseClient.js          ← client Supabase (legge da env vars)
        ├── hooks/
        │   └── useAuth.js             ← hook sessione: user, authLoading, signOut
        └── components/
            ├── Auth/
            │   └── AuthPage.jsx       ← UI login + registrazione (dark theme)
            ├── Calculator/
            │   ├── DayCard.jsx        ← vista giornaliera con navigazione date
            │   └── MealSection.jsx    ← card singolo pasto con lista piatti
            ├── Layout/
            │   └── Sidebar.jsx        ← menu laterale + logout + email utente
            ├── Modals/
            │   └── DishModal.jsx      ← modale aggiungi/modifica piatto
            └── UI/
                ├── EditableStatCard.jsx
                ├── LoadingScreen.jsx
                ├── NutrientBadge.jsx
                └── StatCard.jsx
```

---

## Architettura e flusso dati

```
Browser (React)
  │
  ├── Supabase Auth → sessione JWT gestita da useAuth.js
  │
  ├── POST /api/analyze → netlify.toml redirect → /.netlify/functions/analyze
  │     └── analyze.js chiama Google Gemini REST API
  │         └── ritorna { food, grams, calories, protein, carbs, fat }
  │
  └── Supabase JS client (diretto dal browser, con anon key + RLS)
        ├── meals: SELECT/INSERT/UPDATE/DELETE filtrati per user_id
        └── goals: SELECT/UPSERT filtrati per user_id
```

**Nota importante:** Il frontend chiama `/api/analyze` come URL relativo. Il `netlify.toml` ha un redirect che mappa `/api/*` → `/.netlify/functions/:splat`. In locale si usa `netlify dev` (porta 8888) che gestisce sia il frontend Vite che le functions.

---

## Schema database Supabase (stato target post-migrazione)

### `auth.users` — gestita da Supabase, non toccare

### `public.profiles`
```sql
id uuid PRIMARY KEY references auth.users(id) ON DELETE CASCADE
display_name text
created_at timestamptz DEFAULT now()
```
- Creata automaticamente al signup dal trigger `on_auth_user_created`
- RLS: ogni utente vede/modifica solo il proprio profilo

### `public.goals`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id uuid UNIQUE NOT NULL references auth.users(id) ON DELETE CASCADE
calories integer DEFAULT 2000
protein integer DEFAULT 150
carbs integer DEFAULT 250
fat integer DEFAULT 70
updated_at timestamptz DEFAULT now()
```
- Una riga per utente (vincolo UNIQUE su user_id)
- Sostituisce il vecchio singleton con `id=1`
- RLS: ogni utente vede/modifica solo i propri obiettivi
- Upsert con `onConflict: 'user_id'`

### `public.meals`
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id uuid NOT NULL references auth.users(id)  -- era nullable prima della migrazione
category text   -- 'Colazione' | 'Pranzo' | 'Cena' | 'Spuntino'
dishes jsonb    -- array di oggetti piatto (vedi sotto)
date date
created_at timestamptz DEFAULT now()
```
- RLS: ogni utente vede/modifica solo i propri pasti
- Index: `meals_user_date_idx on (user_id, date)`

**Struttura oggetto in `dishes[]`:**
```json
{
  "id": 1234567,
  "food": "Pasta",
  "grams": 80,
  "quantityType": "grams",
  "quantity": 80,
  "calories": 280,
  "protein": 10,
  "carbs": 56,
  "fat": 1.2,
  "caloriesPerUnit": 3.5,
  "proteinPerUnit": 0.125,
  "carbsPerUnit": 0.7,
  "fatPerUnit": 0.015
}
```

---

## Variabili d'ambiente

### `frontend/.env.local` (sviluppo locale, NON committato)
```
VITE_SUPABASE_URL=https://bfoslaydcsffzruubwrx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_5dyc2h0B0oGZqZONwmIJPw_-3jQ4OiV
# VITE_API_URL=http://localhost:5000  ← solo se usi il vecchio express, non netlify dev
```

### Netlify dashboard (produzione)
```
VITE_SUPABASE_URL=https://bfoslaydcsffzruubwrx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_5dyc2h0B0oGZqZONwmIJPw_-3jQ4OiV
GEMINI_API_KEY=AIzaSyA43AZg9clYdWkS1pE8JHhP3DmTGKbXjdw  ← secret
```

**Regola critica:** Non usare mai il prefisso `VITE_` per la `GEMINI_API_KEY` o qualsiasi segreto server-side — Vite inietterebbe il valore nel bundle del browser.

---

## Modifiche effettuate nella sessione del 2026-06-11

### Problema 1: Cold-start Render → Netlify Functions
- **Eliminato:** `backend/` (Express su Render)
- **Creato:** `netlify/functions/analyze.js` — logica identica al vecchio Express, adattata al formato Netlify Function (`exports.handler = async (event) => { return { statusCode, headers, body } }`)
- **Creato:** `netlify.toml` con redirect `/api/*` → `/.netlify/functions/:splat` (il frontend non cambia le sue URL)
- La cache in-memory (Map con TTL 24h) persiste solo nell'istanza warm — comportamento accettabile

### Problema 2: Single-user → Multi-utente
- **`supabaseClient.js`:** sostituiti valori hardcodata con `import.meta.env.VITE_SUPABASE_URL/KEY`
- **`frontend/.env.local`:** creato con le variabili Supabase
- **`main.jsx`:** ora renderizza `<AppRoot />` invece di `<App />`
- **`AppRoot.jsx`:** nuovo wrapper che mostra `<AuthPage />` se non loggato, `<App />` se loggato
- **`hooks/useAuth.js`:** hook con `supabase.auth.onAuthStateChange`, espone `{ user, authLoading, signOut }`
- **`components/Auth/AuthPage.jsx`:** UI login + registrazione con tab switcher, dark theme coerente
- **`App.jsx`:**
  - Firma: `const App = ({ user, onSignOut }) => {`
  - `fetchLogs`: aggiunto `.eq('user_id', user.id)` + dependency `[user.id]`
  - `fetchGoals`: da `.eq('id', 1)` a `.eq('user_id', user.id)`, crea riga di default se assente
  - `saveGoalsToDB`: da `{ id: 1 }` a `{ user_id: user.id }`, `onConflict: 'user_id'`
  - `handleAddMeal`: aggiunto `user_id: user.id` nel nuovo card
  - `API_BASE_URL`: ora `import.meta.env.VITE_API_URL || ''` (URL relativo in produzione)
- **`Sidebar.jsx`:** aggiunto bottone logout (rosso) + visualizzazione email utente in fondo

### Documentazione
- **`docs/schema.sql`:** schema completo target con tutte le tabelle, RLS, trigger e indici

---

## Stato migrazioni Supabase

Le seguenti SQL devono essere eseguite manualmente in Supabase SQL Editor (in ordine):

- [x] Query 1: Crea tabella `profiles` + RLS
- [x] Query 2: Trigger `handle_new_user` (auto-crea profilo al signup)
- [x] Query 3: Drop + ricrea tabella `goals` come per-utente
- [ ] **Query 4: Aggiorna RLS di `meals`** ← DA FARE dopo aver assegnato i pasti esistenti

### Pasti esistenti con `user_id = null`
Dopo il primo login, copiare il proprio UUID da Supabase → Authentication → Users, poi:
```sql
update public.meals
set user_id = '<tuo-uuid>'
where user_id is null;
```
**Solo dopo questo step** applicare la Query 4 (RLS restrittiva su meals).

---

## Come avviare in locale

```bash
# Richiede: Node.js, Netlify CLI installata globalmente
npm install -g netlify-cli

cd frontend
npm install

# Dalla root del progetto:
netlify dev
# → Frontend su http://localhost:8888
# → Functions su http://localhost:8888/.netlify/functions/analyze
```

---

## Pattern di codice importanti

### Aggiunta pasto (App.jsx `handleAddMeal`)
1. Cerca il cibo già presente in `logs` (evita chiamata API) → `findExistingNutrients()`
2. Se trovato: ricalcola macro proporzionalmente ai valori per-unità salvati
3. Se nuovo: chiama `POST /api/analyze` → Gemini AI
4. Salva su Supabase in `meals` (aggiunge a card esistente o crea nuova)
5. Aggiorna state locale ottimisticamente

### Auth flow
```
AppRoot renders
  → useAuth.getSession() → se sessione: user = {...}, authLoading = false → render App
  → no sessione: user = null → render AuthPage
  → AuthPage.signInWithPassword() → onAuthStateChange fires → user aggiornato → render App
```

### Netlify Function analyze.js
- Legge `GEMINI_API_KEY` da `process.env`
- Prova modelli in ordine: `gemini-2.5-flash` → `gemini-2.0-flash`
- Cache in-memory con TTL 24h (persiste solo istanza warm)
- Deduplicazione richieste in-flight con Map di Promise
- Retry con backoff esponenziale su errori 429/5xx
