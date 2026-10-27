/**
 * ProgressBar component
 * Avanzamento verso un obiettivo. Oltre l'obiettivo la barra è piena e rossa:
 * chi la usa mostra anche il testo che lo dice, il colore da solo non basta.
 * @param {number} value
 * @param {number} max - Obiettivo
 * @param {string} colorClass - Classe di sfondo della barra (es. 'bg-macro-protein')
 * @param {string} label - Nome per i lettori di schermo
 */
export function ProgressBar({ value, max, colorClass, label }) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const over = max > 0 && value > max

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
    >
      <div className={`h-full rounded-full ${over ? 'bg-danger' : colorClass}`} style={{ width: `${percent}%` }} />
    </div>
  )
}
