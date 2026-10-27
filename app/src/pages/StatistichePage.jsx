import { useState } from 'react'
import { Link } from 'react-router'
import { ChartColumn, CloudOff } from 'lucide-react'
import { PageTitle } from '../components/layout/PageTitle'
import { CaloriesChart } from '../components/stats/CaloriesChart'
import { MacroAverages } from '../components/stats/MacroAverages'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Skeleton } from '../components/ui/Skeleton'
import { useData } from '../hooks/useData'
import { useStats } from '../hooks/useStats'

const PERIODS = [
  { value: '7', label: '7 giorni' },
  { value: '30', label: '30 giorni' },
  { value: '90', label: '90 giorni' },
]

/**
 * StatistichePage
 * Andamento degli ultimi 7, 30 o 90 giorni: calorie per giorno contro
 * l'obiettivo e media dei macro.
 */
export function StatistichePage() {
  const [period, setPeriod] = useState('7')
  const { goals, refreshAll } = useData()
  const stats = useStats(Number(period))

  return (
    <>
      <PageTitle eyebrow="Andamento" title="Le tue" accent="statistiche." />

      <SegmentedControl label="Periodo" options={PERIODS} value={period} onChange={setPeriod} className="mb-6" />

      {stats.loading && (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Caricamento statistiche">
          <Skeleton className="h-80" />
          <Skeleton className="h-56" />
        </div>
      )}

      {!stats.loading && stats.error && (
        <EmptyState
          icon={CloudOff}
          tone="danger"
          title="Non riesco a caricare le statistiche"
          description="Controlla la connessione e riprova."
          action={<Button variant="secondary" onClick={refreshAll}>Riprova</Button>}
        />
      )}

      {!stats.loading && !stats.error && stats.loggedDayCount === 0 && (
        <EmptyState
          icon={ChartColumn}
          title={`Nessun pasto negli ultimi ${period} giorni`}
          description="Le statistiche si costruiscono dai pasti del diario."
          action={
            <Link
              to="/diario"
              className="inline-flex min-h-11 items-center rounded-full bg-surface-sunken px-4 text-base font-semibold text-content hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text"
            >
              Vai al diario
            </Link>
          }
        />
      )}

      {!stats.loading && !stats.error && stats.loggedDayCount > 0 && (
        <div className="flex flex-col gap-4">
          <CaloriesChart
            bars={stats.bars}
            goal={goals.calories}
            groupByWeek={stats.groupByWeek}
            average={stats.averages.calories}
          />
          <MacroAverages averages={stats.averages} goals={goals} loggedDayCount={stats.loggedDayCount} />
        </div>
      )}
    </>
  )
}
