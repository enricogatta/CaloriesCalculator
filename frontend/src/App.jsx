import React, { useState, useEffect } from 'react';

const App = () => {
  const [meal, setMeal] = useState('');
  const [grams, setGrams] = useState('');
  const [category, setCategory] = useState('Colazione');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const mealInputRef = React.useRef(null);

  useEffect(() => {
    const savedLogs = localStorage.getItem('dailyMeals');
    if (savedLogs) setLogs(JSON.parse(savedLogs));
  }, []);

  useEffect(() => {
    localStorage.setItem('dailyMeals', JSON.stringify(logs));
  }, [logs]);

  const totals = logs.reduce((acc, curr) => ({
    calories: acc.calories + (Number(curr.calories) || 0),
    protein: acc.protein + (Number(curr.protein) || 0),
    carbs: acc.carbs + (Number(curr.carbs) || 0),
    fat: acc.fat + (Number(curr.fat) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

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
      
      const newEntry = {
        ...data,
        id: Date.now(),
        category,
        grams: parseFloat(grams)
      };

      setLogs([newEntry, ...logs]);
      setMeal('');
      setGrams('');
      // Mantieni la categoria e focalizza su meal input per aggiungere rapidamente altri piatti
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

  const handleAddAnotherDish = (entryCategory) => {
    setCategory(entryCategory);
    setMeal('');
    setGrams('');
    if (mealInputRef.current) {
      mealInputRef.current.focus();
    }
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
              <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">NutriTrack</h1>
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
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="bg-slate-900 border border-violet-700 border-opacity-30 p-6 rounded-2xl hover:border-opacity-70 transition-all duration-300 group hover:shadow-lg hover:shadow-violet-500/20 hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-violet-300 bg-slate-800 px-3 py-1.5 rounded-full border border-violet-700 border-opacity-30">
                          {log.category}
                        </span>
                        <span className="text-sm text-gray-500">📅 {new Date(log.id).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}</span>
                      </div>
                      <h3 className="text-xl font-bold text-white capitalize mb-3">
                        {log.food} 
                        <span className="text-sm text-gray-400 font-normal ml-2">({log.grams}g)</span>
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <NutrientBadge icon="🔥" label="Calorie" value={log.calories.toFixed(0)} unit="kcal" color="orange" />
                        <NutrientBadge icon="🥩" label="Proteine" value={log.protein.toFixed(1)} unit="g" color="blue" />
                        <NutrientBadge icon="🌾" label="Carbs" value={log.carbs.toFixed(1)} unit="g" color="yellow" />
                        <NutrientBadge icon="🥑" label="Grassi" value={log.fat.toFixed(1)} unit="g" color="green" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleAddAnotherDish(log.category)}
                      className="text-sm font-semibold text-violet-400 hover:text-white transition-colors"
                    >
                      + Aggiungi un altro piatto
                    </button>
                  </div>
                </div>
              ))}
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