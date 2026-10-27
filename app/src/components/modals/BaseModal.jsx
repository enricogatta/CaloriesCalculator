import { useEffect, useEffectEvent, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Modali aperti, dall'ultimo in cima: Esc e Tab agiscono solo su quello in cima
// (es. la conferma aperta sopra il form di un alimento)
const openModals = []

/**
 * BaseModal component
 * Guscio di tutti i modali: foglio che sale dal basso su ogni schermo (da sm in
 * su largo al massimo come una colonna), velo sfocato dietro. Portal su body (su
 * iOS position:fixed dentro un contenitore scrollabile si aggancia al
 * contenitore), scroll della pagina bloccato, focus intrappolato, chiusura con
 * Esc o toccando fuori, focus restituito a chi l'ha aperto.
 * Senza initialFocusRef il focus va al pannello: nessun campo si attiva da solo
 * (su telefono aprirebbe la tastiera prima del tempo).
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {string} title
 * @param {string} description - Sottotitolo (opzionale)
 * @param {ReactNode} footer - Bottoni in fondo, fuori dall'area che scorre
 * @param {object} initialFocusRef - Elemento da mettere a fuoco all'apertura (solo bottoni, mai campi di testo)
 * @param {boolean} dismissible - false per impedire la chiusura (es. durante un salvataggio)
 */
export function BaseModal({
  isOpen,
  onClose,
  title,
  description,
  footer,
  initialFocusRef,
  dismissible = true,
  children,
}) {
  const panelRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  const requestClose = useEffectEvent(() => {
    if (dismissible) onClose()
  })

  useEffect(() => {
    if (!isOpen) return
    const modalId = Symbol('modal')
    openModals.push(modalId)
    const previouslyFocused = document.activeElement
    lockBodyScroll()

    const target = initialFocusRef?.current ?? panelRef.current
    target?.focus({ preventScroll: true })

    const onKeyDown = (event) => {
      if (openModals[openModals.length - 1] !== modalId) return
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = [...panelRef.current.querySelectorAll(FOCUSABLE)]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      openModals.splice(openModals.indexOf(modalId), 1)
      unlockBodyScroll()
      previouslyFocused?.focus?.({ preventScroll: true })
    }
  }, [isOpen, initialFocusRef])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 animate-fade-in bg-scrim backdrop-blur-sm"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="relative flex max-h-sheet w-full animate-sheet-in flex-col overflow-hidden rounded-t-xl bg-surface-raised shadow-lg focus:outline-none sm:max-w-md"
      >
        {/* Maniglia del foglio, solo decorativa (iOS) */}
        <span className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />

        <div className="flex shrink-0 items-start gap-3 px-6 pt-4 pb-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl font-semibold leading-tight text-content">{title}</h2>
            {description && (
              <p id={descriptionId} className="mt-2 text-base text-content-muted">{description}</p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi"
              className="-mt-2 -mr-3 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-content-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {children && (
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-6 pb-6">
            {children}
          </div>
        )}

        {footer && (
          // Con contenuto scorrevole sopra, un filo separa i bottoni da ciò che scorre
          <div className={`shrink-0 px-6 pb-safe-6 ${children ? 'border-t border-line pt-4' : ''}`}>{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}
