import { ChevronDown } from 'lucide-react'
import { inputClass } from './fieldStyles'

/**
 * Select component
 * Select nativa (su iPhone apre il selettore a rullo) con la freccia del tema.
 * @param {string} error - Stato d'errore del bordo
 */
export function Select({ error, className = '', children, ...props }) {
  return (
    <div className="relative">
      <select className={`${inputClass(error)} cursor-pointer appearance-none pr-12 ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-content-muted"
        aria-hidden="true"
      />
    </div>
  )
}
