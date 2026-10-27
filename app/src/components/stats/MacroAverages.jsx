import { Card } from '../ui/Card'
import { ProgressBar } from '../ui/ProgressBar'
import { MACROS, formatInteger } from '../../utils/nutrition'

/**
 * MacroAverages component
 * Media giornaliera di proteine, carboidrati e grassi confrontata con gli obiettivi.
 * La media è sui soli giorni registrati: un giorno dimenticato non la abbassa.
 * @param {{protein:number, carbs:number, fat:number}} averages
 * @param {{protein:number, carbs:number, fat:number}} goals
 * @param {number} loggedDayCount
 */
export function MacroAverages({ averages, goals, loggedDayCount }) {
  return (
    <Card className="flex flex-col gap-6 p-6" aria-labelledby="macro-averages-title">
      <div className="flex flex-col gap-1">
        <h2 id="macro-averages-title" className="text-base font-semibold text-content">Media dei macro al giorno</h2>
        <p className="text-sm text-content-muted">
          Calcolata su {loggedDayCount === 1 ? '1 giorno registrato' : `${loggedDayCount} giorni registrati`}.
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {MACROS.map(macro => {
          const value = averages[macro.key]
          const goal = goals[macro.key]
          const percent = goal > 0 ? Math.round((value / goal) * 100) : 0
          return (
            <li key={macro.key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-content-muted">
                  <span className={`size-2 rounded-full ${macro.bar}`} aria-hidden="true" />
                  {macro.label}
                </span>
                <span className="text-content tabular-nums">
                  <span className="font-semibold">{formatInteger(value)}</span> / {formatInteger(goal)} g
                  <span className={percent > 100 ? 'text-danger' : 'text-content-muted'}> · {percent}%</span>
                </span>
              </div>
              <ProgressBar value={value} max={goal} colorClass={macro.bar} label={`${macro.label}, media giornaliera`} />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
