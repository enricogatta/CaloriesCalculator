import React, { useMemo } from 'react';
import StatCard from '../UI/StatCard';
import MealSection from './MealSection';

const DayCard = ({
  selectedDate,
  setSelectedDate,
  getTodayDate,
  dailyTotals,
  goals,
  category,
  setCategory,
  meal,
  setMeal,
  quantity,
  setQuantity,
  quantityType,
  setQuantityType,
  handleAddMeal,
  loading,
  mealInputRef,
  dailyLogs,
  clearLogs,
  onEditDish,
  onDeleteDish,
  onDeleteMeal,
  onAddDish,
  todayButtonRef
}) => {
  const generateDateRange = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (14 - i));
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const dates = useMemo(() => generateDateRange(), [selectedDate]);
  const todayDate = getTodayDate();

  return (
    <div>
      {/* NAVIGAZIONE DATE */}
      <div className="mb-6 flex items-center justify-center gap-2 xs:gap-3 sm:gap-4">
        <button
          onClick={() => setSelectedDate(new Date(new Date(selectedDate).getTime() - 86400000).toISOString().split('T')[0])}
          className="px-4 py-2 text-violet-400 hover:text-white transition-colors text-xl font-bold"
        >←</button>

        <div className="flex gap-1 xs:gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-[220px] xs:max-w-[280px] md:max-w-3xl">
          {dates.map((date) => {
            const isSelected = selectedDate === date;
            const isToday = date === todayDate;
            const shortWeekday = new Date(date)
              .toLocaleDateString('it-IT', { weekday: 'short' })
              .replace('.', '')
              .toLowerCase();
            return (
              <button
                key={date}
                ref={isToday ? todayButtonRef : null}
                onClick={() => date <= todayDate && setSelectedDate(date)}
                disabled={date > todayDate}
                className={`
                  px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all duration-300 flex flex-col items-center leading-tight
                  ${isSelected
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg border-2 border-violet-400 scale-105'
                    : isToday
                    ? 'border-2 border-cyan-400 text-cyan-400 bg-slate-800'
                    : date > todayDate
                    ? 'opacity-30 cursor-not-allowed bg-slate-900 text-slate-600'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }
                `}
              >
                <span>{new Date(date).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' })}</span>
                <span className={`text-[10px] mt-1 ${isSelected ? 'text-violet-100' : 'opacity-80'}`}>{shortWeekday}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            const next = new Date(new Date(selectedDate).getTime() + 86400000).toISOString().split('T')[0];
            if (next <= todayDate) setSelectedDate(next);
          }}
          className={`px-4 py-2 text-xl font-bold transition-colors ${new Date(new Date(selectedDate).getTime() + 86400000).toISOString().split('T')[0] > todayDate ? 'text-gray-700 cursor-not-allowed' : 'text-violet-400 hover:text-white'}`}
        >→</button>
      </div>

      {/* DASHBOARD STATS CON PERCENTUALI */}
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 gap-2 xs:gap-3 mb-6 xs:mb-8">
        <StatCard
          label="Calorie" value={dailyTotals.calories.toFixed(0)} unit="kcal" icon="🔥" gradient="from-orange-500 to-red-600"
          percentage={goals.calories > 0 ? Math.round((dailyTotals.calories / goals.calories) * 100) : 0}
        />
        <StatCard
          label="Proteine" value={dailyTotals.protein.toFixed(1)} unit="g" icon="🥩" gradient="from-blue-500 to-cyan-600"
          percentage={goals.protein > 0 ? Math.round((dailyTotals.protein / goals.protein) * 100) : 0}
        />
        <StatCard
          label="Carboidrati" value={dailyTotals.carbs.toFixed(1)} unit="g" icon="🌾" gradient="from-yellow-400 to-orange-500"
          percentage={goals.carbs > 0 ? Math.round((dailyTotals.carbs / goals.carbs) * 100) : 0}
        />
        <StatCard
          label="Grassi" value={dailyTotals.fat.toFixed(1)} unit="g" icon="🥑" gradient="from-green-400 to-emerald-600"
          percentage={goals.fat > 0 ? Math.round((dailyTotals.fat / goals.fat) * 100) : 0}
        />
      </div>

      {/* INPUT FORM */}
      <div className={`
        bg-slate-900 rounded-2xl border border-violet-700 border-opacity-30 p-3 xs:p-4 sm:p-8 mb-6 xs:mb-8 backdrop-blur-sm hover:border-opacity-70 transition-all duration-300
        ${selectedDate > todayDate ? 'opacity-50 pointer-events-none grayscale' : ''}
      `}>
        <h2 className="text-xl xs:text-2xl font-bold mb-4 xs:mb-6 text-white flex items-center gap-2">
          <span className="text-2xl xs:text-3xl">📝</span> Aggiungi un pasto
        </h2>
        <div className="grid grid-cols-1 xs:grid-cols-1 md:grid-cols-12 gap-2 xs:gap-3">
          <select
            className="md:col-span-3 px-4 py-3 rounded-xl bg-slate-800 border border-violet-700 border-opacity-30 text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-opacity-30 outline-none transition-all cursor-pointer"
            value={category} onChange={(e) => setCategory(e.target.value)}
          >
            {['Colazione', 'Pranzo', 'Cena', 'Spuntino'].map(c => <option key={c} className="bg-slate-900">{c}</option>)}
          </select>
          <input
            ref={mealInputRef}
            className="md:col-span-5 px-3 py-2 xs:px-4 xs:py-3 rounded-xl bg-slate-800 border border-violet-700 border-opacity-30 text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-opacity-30 outline-none transition-all placeholder-gray-500 text-sm xs:text-base"
            type="text" placeholder="Es: Pasta al pesto"
            value={meal} onChange={(e) => setMeal(e.target.value)}
          />
          <div className="md:col-span-2 flex gap-1 items-center">
            <input
              className="w-20 px-2 py-2 rounded-xl bg-slate-800 border border-violet-700 border-opacity-30 text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-opacity-30 outline-none transition-all placeholder-gray-500 text-sm xs:text-base"
              type="number" min="0" step="any" placeholder="Quantità"
              value={quantity} onChange={e => setQuantity(e.target.value)}
            />
            <select
              className="px-2 py-2 rounded-xl bg-slate-800 border border-violet-700 border-opacity-30 text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-opacity-30 outline-none transition-all text-xs xs:text-sm"
              value={quantityType} onChange={e => setQuantityType(e.target.value)}
            >
              <option value="grams">g</option>
              <option value="unit">unità</option>
              <option value="teaspoon">cucchiaino</option>
              <option value="tablespoon">cucchiaio</option>
            </select>
          </div>
          <button
            onClick={handleAddMeal} disabled={loading}
            className={`md:col-span-2 px-3 py-2 xs:px-4 xs:py-3 rounded-xl font-bold text-white transition-all active:scale-95 transform text-sm xs:text-base ${
              loading ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:shadow-lg hover:shadow-violet-500/50 hover:-translate-y-0.5'
            }`}
          >
            {loading ? '⏳' : '✚ Aggiungi'}
          </button>
        </div>
      </div>

      {/* LISTA PASTI */}
      <div>
        <div className="flex justify-between items-center mb-6 px-2">
          <h3 className="font-bold text-2xl text-white flex items-center gap-2">
            <span className="text-3xl">📋</span> Pasti della giornata
          </h3>
          {dailyLogs.length > 0 && (
            <button onClick={clearLogs} className="text-sm text-gray-400 hover:text-pink-400 transition-colors font-semibold hover:underline">
              🗑️ Svuota tutto
            </button>
          )}
        </div>

        {dailyLogs.length === 0 && (
          <div className="text-center py-20 bg-slate-900 bg-opacity-20 rounded-3xl border-2 border-dashed border-slate-800">
            <p className="text-6xl mb-6">🍽️</p>
            <p className="text-gray-400 text-lg">Nessun pasto registrato per questo giorno.</p>
            <p className="text-gray-500 text-sm mt-2 italic">Aggiungi qualcosa di gustoso!</p>
          </div>
        )}

        <div className="space-y-4">
          {dailyLogs.map((log) => (
            <MealSection
              key={log.id}
              id={log.id}
              category={log.category}
              dishes={log.dishes}
              onEditDish={onEditDish}
              onDeleteDish={onDeleteDish}
              onDeleteMeal={onDeleteMeal}
              onAddDish={onAddDish}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(DayCard);