import { NavLink, useLocation } from 'react-router'
import { ChartColumn, NotebookPen, Apple, Target } from 'lucide-react'

const TABS = [
  { to: '/diario', label: 'Diario', icon: NotebookPen },
  { to: '/statistiche', label: 'Statistiche', icon: ChartColumn },
  { to: '/alimenti', label: 'Alimenti', icon: Apple },
  { to: '/obiettivi', label: 'Obiettivi', icon: Target },
]

/**
 * TabBar component
 * Barra a capsula in liquid glass che galleggia sopra il contenuto, sopra
 * l'home indicator. La capsula interna scorre sulla sezione attiva; nelle
 * pagine fuori dalle tab (Impostazioni) nessuna voce è attiva.
 */
export function TabBar() {
  const { pathname } = useLocation()
  const activeIndex = TABS.findIndex(tab => pathname.startsWith(tab.to))

  return (
    <nav aria-label="Sezioni" className="fixed inset-x-4 bottom-tabbar z-40 mx-auto max-w-md">
      <div className="glass relative grid grid-cols-4 rounded-full p-1">
        {activeIndex >= 0 && (
          <span
            aria-hidden="true"
            className="absolute inset-y-1 left-1 rounded-full bg-glass-active transition-transform duration-200 ease-out"
            style={{ width: 'calc((100% - 0.5rem) / 4)', transform: `translateX(${activeIndex * 100}%)` }}
          />
        )}
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => [
              'relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-full',
              'text-xs font-semibold transition-colors duration-150 active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text',
              isActive ? 'text-accent-text' : 'text-content',
            ].join(' ')}
          >
            <Icon className="size-6" strokeWidth={2} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
