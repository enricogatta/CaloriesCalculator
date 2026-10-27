import { Link } from 'react-router'

const BASE = [
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full',
  'transition-[background-color,color,transform] duration-150 active:scale-95',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

const VARIANTS = {
  glass: 'glass text-accent-text',
  plain: 'text-content-muted hover:bg-surface-sunken hover:text-content',
  danger: 'text-content-muted hover:bg-surface-sunken hover:text-danger',
}

/**
 * IconButton component
 * Bottone tondo da 44px con sola icona. L'etichetta è obbligatoria: diventa
 * aria-label e tooltip.
 * @param {Function} icon - Icona lucide
 * @param {string} label - Cosa fa il bottone (es. "Elimina piatto")
 * @param {string} variant - 'glass' (flottante, header) | 'plain' | 'danger'
 * @param {string} to - Se presente il bottone è un link di navigazione
 */
export function IconButton({ icon: Icon, label, variant = 'plain', to, className = '', ...props }) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`
  const content = <Icon className="size-5" strokeWidth={2.25} aria-hidden="true" />

  if (to) {
    return (
      <Link to={to} aria-label={label} title={label} className={classes} {...props}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" aria-label={label} title={label} className={classes} {...props}>
      {content}
    </button>
  )
}
