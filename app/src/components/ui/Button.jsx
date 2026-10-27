import { Loader2 } from 'lucide-react'

const BASE = [
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold select-none',
  'transition-[background-color,color,transform] duration-150 active:scale-98',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text',
  'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
].join(' ')

const VARIANTS = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
  secondary: 'bg-surface-sunken text-content hover:bg-line',
  ghost: 'text-accent-text hover:bg-surface-sunken',
  danger: 'bg-danger-fill text-white hover:brightness-110',
  'danger-ghost': 'text-danger hover:bg-surface-sunken',
}

const SIZES = {
  md: 'min-h-11 px-4 text-base',
  lg: 'min-h-14 px-6 text-base',
}

/**
 * Button component
 * Bottone a capsula. In loading mostra lo spinner accanto al testo, così la
 * larghezza non cambia.
 * @param {string} variant - 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost'
 * @param {string} size - 'md' (44px) | 'lg' (56px, azione principale della pagina)
 * @param {boolean} loading - Disabilita e mostra lo spinner
 * @param {boolean} fullWidth - Occupa tutta la larghezza
 * @param {Function} icon - Icona lucide a sinistra del testo (opzionale)
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  const isDisabled = disabled || loading
  return (
    <button
      type={type}
      className={[BASE, VARIANTS[variant], SIZES[size], fullWidth ? 'w-full' : '', className].join(' ')}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading
        ? <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        : Icon && <Icon className="size-5" aria-hidden="true" />}
      {children}
    </button>
  )
}
