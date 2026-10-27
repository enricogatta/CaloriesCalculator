import { useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { PageTitle } from '../components/layout/PageTitle'
import { GoalField } from '../components/goals/GoalField'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'
import { useData } from '../hooks/useData'
import { saveGoals } from '../services/goalsService'
import { MACROS, formatInteger } from '../utils/nutrition'

const LIMITS = { calories: [500, 10000], protein: [0, 1000], carbs: [0, 1000], fat: [0, 1000] }

const toForm = (goals) => Object.fromEntries(Object.entries(goals).map(([key, value]) => [key, String(value)]))

function validate(form) {
  const errors = {}
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    const value = Number(form[key])
    if (!/^\d+$/.test(form[key].trim()) || value < min || value > max) {
      errors[key] = `Inserisci un numero intero fra ${formatInteger(min)} e ${formatInteger(max)}.`
    }
  }
  return errors
}

/**
 * ObiettiviPage
 * Obiettivi giornalieri di kcal e macro, salvati con un bottone.
 * Suggerisce le kcal che risultano dai macro (P·4 + C·4 + G·9) per controllare la coerenza.
 */
export function ObiettiviPage() {
  const { user } = useAuth()
  const { goals, setGoals } = useData()
  const [form, setForm] = useState(() => toForm(goals))
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | saving | saved | error

  const dirty = Object.keys(LIMITS).some(key => form[key].trim() !== String(goals[key]))
  const macroCalories = Number(form.protein) * 4 + Number(form.carbs) * 4 + Number(form.fat) * 9
  const calorieGap = macroCalories - Number(form.calories)
  const showGapHint = Number(form.calories) > 0 && Math.abs(calorieGap) > Number(form.calories) * 0.1

  const update = (key) => (text) => {
    setForm(prev => ({ ...prev, [key]: text }))
    setStatus('idle')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const next = Object.fromEntries(Object.keys(LIMITS).map(key => [key, Number(form[key])]))
    setStatus('saving')
    const { error } = await saveGoals(user.id, next)
    if (error) {
      setStatus('error')
      return
    }
    setGoals(next)
    setForm(toForm(next))
    setStatus('saved')
  }

  return (
    <>
      <PageTitle
        eyebrow="Ogni giorno"
        title="I tuoi"
        accent="obiettivi."
        description="Calorie e macronutrienti da raggiungere ogni giorno: il diario li usa per le barre di avanzamento."
      />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <Card className="flex flex-col gap-6 p-6">
          <GoalField label="Calorie" unit="kcal" value={form.calories} onChange={update('calories')} error={errors.calories} />
          {MACROS.map(macro => (
            <GoalField
              key={macro.key}
              label={macro.label}
              unit="g"
              dotClass={macro.bar}
              value={form[macro.key]}
              onChange={update(macro.key)}
              error={errors[macro.key]}
            />
          ))}
          <p className="text-sm text-content-muted">
            Dai macro risultano <span className="font-semibold text-content tabular-nums">{formatInteger(macroCalories)} kcal</span>
            {showGapHint
              ? `, ${formatInteger(Math.abs(calorieGap))} ${calorieGap > 0 ? 'in più' : 'in meno'} dell'obiettivo calorie.`
              : ', in linea con l\'obiettivo calorie.'}
          </p>
        </Card>

        <div className="flex flex-col gap-3">
          <Button type="submit" size="lg" fullWidth loading={status === 'saving'} disabled={!dirty}>
            Salva obiettivi
          </Button>
          <div aria-live="polite" className="min-h-6 text-center text-sm">
            {status === 'saved' && (
              <span className="inline-flex items-center gap-2 text-success">
                <CircleCheck className="size-4" aria-hidden="true" /> Obiettivi salvati
              </span>
            )}
            {status === 'error' && (
              <span className="text-danger">Salvataggio non riuscito. Controlla la connessione e riprova.</span>
            )}
          </div>
        </div>
      </form>
    </>
  )
}
