/**
 * Skeleton component
 * Segnaposto del contenuto che sta caricando, con la sua forma: evita il salto
 * di layout che darebbe uno spinner.
 */
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-surface-raised ${className}`} aria-hidden="true" />
}
