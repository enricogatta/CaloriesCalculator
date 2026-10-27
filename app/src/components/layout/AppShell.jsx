import { Outlet, useLocation, useNavigate } from 'react-router'
import { ChevronLeft, CloudOff, Settings } from 'lucide-react'
import { IconButton } from '../ui/IconButton'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { Skeleton } from '../ui/Skeleton'
import { TabBar } from './TabBar'
import { useData } from '../../hooks/useData'

/**
 * AppShell component
 * Struttura delle pagine dopo il login: header traslucido con l'ingranaggio
 * delle Impostazioni (o "Indietro" dentro le Impostazioni), contenuto, tab bar.
 * Il contenuto compare quando libreria e obiettivi sono caricati.
 */
export function AppShell() {
  const { pathname, key } = useLocation()
  const navigate = useNavigate()
  const { status, refreshAll } = useData()
  const inSettings = pathname.startsWith('/impostazioni')

  // Indietro torna alla pagina di prima se c'è, altrimenti al diario
  const goBack = () => (key !== 'default' ? navigate(-1) : navigate('/diario'))

  return (
    <div className="min-h-screen-dvh">
      <header className="sticky top-0 z-30 bg-surface/80 pt-safe backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-3 px-4">
          {inSettings
            ? <IconButton icon={ChevronLeft} label="Indietro" variant="glass" onClick={goBack} />
            : <IconButton icon={Settings} label="Impostazioni" variant="glass" to="/impostazioni" />}
          <p className="truncate text-base font-semibold text-content">Calories Calculator</p>
          <span className="size-11 shrink-0" aria-hidden="true" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-tabbar">
        {status === 'ready' && <Outlet />}
        {status === 'loading' && (
          <div className="flex flex-col gap-4" aria-busy="true" aria-label="Caricamento">
            <Skeleton className="h-24" />
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
        )}
        {status === 'error' && (
          <EmptyState
            icon={CloudOff}
            tone="danger"
            title="Non riesco a caricare i tuoi dati"
            description="Controlla la connessione e riprova."
            action={<Button variant="secondary" onClick={refreshAll}>Riprova</Button>}
          />
        )}
      </main>

      <TabBar />
    </div>
  )
}
