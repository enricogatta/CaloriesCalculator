import { FormField } from '../ui/FormField'
import { inputClass } from '../ui/fieldStyles'

/**
 * GoalField component
 * Campo numerico intero per un obiettivo giornaliero, con unità a destra e il
 * pallino del colore del macro accanto all'etichetta.
 * @param {string} label
 * @param {string} unit - 'kcal' | 'g'
 * @param {string} dotClass - Classe colore del macro (opzionale)
 * @param {string} value - Testo del campo
 * @param {Function} onChange - (text) => void
 * @param {string} error
 */
export function GoalField({ label, unit, dotClass, value, onChange, error }) {
  return (
    <FormField
      label={
        <span className="flex items-center gap-2">
          {dotClass && <span className={`size-2 rounded-full ${dotClass}`} aria-hidden="true" />}
          {label}
        </span>
      }
      error={error}
    >
      {(field) => (
        <div className="relative">
          <input
            {...field}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={`${inputClass(error)} ${unit === 'kcal' ? 'pr-16' : 'pr-10'} text-right font-semibold tabular-nums`}
          />
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-base text-content-muted">
            {unit}
          </span>
        </div>
      )}
    </FormField>
  )
}
