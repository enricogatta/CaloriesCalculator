import { useId } from 'react'

/**
 * FormField component
 * Label vera + campo + suggerimento o errore sotto. Il campo lo disegna il
 * chiamante con le props di accessibilità che riceve.
 * @param {string} label - Testo della label
 * @param {string} hint - Suggerimento (nascosto se c'è un errore)
 * @param {string} error - Messaggio d'errore: dice come risolvere
 * @param {Function} children - ({ id, 'aria-describedby', 'aria-invalid' }) => campo
 *
 * @example
 * <FormField label="Quantità" error={errors.quantity}>
 *   {(field) => <input {...field} className={inputClass(errors.quantity)} />}
 * </FormField>
 */
export function FormField({ label, hint, error, className = '', children }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-content-muted">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && <p id={hintId} className="text-sm text-content-muted">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  )
}
