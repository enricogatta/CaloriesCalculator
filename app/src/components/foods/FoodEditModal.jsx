import { useId, useState } from 'react'
import { Sparkles, Trash2, TriangleAlert } from 'lucide-react'
import { BaseModal } from '../modals/BaseModal'
import { Button } from '../ui/Button'
import { FormField } from '../ui/FormField'
import { Select } from '../ui/Select'
import { inputClass } from '../ui/fieldStyles'
import { MACROS, PER_LABELS, QUANTITY_TYPES, UNIT_LABELS, displayFactor } from '../../utils/nutrition'

const parseNumber = (text) => Number(String(text).trim().replace(',', '.'))
const toInput = (value) => (value == null ? '' : String(Math.round(value * 10) / 10).replace('.', ','))

const VALUE_FIELDS = [
  { key: 'calories', label: 'Calorie', unit: 'kcal' },
  ...MACROS.map(m => ({ key: m.key, label: m.label, unit: 'g', dot: m.bar })),
]

function initialForm(food) {
  if (!food) {
    return { name: '', quantityType: 'grams', calories: '', protein: '', carbs: '', fat: '', gramsPerUnit: '' }
  }
  const factor = displayFactor(food.default_quantity_type)
  return {
    name: food.name,
    quantityType: food.default_quantity_type,
    calories: toInput(food.calories_per_unit * factor),
    protein: toInput(food.protein_per_unit * factor),
    carbs: toInput(food.carbs_per_unit * factor),
    fat: toInput(food.fat_per_unit * factor),
    gramsPerUnit: food.default_quantity_type === 'grams' ? '' : toInput(food.grams_per_unit),
  }
}

function validate(form) {
  const errors = {}
  const name = form.name.trim()
  if (name.length < 2) errors.name = 'Scrivi il nome dell\'alimento (almeno 2 lettere).'
  else if (name.length > 100) errors.name = 'Il nome può avere al massimo 100 caratteri.'

  const isGrams = form.quantityType === 'grams'
  const limits = { calories: isGrams ? 900 : 5000, macro: isGrams ? 100 : 1000 }
  for (const field of VALUE_FIELDS) {
    const value = parseNumber(form[field.key])
    const max = field.key === 'calories' ? limits.calories : limits.macro
    if (form[field.key].trim() === '' || !Number.isFinite(value) || value < 0 || value > max) {
      errors[field.key] = `Inserisci un numero fra 0 e ${max}, es. ${field.key === 'calories' ? '120' : '4,5'}.`
    }
  }
  const macroSum = MACROS.reduce((sum, m) => sum + (parseNumber(form[m.key]) || 0), 0)
  if (isGrams && !errors.protein && !errors.carbs && !errors.fat && macroSum > 100) {
    errors.fat = 'Proteine, carboidrati e grassi insieme non possono superare 100 g su 100 g.'
  }

  if (!isGrams && form.gramsPerUnit.trim() !== '') {
    const grams = parseNumber(form.gramsPerUnit)
    if (!Number.isFinite(grams) || grams <= 0 || grams > 5000) {
      errors.gramsPerUnit = 'Inserisci il peso in grammi, es. 120, oppure lascia vuoto.'
    }
  }
  return errors
}

/**
 * FoodEditModal component
 * Crea o corregge un alimento della libreria. I valori si inseriscono per 100 g
 * (come sulle etichette) o per 1 unità/cucchiaino/cucchiaio, e vengono salvati per unità.
 * Il tipo di unità non si cambia dopo la creazione: cambierebbe il significato dei piatti già registrati.
 * "Calcola con l'AI" compila i valori con la stima dell'AI; si applicano solo toccando Salva.
 * Il genitore lo monta solo quando serve.
 * @param {object|null} food - Riga di foods da modificare, null per crearne una
 * @param {Function} onClose
 * @param {Function} onSubmit - (fields) => Promise<{ error: { field?: string, message: string } | null }>
 * @param {Function} onDelete - () => void, solo in modifica
 * @param {Function} onEstimate - ({ meal, quantity, quantityType }) => Promise<{ data, error }>, come analyzeFood
 */
export function FoodEditModal({ food, onClose, onSubmit, onDelete, onEstimate }) {
  const [form, setForm] = useState(() => initialForm(food))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [estimated, setEstimated] = useState(false)
  const formId = useId()

  const isEdit = Boolean(food)
  const isGrams = form.quantityType === 'grams'
  const perLabel = PER_LABELS[form.quantityType]

  const update = (key) => (event) => {
    setForm(prev => ({ ...prev, [key]: event.target.value }))
    setSubmitError(null)
  }

  // Chiede all'AI i valori per 100 g (o per 1 unità) e li mette nei campi, da controllare prima di salvare
  const handleEstimate = async () => {
    const name = form.name.trim()
    if (name.length < 2 || name.length > 100) {
      setErrors(prev => ({ ...prev, name: 'Scrivi il nome dell\'alimento (da 2 a 100 caratteri) per farlo calcolare all\'AI.' }))
      return
    }
    const { quantityType } = form
    const quantity = displayFactor(quantityType)
    setSubmitError(null)
    setEstimated(false)
    setEstimating(true)
    const { data, error } = await onEstimate({ meal: name, quantity, quantityType })
    setEstimating(false)
    if (error) {
      setSubmitError(error.message)
      return
    }
    setForm(prev => ({
      ...prev,
      calories: toInput(data.calories),
      protein: toInput(data.protein),
      carbs: toInput(data.carbs),
      fat: toInput(data.fat),
      gramsPerUnit: quantityType === 'grams' ? '' : toInput(data.grams / quantity),
    }))
    setErrors({})
    setEstimated(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const factor = displayFactor(form.quantityType)
    const fields = {
      name: form.name,
      default_quantity_type: form.quantityType,
      calories_per_unit: parseNumber(form.calories) / factor,
      protein_per_unit: parseNumber(form.protein) / factor,
      carbs_per_unit: parseNumber(form.carbs) / factor,
      fat_per_unit: parseNumber(form.fat) / factor,
      grams_per_unit: isGrams ? 1 : (form.gramsPerUnit.trim() ? parseNumber(form.gramsPerUnit) : null),
    }

    setSaving(true)
    const { error } = await onSubmit(fields)
    setSaving(false)
    if (!error) return
    if (error.field) setErrors(prev => ({ ...prev, [error.field]: error.message }))
    else setSubmitError(error.message)
  }

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Modifica alimento' : 'Nuovo alimento'}
      description={isEdit ? 'Correggi nome o valori se quelli calcolati non ti convincono.' : 'Usa i valori dell\'etichetta.'}
      dismissible={!saving}
      footer={
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Annulla</Button>
            <Button type="submit" form={formId} loading={saving} disabled={estimating} className="flex-1">Salva</Button>
          </div>
          {isEdit && (
            <Button variant="danger-ghost" icon={Trash2} onClick={onDelete} disabled={saving} fullWidth>
              Elimina alimento
            </Button>
          )}
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <FormField label="Nome" error={errors.name}>
          {(field) => (
            <input
              {...field}
              type="text"
              autoComplete="off"
              placeholder="Es. yogurt greco"
              value={form.name}
              onChange={update('name')}
              className={inputClass(errors.name)}
            />
          )}
        </FormField>

        <FormField
          label="Si misura in"
          hint={isEdit ? 'Non si cambia dopo la creazione: per un\'altra unità crea un nuovo alimento.' : undefined}
        >
          {(field) => (
            <Select {...field} value={form.quantityType} onChange={update('quantityType')} disabled={isEdit || estimating}>
              {QUANTITY_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </Select>
          )}
        </FormField>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-4 text-base font-semibold text-content">Valori {perLabel}</legend>
          <div className="grid grid-cols-2 gap-4">
            {VALUE_FIELDS.map(valueField => (
              <FormField
                key={valueField.key}
                label={
                  <span className="flex items-center gap-2">
                    {valueField.dot && <span className={`size-2 rounded-full ${valueField.dot}`} aria-hidden="true" />}
                    {valueField.label}
                  </span>
                }
                error={errors[valueField.key]}
              >
                {(field) => (
                  <div className="relative">
                    <input
                      {...field}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={form[valueField.key]}
                      onChange={update(valueField.key)}
                      className={`${inputClass(errors[valueField.key])} ${valueField.unit === 'kcal' ? 'pr-16' : 'pr-10'} text-right tabular-nums`}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-base text-content-muted">
                      {valueField.unit}
                    </span>
                  </div>
                )}
              </FormField>
            ))}
          </div>
        </fieldset>

        {!isGrams && (
          <FormField
            label={`Peso di 1 ${UNIT_LABELS[form.quantityType]} (facoltativo)`}
            hint="Serve a mostrare i grammi dei piatti. Se non lo sai lascia vuoto."
            error={errors.gramsPerUnit}
          >
            {(field) => (
              <div className="relative">
                <input
                  {...field}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={form.gramsPerUnit}
                  onChange={update('gramsPerUnit')}
                  className={`${inputClass(errors.gramsPerUnit)} pr-10 text-right tabular-nums`}
                />
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-base text-content-muted">g</span>
              </div>
            )}
          </FormField>
        )}

        <div className="flex flex-col gap-2">
          <Button variant="secondary" icon={Sparkles} loading={estimating} disabled={saving} onClick={handleEstimate} fullWidth>
            {isEdit ? 'Ricalcola con l\'AI' : 'Calcola con l\'AI'}
          </Button>
          {estimated && (
            <p role="status" className="text-sm text-content-muted">
              Valori stimati dall'AI: controllali e tocca Salva per applicarli.
            </p>
          )}
        </div>

        {submitError && (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-danger/10 p-4 text-sm text-danger">
            <span className="flex h-5 shrink-0 items-center" aria-hidden="true"><TriangleAlert className="size-4" /></span>
            {submitError}
          </p>
        )}
      </form>
    </BaseModal>
  )
}
