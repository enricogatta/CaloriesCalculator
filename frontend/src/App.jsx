import React, { useState, useEffect } from 'react';

const App = () => {
  const [meal, setMeal] = useState('');
  const [grams, setGrams] = useState('');
  const [category, setCategory] = useState('Colazione');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [targetCardId, setTargetCardId] = useState(null);
  const mealInputRef = React.useRef(null);

  useEffect(() => {
    const savedLogs = localStorage.getItem('dailyMeals');
    if (savedLogs) setLogs(JSON.parse(savedLogs));
  }, []);

  useEffect(() => {
    localStorage.setItem('dailyMeals', JSON.stringify(logs));
  }, [logs]);

  const totals = logs.reduce((acc, card) => {
    const cardTotals = card.dishes.reduce((cAcc, dish) => ({
      calories: cAcc.calories + (Number(dish.calories) || 0),
      protein: cAcc.protein + (Number(dish.protein) || 0),
      carbs: cAcc.carbs + (Number(dish.carbs) || 0),
      fat: cAcc.fat + (Number(dish.fat) || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    return {
      calories: acc.calories + cardTotals.calories,
      protein: acc.protein + cardTotals.protein,
      carbs: acc.carbs + cardTotals.carbs,
      fat: acc.fat + cardTotals.fat,
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const handleAddMeal = async () => {
    if (!meal.trim() || !grams || isNaN(grams) || grams <= 0) {
      alert("Inserisci un cibo valido e una quantità in grammi positiva!");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal: meal.trim(), grams: parseFloat(grams) })
      });

      if (!response.ok) {
        throw new Error(`Errore API: ${response.status}`);
      }

      const data = await response.json();
      
      const newDish = {
        id: Date.now() + Math.random(),
        food: data.food || meal.trim(),
        grams: parseFloat(grams),
        calories: Number(data.calories) || 0,
        protein: Number(data.protein) || 0,
        carbs: Number(data.carbs) || 0,
        fat: Number(data.fat) || 0,
      };

      if (targetCardId) {
        setLogs((prev) => prev.map((card) => {
          if (card.id !== targetCardId) return card;
          return { ...card, dishes: [...card.dishes, newDish] };
        }));
      } else {
        const newCard = {
          id: Date.now(),
          category,
          dishes: [newDish],
        };
        setLogs((prev) => [newCard, ...prev]);
      }

      setMeal('');
      setGrams('');
      setTargetCardId(null);

      if (mealInputRef.current) {
        mealInputRef.current.focus();
      }
    } catch (error) {
      alert(`Errore: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    if(window.confirm("Vuoi cancellare tutti i dati di oggi?")) setLogs([]);
  };

  const handleAddAnotherDish = (cardId, entryCategory) => {
    setTargetCardId(cardId);
    setCategory(entryCategory);
    setMeal('');
    setGrams('');
    if (mealInputRef.current) {
      mealInputRef.current.focus();
    }
  };

  const handleRemoveCard = (cardId) => {
    setLogs((prev) => prev.filter((card) => card.id !== cardId));
  };

  const handleRemoveDish = (cardId, dishId) => {
    setLogs((prev) => prev
      .map((card) => {
        if (card.id !== cardId) return card;
        const reducedDishes = card.dishes.filter((dish) => dish.id !== dishId);
        return { ...card, dishes: reducedDishes };
      })
      .filter((card) => card.dishes.length > 0)
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden text-white">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600 rounded-full mix-blend-multiply opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply opacity-10 blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen p-4 md:p-8 font-sans">
        <div className="max-w-4xl mx-auto">
          
          {/* HEADER */}
          <header className="mb-12 text-center">
            <div className="inline-block mb-4">
              <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">Calories Calculator</h1>
              <p className="text-cyan-400 text-sm tracking-widest mt-1 font-semibold">Your Daily Nutrition Monitor</p>
            </div>
          </header>

          {/* DASHBOARD STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            <StatCard label="Calorie" value={totals.calories.toFixed(0)} unit="kcal" icon="🔥" gradient="from-orange-500 to-red-600" />
            <StatCard label="Proteine" value={totals.protein.toFixed(1)} unit="g" icon="🥩" gradient="from-blue-500 to-cyan-600" />
            <StatCard label="Carboidrati" value={totals.carbs.toFixed(1)} unit="g" icon="🌾" gradient="from-yellow-400 to-orange-500" />
            <StatCard label="Grassi" value={totals.fat.toFixed(1)} unit="g" icon="🥑" gradient="from-green-400 to-emerald-600" />
          </div>

          {/* INPUT FORM */}
          <div className="bg-slate-900 rounded-3xl border border-violet-700 border-opacity-30 p-8 mb-10 backdrop-blur-sm hover:border-opacity-70 transition-all duration-300">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
              <span className="text-3xl">📝</span> Aggiungi un pasto
            </h2>
            {targetCardId && (
              <div className="mb-4 text-sm text-cyan-300">👉 Stai aggiungendo in card “{category}”. Premi Aggiungi per inserire il piatto.</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <select 
                className="md:col-span-3 px-4 py-3 rounded-xl bg-slate-800 border border-violet-700 border-opacity-30 text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-opacity-30 outline-none transition-all"
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
              >
                {['Colazione', 'Pranzo', 'Cena', 'Spuntino'].map(c => <option key={c} className="bg-slate-900">{c}</option>)}
              </select>
              <input 
                ref={mealInputRef}
                className="md:col-span-5 px-4 py-3 rounded-xl bg-slate-800 border border-violet-700 border-opacity-30 text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-opacity-30 outline-none transition-all placeholder-gray-500"
                type="text" placeholder="Es: Pasta al pesto" 
                value={meal} onChange={(e) => setMeal(e.target.value)}
              />
              <input 
                className="md:col-span-2 px-4 py-3 rounded-xl bg-slate-800 border border-violet-700 border-opacity-30 text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-opacity-30 outline-none transition-all placeholder-gray-500"
                type="number" placeholder="Grammi" 
                value={grams} onChange={(e) => setGrams(e.target.value)}
              />
              <button
                onClick={handleAddMeal}
                disabled={loading}
                className={`md:col-span-2 px-4 py-3 rounded-xl font-bold text-white transition-all active:scale-95 transform ${
                  loading 
                    ? 'bg-slate-700 opacity-50 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:shadow-lg hover:shadow-violet-500/50 hover:-translate-y-0.5'
                }`}
              >
                {loading ? '⏳' : '✚ Aggiungi'}
              </button>
            </div>
          </div>

          {/* LISTA PASTI */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-2xl text-white flex items-center gap-2">
                <span className="text-3xl">📋</span> Pasti Recenti
              </h3>
              {logs.length > 0 && (
                <button 
                  onClick={clearLogs} 
                  className="text-sm text-gray-400 hover:text-pink-400 transition-colors font-semibold hover:underline"
                >
                  🗑️ Svuota
                </button>
              )}
            </div>
            
            {logs.length === 0 && (
              <div className="text-center py-16">
                <p className="text-5xl mb-4">🍽️</p>
                <p className="text-gray-400 text-lg">Ancora nessun pasto aggiunto. Inizia a monitorare ora!</p>
              </div>
            )}

            <div className="space-y-3">
              {logs.map((log) => {
                const cardTotals = log.dishes.reduce((cAcc, dish) => ({
                  calories: cAcc.calories + Number(dish.calories),
                  protein: cAcc.protein + Number(dish.protein),
                  carbs: cAcc.carbs + Number(dish.carbs),
                  fat: cAcc.fat + Number(dish.fat),
                }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

                return (
                  <div 
                    key={log.id} 
                    className="bg-slate-900 border border-violet-700 border-opacity-30 p-6 rounded-2xl hover:border-opacity-70 transition-all duration-300 group hover:shadow-lg hover:shadow-violet-500/20 hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-violet-300 bg-slate-800 px-3 py-1.5 rounded-full border border-violet-700 border-opacity-30">
                          {log.category}
                        </span>
                        <div className="mt-2 text-gray-300 text-xs">Totale card</div>
                        <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-gray-400">
                          <span>🔥 {cardTotals.calories.toFixed(0)} kcal</span>
                          <span>🥩 {cardTotals.protein.toFixed(1)}g</span>
                          <span>🍞 {cardTotals.carbs.toFixed(1)}g</span>
                          <span>🥑 {cardTotals.fat.toFixed(1)}g</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRemoveCard(log.id)}
                          className="text-xs text-red-400 hover:text-red-500 font-semibold"
                        >
                          Elimina card
                        </button>
                        <button
                          onClick={() => handleAddAnotherDish(log.id, log.category)}
                          className="text-xs text-violet-400 hover:text-violet-200 font-semibold"
                        >
                          + Nuovo piatto
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {log.dishes.map((dish) => (
                        <div key={dish.id} className="bg-slate-800 rounded-xl p-3 flex justify-between items-center border border-violet-700 border-opacity-20">
                          <div>
                            <p className="text-sm text-white font-semibold">{dish.food} <span className="text-xs text-gray-400">({dish.grams}g)</span></p>
                            <p className="text-xs text-gray-300 mt-1">🔥 {dish.calories.toFixed(0)} kcal · 🥩 {dish.protein.toFixed(1)}g · 🍞 {dish.carbs.toFixed(1)}g · 🥑 {dish.fat.toFixed(1)}g</p>
                          </div>
                          <button
                            onClick={() => handleRemoveDish(log.id, dish.id)}
                            className="text-sm rounded-md px-2 py-1 bg-red-500 hover:bg-red-400 text-white"
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, unit, icon, gradient }) => (
  <div className={`bg-gradient-to-br ${gradient} p-6 rounded-2xl text-white shadow-lg border border-white border-opacity-10 group hover:-translate-y-1 transition-transform duration-300`}>
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs uppercase font-bold opacity-90 tracking-wider">{label}</p>
      <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-3xl font-black">{value}</span>
      <span className="text-xs font-semibold opacity-80">{unit}</span>
    </div>
  </div>
);

const NutrientBadge = ({ icon, label, value, unit, color }) => (
  <div className="bg-slate-800 border border-violet-700 border-opacity-20 px-3 py-2 rounded-lg hover:border-opacity-50 transition-all">
    <div className="flex items-center gap-1 mb-1">
      <span className="text-lg">{icon}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
    <div className="text-sm font-bold text-white">
      {value}<span className="text-xs text-gray-500 ml-1">{unit}</span>
    </div>
  </div>
);

export default App;