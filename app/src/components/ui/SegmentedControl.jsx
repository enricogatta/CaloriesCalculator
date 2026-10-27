import { useRef } from 'react'

/**
 * SegmentedControl component
 * Scelta fra 2–3 opzioni brevi, con la capsula che scorre sull'opzione attiva.
 * Si usa con le frecce della tastiera come un gruppo di radio.
 * @param {Array<{value: string, label: string}>} options
 * @param {string} value - Opzione selezionata
 * @param {Function} onChange - (value) => void
 * @param {string} label - Nome del gruppo per i lettori di schermo
 */
export function SegmentedControl({ options, value, onChange, label, className = '' }) {
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
    <div
      role="radiogroup"
      aria-label={label}
      className={`relative grid rounded-full bg-surface-sunken p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-full bg-surface-raised shadow-sm transition-transform duration-200 ease-out"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
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
              'relative min-h-11 rounded-full px-2 text-sm font-semibold transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text',
              selected ? 'text-content' : 'text-content-muted hover:text-content',
            ].join(' ')}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
