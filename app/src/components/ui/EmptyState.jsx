/**
 * EmptyState component
 * Lista vuota o errore: dice cosa è successo e cosa fare dopo, con l'azione.
 * @param {Function} icon - Icona lucide
 * @param {string} title
 * @param {string} description - Il passo successivo
 * @param {ReactNode} action - Bottone o link (opzionale)
 * @param {string} tone - 'default' | 'danger' (errore di caricamento)
 */
export function EmptyState({ icon: Icon, title, description, action, tone = 'default' }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong px-6 py-12 text-center"
    >
      {Icon && (
        <span
          className={`flex size-12 items-center justify-center rounded-full bg-surface-sunken ${
            tone === 'danger' ? 'text-danger' : 'text-content-muted'
          }`}
        >
          <Icon className="size-6" aria-hidden="true" />
        </span>
      )}
      <p className="text-base font-semibold text-content">{title}</p>
      {description && <p className="max-w-xs text-sm text-content-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
