import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './supabaseClient'; // Importazione del client Supabase
import Sidebar from './components/Layout/Sidebar';
import DayCard from './components/Calculator/DayCard';
import DishModal from './components/Modals/DishModal';
import EditableStatCard from './components/UI/EditableStatCard';
import LoadingScreen from './components/UI/LoadingScreen';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const App = ({ user, onSignOut }) => {
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
  const [syncLoading, setSyncLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [goals, setGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 70
  });

  const mealInputRef = React.useRef(null);
  const todayButtonRef = React.useRef(null);
  const pendingApiRequestsRef = React.useRef(new Map());

  const getTodayDate = useCallback(() => new Date().toISOString().split('T')[0], []);
  const dailyLogs = useMemo(
    () => logs.filter(log => log.date === selectedDate),
    [logs, selectedDate]
  );

  const getAnalyzeKey = useCallback((foodName, qty, qtyType) => {
    const normalizedFood = String(foodName || '').trim().toLowerCase();
    const normalizedQty = Number(qty).toFixed(3);
    const normalizedQtyType = String(qtyType || '').trim().toLowerCase();
    return `${normalizedFood}|${normalizedQty}|${normalizedQtyType}`;
  }, []);

  const fetchNutritionFromApi = useCallback(async (foodName, qty, qtyType) => {
    const key = getAnalyzeKey(foodName, qty, qtyType);
    const pending = pendingApiRequestsRef.current.get(key);
    if (pending) {
      return pending;
    }

    const requestPromise = (async () => {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal: String(foodName || '').trim(),
          quantity: parseFloat(qty),
          quantityType: qtyType
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || `Errore API: ${response.status}`);
      }

      return payload;
    })();

    pendingApiRequestsRef.current.set(key, requestPromise);

    try {
      return await requestPromise;
    } finally {
      pendingApiRequestsRef.current.delete(key);
    }
  }, [getAnalyzeKey]);

  // Cerca un cibo già presente nei dati Supabase caricati e ricalcola i macro sulla nuova quantità.
  const findExistingNutrients = useCallback((foodName, quantityType, quantity) => {
    const normalizedSearch = foodName.trim().toLowerCase();
    const normalizedQuantityType = (quantityType || '').trim().toLowerCase();
    const targetQuantity = Number(quantity);

    if (!normalizedSearch || !Number.isFinite(targetQuantity) || targetQuantity <= 0) {
      return null;
    }

    const round1 = (value) => Math.round(value * 10) / 10;

    for (const log of logs) {
      const dishes = Array.isArray(log.dishes) ? log.dishes : [];

      for (const dish of dishes) {
        const dishFood = (dish.food || '').trim().toLowerCase();
        const dishQuantityType = (dish.quantityType || '').trim().toLowerCase();

        if (dishFood !== normalizedSearch || dishQuantityType !== normalizedQuantityType) {
          continue;
        }

        const storedQuantity = Number(dish.quantity);
        if (!Number.isFinite(storedQuantity) || storedQuantity <= 0) {
          continue;
        }

        // Per robustezza usiamo i macro reali salvati nel record e ricaviamo i valori per 1 unità di quantityType.
        const caloriesPerUnit = Number(dish.calories || 0) / storedQuantity;
        const proteinPerUnit = Number(dish.protein || 0) / storedQuantity;
        const carbsPerUnit = Number(dish.carbs || 0) / storedQuantity;
        const fatPerUnit = Number(dish.fat || 0) / storedQuantity;

        return {
          food: dish.food,
          grams: normalizedQuantityType === 'grams' ? targetQuantity : Number(dish.grams) || 0,
          calories: Math.round(caloriesPerUnit * targetQuantity),
          protein: round1(proteinPerUnit * targetQuantity),
          carbs: round1(carbsPerUnit * targetQuantity),
          fat: round1(fatPerUnit * targetQuantity),
          caloriesPerUnit,
          proteinPerUnit,
          carbsPerUnit,
          fatPerUnit
        };
      }
    }

    return null;
  }, [logs]);

  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Errore caricamento meals:', error);
      } else {
        setLogs(data || []);
      }
    } catch (err) {
      console.error('❌ Eccezione durante caricamento:', err);
    }
  }, [user.id]);

  const fetchGoals = useCallback(async () => {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('❌ Errore caricamento goals:', error.message);
      setGoals({ calories: 2000, protein: 150, carbs: 250, fat: 70 });
    } else if (data) {
      setGoals({
        calories: data.calories || 2000,
        protein: data.protein || 150,
        carbs: data.carbs || 250,
        fat: data.fat || 70
      });
    } else {
      // Prima volta: crea la riga di default per questo utente
      const defaultGoals = { user_id: user.id, calories: 2000, protein: 150, carbs: 250, fat: 70 };
      const { error: insertError } = await supabase.from('goals').insert(defaultGoals);
      if (insertError) console.error('❌ Errore inizializzazione goals:', insertError.message);
      setGoals({ calories: 2000, protein: 150, carbs: 250, fat: 70 });
    }
  }, [user.id]);

  // 1. CARICAMENTO DATI PASTI DA SUPABASE
  useEffect(() => {
    let isMounted = true;

    const bootstrapApp = async () => {
      try {
        await Promise.all([fetchLogs(), fetchGoals()]);
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    };

    bootstrapApp();

    return () => {
      isMounted = false;
    };
  }, [fetchLogs, fetchGoals]);

  const handleSyncWithSupabase = useCallback(async () => {
    setIsSidebarOpen(false);
    setSyncLoading(true);
    try {
      await Promise.all([fetchLogs(), fetchGoals()]);
    } finally {
      setSyncLoading(false);
    }
  }, [fetchLogs, fetchGoals]);

  useEffect(() => {
    if (initialLoading || syncLoading || currentView !== 'calculator') {
      return;
    }

    const scrollTimer = setTimeout(() => {
      todayButtonRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }, 120);

    return () => clearTimeout(scrollTimer);
  }, [initialLoading, syncLoading, currentView]);

  // --- FUNZIONI PER GESTIRE GLI OBIETTIVI ---
  const handleUpdateGoal = useCallback((macro, value) => {
    setGoals(prev => ({ ...prev, [macro]: Number(value) }));
  }, []);

  const saveGoalsToDB = useCallback(async () => {
    const payload = {
      user_id: user.id,
      calories: goals.calories,
      protein: goals.protein,
      carbs: goals.carbs,
      fat: goals.fat,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('goals')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.error("Errore salvataggio obiettivi:", error.message);
    }
  }, [goals, user.id]);

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
        // Usa i macro ricalcolati dal cibo esistente
        data = {
          food: existing.food,
          grams: existing.grams,
          calories: existing.calories,
          protein: existing.protein,
          carbs: existing.carbs,
          fat: existing.fat,
          caloriesPerUnit: existing.caloriesPerUnit,
          proteinPerUnit: existing.proteinPerUnit,
          carbsPerUnit: existing.carbsPerUnit,
          fatPerUnit: existing.fatPerUnit
        };
      } else {
        // Nuovo cibo: chiama l'API
        const apiData = await fetchNutritionFromApi(meal.trim(), quantity, quantityType);

        // Calcola i macro per 1 unità del quantityType corrente (1g, 1 unità, 1 cucchiaino, ...)
        const currentQuantity = parseFloat(quantity);
        data = {
          food: apiData.food || meal.trim(),
          grams: Number(apiData.grams) || (quantityType === 'grams' ? currentQuantity : 0),
          calories: Number(apiData.calories) || 0,
          protein: Number(apiData.protein) || 0,
          carbs: Number(apiData.carbs) || 0,
          fat: Number(apiData.fat) || 0,
          caloriesPerUnit: (Number(apiData.calories) || 0) / currentQuantity,
          proteinPerUnit: (Number(apiData.protein) || 0) / currentQuantity,
          carbsPerUnit: (Number(apiData.carbs) || 0) / currentQuantity,
          fatPerUnit: (Number(apiData.fat) || 0) / currentQuantity
        };
      }

      const newDish = {
        id: Date.now() + Math.random(),
        food: data.food,
        grams: Number(data.grams) || 0,
        quantityType,
        quantity: parseFloat(quantity),
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        caloriesPerUnit: data.caloriesPerUnit,
        proteinPerUnit: data.proteinPerUnit,
        carbsPerUnit: data.carbsPerUnit,
        fatPerUnit: data.fatPerUnit
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
          const newCard = { category, dishes: [newDish], date: selectedDate, user_id: user.id };
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
        // Usa i macro ricalcolati dal cibo esistente
        data = {
          food: existing.food,
          grams: existing.grams,
          calories: existing.calories,
          protein: existing.protein,
          carbs: existing.carbs,
          fat: existing.fat,
          caloriesPerUnit: existing.caloriesPerUnit,
          proteinPerUnit: existing.proteinPerUnit,
          carbsPerUnit: existing.carbsPerUnit,
          fatPerUnit: existing.fatPerUnit
        };
      } else {
        // Nuovo cibo: chiama l'API
        const apiData = await fetchNutritionFromApi(modalMeal.trim(), modalQuantity, modalQuantityType);

        // Calcola i macro per 1 unità del quantityType corrente (1g, 1 unità, 1 cucchiaino, ...)
        const currentQuantity = parseFloat(modalQuantity);
        data = {
          food: apiData.food || modalMeal.trim(),
          grams: Number(apiData.grams) || (modalQuantityType === 'grams' ? currentQuantity : 0),
          calories: Number(apiData.calories) || 0,
          protein: Number(apiData.protein) || 0,
          carbs: Number(apiData.carbs) || 0,
          fat: Number(apiData.fat) || 0,
          caloriesPerUnit: (Number(apiData.calories) || 0) / currentQuantity,
          proteinPerUnit: (Number(apiData.protein) || 0) / currentQuantity,
          carbsPerUnit: (Number(apiData.carbs) || 0) / currentQuantity,
          fatPerUnit: (Number(apiData.fat) || 0) / currentQuantity
        };
      }

      const targetCard = logs.find(c => c.id === modalCardId);
      let updatedDishes;

      if (editingDishId) {
        // Modifica piatto esistente
        updatedDishes = targetCard.dishes.map(d => d.id === editingDishId ? {
            ...d,
            food: data.food,
            grams: Number(data.grams) || 0,
            quantityType: modalQuantityType,
            quantity: parseFloat(modalQuantity),
            calories: data.calories,
            protein: data.protein,
            carbs: data.carbs,
            fat: data.fat,
            caloriesPerUnit: data.caloriesPerUnit,
            proteinPerUnit: data.proteinPerUnit,
            carbsPerUnit: data.carbsPerUnit,
            fatPerUnit: data.fatPerUnit
          } : d);
      } else {
        // Nuovo piatto
        const newDish = {
          id: Date.now() + Math.random(),
          food: data.food,
          grams: Number(data.grams) || 0,
          quantityType: modalQuantityType,
          quantity: parseFloat(modalQuantity),
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
          caloriesPerUnit: data.caloriesPerUnit,
          proteinPerUnit: data.proteinPerUnit,
          carbsPerUnit: data.carbsPerUnit,
          fatPerUnit: data.fatPerUnit
        };
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

    if (reducedDishes.length === 0) {
      // Il piatto è l'unico nella card: elimina direttamente il pasto senza una seconda conferma.
      const { error } = await supabase.from('meals').delete().eq('id', cardId);
      if (!error) {
        setLogs((prev) => prev.filter((c) => c.id !== cardId));
      } else {
        alert("Errore durante l'eliminazione");
      }
    }
    else {
      const { error } = await supabase.from('meals').update({ dishes: reducedDishes }).eq('id', cardId);
      if (!error) setLogs((prev) => prev.map((c) => c.id === cardId ? { ...c, dishes: reducedDishes } : c)); else alert("Errore durante l'aggiornamento");
    }
  };

  // Calcolo dei totali giornalieri per le barre di progresso
  const dailyTotals = useMemo(() => dailyLogs.reduce((acc, card) => {
    const dishes = Array.isArray(card.dishes) ? card.dishes : [];
    const cardTotals = dishes.reduce((cAcc, dish) => ({
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
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 }), [dailyLogs]);

  if (initialLoading) {
    return <LoadingScreen message="Caricamento dati in corso..." />;
  }

  if (syncLoading) {
    return <LoadingScreen message="Sincronizzazione in corso..." />;
  }

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
        onSync={handleSyncWithSupabase}
        syncLoading={syncLoading}
        onSignOut={onSignOut}
        userEmail={user.email}
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
      <DishModal
        showDishModal={showDishModal}
        closeModal={closeModal}
        modalMeal={modalMeal}
        setModalMeal={setModalMeal}
        modalQuantityType={modalQuantityType}
        setModalQuantityType={setModalQuantityType}
        modalQuantity={modalQuantity}
        setModalQuantity={setModalQuantity}
        modalCardId={modalCardId}
        modalCardCategory={modalCardCategory}
        editingDishId={editingDishId}
        handleAddDishFromModal={handleAddDishFromModal}
        modalLoading={modalLoading}
      />
    </div>
  );
};

// --- COMPONENTI ACCESSORI AGGIORNATI ---

export default App;