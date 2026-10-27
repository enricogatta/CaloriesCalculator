import { useRef } from 'react'
import { BaseModal } from './BaseModal'
import { Button } from '../ui/Button'

/**
 * ConfirmModal component
 * "Sei sicuro?" prima di un'operazione, al posto di window.confirm. Di solito
 * non si usa direttamente: lo apre useDialog().confirm(...).
 * Per le operazioni distruttive il focus va su "Annulla", così Invio non elimina per sbaglio.
 * @param {boolean} isOpen
 * @param {Function} onClose - Annulla (tasto secondario, tocco fuori, Esc)
 * @param {Function} onConfirm - Conferma
 * @param {string} title - Domanda (es. "Eliminare il piatto?")
 * @param {string} message - Conseguenze, in una frase
 * @param {string} confirmLabel - Verbo dell'azione (es. "Elimina")
 * @param {string} cancelLabel
 * @param {string} tone - 'danger' | 'default'
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  tone = 'default',
}) {
  const cancelRef = useRef(null)
  const confirmRef = useRef(null)

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={message}
      initialFocusRef={tone === 'danger' ? cancelRef : confirmRef}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" onClick={onClose} className="sm:min-w-28">
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            className="sm:min-w-28"
          >
            {confirmLabel}
          </Button>
        </div>
      }
    />
  )
}
