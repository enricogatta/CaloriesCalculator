---
name: Design System — CaloriesCalculator
description: >-
  Design system e convenzioni del progetto CaloriesCalculator (diario calorie React + Supabase +
  Groq). Usala quando crei o modifichi componenti, pagine o stili in questo repository: elenca i
  componenti già disponibili in app/src/components/ (Button, IconButton, FormField, Select,
  SegmentedControl, ChoiceGroup, Card, ProgressBar, EmptyState, Skeleton, BaseModal, ConfirmModal,
  NoticeModal, PageTitle, TabBar, FoodAutocomplete…), i token reali di index.css, useDialog al posto
  di confirm/alert, le convenzioni di naming e la struttura del database. Consultala prima di creare
  qualsiasi componente nuovo.
---

# Design System — CaloriesCalculator

Documenta **questo** progetto. Le regole generali di qualità visiva stanno nella skill personale
`ui-ux-pro` e non vanno ripetute qui.

> Generato da `/skill-bootstrap` il 2026-10-27. Rilancia il comando se le convenzioni cambiano.

---

## Stack

| Ambito | Cosa usa questo progetto |
|---|---|
| Framework | React 19.2 + Vite 8, React Compiler (`babel-plugin-react-compiler` via `@rolldown/plugin-babel`) |
| Linguaggio | JavaScript (`.jsx` / `.js`), nessun TypeScript |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite`, configurazione CSS-first in `app/src/index.css` (nessun `tailwind.config.js`) |
| Componenti | Nessuna libreria: tutto custom in `app/src/components/` |
| Icone | `lucide-react` |
| Routing | `react-router` 7: `BrowserRouter` + `Routes` in `App.jsx` |
| Stato | Context API (Auth, Theme, Data, Dialog) + stato locale; nessuna libreria di stato |
| Dati | `@supabase/supabase-js` 2 con publishable key + RLS, chiamate in `src/services/` |
| Backend | `app/netlify/functions/` (Functions v2, ESM), validazione con `zod` |
| Deploy | Netlify, `netlify.toml` in root con `base = "app"` |

## Struttura

```
app/
├── index.html · vite.config.js (CSP in build) · eslint.config.js · package.json (unico)
├── public/          theme-init.js · manifest.webmanifest · favicon.svg · icons/
├── netlify/functions/
│   ├── analyze.js
│   └── _shared/supabase.js
└── src/
    ├── main.jsx · App.jsx · index.css
    ├── pages/        DiarioPage · StatistichePage · AlimentiPage · ObiettiviPage · ImpostazioniPage · LoginPage
    ├── components/
    │   ├── ui/       primitive riusabili
    │   ├── modals/   BaseModal e derivati
    │   ├── layout/   AppShell, TabBar, PageTitle, SplashScreen
    │   ├── diary/    stats/    foods/    goals/   (componenti di una sola pagina)
    ├── context/      solo i Provider
    ├── hooks/        context + hook, hook di dominio
    ├── services/     accesso a Supabase e alla Function
    └── utils/        funzioni pure
docs/schema.sql · docs/migrations/
```

Tutte le cartelle sono minuscole (su Windows un cambio di sole maiuscole va fatto passando da un nome temporaneo).

## Token

Definiti in `app/src/index.css`: CSS variables su `:root` (light), override sotto `.dark`, esposte a
Tailwind con `@theme inline`.

| Token CSS | Light | Dark | Classe Tailwind |
|---|---|---|---|
| `--surface` | `#f2f2f7` | `#000000` | `bg-surface` |
| `--surface-raised` | `#ffffff` | `#1c1c1e` | `bg-surface-raised` |
| `--surface-sunken` | `#e9e9ee` | `#2c2c2e` | `bg-surface-sunken` |
| `--text` | `#000000` | `#ffffff` | `text-content` |
| `--text-muted` | `#6c6c70` | `#98989f` | `text-content-muted` |
| `--text-subtle` | `#8e8e93` | `#8e8e93` | `text-content-subtle` |
| `--border` | `#e5e5ea` | `#38383a` | `border-line` |
| `--border-strong` | `#d1d1d6` | `#48484a` | `border-line-strong` |
| `--accent` | `#0071e3` | `#0071e3` | `bg-accent` (riempimento bottoni) |
| `--accent-hover` | `#0062c4` | `#0062c4` | `bg-accent-hover` |
| `--accent-fg` | `#ffffff` | `#ffffff` | `text-accent-fg` |
| `--accent-text` | `#0066cc` | `#409cff` | `text-accent-text` (testo e icone in accento, focus ring) |
| `--danger` | `#d70015` | `#ff453a` | `text-danger`, `bg-danger` |
| `--danger-fill` | `#d70015` | `#d70015` | `bg-danger-fill` (bottone distruttivo) |
| `--warning` | `#b25000` | `#ff9f0a` | `text-warning` |
| `--success` | `#1e7b34` | `#30d158` | `text-success` |
| `--macro-protein` | `#6250d6` | `#9085e9` | `bg-macro-protein` |
| `--macro-carbs` | `#eb6834` | `#d95926` | `bg-macro-carbs` |
| `--macro-fat` | `#1baf7a` | `#199e70` | `bg-macro-fat` |
| `--glass-bg` / `-border` / `-highlight` / `-shadow` | bianco 64% | grigio 62% | usati dall'utility `glass` |
| `--glass-active` | nero 7% | nero 50% | `bg-glass-active` (voce attiva della tab bar) |
| `--scrim` | nero 32% | nero 55% | `bg-scrim` (velo dei modali) |
| `--tabbar-height` | `4rem` | — | usato da `pb-tabbar` |

| Altro | Valore |
|---|---|
| `--radius-md` / `-lg` / `-xl` | `0.75rem` / `1.25rem` / `1.75rem` (input / card / modali) |
| `--font-sans` | stack di sistema (`-apple-system`, SF Pro Text, Segoe UI, Roboto…) |
| Animazioni | `animate-sheet-in` (260ms), `animate-fade-in` (200ms), `animate-pop-in` (200ms) |
| Utility custom | `glass`, `pt-safe`, `pb-safe-6`, `pb-tabbar`, `bottom-tabbar`, `max-h-sheet`, `min-h-screen-dvh`, `h-page` (altezza fra header e tab bar, per liste che scorrono al proprio interno) |

Contrasti verificati annotati in testa a `index.css`. Palette dei macro validata con la skill
`dataviz` (CVD all-pairs, entrambi i temi); le kcal non hanno colore proprio (usano `bg-content`).

**Tema:** light di default su `:root`, dark con classe `.dark` su `<html>` (`@custom-variant dark`).
Scelta chiaro/scuro/sistema in localStorage `cc-theme`: applicata prima del paint da
`public/theme-init.js`, poi gestita da `ThemeProvider`.

**Tipografia osservata:** titolo di pagina `text-4xl font-bold` (solo in `PageTitle`), titoli di card
e modali `text-base`/`text-xl font-semibold`, testo `text-base`, metadati e label `text-sm`, etichette
della tab bar `text-xs`. Pesi: normal, semibold, bold (solo titolo di pagina).

## Componenti disponibili

**Consulta questa tabella prima di creare qualsiasi componente nuovo.** "Usi" = file che lo importano.

| Componente | File | A cosa serve | Varianti / props principali | Usi |
|---|---|---|---|---|
| `Button` | `components/ui/Button.jsx` | Bottone a capsula con stato loading a larghezza fissa | `variant`: primary, secondary, ghost, danger, danger-ghost · `size`: md (44px), lg (56px) · `loading`, `fullWidth`, `icon` | 11 |
| `Card` | `components/ui/Card.jsx` | Superficie piena `rounded-lg bg-surface-raised`, senza bordo né ombra | `as` (predefinito `section`) | 7 |
| `FormField` | `components/ui/FormField.jsx` | Label + campo + hint o errore con id e aria collegati | `label` (anche nodo), `hint`, `error`, children = funzione `(fieldProps) => campo` | 5 |
| `inputClass(error)` | `components/ui/fieldStyles.js` | Classi condivise di input/select/autocomplete (16px, 44px, stato errore) | `error` | 6 file |
| `PageTitle` | `components/layout/PageTitle.jsx` | Intestazione di pagina: sopratitolo, titolo con parte in accento, descrizione | `eyebrow`, `title`, `accent`, `description` | 5 |
| `IconButton` | `components/ui/IconButton.jsx` | Bottone tondo 44px con sola icona; `label` → aria-label | `variant`: glass, plain, danger · `to` per renderlo Link | 4 |
| `EmptyState` | `components/ui/EmptyState.jsx` | Lista vuota o errore di caricamento con azione | `icon`, `title`, `description`, `action`, `tone`: default, danger | 4 |
| `BaseModal` | `components/modals/BaseModal.jsx` | Guscio di ogni modale: foglio dal basso su mobile, centrato da `sm`, portal, focus trap, Esc, scroll lock, stack di modali | `isOpen`, `onClose`, `title`, `description`, `footer`, `initialFocusRef`, `dismissible` | 4 |
| `Skeleton` | `components/ui/Skeleton.jsx` | Segnaposto di caricamento con la forma del contenuto | `className` | 3 |
| `SegmentedControl` | `components/ui/SegmentedControl.jsx` | Scelta fra 2–3 opzioni brevi, capsula che scorre, frecce da tastiera | `options`, `value`, `onChange`, `label` | 3 |
| `Select` | `components/ui/Select.jsx` | Select nativa con freccia del tema | `error` + props di `<select>` | 2 |
| `ProgressBar` | `components/ui/ProgressBar.jsx` | Avanzamento verso un obiettivo; oltre il 100% diventa `bg-danger` | `value`, `max`, `colorClass`, `label` | 2 |
| `ChoiceGroup` | `components/ui/ChoiceGroup.jsx` | Scelta singola con etichette lunghe (2 colonne su mobile) | `options`, `value`, `onChange`, `labelledBy` | 1 |
| `ConfirmModal` | `components/modals/ConfirmModal.jsx` | "Sei sicuro?" — usato tramite `useDialog().confirm` | `title`, `message`, `confirmLabel`, `cancelLabel`, `tone` | 1 |
| `NoticeModal` | `components/modals/NoticeModal.jsx` | Avviso a un tasto — usato tramite `useDialog().notice` | `title`, `message`, `buttonLabel` | 1 |
| `AppShell` | `components/layout/AppShell.jsx` | Header traslucido + `Outlet` + TabBar; gate su `useData().status` | — | 1 |
| `TabBar` | `components/layout/TabBar.jsx` | Tab bar flottante `glass` con 4 sezioni | — | 1 |
| `SplashScreen` | `components/layout/SplashScreen.jsx` | Schermata durante la verifica della sessione | — | 1 |
| `FoodAutocomplete` | `components/diary/FoodAutocomplete.jsx` | Campo alimento con suggerimenti dalla libreria; menu in portal con logica iOS (visualViewport, tap vs scroll) | `value`, `onValueChange`, `onSelect`, `foods`, `fieldProps`, `error`, `inputRef` | 1 |
| `FoodFormModal` | `components/diary/FoodFormModal.jsx` | Aggiunta/modifica di un piatto con anteprima valori | `mode`, `initial`, `lockCategory`, `foods`, `onSubmit` | 1 |
| `WeekStrip` | `components/diary/WeekStrip.jsx` | Settimana con pallini sui giorni registrati + date picker nativo | `selectedDate`, `onChange`, `loggedDates` | 1 |
| `DailySummary` | `components/diary/DailySummary.jsx` | Totali del giorno contro obiettivi | `totals`, `goals` | 1 |
| `MealCard` / `DishRow` | `components/diary/` | Card di un pasto e riga di un piatto | callback `onAddDish`, `onEditDish`, `onDeleteDish`, `onDeleteCard` | 1 |
| `CaloriesChart` | `components/stats/CaloriesChart.jsx` | Colonne kcal con linea obiettivo, valore al tap, vista tabella | `bars`, `goal`, `groupByWeek`, `average` | 1 |
| `MacroAverages` | `components/stats/MacroAverages.jsx` | Media macro contro obiettivi | `averages`, `goals`, `loggedDayCount` | 1 |
| `FoodRow` / `FoodEditModal` | `components/foods/` | Riga della libreria e modale crea/modifica alimento | `food`, `onSubmit`, `onDelete` | 1 |
| `GoalField` | `components/goals/GoalField.jsx` | Campo intero con unità a destra | `label`, `unit`, `dotClass`, `value`, `onChange`, `error` | 1 |

### Hook

| Hook | File | A cosa serve |
|---|---|---|
| `useAuth` | `hooks/useAuth.js` | `{ user, loading, signOut }` (contesto + hook nello stesso file) |
| `useTheme` | `hooks/useTheme.js` | `{ preference, isDark, setPreference }` |
| `useData` | `hooks/useData.js` | `{ foods, goals, status, refreshToken, refreshAll, setGoals, upsertFoodLocal, removeFoodLocal }` |
| `useDialog` | `hooks/useDialog.js` | `confirm(options)` → Promise<boolean>, `notice(options)` — **al posto di `window.confirm`/`alert`** |
| `useDiary` | `hooks/useDiary.js` | Pasti di un giorno (cache per data) + `saveDish`, `deleteDish`, `deleteCard`, `clearDay` |
| `useStats` | `hooks/useStats.js` | Barre per giorno/settimana e medie dei macro per 7/30/90 giorni |

### Context (solo Provider)

`context/AuthContext.jsx` · `ThemeContext.jsx` · `DataContext.jsx` (montato con `key={user.id}`, ricarica
quando l'app torna in primo piano dopo 60s) · `DialogContext.jsx` (monta un ConfirmModal e un NoticeModal).

### Servizi e utility

| Modulo | File | A cosa serve |
|---|---|---|
| `supabase` | `services/supabaseClient.js` | Client unico (publishable key) |
| `analyzeFood` | `services/analyzeApi.js` | POST `/api/analyze` con JWT, deduplica richieste uguali, errori `{ code, message }` |
| foods | `services/foodsService.js` | `getFoods`, `upsertFood`, `createFood`, `updateFood`, `deleteFood`, `countFoodUsage`, `recalculateFoodItems` |
| meals | `services/mealsService.js` | `getMealCardsByDate` (raggruppa per categoria), `getLoggedDates`, `getDailyTotals`, `createMeal`, `addMealItem`, `updateMealItem`, `deleteMealItem`, `deleteMeals`, `deleteMealsByDate` |
| goals | `services/goalsService.js` | `getGoals`, `saveGoals` (upsert su `user_id`) |
| profile | `services/profileService.js` | `hasAiApiKey` (RPC), `saveAiApiKey`, `removeAiApiKey` (chiave Groq) |
| dates | `utils/dates.js` | Date locali `'YYYY-MM-DD'`: `toDateStr`, `parseDateStr`, `todayStr`, `addDays`, `startOfWeek`, `dateRange`, formatter italiani |
| nutrition | `utils/nutrition.js` | Costanti (`MEAL_CATEGORIES`, `QUANTITY_TYPES`, `UNIT_LABELS`, `PER_LABELS`, `MACROS`, `DEFAULT_GOALS`) e calcoli (`findFood`, `portionFromFood`, `perUnitFromAnalysis`, `sumMacros`, `formatNumber`, `formatInteger`) |
| scrollLock | `utils/scrollLock.js` | Blocco scroll compatibile iOS con contatore per modali annidati |
| storage | `utils/storage.js` | `readStorage` / `writeStorage` con try/catch |

## Database

Da `docs/schema.sql` (aggiornato al 2026-10-27).

| Tabella | Colonne principali | RLS | Policy |
|---|---|---|---|
| `profiles` | id, display_name, ai_api_key, created_at | ✅ | select/insert/update propri; `ai_api_key` non leggibile da `anon`/`authenticated` (column privileges) |
| `goals` | user_id (unique), calories, protein, carbs, fat | ✅ | select/insert/update/delete propri |
| `meals` | user_id, category, date | ✅ | select/insert/update/delete propri |
| `foods` | user_id, name, default_quantity_type, *_per_unit, grams_per_unit | ✅ | select/insert/update/delete propri |
| `meal_items` | meal_id, food_id, quantity, quantity_type, grams, calories, protein, carbs, fat, position | ✅ | tramite `meals` dell'utente; insert/update verificano anche il cibo |

**Relazioni:** `profiles/goals/meals/foods.user_id → auth.users` (cascade) · `meal_items.meal_id → meals`
(cascade) · `meal_items.food_id → foods` (**restrict**).

**Funzioni:** `handle_new_user()` (trigger al signup) · `has_ai_api_key()` (security definer) ·
`recalculate_food_items(uuid)` (security invoker).

**Regola:** quando modifichi tabelle, colonne o policy, aggiorna `docs/schema.sql` e aggiungi una
migrazione `docs/migrations/YYYY-MM-DD_nome.sql` nello stesso intervento.

## Netlify Functions

| Function | File | Metodo | Cosa fa | Auth richiesta |
|---|---|---|---|---|
| `analyze` | `app/netlify/functions/analyze.js` | POST | Valori nutrizionali di una porzione da un modello su Groq | Sì: JWT Supabase verificato, 401 altrimenti |

Codice condiviso in `netlify/functions/_shared/supabase.js` (`getAdmin`, `getUser`, `json`, `log`).
Errori al client come `{ error: <codice>, message: <testo> }`.

## Convenzioni in uso

- **File componente:** `PascalCase.jsx`; pagine `XxxPage.jsx`; moduli non componenti in camelCase (`fieldStyles.js`, `mealsService.js`).
- **Export:** named (`export function`) ovunque; unica eccezione `App.jsx` (default).
- **Commenti:** blocco JSDoc in testa a ogni componente con le props.
- **Import alias:** nessuno, percorsi relativi.
- **Context:** oggetto context + hook in `hooks/useX.js`, Provider in `context/XContext.jsx`.
- **Service:** funzioni `async` che restituiscono `{ data, error }`, niente throw.
- **Modali con form:** montati solo quando servono (`{state && <XModal … />}`) così lo stato riparte pulito.
- **Lingua:** codice in inglese per i nomi, commenti e testi UI in italiano; commit in italiano.
- **Stile:** niente punto e virgola, apici singoli.
- **Gestione errori:** validazione vicino al campo (`FormField error`), errori di operazione con `useDialog().notice`, errori di caricamento con `EmptyState tone="danger"`.
- **Data fetching:** `useEffect` con flag `cancelled` e stato derivato da una chiave (niente `setState` sincrono negli effect: lo vieta il lint del React Compiler).
- **Stili inline:** solo per valori dinamici (percentuali delle barre, `translateX` delle capsule, posizione del menu autocomplete).

## Incoerenze rilevate

| Cosa | Dove | Nota |
|---|---|---|
| Box messaggio errore/successo scritto a mano più volte (`rounded-md bg-danger/10 p-4 text-sm text-danger` + icona in `h-5`) | `diary/FoodFormModal.jsx`, `foods/FoodEditModal.jsx`, `pages/LoginPage.jsx` (2), `pages/DiarioPage.jsx` | Manca un componente condiviso (es. `InlineMessage`) |
| Input con unità a destra ripetuto | `goals/GoalField.jsx`, `foods/FoodEditModal.jsx` (2 volte) | Stesso markup `relative` + span assoluto |
| Bottoni testuali e righe-bottone con classi scritte a mano invece di `Button` | `diary/MealCard.jsx` ("Aggiungi a…"), `diary/WeekStrip.jsx` ("Oggi"), `diary/DishRow.jsx`, `foods/FoodRow.jsx` | Stati (hover/active/focus) ricopiati a mano |
| Link con l'aspetto di `Button secondary` | `pages/StatistichePage.jsx` ("Vai al diario") | `Button` non supporta il rendering come `Link` (`IconButton` sì, con `to`) |
| Navigazione da tastiera del radiogroup duplicata | `ui/SegmentedControl.jsx`, `ui/ChoiceGroup.jsx` | Stessa `onKeyDown` |
| Valore arbitrario `transition-[background-color,color,transform]` | `ui/Button.jsx`, `ui/IconButton.jsx` | Unici valori arbitrari in `src/` |
| Colori del tema duplicati in JS | `context/ThemeContext.jsx`, `public/theme-init.js` | Voluto (theme-init gira prima di React): vanno tenuti allineati a mano |

## Da decidere

- [ ] Nessun test automatico (né unit né end-to-end).
- [ ] `meals`: nessun vincolo unique su (user_id, date, category) e nessun check su `category`: i duplicati sono assorbiti nel frontend (`getMealCardsByDate` li raggruppa).
- [ ] `foods.default_quantity_type` e `meal_items.quantity_type` senza check sui 4 valori ammessi.
- [ ] Naming delle Netlify Functions: c'è una sola function (`analyze.js`), convenzione non deducibile.
- [ ] Nessun alias di import (`@/`).
- [ ] Nessun rate limiting su `/api/analyze` (scelta consapevole: la chiave di riserva vale solo per `AI_FALLBACK_USER_ID`).
- [ ] Nessun service worker: offline e avviso di aggiornamento non gestiti.
- [ ] Bundle JS unico da ~530 kB (159 kB gzip): nessun code splitting delle pagine.
