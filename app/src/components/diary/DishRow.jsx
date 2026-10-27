import { Trash2 } from 'lucide-react'
import { IconButton } from '../ui/IconButton'
import { formatInteger, formatNumber, formatQuantity } from '../../utils/nutrition'

/**
 * DishRow component
 * Riga di un piatto: tocco sulla riga per modificarlo, cestino per eliminarlo.
 * @param {object} dish - Piatto normalizzato da mealsService
 * @param {Function} onEdit - () => void
 * @param {Function} onDelete - () => void
 */
export function DishRow({ dish, onEdit, onDelete }) {
  return (
    <li className="flex items-center gap-1 pr-2">
      <button
        type="button"
        onClick={onEdit}
        className="flex min-h-16 min-w-0 flex-1 items-center justify-between gap-3 py-3 pl-4 text-left transition-colors duration-150 hover:bg-surface-sunken active:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-text"
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-base text-content first-letter:uppercase">{dish.food}</span>
          <span className="text-sm text-content-muted tabular-nums">
            {formatQuantity(dish)} · P {formatNumber(dish.protein)} · C {formatNumber(dish.carbs)} · G {formatNumber(dish.fat)}
          </span>
        </span>
        <span className="shrink-0 text-base tabular-nums text-content">
          <span className="font-semibold">{formatInteger(dish.calories)}</span>
          <span className="text-sm text-content-muted"> kcal</span>
        </span>
      </button>
      <IconButton icon={Trash2} label={`Elimina ${dish.food}`} variant="danger" onClick={onDelete} />
    </li>
  )
}
