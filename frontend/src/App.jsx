import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './supabaseClient';
import Sidebar from './components/Layout/Sidebar';
import DayCard from './components/Calculator/DayCard';
import DishModal from './components/Modals/DishModal';
import EditableStatCard from './components/UI/EditableStatCard';
import LoadingScreen from './components/UI/LoadingScreen';
import ApiKeySettings from './components/Settings/ApiKeySettings';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const getLocalDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const App = ({ user, onSignOut }) => {
  const [meal, setMeal] = useState('');
  const [quantityType, setQuantityType] = useState('grams');
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
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr());
  const [editingDishId, setEditingDishId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('calculator');
  const [syncLoading, setSyncLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [goals, setGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 70
  });

  const mealInputRef = React.useRef(null);
  const pendingApiRequestsRef = React.useRef(new Map());

  const getTodayDate = useCallback(() => getLocalDateStr(), []);
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
    if (pending) return pending;

    const requestPromise = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          meal: String(foodName || '').trim(),
          quantity: parseFloat(qty),
          quantityType: qtyType
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `Errore API: ${response.status}`);
      return payload;
    })();

    pendingApiRequestsRef.current.set(key, requestPromise);
    try {
      return await requestPromise;
    } finally {
      pendingApiRequestsRef.current.delete(key);
    }
  }, [getAnalyzeKey]);

  // Cerca il cibo nella food library in memoria (logs già caricati).
  // Ricalcola i macro sulla nuova quantità usando i valori per-unità da foods.
  const findExistingNutrients = useCallback((foodName, qty_type, quantity) => {
    const normalizedSearch = foodName.trim().toLowerCase();
    const normalizedQT = (qty_type || '').trim().toLowerCase();
    const targetQuantity = Number(quantity);

    if (!normalizedSearch || !Number.isFinite(targetQuantity) || targetQuantity <= 0) return null;

    const round1 = (v) => Math.round(v * 10) / 10;

    for (const log of logs) {
      const dishes = Array.isArray(log.dishes) ? log.dishes : [];
      for (const dish of dishes) {
        if ((dish.food || '').trim().toLowerCase() !== normalizedSearch) continue;
        if ((dish.quantityType || '').trim().toLowerCase() !== normalizedQT) continue;

        const cpU = Number(dish.caloriesPerUnit) || 0;
        const ppU = Number(dish.proteinPerUnit) || 0;
        const crpU = Number(dish.carbsPerUnit) || 0;
        const fpU = Number(dish.fatPerUnit) || 0;

        if (cpU <= 0) continue;

        return {
          food: dish.food,
          grams: normalizedQT === 'grams' ? targetQuantity : Number(dish.grams) || 0,
          calories: Math.round(cpU * targetQuantity),
          protein: round1(ppU * targetQuantity),
          carbs: round1(crpU * targetQuantity),
          fat: round1(fpU * targetQuantity),
          caloriesPerUnit: cpU,
          proteinPerUnit: ppU,
          carbsPerUnit: crpU,
          fatPerUnit: fpU,
        };
      }
    }
    return null;
  }, [logs]);

  // Normalizza il risultato della query Supabase (meals + meal_items + foods)
  // nel formato { ...meal, dishes: [...] } usato dai componenti.
  const normalizeMeals = useCallback((data) => {
    return (data || []).map(meal => ({
      ...meal,
      dishes: (meal.meal_items || [])
        .sort((a, b) => a.position - b.position)
        .map(item => ({
          id: item.id,
          food: item.foods?.name ?? '',
          food_id: item.food_id,
          grams: Number(item.grams) || 0,
          quantityType: item.quantity_type,
          quantity: Number(item.quantity) || 0,
          calories: Number(item.calories) || 0,
          protein: Number(item.protein) || 0,
          carbs: Number(item.carbs) || 0,
          fat: Number(item.fat) || 0,
          caloriesPerUnit: Number(item.foods?.calories_per_unit) || 0,
          proteinPerUnit: Number(item.foods?.protein_per_unit) || 0,
          carbsPerUnit: Number(item.foods?.carbs_per_unit) || 0,
          fatPerUnit: Number(item.foods?.fat_per_unit) || 0,
        })),
    }));
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('meals')
        .select(`
          id, category, date, created_at,
          meal_items (
            id, position, quantity, quantity_type, grams,
            calories, protein, carbs, fat, food_id,
            foods (
              id, name, default_quantity_type,
              calories_per_unit, protein_per_unit,
              carbs_per_unit, fat_per_unit
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Errore caricamento meals:', error);
      } else {
        setLogs(normalizeMeals(data));
      }
    } catch (err) {
      console.error('❌ Eccezione durante caricamento:', err);
    }
  }, [user.id, normalizeMeals]);

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
      const defaultGoals = { user_id: user.id, calories: 2000, protein: 150, carbs: 250, fat: 70 };
      const { error: insertError } = await supabase.from('goals').insert(defaultGoals);
      if (insertError) console.error('❌ Errore inizializzazione goals:', insertError.message);
      setGoals({ calories: 2000, protein: 150, carbs: 250, fat: 70 });
    }
  }, [user.id]);

  useEffect(() => {
    let isMounted = true;
    const bootstrapApp = async () => {
      try {
        await Promise.all([fetchLogs(), fetchGoals()]);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    };
    bootstrapApp();
    return () => { isMounted = false; };
  }, [fetchLogs, fetchGoals]);

  const handleSyncWithSupabase = useCallback(async () => {
    setIsSidebarOpen(false);
    setSyncLoading(true);
    setSelectedDate(getTodayDate());
    try {
      await Promise.all([fetchLogs(), fetchGoals()]);
    } finally {
      setSyncLoading(false);
    }
  }, [fetchLogs, fetchGoals, getTodayDate]);

const handleUpdateGoal = useCallback((macro, value) => {
    setGoals(prev => ({ ...prev, [macro]: Number(value) }));
  }, []);

  const saveGoalsToDB = useCallback(async () => {
    const { error } = await supabase
      .from('goals')
      .upsert({
        user_id: user.id,
        calories: goals.calories,
        protein: goals.protein,
        carbs: goals.carbs,
        fat: goals.fat,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    if (error) console.error("Errore salvataggio obiettivi:", error.message);
  }, [goals, user.id]);

  // Costruisce l'oggetto dati nutrizionali dal risultato API o dall'esistente in memoria.
  const buildNutritionData = useCallback((source, qty, qtyType) => {
    const currentQuantity = parseFloat(qty);
    if ('caloriesPerUnit' in source) {
      // Proveniente da findExistingNutrients: già ha i perUnit
      return source;
    }
    // Proveniente dall'API Gemini
    return {
      food: (source.food || '').toLowerCase().trim(),
      grams: Number(source.grams) || (qtyType === 'grams' ? currentQuantity : 0),
      calories: Number(source.calories) || 0,
      protein: Number(source.protein) || 0,
      carbs: Number(source.carbs) || 0,
      fat: Number(source.fat) || 0,
      caloriesPerUnit: (Number(source.calories) || 0) / currentQuantity,
      proteinPerUnit: (Number(source.protein) || 0) / currentQuantity,
      carbsPerUnit: (Number(source.carbs) || 0) / currentQuantity,
      fatPerUnit: (Number(source.fat) || 0) / currentQuantity,
    };
  }, []);

  // Upsert in foods e ritorna il record. Il nome viene normalizzato in minuscolo.
  const upsertFood = useCallback(async (nutritionData, qtyType) => {
    const foodName = (nutritionData.food || '').toLowerCase().trim();
    const { data, error } = await supabase
      .from('foods')
      .upsert({
        user_id: user.id,
        name: foodName,
        default_quantity_type: qtyType,
        calories_per_unit: nutritionData.caloriesPerUnit,
        protein_per_unit: nutritionData.proteinPerUnit,
        carbs_per_unit: nutritionData.carbsPerUnit,
        fat_per_unit: nutritionData.fatPerUnit,
      }, { onConflict: 'user_id,name,default_quantity_type' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, [user.id]);

  const handleAddMeal = async () => {
    if (!meal.trim() || !quantity || isNaN(quantity) || quantity <= 0) {
      alert("Inserisci un cibo valido e una quantità positiva!"); return;
    }

    setLoading(true);
    try {
      const existing = findExistingNutrients(meal, quantityType, quantity);
      let nutritionData;
      if (existing && existing.calories > 0) {
        nutritionData = existing;
      } else {
        const apiData = await fetchNutritionFromApi(meal.trim(), quantity, quantityType);
        nutritionData = buildNutritionData(apiData, quantity, quantityType);
      }

      const foodRecord = await upsertFood(nutritionData, quantityType);

      // Trova o crea la meal card
      let mealId;
      if (targetCardId) {
        mealId = targetCardId;
      } else {
        const existingCard = logs.find(c => c.category === category && c.date === selectedDate);
        if (existingCard) {
          mealId = existingCard.id;
        } else {
          const { data: newCard, error: cardError } = await supabase
            .from('meals')
            .insert([{ category, date: selectedDate, user_id: user.id }])
            .select()
            .single();
          if (cardError) throw cardError;
          mealId = newCard.id;
        }
      }

      const targetCard = logs.find(c => c.id === mealId);
      const position = targetCard ? (targetCard.dishes?.length || 0) : 0;

      const { error: itemError } = await supabase.from('meal_items').insert({
        meal_id: mealId,
        food_id: foodRecord.id,
        quantity: parseFloat(quantity),
        quantity_type: quantityType,
        grams: nutritionData.grams,
        calories: nutritionData.calories,
        protein: nutritionData.protein,
        carbs: nutritionData.carbs,
        fat: nutritionData.fat,
        position,
      });
      if (itemError) throw itemError;

      await fetchLogs();
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

    setModalLoading(true);
    try {
      const existing = findExistingNutrients(modalMeal, modalQuantityType, modalQuantity);
      let nutritionData;
      if (existing && existing.calories > 0) {
        nutritionData = existing;
      } else {
        const apiData = await fetchNutritionFromApi(modalMeal.trim(), modalQuantity, modalQuantityType);
        nutritionData = buildNutritionData(apiData, modalQuantity, modalQuantityType);
      }

      const foodRecord = await upsertFood(nutritionData, modalQuantityType);

      if (editingDishId) {
        // Modifica meal_item esistente (editingDishId è l'UUID di meal_items)
        const { error } = await supabase
          .from('meal_items')
          .update({
            food_id: foodRecord.id,
            quantity: parseFloat(modalQuantity),
            quantity_type: modalQuantityType,
            grams: nutritionData.grams,
            calories: nutritionData.calories,
            protein: nutritionData.protein,
            carbs: nutritionData.carbs,
            fat: nutritionData.fat,
          })
          .eq('id', editingDishId);
        if (error) throw error;
      } else {
        // Nuovo piatto nella card esistente
        const targetCard = logs.find(c => c.id === modalCardId);
        const position = targetCard ? (targetCard.dishes?.length || 0) : 0;
        const { error } = await supabase.from('meal_items').insert({
          meal_id: modalCardId,
          food_id: foodRecord.id,
          quantity: parseFloat(modalQuantity),
          quantity_type: modalQuantityType,
          grams: nutritionData.grams,
          calories: nutritionData.calories,
          protein: nutritionData.protein,
          carbs: nutritionData.carbs,
          fat: nutritionData.fat,
          position,
        });
        if (error) throw error;
      }

      await fetchLogs();
      closeModal();
    } catch (error) {
      alert(`Errore: ${error.message}`);
    } finally {
      setModalLoading(false);
    }
  };

  const clearLogs = async () => {
    if (window.confirm("Sei sicuro di voler cancellare tutti i pasti del giorno selezionato? Questa operazione è irreversibile.")) {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('user_id', user.id)
        .eq('date', selectedDate);
      if (!error) {
        setLogs(prev => prev.filter(card => card.date !== selectedDate));
      } else {
        alert("Errore durante la cancellazione");
      }
    }
  };

  const handleAddAnotherDish = (cardId, entryCategory) => {
    setModalCardId(cardId); setModalCardCategory(entryCategory);
    setModalMeal(''); setModalQuantity(''); setModalQuantityType('grams');
    setEditingDishId(null); setShowDishModal(true);
  };

  const handleEditDish = (cardId, dish) => {
    setModalCardId(cardId);
    setModalMeal(dish.food);
    setModalQuantity(dish.quantity.toString());
    setModalQuantityType(dish.quantityType);
    setEditingDishId(dish.id); // dish.id è l'UUID di meal_items
    setShowDishModal(true);
  };

  const closeModal = () => {
    setShowDishModal(false); setModalCardId(null); setModalCardCategory('');
    setModalMeal(''); setModalQuantity(''); setModalQuantityType('grams');
    setEditingDishId(null); setModalLoading(false);
  };

  const handleRemoveCard = async (cardId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa card pasto?")) return;
    const { error } = await supabase.from('meals').delete().eq('id', cardId);
    if (!error) {
      setLogs(prev => prev.filter(card => card.id !== cardId));
    } else {
      alert("Errore durante l'eliminazione");
    }
  };

  const handleRemoveDish = async (cardId, dishId) => {
    // dishId è l'UUID di meal_items
    if (!window.confirm("Sei sicuro di voler eliminare questo piatto?")) return;
    const card = logs.find(c => c.id === cardId);

    if (card?.dishes?.length === 1) {
      // Ultimo piatto: elimina l'intera card (meal_items eliminati in cascade)
      const { error } = await supabase.from('meals').delete().eq('id', cardId);
      if (!error) {
        setLogs(prev => prev.filter(c => c.id !== cardId));
      } else {
        alert("Errore durante l'eliminazione");
      }
    } else {
      const { error } = await supabase.from('meal_items').delete().eq('id', dishId);
      if (!error) {
        await fetchLogs();
      } else {
        alert("Errore durante l'aggiornamento");
      }
    }
  };

  // Lista cibi unici dell'utente, derivata dai logs già caricati — nessuna query extra.
  const userFoods = useMemo(() => {
    const seen = new Map();
    for (const log of logs) {
      for (const dish of (log.dishes || [])) {
        if (!dish.food) continue;
        const key = `${dish.food}|${dish.quantityType}`;
        if (!seen.has(key)) {
          seen.set(key, { name: dish.food, default_quantity_type: dish.quantityType });
        }
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [logs]);

  const minLogDate = useMemo(() => {
    const logDates = logs.map(l => l.date).filter(Boolean);
    if (logDates.length === 0) return getLocalDateStr(new Date(Date.now() - 30 * 86400000));
    return logDates.reduce((min, date) => date < min ? date : min);
  }, [logs]);

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

  if (initialLoading) return <LoadingScreen message="Caricamento dati in corso..." />;
  if (syncLoading) return <LoadingScreen message="Sincronizzazione in corso..." />;

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600 rounded-full mix-blend-multiply opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply opacity-10 blur-3xl"></div>
      </div>

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

      <div className="relative z-10 min-h-screen p-2 pt-16 md:p-8 md:pt-8 font-sans">
        <div className="max-w-full md:max-w-4xl mx-auto">

          <header className="mb-8 text-center">
            <div className="inline-block mb-2">
              <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600 leading-tight">Calories Calculator</h1>
              <p className="text-cyan-400 text-xs xs:text-sm tracking-widest mt-1 font-semibold">Your Daily Nutrition Monitor</p>
            </div>
          </header>

          {currentView === 'goals' ? (
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
          ) : currentView === 'settings' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ApiKeySettings user={user} />
            </div>
          ) : (
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
                userFoods={userFoods}
                minLogDate={minLogDate}
              />
            </div>
          )}
        </div>
      </div>

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
        userFoods={userFoods}
      />
    </div>
  );
};

export default App;
