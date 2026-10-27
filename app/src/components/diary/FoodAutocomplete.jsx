import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { UNIT_LABELS } from '../../utils/nutrition'
import { inputClass } from '../ui/fieldStyles'

const MAX_RESULTS = 6

const filterFoods = (foods, text) => {
  const query = text.trim().toLowerCase()
  if (!query) return []
  return foods.filter(food => food.name.includes(query)).slice(0, MAX_RESULTS)
}

/**
 * FoodAutocomplete component
 * Campo alimento con i suggerimenti dalla libreria dell'utente.
 * - Il menu è in un portal su body con position:fixed calcolata dal campo: sfugge
 *   a modali e backdrop-filter che ne sfaserebbero la posizione.
 * - La posizione si riscrive sul DOM dopo ogni render (il campo si sposta se il
 *   foglio del modale cresce) e quando la tastiera iOS appare o sparisce (visualViewport).
 * - Nessun listener su window.scroll: su iOS la tastiera genera scroll che
 *   chiuderebbero il menu. Si chiude solo toccando fuori, con Esc o scegliendo.
 * - Tap e scroll nel menu sono distinti a mano su touch.
 * - Il menu si apre solo dopo che l'utente ha scritto: un valore precompilato
 *   (modifica piatto) non lo apre.
 * @param {string} value
 * @param {Function} onValueChange - (text) => void
 * @param {Function} onSelect - (food) => void, food è una riga di foods
 * @param {Array} foods - Libreria cibi
 * @param {object} fieldProps - id e aria-* da FormField
 * @param {string} error - Stato d'errore del bordo
 * @param {object} inputRef
 */
export function FoodAutocomplete({ value, onValueChange, onSelect, foods, fieldProps, error, inputRef, placeholder }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [pressedIndex, setPressedIndex] = useState(-1)
  const containerRef = useRef(null)
  const dropdownRef = useRef(null)
  const suppressCloseRef = useRef(false)
  const userTypedRef = useRef(false)
  // Distingue tap da scroll nel menu su touch screen
  const touchRef = useRef({ y: 0, moved: false })
  const listboxId = useId()

  const results = filterFoods(foods, value)
  const isOpen = open && results.length > 0

  // Posizione calcolata dal campo e scritta direttamente sul menu: funziona anche
  // dentro un modale e non serve un render in più
  const updateDropdownPosition = useCallback(() => {
    const anchor = containerRef.current
    const dropdown = dropdownRef.current
    if (!anchor || !dropdown) return
    const rect = anchor.getBoundingClientRect()
    // visualViewport.offsetTop compensa lo scroll che iOS fa quando appare la tastiera
    const viewportOffsetTop = window.visualViewport?.offsetTop ?? 0
    dropdown.style.top = `${rect.bottom + viewportOffsetTop + 4}px`
    dropdown.style.left = `${rect.left}px`
    dropdown.style.width = `${rect.width}px`
  }, [])

  // Dopo ogni render il campo può essersi spostato (es. il foglio del modale è
  // cresciuto mostrando un suggerimento): il menu lo segue
  useLayoutEffect(() => {
    if (isOpen) updateDropdownPosition()
  })

  useEffect(() => {
    if (!isOpen) return

    // Chiude se si tocca o clicca fuori da campo e menu
    const handleClose = (event) => {
      if (suppressCloseRef.current) return
      const insideInput = containerRef.current?.contains(event.target)
      const insideDropdown = dropdownRef.current?.contains(event.target)
      if (!insideInput && !insideDropdown) setOpen(false)
    }

    // Quando la tastiera iOS appare o sparisce: riposiziona e blocca per poco la
    // chiusura (lo spostamento del viewport può spostare il bersaglio del tocco)
    const handleViewportChange = () => {
      suppressCloseRef.current = true
      updateDropdownPosition()
      setTimeout(() => { suppressCloseRef.current = false }, 300)
    }

    const viewport = window.visualViewport
    document.addEventListener('mousedown', handleClose)
    // passive: true migliora lo scroll su iOS
    document.addEventListener('touchstart', handleClose, { passive: true })
    viewport?.addEventListener('resize', handleViewportChange)
    viewport?.addEventListener('scroll', handleViewportChange)
    return () => {
      document.removeEventListener('mousedown', handleClose)
      document.removeEventListener('touchstart', handleClose)
      viewport?.removeEventListener('resize', handleViewportChange)
      viewport?.removeEventListener('scroll', handleViewportChange)
    }
  }, [isOpen, updateDropdownPosition])

  const handleChange = (event) => {
    userTypedRef.current = true
    const text = event.target.value
    onValueChange(text)
    setActiveIndex(-1)
    setOpen(filterFoods(foods, text).length > 0)
  }

  const handleSelect = (food) => {
    userTypedRef.current = false
    onSelect(food)
    setOpen(false)
    setActiveIndex(-1)
    setPressedIndex(-1)
  }

  const handleKeyDown = (event) => {
    if (!isOpen) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      handleSelect(results[activeIndex])
    } else if (event.key === 'Escape') {
      // Chiude il menu senza chiudere il modale che lo contiene
      event.stopPropagation()
      event.nativeEvent.stopImmediatePropagation()
      setOpen(false)
    }
  }

  const optionId = (index) => `${listboxId}-option-${index}`

  return (
    <>
      <div ref={containerRef}>
        <input
          {...fieldProps}
          ref={inputRef}
          className={inputClass(error)}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (userTypedRef.current && results.length > 0) setOpen(true)
          }}
          autoComplete="off"
          autoCapitalize="none"
          enterKeyHint="next"
        />
      </div>

      {isOpen && createPortal(
        <ul
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          className="fixed z-60 max-h-56 overflow-y-auto overscroll-contain rounded-md border border-line bg-surface-raised py-1 shadow-md"
        >
          {results.map((food, index) => {
            const highlighted = index === activeIndex || index === pressedIndex
            return (
              <li
                key={food.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-2 text-base text-content transition-colors duration-150 ${
                  highlighted ? 'bg-surface-sunken' : 'hover:bg-surface-sunken'
                }`}
                onMouseDown={(event) => { event.preventDefault(); handleSelect(food) }}
                onTouchStart={(event) => {
                  touchRef.current = { y: event.touches[0].clientY, moved: false }
                  setPressedIndex(index)
                }}
                onTouchMove={(event) => {
                  // Se il dito si sposta è uno scroll: niente evidenziazione né selezione
                  if (Math.abs(event.touches[0].clientY - touchRef.current.y) > 10) {
                    touchRef.current.moved = true
                    setPressedIndex(-1)
                  }
                }}
                onTouchCancel={() => { touchRef.current.moved = true; setPressedIndex(-1) }}
                onTouchEnd={(event) => {
                  setPressedIndex(-1)
                  if (touchRef.current.moved) return
                  event.preventDefault()
                  handleSelect(food)
                }}
              >
                <span className="truncate first-letter:uppercase">{food.name}</span>
                <span className="shrink-0 text-sm text-content-muted">
                  {UNIT_LABELS[food.default_quantity_type] ?? food.default_quantity_type}
                </span>
              </li>
            )
          })}
        </ul>,
        document.body,
      )}
    </>
  )
}
