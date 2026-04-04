import React, { useMemo } from 'react';
import NutrientBadge from '../UI/NutrientBadge';

const MealSection = ({ id, category, dishes, onEditDish, onDeleteDish, onDeleteMeal, onAddDish }) => {
  const cardTotals = useMemo(() => dishes.reduce((cAcc, dish) => ({
    calories: cAcc.calories + (Number(dish.calories) || 0), protein: cAcc.protein + (Number(dish.protein) || 0), carbs: cAcc.carbs + (Number(dish.carbs) || 0), fat: cAcc.fat + (Number(dish.fat) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [dishes]);

  return (
    <div className="bg-slate-900 border border-violet-700 border-opacity-30 p-6 rounded-2xl hover:border-opacity-70 transition-all duration-300 group hover:shadow-lg hover:shadow-violet-500/20 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-violet-300 bg-slate-800 px-3 py-1.5 rounded-full border border-violet-700 border-opacity-30">
            {category}
          </span>
          <div className="flex flex-wrap gap-2 mt-3">
            <NutrientBadge label="kcal" value={cardTotals.calories.toFixed(0)} color="text-orange-400" />
            <NutrientBadge label="PRO" value={cardTotals.protein.toFixed(1)} color="text-blue-400" />
            <NutrientBadge label="CHO" value={cardTotals.carbs.toFixed(1)} color="text-yellow-400" />
            <NutrientBadge label="FAT" value={cardTotals.fat.toFixed(1)} color="text-green-400" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onDeleteMeal(id)} className="text-xs text-red-400 hover:text-red-500 font-semibold transition-colors opacity-60 hover:opacity-100">
            Elimina pasto
          </button>
          <button onClick={() => onAddDish(id, category)} className="text-xs text-violet-400 hover:text-violet-200 font-semibold transition-colors bg-slate-800 px-3 py-1.5 rounded-lg border border-violet-700 border-opacity-30">
            + Nuovo piatto
          </button>
        </div>
      </div>

      <div className="space-y-3 mt-4">
        {dishes.map((dish) => (
          <div key={dish.id} className="bg-slate-800 rounded-xl p-4 flex justify-between items-center border border-violet-700 border-opacity-10 hover:border-opacity-40 transition-all group/item">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm text-white font-bold">{dish.food}</p>
                <span className="text-[10px] text-gray-500 font-bold bg-slate-900 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                  {dish.quantity}{dish.quantityType === 'grams' ? 'g' : dish.quantityType === 'unit' ? 'unità' : dish.quantityType === 'teaspoon' ? 'cucchiaino' : 'cucchiaio'}{dish.quantityType !== 'grams' ? ` (${dish.grams}g)` : ''}
                </span>
              </div>
              <div className="flex gap-3 mt-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-tighter">
                <span>🔥 {dish.calories.toFixed(0)} kcal</span>
                <span>🥩 {dish.protein.toFixed(1)}g pro</span>
                <span>🌾 {dish.carbs.toFixed(1)}g cho</span>
                <span>🥑 {dish.fat.toFixed(1)}g fat</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onEditDish(id, dish)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-violet-600 text-white transition-all transform active:scale-90" title="Modifica">
                ✏️
              </button>
              <button onClick={() => onDeleteDish(id, dish.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-red-500 text-white transition-all transform active:scale-90">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(MealSection);