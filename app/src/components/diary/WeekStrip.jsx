import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { IconButton } from '../ui/IconButton'
import {
  addDays,
  formatDayMonth,
  formatMonthYear,
  formatWeekdayShort,
  parseDateStr,
  startOfWeek,
  todayStr,
} from '../../utils/dates'

/**
 * WeekStrip component
 * Settimana del giorno selezionato (lunedì → domenica) con un pallino sui giorni
 * con pasti registrati. Le frecce spostano di una settimana; toccando il mese si
 * apre il calendario nativo per saltare a qualsiasi data.
 * @param {string} selectedDate - 'YYYY-MM-DD'
 * @param {Function} onChange - (date) => void
 * @param {Set<string>} loggedDates - Giorni con almeno un pasto
 */
export function WeekStrip({ selectedDate, onChange, loggedDates }) {
  const today = todayStr()
  const weekStart = startOfWeek(selectedDate)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {/* Input date nativo sovrapposto al mese: su iPhone apre il selettore a rullo */}
        <label className="relative -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-base font-semibold text-content focus-within:ring-2 focus-within:ring-accent-text">
          <span className="first-letter:uppercase">{formatMonthYear(selectedDate)}</span>
          <ChevronDown className="size-4 text-content-muted" aria-hidden="true" />
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => event.target.value && onChange(event.target.value)}
            aria-label="Scegli una data"
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>

        <div className="flex items-center gap-1">
          {selectedDate !== today && (
            <button
              type="button"
              onClick={() => onChange(today)}
              className="min-h-11 rounded-full px-4 text-base font-semibold text-accent-text transition-colors duration-150 hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text"
            >
              Oggi
            </button>
          )}
          <IconButton icon={ChevronLeft} label="Settimana precedente" onClick={() => onChange(addDays(selectedDate, -7))} />
          <IconButton icon={ChevronRight} label="Settimana successiva" onClick={() => onChange(addDays(selectedDate, 7))} />
        </div>
      </div>

      <ol className="grid grid-cols-7">
        {days.map(date => {
          const selected = date === selectedDate
          const isToday = date === today
          const logged = loggedDates.has(date)
          return (
            <li key={date} className="flex justify-center">
              <button
                type="button"
                onClick={() => onChange(date)}
                aria-pressed={selected}
                aria-label={`${formatDayMonth(date)}${isToday ? ', oggi' : ''}${logged ? ', con pasti' : ''}`}
                className={[
                  'flex min-h-16 w-full max-w-14 flex-col items-center justify-center gap-1 rounded-full',
                  'transition-colors duration-150 active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text',
                  selected
                    ? 'bg-accent text-accent-fg'
                    : isToday
                      ? 'text-accent-text hover:bg-surface-raised'
                      : 'text-content hover:bg-surface-raised',
                ].join(' ')}
              >
                <span className={`text-sm uppercase ${selected ? '' : 'text-content-muted'}`}>
                  {formatWeekdayShort(date).slice(0, 3)}
                </span>
                <span className="text-base font-semibold tabular-nums">{parseDateStr(date).getDate()}</span>
                <span
                  className={`size-1 rounded-full ${logged ? (selected ? 'bg-accent-fg' : 'bg-content-muted') : 'bg-transparent'}`}
                  aria-hidden="true"
                />
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
