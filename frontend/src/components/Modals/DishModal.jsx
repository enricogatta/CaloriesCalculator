import React from 'react';
import FoodAutocomplete from '../UI/FoodAutocomplete';
import { CloseIcon, ChevronDownIcon, SpinnerIcon } from '../UI/Icons';

const inputClass =
  'w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-base text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-violet-400/60 min-h-[46px]';
const selectClass = `${inputClass} cursor-pointer appearance-none pr-9`;
const labelClass = 'mb-1.5 block text-xs font-medium text-zinc-400';

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
  modalLoading,
  userFoods,
}) => (
  <>
    {showDishModal && (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={closeModal}
      >
        <div
          className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border-t border-violet-400/30 bg-zinc-950 bg-gradient-to-br from-violet-500/25 to-violet-500/[0.08] p-5 sm:max-w-md sm:rounded-2xl sm:border sm:p-6"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">
                {editingDishId ? 'Modifica piatto' : 'Aggiungi piatto'}
              </h2>
              {modalCardCategory && (
                <p className="mt-0.5 text-xs font-medium text-zinc-500">{modalCardCategory}</p>
              )}
            </div>
            <button
              onClick={closeModal}
              className="-mt-1 -mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Chiudi"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          <div className="mb-6 space-y-4">
            <div>
              <label className={labelClass}>Alimento</label>
              <FoodAutocomplete
                value={modalMeal}
                onChange={(e) => setModalMeal(e.target.value)}
                onSelect={(food) => { setModalMeal(food.name); setModalQuantityType(food.default_quantity_type); }}
                foods={userFoods || []}
                placeholder="Es: petto di pollo"
                inputClassName={inputClass}
                autoFocus={!editingDishId}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Quantità</label>
                <input
                  className={inputClass}
                  type="number" min="0" step="any" placeholder="Es: 150"
                  value={modalQuantity} onChange={(e) => setModalQuantity(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Unità</label>
                <div className="relative">
                  <select
                    className={selectClass}
                    value={modalQuantityType} onChange={(e) => setModalQuantityType(e.target.value)}
                  >
                    <option value="grams">grammi (g)</option>
                    <option value="unit">unità</option>
                    <option value="teaspoon">cucchiaino</option>
                    <option value="tablespoon">cucchiaio</option>
                  </select>
                  <ChevronDownIcon
                    size={16}
                    className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-zinc-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={closeModal}
              className="flex h-[46px] flex-1 items-center justify-center rounded-xl border border-white/10 text-[15px] font-semibold text-zinc-300 transition-colors hover:bg-white/5"
            >
              Annulla
            </button>
            <button
              onClick={handleAddDishFromModal} disabled={modalLoading}
              className={`flex h-[46px] flex-1 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition-colors ${
                modalLoading
                  ? 'cursor-not-allowed bg-zinc-800 text-zinc-500'
                  : 'bg-violet-600 text-white hover:bg-violet-500 active:bg-violet-600'
              }`}
            >
              {modalLoading ? (
                <>
                  <SpinnerIcon size={17} /> Analisi...
                </>
              ) : editingDishId ? 'Salva modifiche' : 'Aggiungi'}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);

export default React.memo(DishModal);
