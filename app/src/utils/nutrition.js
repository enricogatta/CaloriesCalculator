// Costanti e calcoli nutrizionali condivisi da diario, libreria alimenti e statistiche.

export const MEAL_CATEGORIES = ['Colazione', 'Pranzo', 'Cena', 'Spuntino']

export const QUANTITY_TYPES = [
  { value: 'grams', label: 'grammi (g)' },
  { value: 'unit', label: 'unità' },
  { value: 'teaspoon', label: 'cucchiaino' },
  { value: 'tablespoon', label: 'cucchiaio' },
]

export const UNIT_LABELS = {
  grams: 'g',
  unit: 'unità',
  teaspoon: 'cucchiaino',
  tablespoon: 'cucchiaio',
}

// A cosa si riferiscono i valori mostrati di un cibo. Per i grammi si mostrano
// su 100 g (come sulle etichette), anche se nel DB sono per 1 g.
export const PER_LABELS = {
  grams: 'per 100 g',
  unit: 'per unità',
  teaspoon: 'per cucchiaino',
  tablespoon: 'per cucchiaio',
}

/** Fattore fra valori salvati (per unità) e valori mostrati: 100 per i grammi. */
export const displayFactor = (quantityType) => (quantityType === 'grams' ? 100 : 1)

export const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 250, fat: 70 }

// Etichette e colori dei macro. Il colore è sempre affiancato dall'etichetta:
// non è mai l'unico modo per riconoscere un macro.
export const MACROS = [
  { key: 'protein', label: 'Proteine', short: 'P', bar: 'bg-macro-protein' },
  { key: 'carbs', label: 'Carboidrati', short: 'C', bar: 'bg-macro-carbs' },
  { key: 'fat', label: 'Grassi', short: 'G', bar: 'bg-macro-fat' },
]

export const EMPTY_TOTALS = { calories: 0, protein: 0, carbs: 0, fat: 0 }

export const round1 = (value) => Math.round(value * 10) / 10

/**
 * Pasto proposto in base all'ora: colazione fino alle 11, pranzo 11–15,
 * spuntino 15–18, cena dopo le 18.
 * @param {Date} now
 * @returns {string}
 */
export function categoryForTime(now = new Date()) {
  const hour = now.getHours()
  if (hour < 11) return 'Colazione'
  if (hour < 15) return 'Pranzo'
  if (hour < 18) return 'Spuntino'
  return 'Cena'
}

/** Nome cibo come salvato in foods.name: minuscolo, spazi singoli. */
export const normalizeFoodName = (name) => String(name || '').trim().replace(/\s+/g, ' ').toLowerCase()

/**
 * Somma kcal e macro di una lista di piatti.
 * @param {Array<{calories:number, protein:number, carbs:number, fat:number}>} items
 */
export function sumMacros(items) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + (Number(item.calories) || 0),
      protein: acc.protein + (Number(item.protein) || 0),
      carbs: acc.carbs + (Number(item.carbs) || 0),
      fat: acc.fat + (Number(item.fat) || 0),
    }),
    { ...EMPTY_TOTALS },
  )
}

/**
 * Cerca nella libreria il cibo con quel nome e quella unità.
 * @param {Array} foods - righe di foods
 * @param {string} name
 * @param {string} quantityType
 */
export function findFood(foods, name, quantityType) {
  const normalized = normalizeFoodName(name)
  return foods.find(f => f.name === normalized && f.default_quantity_type === quantityType) || null
}

/**
 * Grammi e macro di una porzione, dai valori per unità del cibo.
 * Arrotondamenti uguali a recalculate_food_items() nel DB.
 * @param {object} food - riga di foods
 * @param {number} quantity
 */
export function portionFromFood(food, quantity) {
  const q = Number(quantity)
  const gramsPerUnit = food.default_quantity_type === 'grams' ? 1 : Number(food.grams_per_unit) || 0
  return {
    grams: Math.round(q * gramsPerUnit * 100) / 100,
    calories: Math.round(q * Number(food.calories_per_unit)),
    protein: round1(q * Number(food.protein_per_unit)),
    carbs: round1(q * Number(food.carbs_per_unit)),
    fat: round1(q * Number(food.fat_per_unit)),
  }
}

/**
 * Valori per unità dal risultato di Gemini per una certa quantità.
 * @param {{grams:number, calories:number, protein:number, carbs:number, fat:number}} analysis
 * @param {number} quantity
 * @param {string} quantityType
 */
export function perUnitFromAnalysis(analysis, quantity, quantityType) {
  const q = Number(quantity)
  return {
    calories_per_unit: analysis.calories / q,
    protein_per_unit: analysis.protein / q,
    carbs_per_unit: analysis.carbs / q,
    fat_per_unit: analysis.fat / q,
    grams_per_unit: quantityType === 'grams' ? 1 : (analysis.grams > 0 ? analysis.grams / q : null),
  }
}

/** '150 g' oppure '2 unità (240 g)' */
export function formatQuantity(dish) {
  const unit = UNIT_LABELS[dish.quantityType] ?? dish.quantityType
  const base = `${formatNumber(dish.quantity)} ${unit}`
  return dish.quantityType !== 'grams' && dish.grams > 0 ? `${base} · ${formatNumber(dish.grams)} g` : base
}

const numberFmt = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 })
const integerFmt = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 })

/** Numero con al massimo un decimale, separatori italiani. */
export const formatNumber = (value) => numberFmt.format(Number(value) || 0)

/** Numero intero con separatore delle migliaia. */
export const formatInteger = (value) => integerFmt.format(Number(value) || 0)
