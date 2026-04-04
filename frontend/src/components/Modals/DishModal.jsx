import React from 'react';

const DishModal = ({
  showDishModal,
  closeModal,
  modalMeal,
  setModalMeal,
  modalQuantityType,
  setModalQuantityType,
  modalQuantity,
  setModalQuantity,
  modalCardId,
  modalCardCategory,
  editingDishId,
  handleAddDishFromModal,
  modalLoading
}) => (
  <>
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
  </>
);

export default React.memo(DishModal);