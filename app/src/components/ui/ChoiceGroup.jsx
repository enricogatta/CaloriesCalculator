import { useRef } from 'react'

/**
 * ChoiceGroup component
 * Scelta singola fra opzioni con etichette lunghe (es. le 4 categorie di pasto):
 * capsule su 2 colonne su telefono, in riga da sm in su. Per 2–3 opzioni brevi
 * usa SegmentedControl.
 * @param {Array<{value: string, label: string}>} options
 * @param {string} value
 * @param {Function} onChange - (value) => void
 * @param {string} labelledBy - id della label del gruppo
 */
export function ChoiceGroup({ options, value, onChange, labelledBy }) {
  const buttonsRef = useRef([])
  const activeIndex = Math.max(0, options.findIndex(o => o.value === value))

  const onKeyDown = (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    const next = (activeIndex + step + options.length) % options.length
    onChange(options[next].value)
    buttonsRef.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {options.map((option, index) => {
        const selected = index === activeIndex
        return (
          <button
            key={option.value}
            ref={el => { buttonsRef.current[index] = el }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={onKeyDown}
            className={[
              'min-h-11 rounded-full px-4 text-base transition-colors duration-150 active:scale-98',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text',
              // Selezione tinta, non piena: il blu pieno resta al solo bottone primario
              selected
                ? 'bg-accent-text/15 text-accent-text font-semibold ring-1 ring-accent-text'
                : 'bg-surface-sunken text-content hover:bg-line',
            ].join(' ')}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
