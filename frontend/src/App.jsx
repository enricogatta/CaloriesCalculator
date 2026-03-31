import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Importazione del client Supabase
import Sidebar from './components/Layout/Sidebar';
import DayCard from './components/Calculator/DayCard';
import DishModal from './components/Modals/DishModal';
import EditableStatCard from './components/UI/EditableStatCard';

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
    for (const log of logs) {
      const found = log.dishes.find(d => {
        const dQuantityNum = parseFloat(d.quantity);
        return d.food.toLowerCase() === normalizedSearch && d.quantityType === quantityType && dQuantityNum === quantityNum;
      });
      if (found) {
        return {
          food: found.food,
          calories: found.calories,
          protein: found.protein,
          carbs: found.carbs,
          fat: found.fat
        };
      }
    }
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

      if (existing && existing.calories > 0) {
        data = {
          food: existing.food, calories: existing.calories, protein: existing.protein, carbs: existing.carbs, fat: existing.fat
        };
      } else {
        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meal: meal.trim(), quantity: parseFloat(quantity), quantityType })
        });
        if (!response.ok) throw new Error(`Errore API: ${response.status}`);
        data = await response.json();
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
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

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
              <DayCard
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                getTodayDate={getTodayDate}
                dailyTotals={dailyTotals}
                goals={goals}
                category={category}
                setCategory={setCategory}
                meal={meal}
                setMeal={setMeal}
                quantity={quantity}
                setQuantity={setQuantity}
                quantityType={quantityType}
                setQuantityType={setQuantityType}
                handleAddMeal={handleAddMeal}
                loading={loading}
                mealInputRef={mealInputRef}
                dailyLogs={dailyLogs}
                clearLogs={clearLogs}
                onEditDish={handleEditDish}
                onDeleteDish={handleRemoveDish}
                onDeleteMeal={handleRemoveCard}
                onAddDish={handleAddAnotherDish}
                todayButtonRef={todayButtonRef}
              />
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

export default App;