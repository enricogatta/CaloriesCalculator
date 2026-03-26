import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Importazione del client Supabase

const App = () => {
  const [meal, setMeal] = useState('');
  const [grams, setGrams] = useState('');
  const [category, setCategory] = useState('Colazione');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [targetCardId, setTargetCardId] = useState(null);
  const [showDishModal, setShowDishModal] = useState(false);
  const [modalMeal, setModalMeal] = useState('');
  const [modalGrams, setModalGrams] = useState('');
  const [modalCardId, setModalCardId] = useState(null);
  const [modalCardCategory, setModalCardCategory] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingDishId, setEditingDishId] = useState(null);
  const mealInputRef = React.useRef(null);
  const todayButtonRef = React.useRef(null);

  // Funzione per ottenere la data odierna in formato YYYY-MM-DD
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  
  // Filtra i logs per la data selezionata
  const dailyLogs = logs.filter(log => log.date === selectedDate);

  // --- LOGICA DI MEMORIA: Cerca se il piatto è già stato inserito in passato ---
  const findExistingNutrients = (foodName) => {
    const normalizedSearch = foodName.trim().toLowerCase();
    for (const log of logs) {
      const found = log.dishes.find(d => d.food.toLowerCase() === normalizedSearch);
      if (found) {
        // Restituisce i valori per singolo grammo per poterli riproporzionare
        return {
          food: found.food,
          calPerG: found.calories / found.grams,
          proPerG: found.protein / found.grams,
          choPerG: found.carbs / found.grams,
          fatPerG: found.fat / found.grams
        };
      }
    }
    return null;
  };

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) setLogs(data);
    };
    fetchLogs();
  }, []);

  useEffect(() => {
    if (todayButtonRef.current) {
      setTimeout(() => {
        todayButtonRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }, 100);
    }
  }, []);

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

    if (selectedDate > getTodayDate()) {
      alert("Non puoi aggiungere pasti a giorni futuri!");
      return;
    }

    setLoading(true);

    try {
      let data;
      const existing = findExistingNutrients(meal);

      if (existing) {
        // Recupero dai dati storici
        const g = parseFloat(grams);
        data = {
          food: existing.food,
          calories: existing.calPerG * g,
          protein: existing.proPerG * g,
          carbs: existing.choPerG * g,
          fat: existing.fatPerG * g
        };
      } else {
        // Chiamata a Gemini se il piatto è nuovo
        const response = await fetch('http://localhost:5000/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meal: meal.trim(), grams: parseFloat(grams) })
        });

        if (!response.ok) throw new Error(`Errore API: ${response.status}`);
        data = await response.json();
      }
      
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
        const targetCard = logs.find(c => c.id === targetCardId);
        const updatedDishes = [...targetCard.dishes, newDish];

        const { error } = await supabase
          .from('meals')
          .update({ dishes: updatedDishes })
          .eq('id', targetCardId);

        if (error) throw error;
        
        setLogs((prev) => prev.map((card) => 
          card.id === targetCardId ? { ...card, dishes: updatedDishes } : card
        ));
      } else {
        const newCard = {
          category,
          dishes: [newDish],
          date: selectedDate
        };

        const { data: insertedData, error } = await supabase
          .from('meals')
          .insert([newCard])
          .select();

        if (error) throw error;
        setLogs((prev) => [insertedData[0], ...prev]);
      }

      setMeal('');
      setGrams('');
      setTargetCardId(null);
      if (mealInputRef.current) mealInputRef.current.focus();
    } catch (error) {
      alert(`Errore: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDishFromModal = async () => {
    if (!modalMeal.trim() || !modalGrams || isNaN(modalGrams) || modalGrams <= 0) {
      alert("Inserisci un cibo valido e una quantità in grammi positiva!");
      return;
    }

    if (selectedDate > getTodayDate()) {
      alert("Non puoi aggiungere pasti a giorni futuri!");
      return;
    }

    setModalLoading(true);

    try {
      let data;
      const existing = findExistingNutrients(modalMeal);

      if (existing) {
        const g = parseFloat(modalGrams);
        data = {
          food: existing.food,
          calories: existing.calPerG * g,
          protein: existing.proPerG * g,
          carbs: existing.choPerG * g,
          fat: existing.fatPerG * g
        };
      } else {
        const response = await fetch('http://localhost:5000/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meal: modalMeal.trim(), grams: parseFloat(modalGrams) })
        });

        if (!response.ok) throw new Error(`Errore API: ${response.status}`);
        data = await response.json();
      }
      
      const targetCard = logs.find(c => c.id === modalCardId);
      let updatedDishes;
      
      if (editingDishId) {
        updatedDishes = targetCard.dishes.map(d => 
          d.id === editingDishId ? {
            ...d,
            food: data.food || modalMeal.trim(),
            grams: parseFloat(modalGrams),
            calories: Number(data.calories) || 0,
            protein: Number(data.protein) || 0,
            carbs: Number(data.carbs) || 0,
            fat: Number(data.fat) || 0,
          } : d
        );
      } else {
        const newDish = {
          id: Date.now() + Math.random(),
          food: data.food || modalMeal.trim(),
          grams: parseFloat(modalGrams),
          calories: Number(data.calories) || 0,
          protein: Number(data.protein) || 0,
          carbs: Number(data.carbs) || 0,
          fat: Number(data.fat) || 0,
        };
        updatedDishes = [...targetCard.dishes, newDish];
      }

      const { error } = await supabase
        .from('meals')
        .update({ dishes: updatedDishes })
        .eq('id', modalCardId);

      if (error) throw error;
      
      setLogs((prev) => prev.map((card) => 
        card.id === modalCardId ? { ...card, dishes: updatedDishes } : card
      ));

      closeModal();
    } catch (error) {
      alert(`Errore: ${error.message}`);
    } finally {
      setModalLoading(false);
    }
  };

  const clearLogs = async () => {
    if(window.confirm("Sei sicuro di voler cancellare tutti i dati della cronologia? Questa operazione è irreversibile.")) {
      const { error } = await supabase
        .from('meals')
        .delete()
        .neq('category', 'vuoto'); 
      
      if (error) {
        alert("Errore durante la cancellazione");
      } else {
        setLogs([]);
      }
    }
  };

  const handleAddAnotherDish = (cardId, entryCategory) => {
    setModalCardId(cardId);
    setModalCardCategory(entryCategory);
    setModalMeal('');
    setModalGrams('');
    setEditingDishId(null);
    setShowDishModal(true);
  };

  const handleEditDish = (cardId, dish) => {
    setModalCardId(cardId);
    setModalMeal(dish.food);
    setModalGrams(dish.grams.toString());
    setEditingDishId(dish.id);
    setShowDishModal(true);
  };

  const closeModal = () => {
    setShowDishModal(false);
    setModalCardId(null);
    setModalCardCategory('');
    setModalMeal('');
    setModalGrams('');
    setEditingDishId(null);
    setModalLoading(false);
  };

  const handleRemoveCard = async (cardId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa card pasto?")) return;

    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', cardId);

    if (error) {
      alert("Errore durante l'eliminazione");
    } else {
      setLogs((prev) => prev.filter((card) => card.id !== cardId));
    }
  };

  const handleRemoveDish = async (cardId, dishId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo piatto?")) return;

    const card = logs.find(c => c.id === cardId);
    const reducedDishes = card.dishes.filter((dish) => dish.id !== dishId);

    if (reducedDishes.length === 0) {
      handleRemoveCard(cardId);
    } else {
      const { error } = await supabase
        .from('meals')
        .update({ dishes: reducedDishes })
        .eq('id', cardId);
      
      if (error) {
        alert("Errore durante l'aggiornamento");
      } else {
        setLogs((prev) => prev.map((c) => 
          c.id === cardId ? { ...c, dishes: reducedDishes } : c
        ));
      }
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
              <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">Calories Calculator</h1>
              <p className="text-cyan-400 text-sm tracking-widest mt-1 font-semibold">Your Daily Nutrition Monitor</p>
            </div>
          </header>

          {/* Calendario Orizzontale */}
          <div className="mb-10 flex items-center justify-center gap-4">
            <button 
              onClick={() => {
                const prev = new Date(new Date(selectedDate).getTime() - 86400000).toISOString().split('T')[0];
                setSelectedDate(prev);
              }}
              className="px-4 py-2 text-violet-400 hover:text-white transition-colors text-xl font-bold"
            >
              ←
            </button>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-[280px] md:max-w-3xl">
              {Array.from({ length: 30 }, (_, i) => {
                const date = new Date(new Date().getTime() - (14 - i) * 86400000).toISOString().split('T')[0];
                const isSelected = date === selectedDate;
                const isToday = date === getTodayDate();
                
                return (
                  <button
                    key={date}
                    ref={isToday ? todayButtonRef : null}
                    onClick={() => {
                      if (date <= getTodayDate()) {
                        setSelectedDate(date);
                      }
                    }}
                    className={`
                      px-4 py-3 rounded-lg font-semibold text-sm whitespace-nowrap transition-all duration-300
                      ${isSelected 
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg border-2 border-violet-400 scale-105' 
                        : isToday
                        ? 'border-2 border-cyan-400 text-cyan-400 bg-slate-800'
                        : date > getTodayDate()
                        ? 'opacity-30 cursor-not-allowed bg-slate-900 text-slate-600'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }
                    `}
                  >
                    {new Date(date).toLocaleDateString('it-IT', { month: 'short', day: 'numeric' })}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => {
                const next = new Date(new Date(selectedDate).getTime() + 86400000).toISOString().split('T')[0];
                if (next <= getTodayDate()) {
                  setSelectedDate(next);
                }
              }}
              className={`px-4 py-2 text-xl font-bold transition-colors ${
                new Date(new Date(selectedDate).getTime() + 86400000).toISOString().split('T')[0] > getTodayDate()
                  ? 'text-gray-700 cursor-not-allowed'
                  : 'text-violet-400 hover:text-white'
              }`}
            >
              →
            </button>
          </div>

          {/* DASHBOARD STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            <StatCard 
              label="Calorie" 
              value={dailyLogs.reduce((sum, card) => sum + card.dishes.reduce((s, d) => s + d.calories, 0), 0).toFixed(0)} 
              unit="kcal" icon="🔥" gradient="from-orange-500 to-red-600" 
            />
            <StatCard 
              label="Proteine" 
              value={dailyLogs.reduce((sum, card) => sum + card.dishes.reduce((s, d) => s + d.protein, 0), 0).toFixed(1)} 
              unit="g" icon="🥩" gradient="from-blue-500 to-cyan-600" 
            />
            <StatCard 
              label="Carboidrati" 
              value={dailyLogs.reduce((sum, card) => sum + card.dishes.reduce((s, d) => s + d.carbs, 0), 0).toFixed(1)} 
              unit="g" icon="🌾" gradient="from-yellow-400 to-orange-500" 
            />
            <StatCard 
              label="Grassi" 
              value={dailyLogs.reduce((sum, card) => sum + card.dishes.reduce((s, d) => s + d.fat, 0), 0).toFixed(1)} 
              unit="g" icon="🥑" gradient="from-green-400 to-emerald-600" 
            />
          </div>

          {/* INPUT FORM */}
          <div className={`
            bg-slate-900 rounded-3xl border border-violet-700 border-opacity-30 p-8 mb-10 backdrop-blur-sm hover:border-opacity-70 transition-all duration-300
            ${selectedDate > getTodayDate() ? 'opacity-50 pointer-events-none grayscale' : ''}
          `}>
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
              <span className="text-3xl">📝</span> Aggiungi un pasto
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <select 
                className="md:col-span-3 px-4 py-3 rounded-xl bg-slate-800 border border-violet-700 border-opacity-30 text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-opacity-30 outline-none transition-all cursor-pointer"
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
            <div className="flex justify-between items-center mb-6 px-2">
              <h3 className="font-bold text-2xl text-white flex items-center gap-2">
                <span className="text-3xl">📋</span> Pasti della giornata
              </h3>
              {dailyLogs.length > 0 && (
                <button 
                  onClick={clearLogs} 
                  className="text-sm text-gray-400 hover:text-pink-400 transition-colors font-semibold hover:underline"
                >
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
              {dailyLogs.map((log) => {
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
                        <div className="flex flex-wrap gap-2 mt-3">
                          <NutrientBadge label="kcal" value={cardTotals.calories.toFixed(0)} color="text-orange-400" />
                          <NutrientBadge label="PRO" value={cardTotals.protein.toFixed(1)} color="text-blue-400" />
                          <NutrientBadge label="CHO" value={cardTotals.carbs.toFixed(1)} color="text-yellow-400" />
                          <NutrientBadge label="FAT" value={cardTotals.fat.toFixed(1)} color="text-green-400" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRemoveCard(log.id)}
                          className="text-xs text-red-400 hover:text-red-500 font-semibold transition-colors opacity-60 hover:opacity-100"
                        >
                          Elimina pasto
                        </button>
                        <button
                          onClick={() => handleAddAnotherDish(log.id, log.category)}
                          className="text-xs text-violet-400 hover:text-violet-200 font-semibold transition-colors bg-slate-800 px-3 py-1.5 rounded-lg border border-violet-700 border-opacity-30"
                        >
                          + Nuovo piatto
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 mt-4">
                      {log.dishes.map((dish) => (
                        <div 
                          key={dish.id} 
                          className="bg-slate-800 rounded-xl p-4 flex justify-between items-center border border-violet-700 border-opacity-10 hover:border-opacity-40 transition-all group/item"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-white font-bold">{dish.food}</p>
                              <span className="text-[10px] text-gray-500 font-bold bg-slate-900 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                                {dish.grams}g
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
                            <button
                              onClick={() => handleEditDish(log.id, dish)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-violet-600 text-white transition-all transform active:scale-90"
                              title="Modifica"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleRemoveDish(log.id, dish.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-red-500 text-white transition-all transform active:scale-90"
                            >
                              ✕
                            </button>
                          </div>
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

      {/* MODALE PER AGGIUNGERE/MODIFICARE PIATTI */}
      {showDishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-violet-700 border-opacity-50 rounded-3xl p-8 w-full max-w-md shadow-2xl transform animate-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              {editingDishId ? '✏️ Modifica piatto' : '✚ Aggiungi piatto'}
            </h2>
            <p className="text-gray-400 text-sm mb-6 uppercase tracking-wider font-bold">In: {modalCardCategory}</p>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-xs font-bold text-violet-400 uppercase mb-2 block">Nome alimento</label>
                <input 
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-violet-700 border-opacity-30 text-white outline-none focus:ring-2 focus:ring-violet-500 focus:ring-opacity-30 transition-all"
                  type="text" placeholder="Es: Petto di pollo" 
                  value={modalMeal} onChange={(e) => setModalMeal(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-violet-400 uppercase mb-2 block">Quantità (grammi)</label>
                <input 
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-violet-700 border-opacity-30 text-white outline-none focus:ring-2 focus:ring-violet-500 focus:ring-opacity-30 transition-all"
                  type="number" placeholder="Es: 150" 
                  value={modalGrams} onChange={(e) => setModalGrams(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-300 bg-slate-800 hover:bg-slate-700 transition-all active:scale-95"
              >
                Annulla
              </button>
              <button
                onClick={handleAddDishFromModal}
                disabled={modalLoading}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-white transition-all active:scale-95 ${ 
                  modalLoading 
                    ? 'bg-slate-700 opacity-50 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:shadow-lg hover:shadow-violet-500/50'
                }`}
              >
                {modalLoading ? '⏳' : editingDishId ? '✏️ Salva modifiche' : '✚ Aggiungi piatto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componenti accessori originali
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

const NutrientBadge = ({ label, value, color }) => (
  <div className="flex items-center gap-1.5 bg-slate-800 bg-opacity-50 px-2.5 py-1 rounded-md border border-slate-700 border-opacity-50">
    <span className={`text-[10px] font-black ${color} uppercase tracking-tighter`}>{label}</span>
    <span className="text-xs font-bold text-white">{value}</span>
  </div>
);

export default App;