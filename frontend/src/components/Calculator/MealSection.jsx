import React, { useMemo } from 'react';
import NutrientBadge from '../UI/NutrientBadge';
import { PlusIcon, PencilIcon, TrashIcon } from '../UI/Icons';

const UNIT_LABELS = {
  grams: 'g',
  unit: 'unità',
  teaspoon: 'cucchiaino',
  tablespoon: 'cucchiaio',
};

const formatQuantity = (dish) => {
  const unit = UNIT_LABELS[dish.quantityType] ?? dish.quantityType;
  const base = `${dish.quantity} ${unit}`;
  return dish.quantityType !== 'grams' ? `${base} (${dish.grams} g)` : base;
};

const MealSection = ({ id, category, dishes, onEditDish, onDeleteDish, onDeleteMeal, onAddDish }) => {
  const cardTotals = useMemo(() => dishes.reduce((cAcc, dish) => ({
    calories: cAcc.calories + (Number(dish.calories) || 0), protein: cAcc.protein + (Number(dish.protein) || 0), carbs: cAcc.carbs + (Number(dish.carbs) || 0), fat: cAcc.fat + (Number(dish.fat) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [dishes]);

  return (
    <section className="overflow-hidden rounded-2xl border border-violet-400/25 bg-zinc-950 bg-gradient-to-br from-violet-500/25 to-violet-500/[0.08]">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <h4 className="text-xs font-semibold tracking-wider text-violet-300 uppercase">{category}</h4>
          <p className="mt-0.5 text-xs text-zinc-500 tabular-nums">
            <span className="text-sm font-semibold text-white">{cardTotals.calories.toFixed(0)}</span>
            <span className="ml-0.5 text-[10px] font-medium text-zinc-500">kcal</span>
            <span className="mx-1.5 text-zinc-700">·</span>
            {dishes.length} {dishes.length === 1 ? 'piatto' : 'piatti'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onAddDish(id, category)}
            className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-violet-400 transition-colors hover:bg-violet-400/10"
          >
            <PlusIcon size={15} /> Piatto
          </button>
          <button
            onClick={() => onDeleteMeal(id)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-400/10 hover:text-red-400"
            aria-label="Elimina pasto"
            title="Elimina pasto"
          >
            <TrashIcon size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-4 sm:px-5">
        <NutrientBadge label="Pro" value={cardTotals.protein.toFixed(1)} color="bg-sky-400" />
        <NutrientBadge label="Carb" value={cardTotals.carbs.toFixed(1)} color="bg-amber-400" />
        <NutrientBadge label="Grassi" value={cardTotals.fat.toFixed(1)} color="bg-emerald-400" />
      </div>

      <ul className="divide-y divide-white/5 border-t border-white/5">
        {dishes.map((dish) => (
          <li
            key={dish.id}
            className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02] sm:px-5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="min-w-0 text-sm font-medium break-words text-zinc-100 capitalize">{dish.food}</p>
                <span className="shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] text-zinc-400 tabular-nums">
                  {formatQuantity(dish)}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500 tabular-nums">
                <span className="font-semibold text-sky-400/90">P</span> {dish.protein.toFixed(1)} g
                <span className="mx-1.5 text-zinc-700">·</span>
                <span className="font-semibold text-amber-400/90">C</span> {dish.carbs.toFixed(1)} g
                <span className="mx-1.5 text-zinc-700">·</span>
                <span className="font-semibold text-emerald-400/90">G</span> {dish.fat.toFixed(1)} g
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="mr-1 text-sm font-semibold text-white tabular-nums">
                {dish.calories.toFixed(0)}
                <span className="ml-0.5 text-[10px] font-medium text-zinc-500">kcal</span>
              </span>
              <button
                onClick={() => onEditDish(id, dish)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Modifica piatto"
                title="Modifica"
              >
                <PencilIcon size={15} />
              </button>
              <button
                onClick={() => onDeleteDish(id, dish.id)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-400/10 hover:text-red-400"
                aria-label="Elimina piatto"
                title="Elimina"
              >
                <TrashIcon size={15} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default React.memo(MealSection);
