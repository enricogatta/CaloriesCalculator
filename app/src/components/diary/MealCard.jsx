import { Plus, Trash2 } from 'lucide-react'
import { Card } from '../ui/Card'
import { IconButton } from '../ui/IconButton'
import { DishRow } from './DishRow'
import { formatInteger, formatNumber } from '../../utils/nutrition'

/**
 * MealCard component
 * Un pasto del giorno (Colazione, Pranzo, …) con i suoi piatti e i totali.
 * @param {object} card - { category, mealIds, dishes, totals } da mealsService
 * @param {Function} onAddDish - () => void
 * @param {Function} onEditDish - (dish) => void
 * @param {Function} onDeleteDish - (dish) => void
 * @param {Function} onDeleteCard - () => void
 */
export function MealCard({ card, onAddDish, onEditDish, onDeleteDish, onDeleteCard }) {
  const { category, dishes, totals } = card

  return (
    <Card className="overflow-hidden" aria-labelledby={`meal-${category}`}>
      <div className="flex items-start justify-between gap-3 pt-4 pr-2 pb-2 pl-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={`meal-${category}`} className="text-base font-semibold text-content">{category}</h2>
          <p className="text-sm text-content-muted tabular-nums">
            <span className="font-semibold text-content">{formatInteger(totals.calories)} kcal</span>
            {' '}· P {formatNumber(totals.protein)} · C {formatNumber(totals.carbs)} · G {formatNumber(totals.fat)}
          </p>
        </div>
        <IconButton icon={Trash2} label={`Elimina ${category.toLowerCase()}`} variant="danger" onClick={onDeleteCard} />
      </div>

      <ul className="divide-y divide-line border-t border-line">
        {dishes.map(dish => (
          <DishRow
            key={dish.id}
            dish={dish}
            onEdit={() => onEditDish(dish)}
            onDelete={() => onDeleteDish(dish)}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={onAddDish}
        className="flex min-h-12 w-full items-center gap-2 border-t border-line px-4 text-base font-semibold text-accent-text transition-colors duration-150 hover:bg-surface-sunken active:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-text"
      >
        <Plus className="size-5" aria-hidden="true" />
        Aggiungi a {category.toLowerCase()}
      </button>
    </Card>
  )
}
