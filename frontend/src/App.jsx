import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Importazione del client Supabase

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const App = () => {
  const [meal, setMeal] = useState('');
  const [quantityType, setQuantityType] = useState('grams'); // 'grams', 'unit', 'teaspoon'
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('Colazione');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [targetCardId, setTargetCardId] = useState(null);
  const [showDishModal, setShowDishModal] = useState(false);
  const [modalMeal, setModalMeal] = useState('');
  const [modalQuantityType, setModalQuantityType] = useState('grams');
  const [modalQuantity, setModalQuantity] = useState('');
  const [modalCardId, setModalCardId] = useState(null);
  const [modalCardCategory, setModalCardCategory] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingDishId, setEditingDishId] = useState(null);
  
  // --- NUOVI STATI PER MENU E OBIETTIVI ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('calculator'); // 'calculator' o 'goals'
  const [goals, setGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 70
  });

  const mealInputRef = React.useRef(null);
  const todayButtonRef = React.useRef(null);

  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const dailyLogs = logs.filter(log => log.date === selectedDate);

  // --- LOGICA DI MEMORIA: Cerca se il piatto è già stato inserito in passato ---
  const findExistingNutrients = (foodName, quantityType, quantity) => {
    const normalizedSearch = foodName.trim().toLowerCase();
    const quantityNum = parseFloat(quantity);
    console.log('findExistingNutrients called with:', { foodName, quantityType, quantity: quantityNum });
    for (const log of logs) {
      const found = log.dishes.find(d => {
        const dQuantityNum = parseFloat(d.quantity);
        const match = d.food.toLowerCase() === normalizedSearch && d.quantityType === quantityType && dQuantityNum === quantityNum;
        if (match) console.log('Found matching dish:', d);
        return match;
      });
      if (found) {
        console.log('Returning existing nutrients:', {
          food: found.food,
          calories: found.calories,
          protein: found.protein,
          carbs: found.carbs,
          fat: found.fat
        });
        return {
          food: found.food,
          calories: found.calories,
          protein: found.protein,
          carbs: found.carbs,
          fat: found.fat
        };
      }
    }
    console.log('No existing nutrients found');
    return null;
  };

  // 1. CARICAMENTO DATI PASTI DA SUPABASE
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

  // 2. CARICAMENTO OBIETTIVI DA SUPABASE
  useEffect(() => {
    const fetchGoals = async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', 1)
        .single();

      if (data && !error) {
        setGoals({
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat
        });
      }
    };
    fetchGoals();
  }, []);

  useEffect(() => {
    if (todayButtonRef.current && currentView === 'calculator') {
      setTimeout(() => {
        todayButtonRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }, 100);
    }
  }, [currentView]);

  // --- FUNZIONI PER GESTIRE GLI OBIETTIVI ---
  const handleUpdateGoal = (macro, value) => {
    setGoals(prev => ({ ...prev, [macro]: Number(value) }));
  };

  const saveGoalsToDB = async () => {
    const { error } = await supabase
      .from('goals')
      .update({
        calories: goals.calories,
        protein: goals.protein,
        carbs: goals.carbs,
        fat: goals.fat,
      })
      .eq('id', 1);

    if (error) {
      console.error("Errore salvataggio obiettivi:", error.message);
    }
  };

  // --- LOGICA AGGIUNTA PASTI E PIATTI ---


  const handleAddMeal = async () => {
    if (!meal.trim() || !quantity || isNaN(quantity) || quantity <= 0) {
      alert("Inserisci un cibo valido e una quantità positiva!");
      return;
    }
    if (selectedDate > getTodayDate()) {
      alert("Non puoi aggiungere pasti a giorni futuri!");
      return;
    }

    setLoading(true);
    try {
      let data;
      const existing = findExistingNutrients(meal, quantityType, quantity);
      console.log('Searching for existing nutrients:', { meal, quantityType, quantity, existing });

      if (existing && existing.calories > 0) {
        data = {
          food: existing.food, calories: existing.calories, protein: existing.protein, carbs: existing.carbs, fat: existing.fat
        };
        console.log('Using cached data:', data);
      } else {
        if (existing) console.log('Cached data has zero calories, calling API');
        console.log('Calling API for:', { meal: meal.trim(), quantity: parseFloat(quantity), quantityType });
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meal: meal.trim(), quantity: parseFloat(quantity), quantityType })
        });
        if (!response.ok) throw new Error(`Errore API: ${response.status}`);
        data = await response.json();
        console.log('API response:', data);
      }
      
      const newDish = {
        id: Date.now() + Math.random(), food: data.food || meal.trim(), grams: Number(data.grams) || 0, quantityType, quantity: parseFloat(quantity), calories: Number(data.calories) || 0, protein: Number(data.protein) || 0, carbs: Number(data.carbs) || 0, fat: Number(data.fat) || 0,
      };

      if (targetCardId) {
        const targetCard = logs.find(c => c.id === targetCardId);
        const updatedDishes = [...targetCard.dishes, newDish];
        const { error } = await supabase.from('meals').update({ dishes: updatedDishes }).eq('id', targetCardId);
        if (error) throw error;
        setLogs((prev) => prev.map((card) => card.id === targetCardId ? { ...card, dishes: updatedDishes } : card));
      } else {
        const existingMealCard = logs.find(c => c.category === category && c.date === selectedDate);
        if (existingMealCard) {
          const updatedDishes = [...existingMealCard.dishes, newDish];
          const { error } = await supabase.from('meals').update({ dishes: updatedDishes }).eq('id', existingMealCard.id);
          if (error) throw error;
          setLogs((prev) => prev.map((card) => card.id === existingMealCard.id ? { ...card, dishes: updatedDishes } : card));
        } else {
          const newCard = { category, dishes: [newDish], date: selectedDate };
          const { data: insertedData, error } = await supabase.from('meals').insert([newCard]).select();
          if (error) throw error;
          setLogs((prev) => [insertedData[0], ...prev]);
        }
      }

      setMeal(''); setQuantity(''); setTargetCardId(null); setQuantityType('grams');
      if (mealInputRef.current) mealInputRef.current.focus();
    } catch (error) {
      alert(`Errore: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDishFromModal = async () => {
    if (!modalMeal.trim() || !modalQuantity || isNaN(modalQuantity) || modalQuantity <= 0) {
      alert("Inserisci un cibo valido e una quantità positiva!"); return;
    }
    if (selectedDate > getTodayDate()) {
      alert("Non puoi aggiungere pasti a giorni futuri!"); return;
    }

    setModalLoading(true);
    try {
      let data;
      const existing = findExistingNutrients(modalMeal, modalQuantityType, modalQuantity);

      if (existing && existing.calories > 0) {
        data = { food: existing.food, calories: existing.calories, protein: existing.protein, carbs: existing.carbs, fat: existing.fat };
      } else {
        if (existing) console.log('Cached data has zero calories, calling API for modal');
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meal: modalMeal.trim(), quantity: parseFloat(modalQuantity), quantityType: modalQuantityType })
        });
        if (!response.ok) throw new Error(`Errore API: ${response.status}`);
        data = await response.json();
      }
      
      const targetCard = logs.find(c => c.id === modalCardId);
      let updatedDishes;
      
      if (editingDishId) {
        updatedDishes = targetCard.dishes.map(d => d.id === editingDishId ? {
            ...d, food: data.food || modalMeal.trim(), grams: Number(data.grams) || 0, quantityType: modalQuantityType, quantity: parseFloat(modalQuantity), calories: Number(data.calories) || 0, protein: Number(data.protein) || 0, carbs: Number(data.carbs) || 0, fat: Number(data.fat) || 0,
          } : d);
      } else {
        const newDish = { id: Date.now() + Math.random(), food: data.food || modalMeal.trim(), grams: Number(data.grams) || 0, quantityType: modalQuantityType, quantity: parseFloat(modalQuantity), calories: Number(data.calories) || 0, protein: Number(data.protein) || 0, carbs: Number(data.carbs) || 0, fat: Number(data.fat) || 0, };
        updatedDishes = [...targetCard.dishes, newDish];
      }

      const { error } = await supabase.from('meals').update({ dishes: updatedDishes }).eq('id', modalCardId);
      if (error) throw error;
      setLogs((prev) => prev.map((card) => card.id === modalCardId ? { ...card, dishes: updatedDishes } : card));
      closeModal();
    } catch (error) {
      alert(`Errore: ${error.message}`);
    } finally {
      setModalLoading(false);
    }
  };

  // ... (Tutte le funzioni di cancellazione rimangono identiche)
  const clearLogs = async () => {
    if(window.confirm("Sei sicuro di voler cancellare tutti i pasti del giorno selezionato? Questa operazione è irreversibile.")) {
      const { error } = await supabase.from('meals').delete().eq('date', selectedDate);
      if (!error) {
        setLogs((prev) => prev.filter((card) => card.date !== selectedDate));
      } else {
        alert("Errore durante la cancellazione");
      }
    }
  };

  const handleAddAnotherDish = (cardId, entryCategory) => {
    setModalCardId(cardId); setModalCardCategory(entryCategory); setModalMeal(''); setModalQuantity(''); setModalQuantityType('grams'); setEditingDishId(null); setShowDishModal(true);
  };

  const handleEditDish = (cardId, dish) => {
    setModalCardId(cardId); setModalMeal(dish.food); setModalQuantity(dish.quantity.toString()); setModalQuantityType(dish.quantityType); setEditingDishId(dish.id); setShowDishModal(true);
  };

  const closeModal = () => {
    setShowDishModal(false); setModalCardId(null); setModalCardCategory(''); setModalMeal(''); setModalQuantity(''); setModalQuantityType('grams'); setEditingDishId(null); setModalLoading(false);
  };

  const handleRemoveCard = async (cardId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa card pasto?")) return;
    const { error } = await supabase.from('meals').delete().eq('id', cardId);
    if (!error) setLogs((prev) => prev.filter((card) => card.id !== cardId)); else alert("Errore durante l'eliminazione");
  };

  const handleRemoveDish = async (cardId, dishId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo piatto?")) return;
    const card = logs.find(c => c.id === cardId);
    const reducedDishes = card.dishes.filter((dish) => dish.id !== dishId);

    if (reducedDishes.length === 0) { handleRemoveCard(cardId); } 
    else {
      const { error } = await supabase.from('meals').update({ dishes: reducedDishes }).eq('id', cardId);
      if (!error) setLogs((prev) => prev.map((c) => c.id === cardId ? { ...c, dishes: reducedDishes } : c)); else alert("Errore durante l'aggiornamento");
    }
  };

  // Calcolo dei totali giornalieri per le barre di progresso
  const dailyTotals = dailyLogs.reduce((acc, card) => {
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

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden text-white">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600 rounded-full mix-blend-multiply opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply opacity-10 blur-3xl"></div>
      </div>

      {/* PULSANTE HAMBURGER MENU SEMPRE FISSO IN ALTO */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-0 left-0 z-50 p-3 mt-2 ml-2 bg-slate-900 border border-violet-700 border-opacity-50 rounded-xl text-white hover:bg-slate-800 transition-all shadow-lg shadow-violet-500/20"
        style={{ position: 'fixed', top: 0, left: 0 }}
        aria-label="Apri menu"
      >
        <div className="space-y-1.5">
          <div className="w-6 h-0.5 bg-white rounded-full"></div>
          <div className="w-6 h-0.5 bg-white rounded-full"></div>
          <div className="w-6 h-0.5 bg-white rounded-full"></div>
        </div>
      </button>

      {/* SIDEBAR LATERALE */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex animate-in fade-in duration-200" onClick={() => setIsSidebarOpen(false)}>
          <div 
            className="w-72 bg-slate-950 border-r border-violet-700 border-opacity-50 h-full p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-left duration-300"
            onClick={e => e.stopPropagation()} 
          >
            <div className="flex justify-between items-center mb-8 mt-2">
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">Menu</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white text-2xl font-bold">✕</button>
            </div>
            
            <button 
              onClick={() => { setCurrentView('calculator'); setIsSidebarOpen(false); }}
              className={`text-left px-4 py-4 rounded-xl font-bold transition-all flex items-center gap-3 ${currentView === 'calculator' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : 'text-gray-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <span className="text-xl">🍽️</span> Calories Calculator
            </button>
            <button 
              onClick={() => { setCurrentView('goals'); setIsSidebarOpen(false); }}
              className={`text-left px-4 py-4 rounded-xl font-bold transition-all flex items-center gap-3 ${currentView === 'goals' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : 'text-gray-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <span className="text-xl">🎯</span> Miei Obiettivi
            </button>
          </div>
        </div>
      )}

      {/* CONTENITORE PRINCIPALE */}
      <div className="relative z-10 min-h-screen p-2 pt-16 md:p-8 md:pt-8 font-sans">
        <div className="max-w-full md:max-w-4xl mx-auto">
          
          {/* HEADER COMUNE AD ENTRAMBE LE PAGINE */}
          <header className="mb-8 text-center">
            <div className="inline-block mb-2">
              <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600 leading-tight">Calories Calculator</h1>
              <p className="text-cyan-400 text-xs xs:text-sm tracking-widest mt-1 font-semibold">Your Daily Nutrition Monitor</p>
            </div>
          </header>

          {/* RENDER CONDIZIONALE DELLE PAGINE */}
          {currentView === 'goals' ? (
            /* --- PAGINA MIEI OBIETTIVI --- */
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-bold mb-8 text-white flex items-center gap-3 justify-center">
                <span>🎯</span> Imposta i tuoi Obiettivi
              </h2>
              <p className="text-center text-gray-400 mb-8 max-w-lg mx-auto">
                Modifica i valori qui sotto. Le percentuali nella pagina principale si aggiorneranno automaticamente. I dati verranno salvati quando clicchi fuori dal riquadro.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <EditableStatCard 
                  label="Obiettivo Calorie" value={goals.calories} unit="kcal" icon="🔥" gradient="from-orange-500 to-red-600"
                  onChange={(e) => handleUpdateGoal('calories', e.target.value)} onBlur={saveGoalsToDB}
                />
                <EditableStatCard 
                  label="Obiettivo Proteine" value={goals.protein} unit="g" icon="🥩" gradient="from-blue-500 to-cyan-600"
                  onChange={(e) => handleUpdateGoal('protein', e.target.value)} onBlur={saveGoalsToDB}
                />
                <EditableStatCard 
                  label="Obiettivo Carboidrati" value={goals.carbs} unit="g" icon="🌾" gradient="from-yellow-400 to-orange-500"
                  onChange={(e) => handleUpdateGoal('carbs', e.target.value)} onBlur={saveGoalsToDB}
                />
                <EditableStatCard 
                  label="Obiettivo Grassi" value={goals.fat} unit="g" icon="🥑" gradient="from-green-400 to-emerald-600"
                  onChange={(e) => handleUpdateGoal('fat', e.target.value)} onBlur={saveGoalsToDB}
                />
              </div>
            </div>
          ) : (
            /* --- PAGINA PRINCIPALE: CALORIES CALCULATOR --- */
            <div className="animate-in fade-in duration-500">
              {/* Calendario Orizzontale */}
              <div className="mb-6 flex items-center justify-center gap-2 xs:gap-3 sm:gap-4">
                <button 
                  onClick={() => setSelectedDate(new Date(new Date(selectedDate).getTime() - 86400000).toISOString().split('T')[0])}
                  className="px-4 py-2 text-violet-400 hover:text-white transition-colors text-xl font-bold"
                >←</button>

                <div className="flex gap-1 xs:gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-[220px] xs:max-w-[280px] md:max-w-3xl">
                  {Array.from({ length: 30 }, (_, i) => {
                    const date = new Date(new Date().getTime() - (14 - i) * 86400000).toISOString().split('T')[0];
                    const isSelected = date === selectedDate;
                    const isToday = date === getTodayDate();
                    
                    return (
                      <button
                        key={date}
                        ref={isToday ? todayButtonRef : null}
                        onClick={() => date <= getTodayDate() && setSelectedDate(date)}
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
                    if (next <= getTodayDate()) setSelectedDate(next);
                  }}
                  className={`px-4 py-2 text-xl font-bold transition-colors ${new Date(new Date(selectedDate).getTime() + 86400000).toISOString().split('T')[0] > getTodayDate() ? 'text-gray-700 cursor-not-allowed' : 'text-violet-400 hover:text-white'}`}
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
                ${selectedDate > getTodayDate() ? 'opacity-50 pointer-events-none grayscale' : ''}
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
                  {dailyLogs.map((log) => {
                    const cardTotals = log.dishes.reduce((cAcc, dish) => ({
                      calories: cAcc.calories + Number(dish.calories), protein: cAcc.protein + Number(dish.protein), carbs: cAcc.carbs + Number(dish.carbs), fat: cAcc.fat + Number(dish.fat),
                    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

                    return (
                      <div key={log.id} className="bg-slate-900 border border-violet-700 border-opacity-30 p-6 rounded-2xl hover:border-opacity-70 transition-all duration-300 group hover:shadow-lg hover:shadow-violet-500/20 hover:-translate-y-0.5">
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
                            <button onClick={() => handleRemoveCard(log.id)} className="text-xs text-red-400 hover:text-red-500 font-semibold transition-colors opacity-60 hover:opacity-100">
                              Elimina pasto
                            </button>
                            <button onClick={() => handleAddAnotherDish(log.id, log.category)} className="text-xs text-violet-400 hover:text-violet-200 font-semibold transition-colors bg-slate-800 px-3 py-1.5 rounded-lg border border-violet-700 border-opacity-30">
                              + Nuovo piatto
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 mt-4">
                          {log.dishes.map((dish) => (
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
                                <button onClick={() => handleEditDish(log.id, dish)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-violet-600 text-white transition-all transform active:scale-90" title="Modifica">
                                  ✏️
                                </button>
                                <button onClick={() => handleRemoveDish(log.id, dish.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-red-500 text-white transition-all transform active:scale-90">
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
          )}
        </div>
      </div>

      {/* MODALE PER AGGIUNGERE/MODIFICARE PIATTI (Visibile in entrambe le viste se attivato) */}
      {showDishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-violet-700 border-opacity-50 rounded-3xl p-6 xs:p-8 w-full max-w-md shadow-2xl transform animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              {editingDishId ? '✏️ Modifica piatto' : '✚ Aggiungi piatto'}
            </h2>
            <p className="text-gray-400 text-sm mb-6 uppercase tracking-wider font-bold">In: {modalCardCategory}</p>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-xs font-bold text-violet-400 uppercase mb-2 block">Nome alimento</label>
                <input 
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-violet-700 border-opacity-30 text-white outline-none focus:ring-2 focus:ring-violet-500 focus:ring-opacity-30 transition-all text-base min-h-[48px]"
                  type="text" placeholder="Es: Petto di pollo" 
                  value={modalMeal} onChange={(e) => setModalMeal(e.target.value)} autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-violet-400 uppercase mb-2 block">Quantità</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-violet-700 border-opacity-30 text-white outline-none focus:ring-2 focus:ring-violet-500 focus:ring-opacity-30 transition-all text-base min-h-[48px]"
                    type="number" min="0" step="any" placeholder="Es: 150"
                    value={modalQuantity} onChange={(e) => setModalQuantity(e.target.value)}
                  />
                  <select
                    className="px-4 py-3 rounded-xl bg-slate-800 border border-violet-700 border-opacity-30 text-white outline-none focus:ring-2 focus:ring-violet-500 focus:ring-opacity-30 transition-all text-base min-h-[48px] sm:min-h-[auto]"
                    value={modalQuantityType} onChange={(e) => setModalQuantityType(e.target.value)}
                  >
                    <option value="grams">grammi (g)</option>
                    <option value="unit">unità</option>
                    <option value="teaspoon">cucchiaino</option>
                    <option value="tablespoon">cucchiaio</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={closeModal} className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-300 bg-slate-800 hover:bg-slate-700 transition-all active:scale-95 min-h-[48px] text-base">
                Annulla
              </button>
              <button
                onClick={handleAddDishFromModal} disabled={modalLoading}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-white transition-all active:scale-95 min-h-[48px] text-base ${ 
                  modalLoading ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:shadow-lg hover:shadow-violet-500/50'
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

// --- COMPONENTI ACCESSORI AGGIORNATI ---

// Aggiunta la barra della percentuale
const StatCard = ({ label, value, unit, icon, gradient, percentage }) => (
  <div className={`bg-gradient-to-br ${gradient} p-6 rounded-2xl text-white shadow-lg border border-white border-opacity-10 group hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between`}>
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase font-bold opacity-90 tracking-wider">{label}</p>
        <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-black">{value}</span>
        <span className="text-xs font-semibold opacity-80">{unit}</span>
      </div>
    </div>
    {percentage !== undefined && (
      <div className="mt-4">
        <div className="h-1.5 w-full bg-black bg-opacity-30 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${percentage > 100 ? 'bg-red-400' : 'bg-white'}`} 
            style={{ width: `${Math.min(percentage, 100)}%` }} 
          />
        </div>
        <p className={`text-[10px] mt-1 font-bold text-right opacity-90 ${percentage > 100 ? 'text-red-300' : ''}`}>
          {percentage}% {percentage > 100 ? '(Superato)' : ''}
        </p>
      </div>
    )}
  </div>
);

// Nuova card modificabile per la pagina obiettivi
const EditableStatCard = ({ label, value, unit, icon, gradient, onChange, onBlur }) => (
  <div className={`bg-gradient-to-br ${gradient} p-6 rounded-2xl text-white shadow-lg border border-white border-opacity-10`}>
    <div className="flex items-center justify-between mb-4">
      <p className="text-xs uppercase font-bold opacity-90 tracking-wider">{label}</p>
      <span className="text-2xl">{icon}</span>
    </div>
    <div className="flex items-baseline gap-2 bg-black bg-opacity-20 p-2 rounded-xl border border-transparent focus-within:border-white focus-within:border-opacity-30 transition-all">
      <input
        type="number"
        value={value}
        onChange={onChange}
        onBlur={onBlur} // Salva su database al click esterno
        className="text-2xl font-black bg-transparent border-none outline-none w-full text-right"
      />
      <span className="text-sm font-semibold opacity-80">{unit}</span>
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