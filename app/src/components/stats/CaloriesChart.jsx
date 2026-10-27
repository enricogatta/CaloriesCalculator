import { useState } from 'react'
import { Card } from '../ui/Card'
import { formatShortDate, formatWeekdayShort } from '../../utils/dates'
import { formatInteger } from '../../utils/nutrition'

/**
 * CaloriesChart component
 * Colonne delle kcal per giorno (o media per settimana) con la linea tratteggiata
 * dell'obiettivo. Una sola serie: niente legenda, il titolo la nomina. Toccando
 * una colonna il valore compare sopra il grafico; la tabella mostra tutti i valori.
 * Specifiche dalla skill dataviz: colonne ≤ 24px con 4px arrotondati in cima e
 * base squadrata, 2px di superficie fra colonne vicine, griglia assente.
 * @param {Array<{date: string, value: number|null, loggedDays: number}>} bars
 * @param {number} goal - Obiettivo kcal
 * @param {boolean} groupByWeek - Le colonne sono settimane (media dei giorni registrati)
 * @param {number} average - Media kcal sui giorni registrati
 */
export function CaloriesChart({ bars, goal, groupByWeek, average }) {
  const [selectedDate, setSelectedDate] = useState(null)
  const selected = bars.find(bar => bar.date === selectedDate && bar.value != null)

  const maxValue = Math.max(goal * 1.15, ...bars.map(bar => (bar.value ?? 0) * 1.05), 1)
  const goalPercent = (goal / maxValue) * 100
  const labelEvery = bars.length <= 7 ? 1 : groupByWeek ? 4 : 7

  const barLabel = (bar) => (groupByWeek ? `Settimana dal ${formatShortDate(bar.date)}` : formatShortDate(bar.date))
  const axisLabel = (bar) => (bars.length <= 7 ? formatWeekdayShort(bar.date) : formatShortDate(bar.date))

  return (
    <Card className="flex flex-col gap-4 p-6" aria-labelledby="calories-chart-title">
      <div className="flex flex-col gap-1">
        <h2 id="calories-chart-title" className="text-base font-semibold text-content">
          {groupByWeek ? 'Calorie al giorno, media per settimana' : 'Calorie al giorno'}
        </h2>
        <p className="text-sm text-content-muted tabular-nums" aria-live="polite">
          {selected
            ? <>{barLabel(selected)}: <span className="font-semibold text-content">{formatInteger(selected.value)} kcal</span></>
            : <>Media <span className="font-semibold text-content">{formatInteger(average)} kcal</span> nei giorni registrati</>}
        </p>
      </div>

      <div className="relative h-48" aria-hidden="true">
        {/* Linea dell'obiettivo */}
        <div className="absolute inset-x-0 border-t-2 border-dashed border-line-strong" style={{ bottom: `${goalPercent}%` }}>
          <span className="absolute right-0 bottom-1 z-10 rounded-sm bg-surface-raised px-1 text-sm text-content-muted tabular-nums">
            Obiettivo {formatInteger(goal)}
          </span>
        </div>

        <div className="absolute inset-0 flex items-end gap-0.5 border-b border-line">
          {bars.map(bar => (
            <div key={bar.date} className="flex h-full flex-1 items-end justify-center">
              {bar.value != null && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setSelectedDate(prev => (prev === bar.date ? null : bar.date))}
                  className="flex h-full w-full items-end justify-center"
                >
                  <span
                    className={`w-full max-w-6 rounded-t-sm transition-colors duration-150 ${
                      bar.date === selectedDate ? 'bg-content' : 'bg-content-muted'
                    }`}
                    style={{ height: `${(bar.value / maxValue) * 100}%` }}
                  />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-0.5" aria-hidden="true">
        {bars.map((bar, index) => (
          <div key={bar.date} className="flex flex-1 justify-center overflow-visible">
            {index % labelEvery === 0 && (
              <span className="whitespace-nowrap text-sm text-content-muted">{axisLabel(bar)}</span>
            )}
          </div>
        ))}
      </div>

      {/* Vista tabella: tutti i valori, anche per chi usa un lettore di schermo */}
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-accent-text">
          Mostra come tabella
        </summary>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">Calorie per {groupByWeek ? 'settimana' : 'giorno'}</caption>
          <thead>
            <tr className="border-b border-line text-left text-content-muted">
              <th scope="col" className="py-2 font-semibold">{groupByWeek ? 'Settimana dal' : 'Giorno'}</th>
              <th scope="col" className="py-2 text-right font-semibold">kcal</th>
            </tr>
          </thead>
          <tbody>
            {bars.map(bar => (
              <tr key={bar.date} className="border-b border-line last:border-0">
                <td className="py-2 text-content">{formatShortDate(bar.date)}</td>
                <td className="py-2 text-right text-content tabular-nums">
                  {bar.value == null ? 'nessun pasto' : formatInteger(bar.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  )
}
