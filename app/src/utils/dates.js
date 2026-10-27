// Le date del diario sono stringhe locali 'YYYY-MM-DD' (colonna date di Postgres).
// Mai new Date('YYYY-MM-DD'): JavaScript la legge in UTC e il giorno può slittare.

const pad = (n) => String(n).padStart(2, '0')

/**
 * Data locale in formato 'YYYY-MM-DD'.
 * @param {Date} date
 * @returns {string}
 */
export function toDateStr(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Da 'YYYY-MM-DD' a Date locale (mezzanotte del giorno, non UTC).
 * @param {string} dateStr
 * @returns {Date}
 */
export function parseDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayStr = () => toDateStr(new Date())

/**
 * @param {string} dateStr
 * @param {number} days - anche negativo
 * @returns {string}
 */
export function addDays(dateStr, days) {
  const date = parseDateStr(dateStr)
  date.setDate(date.getDate() + days)
  return toDateStr(date)
}

/**
 * Lunedì della settimana che contiene la data.
 * @param {string} dateStr
 * @returns {string}
 */
export function startOfWeek(dateStr) {
  const day = parseDateStr(dateStr).getDay() // 0 = domenica
  return addDays(dateStr, day === 0 ? -6 : 1 - day)
}

/**
 * Le date da `from` a `to` incluse.
 * @param {string} from
 * @param {string} to
 * @returns {string[]}
 */
export function dateRange(from, to) {
  const dates = []
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d)
  return dates
}

const formatter = (options) => new Intl.DateTimeFormat('it-IT', options)
const weekdayShortFmt = formatter({ weekday: 'short' })
const weekdayLongFmt = formatter({ weekday: 'long' })
const dayMonthFmt = formatter({ day: 'numeric', month: 'long' })
const monthYearFmt = formatter({ month: 'long', year: 'numeric' })
const shortDateFmt = formatter({ day: 'numeric', month: 'short' })

/** 'lun', 'mar', … */
export const formatWeekdayShort = (dateStr) =>
  weekdayShortFmt.format(parseDateStr(dateStr)).replace('.', '')

/** '27 ottobre' */
export const formatDayMonth = (dateStr) => dayMonthFmt.format(parseDateStr(dateStr))

/** 'ottobre 2026' */
export const formatMonthYear = (dateStr) => monthYearFmt.format(parseDateStr(dateStr))

/** '27 ott' */
export const formatShortDate = (dateStr) =>
  shortDateFmt.format(parseDateStr(dateStr)).replace('.', '')

/**
 * 'Oggi', 'Ieri', 'Domani' oppure il giorno della settimana con l'iniziale maiuscola.
 * @param {string} dateStr
 * @returns {string}
 */
export function formatRelativeDay(dateStr) {
  const today = todayStr()
  if (dateStr === today) return 'Oggi'
  if (dateStr === addDays(today, -1)) return 'Ieri'
  if (dateStr === addDays(today, 1)) return 'Domani'
  const weekday = weekdayLongFmt.format(parseDateStr(dateStr))
  return weekday.charAt(0).toUpperCase() + weekday.slice(1)
}
