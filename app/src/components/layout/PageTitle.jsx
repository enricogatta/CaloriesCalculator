/**
 * PageTitle component
 * Intestazione di pagina: sopratitolo maiuscolo, titolo grande con l'ultima
 * parte in accento ("I tuoi obiettivi."), descrizione facoltativa.
 * @param {string} eyebrow - Sopratitolo
 * @param {string} title - Parte del titolo nel colore del testo
 * @param {string} accent - Parte finale nel colore d'accento
 * @param {string} description
 */
export function PageTitle({ eyebrow, title, accent, description }) {
  return (
    <div className="mb-6 flex flex-col gap-2">
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-widest text-content-muted">{eyebrow}</p>
      )}
      <h1 className="text-4xl font-bold leading-tight tracking-tight text-content">
        {title}
        {accent && <> <span className="text-accent-text">{accent}</span></>}
      </h1>
      {description && <p className="max-w-prose text-base text-content-muted">{description}</p>}
    </div>
  )
}
