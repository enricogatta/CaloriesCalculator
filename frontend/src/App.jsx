import React, { useState, useEffect } from 'react';

const App = () => {
  const [meal, setMeal] = useState('');
  const [grams, setGrams] = useState('');
  const [category, setCategory] = useState('Pranzo');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Caricamento dati iniziali
  useEffect(() => {
    const savedLogs = localStorage.getItem('dailyMeals');
    if (savedLogs) setLogs(JSON.parse(savedLogs));
  }, []);

  // Salvataggio automatico
  useEffect(() => {
    localStorage.setItem('dailyMeals', JSON.stringify(logs));
  }, [logs]);

  // CALCOLO TOTALI
  const totals = logs.reduce((acc, curr) => ({
    calories: acc.calories + (Number(curr.calories) || 0),
    protein: acc.protein + (Number(curr.protein) || 0),
    carbs: acc.carbs + (Number(curr.carbs) || 0),
    fat: acc.fat + (Number(curr.fat) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const handleAddMeal = async () => {
    if (!meal || !grams) return alert("Inserisci cibo e quantità!");
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal, grams })
      });

      const data = await response.json();
      
      const newEntry = {
        ...data,
        id: Date.now(),
        category,
        grams
      };

      setLogs([newEntry, ...logs]);
      setMeal('');
      setGrams('');
    } catch (error) {
      alert("Errore nella comunicazione col server");
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    if(window.confirm("Vuoi cancellare tutti i dati di oggi?")) setLogs([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-3xl mx-auto">
        
        {/* HEADER & DASHBOARD */}
        <header className="mb-8">
          <h1 className="text-4xl font-black text-center mb-6 text-indigo-600">NutriTrack AI</h1>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Calorie Totali" value={totals.calories.toFixed(0)} unit="kcal" color="bg-orange-500" />
            <StatCard label="Proteine" value={totals.protein.toFixed(1)} unit="g" color="bg-blue-500" />
            <StatCard label="Carboidrati" value={totals.carbs.toFixed(1)} unit="g" color="bg-yellow-500" />
            <StatCard label="Grassi" value={totals.fat.toFixed(1)} unit="g" color="bg-red-500" />
          </div>
        </header>

        {/* INPUT FORM */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Cosa hai mangiato?</h2>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <select 
              className="md:col-span-3 p-3 rounded-xl bg-slate-100 border-none focus:ring-2 focus:ring-indigo-500 outline-none"
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
            >
              {['Colazione', 'Spuntino 1', 'Pranzo', 'Spuntino 2', 'Cena'].map(c => <option key={c}>{c}</option>)}
            </select>
            <input 
              className="md:col-span-5 p-3 rounded-xl bg-slate-100 border-none focus:ring-2 focus:ring-indigo-500 outline-none"
              type="text" placeholder="Es: Pasta al pesto" 
              value={meal} onChange={(e) => setMeal(e.target.value)}
            />
            <input 
              className="md:col-span-2 p-3 rounded-xl bg-slate-100 border-none focus:ring-2 focus:ring-indigo-500 outline-none"
              type="number" placeholder="Grammi" 
              value={grams} onChange={(e) => setGrams(e.target.value)}
            />
            <button 
              onClick={handleAddMeal}
              disabled={loading}
              className={`md:col-span-2 p-3 rounded-xl font-bold text-white shadow-lg shadow-indigo-200 transition-all active:scale-95 ${loading ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {loading ? '...' : 'Aggiungi'}
            </button>
          </div>
        </div>

        {/* LISTA PASTI */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-bold text-xl text-slate-700">Pasti Recenti</h3>
            <button onClick={clearLogs} className="text-sm text-slate-400 hover:text-red-500 transition-colors">Svuota tutto</button>
          </div>
          
          {logs.length === 0 && (
            <p className="text-center py-10 text-slate-400 italic">Ancora nessun pasto aggiunto. Inizia ora!</p>
          )}

          {logs.map((log) => (
            <div key={log.id} className="bg-white p-5 rounded-2xl flex justify-between items-center shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full mb-2 inline-block">
                  {log.category}
                </span>
                <h3 className="text-lg font-bold text-slate-800 capitalize">{log.food} <span className="text-slate-400 font-normal text-sm">({log.grams}g)</span></h3>
                <div className="flex gap-4 mt-1 text-sm font-medium text-slate-500">
                  <span>🔥 {log.calories.toFixed(0)} <small>kcal</small></span>
                  <span>🥩 {log.protein.toFixed(1)}g</span>
                  <span>🍞 {log.carbs.toFixed(1)}g</span>
                  <span>🥑 {log.fat.toFixed(1)}g</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Componente piccolo per le card della Dashboard
const StatCard = ({ label, value, unit, color }) => (
  <div className={`${color} p-4 rounded-2xl text-white shadow-lg`}>
    <p className="text-[10px] uppercase font-bold opacity-80">{label}</p>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-black">{value}</span>
      <span className="text-xs font-medium">{unit}</span>
    </div>
  </div>
);

export default App;