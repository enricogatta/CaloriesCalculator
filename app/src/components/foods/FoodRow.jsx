import { ChevronRight } from 'lucide-react'
import { PER_LABELS, displayFactor, formatInteger, formatNumber } from '../../utils/nutrition'

/**
 * FoodRow component
 * Riga della libreria: nome, valori per 100 g o per unità. Il tocco apre la modifica.
 * @param {object} food - Riga di foods
 * @param {Function} onOpen - () => void
 */
export function FoodRow({ food, onOpen }) {
  const factor = displayFactor(food.default_quantity_type)

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-16 w-full items-center gap-3 py-3 pr-3 pl-4 text-left transition-colors duration-150 hover:bg-surface-sunken active:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-text"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-base text-content first-letter:uppercase">{food.name}</span>
          <span className="text-sm text-content-muted tabular-nums">
            <span className="font-semibold text-content">{formatInteger(food.calories_per_unit * factor)} kcal</span>
            {' '}{PER_LABELS[food.default_quantity_type]}
            {' '}· P {formatNumber(food.protein_per_unit * factor)} · C {formatNumber(food.carbs_per_unit * factor)} · G {formatNumber(food.fat_per_unit * factor)}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-content-subtle" aria-hidden="true" />
      </button>
    </li>
  )
}
