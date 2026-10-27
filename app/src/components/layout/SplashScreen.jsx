import { Loader2 } from 'lucide-react'

/**
 * SplashScreen component
 * Schermata iniziale mentre si verifica la sessione.
 */
export function SplashScreen() {
  return (
    <div className="flex min-h-screen-dvh flex-col items-center justify-center gap-6 bg-surface px-4">
      <img src="/icons/icon-192.png" alt="" className="size-20 rounded-lg" />
      <Loader2 className="size-6 animate-spin text-content-muted" aria-label="Caricamento" />
    </div>
  )
}
