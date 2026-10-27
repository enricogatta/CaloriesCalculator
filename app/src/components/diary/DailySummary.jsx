import { TriangleAlert } from 'lucide-react'
import { Card } from '../ui/Card'
import { ProgressBar } from '../ui/ProgressBar'
import { MACROS, formatInteger, formatNumber } from '../../utils/nutrition'

/**
 * DailySummary component
 * Totali del giorno contro gli obiettivi: kcal in evidenza con quante ne
 * restano, poi una barra per macro. Il superamento è detto a parole, non solo col rosso.
 * @param {{calories:number, protein:number, carbs:number, fat:number}} totals
 * @param {{calories:number, protein:number, carbs:number, fat:number}} goals
 */
export function DailySummary({ totals, goals }) {
  const remaining = goals.calories - totals.calories
  const over = remaining < 0

  return (
    <Card className="mb-4 flex flex-col gap-6 p-6" aria-label="Riepilogo del giorno">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <p className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight tabular-nums text-content">
              {formatInteger(totals.calories)}
            </span>
            <span className="text-base text-content-muted tabular-nums">/ {formatInteger(goals.calories)} kcal</span>
          </p>
          <p className={`flex items-center gap-1 text-base ${over ? 'text-danger' : 'text-content-muted'}`}>
            {over && <TriangleAlert className="size-4" aria-hidden="true" />}
            {over
              ? <>Oltre di <span className="font-semibold tabular-nums">{formatInteger(-remaining)}</span> kcal</>
              : <>Restano <span className="font-semibold tabular-nums text-content">{formatInteger(remaining)}</span> kcal</>}
          </p>
        </div>
        <ProgressBar value={totals.calories} max={goals.calories} colorClass="bg-content" label="Calorie del giorno" />
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {MACROS.map(macro => {
          const value = totals[macro.key]
          const goal = goals[macro.key]
          const macroOver = value > goal
          return (
            <li key={macro.key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-content-muted">
                  <span className={`size-2 rounded-full ${macro.bar}`} aria-hidden="true" />
                  {macro.label}
                </span>
                <span className={`tabular-nums ${macroOver ? 'text-danger' : 'text-content'}`}>
                  <span className="font-semibold">{formatNumber(value)}</span> / {formatInteger(goal)} g
                  {macroOver && <span className="sr-only"> (oltre l'obiettivo)</span>}
                </span>
              </div>
              <ProgressBar value={value} max={goal} colorClass={macro.bar} label={macro.label} />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
