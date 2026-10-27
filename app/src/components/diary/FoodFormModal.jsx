import { useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { BookOpen, Sparkles, TriangleAlert } from 'lucide-react'
import { BaseModal } from '../modals/BaseModal'
import { Button } from '../ui/Button'
import { ChoiceGroup } from '../ui/ChoiceGroup'
import { FormField } from '../ui/FormField'
import { Select } from '../ui/Select'
import { inputClass } from '../ui/fieldStyles'
import { FoodAutocomplete } from './FoodAutocomplete'
import {
  MEAL_CATEGORIES,
  QUANTITY_TYPES,
  findFood,
  formatInteger,
  formatNumber,
  portionFromFood,
} from '../../utils/nutrition'

const CATEGORY_OPTIONS = MEAL_CATEGORIES.map(c => ({ value: c, label: c }))
const KEY_ERRORS = ['missing_api_key', 'invalid_api_key']

// Accetta sia "1,5" (tastierino italiano) sia "1.5"
const parseQuantity = (text) => Number(String(text).replace(',', '.'))

function validate({ foodName, quantity }) {
  const errors = {}
  const name = foodName.trim()
  if (name.length < 2) errors.food = 'Scrivi il nome dell\'alimento (almeno 2 lettere).'
  else if (name.length > 100) errors.food = 'Il nome può avere al massimo 100 caratteri.'
  const qty = parseQuantity(quantity)
  if (!quantity.trim() || !Number.isFinite(qty) || qty <= 0) errors.quantity = 'Inserisci un numero maggiore di 0, es. 150.'
  else if (qty > 5000) errors.quantity = 'La quantità massima è 5000.'
  return errors
}

/**
 * FoodFormModal component
 * Aggiunge o modifica un piatto. Se il cibo è già nella libreria mostra subito
 * i valori della porzione; altrimenti li calcola l'AI al salvataggio.
 * Il genitore lo monta solo quando serve, così lo stato riparte pulito a ogni apertura.
 * @param {string} mode - 'add' | 'edit'
 * @param {object} initial - { category, foodName, quantity, quantityType }
 * @param {boolean} lockCategory - true se il pasto è già deciso (aperto da una card o in modifica)
 * @param {Array} foods - Libreria cibi
 * @param {Function} onClose
 * @param {Function} onSubmit - ({ category, foodName, quantity, quantityType }) => Promise<{ error }>
 */
export function FoodFormModal({ mode, initial, lockCategory, foods, onClose, onSubmit }) {
  const [category, setCategory] = useState(initial.category)
  const [foodName, setFoodName] = useState(initial.foodName ?? '')
  const [quantity, setQuantity] = useState(initial.quantity ?? '')
  const [quantityType, setQuantityType] = useState(initial.quantityType ?? 'grams')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [saving, setSaving] = useState(false)
  const quantityInputRef = useRef(null)
  const formId = useId()
  const categoryLabelId = useId()

  const qty = parseQuantity(quantity)
  const libraryFood = findFood(foods, foodName, quantityType)
  const preview = libraryFood && qty > 0 ? portionFromFood(libraryFood, qty) : null

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate({ foodName, quantity })
    setErrors(nextErrors)
    setSubmitError(null)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    const { error } = await onSubmit({ category, foodName: foodName.trim(), quantity: qty, quantityType })
    setSaving(false)
    if (error) setSubmitError(error)
    else onClose()
  }

  const title = mode === 'edit' ? 'Modifica piatto' : 'Aggiungi alimento'
  const description = lockCategory ? category : undefined

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      title={title}
      description={description}
      dismissible={!saving}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">
            Annulla
          </Button>
          <Button type="submit" form={formId} loading={saving} className="flex-1">
            {mode === 'edit' ? 'Salva' : 'Aggiungi'}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {!lockCategory && (
          <div className="flex flex-col gap-2">
            <p id={categoryLabelId} className="text-sm font-semibold text-content-muted">Pasto</p>
            <ChoiceGroup
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={setCategory}
              labelledBy={categoryLabelId}
            />
          </div>
        )}

        <FormField label="Alimento" error={errors.food}>
          {(field) => (
            <FoodAutocomplete
              fieldProps={field}
              value={foodName}
              onValueChange={(text) => { setFoodName(text); setSubmitError(null) }}
              onSelect={(food) => {
                setFoodName(food.name)
                setQuantityType(food.default_quantity_type)
                quantityInputRef.current?.focus()
              }}
              onEnter={() => quantityInputRef.current?.focus()}
              foods={foods}
              error={errors.food}
              placeholder="Es. petto di pollo"
            />
          )}
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Quantità" error={errors.quantity}>
            {(field) => (
              <input
                {...field}
                ref={quantityInputRef}
                type="text"
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                placeholder="Es. 150"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className={inputClass(errors.quantity)}
              />
            )}
          </FormField>
          <FormField label="Unità">
            {(field) => (
              <Select {...field} value={quantityType} onChange={(event) => setQuantityType(event.target.value)}>
                {QUANTITY_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </Select>
            )}
          </FormField>
        </div>

        {preview && (
          <p className="flex items-start gap-2 rounded-md bg-surface-sunken p-4 text-sm text-content-muted" aria-live="polite">
            <span className="flex h-5 shrink-0 items-center" aria-hidden="true"><BookOpen className="size-4" /></span>
            <span>
              Dalla tua libreria:{' '}
              <span className="font-semibold text-content tabular-nums">{formatInteger(preview.calories)} kcal</span>
              {' '}· P {formatNumber(preview.protein)} · C {formatNumber(preview.carbs)} · G {formatNumber(preview.fat)}
            </span>
          </p>
        )}
        {!preview && !libraryFood && foodName.trim().length >= 2 && (
          <p className="flex items-start gap-2 rounded-md bg-surface-sunken p-4 text-sm text-content-muted">
            <span className="flex h-5 shrink-0 items-center" aria-hidden="true"><Sparkles className="size-4" /></span>
            Alimento nuovo per questa unità: i valori li calcola l'AI quando salvi.
          </p>
        )}

        {submitError && (
          <div role="alert" className="flex items-start gap-2 rounded-md bg-danger/10 p-4 text-sm text-danger">
            <span className="flex h-5 shrink-0 items-center" aria-hidden="true"><TriangleAlert className="size-4" /></span>
            <span>
              {submitError.message}
              {KEY_ERRORS.includes(submitError.code) && (
                <>
                  {' '}
                  <Link to="/impostazioni" className="font-semibold underline underline-offset-2">
                    Vai alle Impostazioni
                  </Link>
                </>
              )}
            </span>
          </div>
        )}
      </form>
    </BaseModal>
  )
}
