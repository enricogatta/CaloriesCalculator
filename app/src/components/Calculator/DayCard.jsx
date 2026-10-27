import React, { useMemo, useRef, useEffect } from 'react';
import StatCard from '../UI/StatCard';
import MealSection from './MealSection';
import FoodAutocomplete from '../UI/FoodAutocomplete';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
  SpinnerIcon,
  UtensilsIcon,
} from '../UI/Icons';

const inputClass =
  'w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-base text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-violet-400/60';
const selectClass = `${inputClass} cursor-pointer appearance-none pr-9`;
const labelClass = 'mb-1.5 block text-xs font-medium text-zinc-400';

const SelectChevron = () => (
  <ChevronDownIcon
    size={16}
    className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500"
  />
);

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
  userFoods,
  minLogDate,
}) => {
  const selectedButtonRef = useRef(null);
  const todayDate = getTodayDate();

  const generateDateRange = (minDate) => {
    const dates = [];
    const [startY, startM, startD] = minDate.split('-').map(Number);
    const startLocal = new Date(startY, startM - 1, startD);
    const today = new Date();
    const endLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
    const current = new Date(startLocal);
    while (current <= endLocal) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const dates = useMemo(() => generateDateRange(minLogDate), [minLogDate]);

  // Scrolla al bottone della data selezionata ogni volta che cambia
  useEffect(() => {
    const t = setTimeout(() => {
      selectedButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 80);
    return () => clearTimeout(t);
  }, [selectedDate, dates]);

  const navigateDate = (direction) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + direction);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${ny}-${nm}-${nd}`);
  };

  return (
    <div>
      {/* NAVIGAZIONE DATE */}
      <div className="mb-3 flex items-center justify-center gap-1 sm:gap-2">
        <button
          onClick={() => navigateDate(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Giorno precedente"
        >
          <ChevronLeftIcon size={18} />
        </button>

        <div className="scrollbar-hide flex max-w-[240px] gap-1.5 overflow-x-auto pb-1 sm:max-w-md md:max-w-2xl">
          {dates.map((date) => {
            const isSelected = selectedDate === date;
            const isToday = date === todayDate;
            const shortWeekday = new Date(date)
              .toLocaleDateString('it-IT', { weekday: 'short' })
              .replace('.', '')
              .toLowerCase();
            const dayNum = new Date(date).toLocaleDateString('it-IT', { day: 'numeric' });
            const monthShort = new Date(date)
              .toLocaleDateString('it-IT', { month: 'short' })
              .replace('.', '')
              .toLowerCase();
            return (
              <button
                key={date}
                ref={isSelected ? selectedButtonRef : null}
                onClick={() => setSelectedDate(date)}
                className={`flex w-12 shrink-0 flex-col items-center rounded-xl border py-1.5 leading-tight transition-colors ${
                  isSelected
                    ? 'border-transparent bg-violet-600 text-white'
                    : isToday
                    ? 'border-violet-400/40 bg-zinc-900 text-violet-400'
                    : 'border-white/5 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <span className="text-[10px] font-medium uppercase">{shortWeekday}</span>
                <span className="text-sm font-semibold tabular-nums">{dayNum}</span>
                <span className={`text-[9px] uppercase ${isSelected ? 'text-white/70' : 'text-zinc-500'}`}>
                  {monthShort}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => navigateDate(1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Giorno successivo"
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>

      {/* SELETTORE DATA RAPIDO */}
      <div className="mb-6 flex items-center justify-center gap-2">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
          className="cursor-pointer rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 outline-none transition-colors focus:border-violet-400/60"
        />
        {selectedDate !== todayDate && (
          <button
            onClick={() => setSelectedDate(todayDate)}
            className="rounded-lg border border-violet-400/30 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold text-violet-400 transition-colors hover:bg-violet-400/20"
          >
            Oggi
          </button>
        )}
      </div>

      {/* DASHBOARD STATS CON PERCENTUALI */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <StatCard
          label="Calorie" value={dailyTotals.calories.toFixed(0)} unit="kcal" goal={goals.calories} tone="orange"
          percentage={goals.calories > 0 ? Math.round((dailyTotals.calories / goals.calories) * 100) : 0}
        />
        <StatCard
          label="Proteine" value={dailyTotals.protein.toFixed(1)} unit="g" goal={goals.protein} tone="sky"
          percentage={goals.protein > 0 ? Math.round((dailyTotals.protein / goals.protein) * 100) : 0}
        />
        <StatCard
          label="Carboidrati" value={dailyTotals.carbs.toFixed(1)} unit="g" goal={goals.carbs} tone="amber"
          percentage={goals.carbs > 0 ? Math.round((dailyTotals.carbs / goals.carbs) * 100) : 0}
        />
        <StatCard
          label="Grassi" value={dailyTotals.fat.toFixed(1)} unit="g" goal={goals.fat} tone="emerald"
          percentage={goals.fat > 0 ? Math.round((dailyTotals.fat / goals.fat) * 100) : 0}
        />
      </div>

      {/* INPUT FORM */}
      <div className="mb-6 rounded-2xl border border-violet-400/25 bg-zinc-950 bg-gradient-to-br from-violet-500/25 to-violet-500/[0.08] p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-tight text-white">Aggiungi alimento</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-12">
          <div className="col-span-2 md:col-span-4">
            <label className={labelClass}>Pasto</label>
            <div className="relative">
              <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                {['Colazione', 'Pranzo', 'Cena', 'Spuntino'].map(c => (
                  <option key={c} className="bg-zinc-900">{c}</option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>
          <div className="col-span-2 md:col-span-8">
            <label className={labelClass}>Alimento</label>
            <FoodAutocomplete
              value={meal}
              onChange={(e) => setMeal(e.target.value)}
              onSelect={(food) => { setMeal(food.name); setQuantityType(food.default_quantity_type); }}
              foods={userFoods || []}
              placeholder="Es: pasta al pesto"
              inputClassName={inputClass}
              inputRef={mealInputRef}
            />
          </div>
          <div className="col-span-1 md:col-span-4">
            <label className={labelClass}>Quantità</label>
            <input
              className={inputClass}
              type="number" min="0" step="any" placeholder="Es: 150"
              value={quantity} onChange={e => setQuantity(e.target.value)}
            />
          </div>
          <div className="col-span-1 md:col-span-4">
            <label className={labelClass}>Unità</label>
            <div className="relative">
              <select className={selectClass} value={quantityType} onChange={e => setQuantityType(e.target.value)}>
                <option value="grams">grammi (g)</option>
                <option value="unit">unità</option>
                <option value="teaspoon">cucchiaino</option>
                <option value="tablespoon">cucchiaio</option>
              </select>
              <SelectChevron />
            </div>
          </div>
          <div className="col-span-2 flex items-end md:col-span-4">
            <button
              onClick={handleAddMeal} disabled={loading}
              className={`flex h-[46px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition-colors ${
                loading
                  ? 'cursor-not-allowed bg-zinc-800 text-zinc-500'
                  : 'bg-violet-600 text-white hover:bg-violet-500 active:bg-violet-600'
              }`}
            >
              {loading ? (
                <>
                  <SpinnerIcon size={17} /> Analisi in corso...
                </>
              ) : (
                <>
                  <PlusIcon size={17} /> Aggiungi
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* LISTA PASTI */}
      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold tracking-tight text-white">Pasti della giornata</h3>
          {dailyLogs.length > 0 && (
            <button
              onClick={clearLogs}
              className="text-xs font-medium text-zinc-500 transition-colors hover:text-red-400"
            >
              Svuota giorno
            </button>
          )}
        </div>

        {dailyLogs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-zinc-500">
              <UtensilsIcon size={22} />
            </div>
            <p className="mt-4 text-sm font-medium text-zinc-300">Nessun pasto registrato</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-zinc-500">
              Aggiungi il tuo primo alimento per iniziare a tracciare la giornata.
            </p>
          </div>
        )}

        <div className="space-y-3">
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
