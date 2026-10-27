import { useRef } from 'react'
import { BaseModal } from './BaseModal'
import { Button } from '../ui/Button'

/**
 * NoticeModal component
 * Avviso con un solo tasto, al posto di alert. Di solito lo apre useDialog().notice(...).
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {string} title - Cosa è successo
 * @param {string} message - Come risolvere
 * @param {string} buttonLabel
 */
export function NoticeModal({ isOpen, onClose, title, message, buttonLabel = 'Ho capito' }) {
  const buttonRef = useRef(null)

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={message}
      initialFocusRef={buttonRef}
      footer={
        <div className="flex sm:justify-end">
          <Button ref={buttonRef} variant="secondary" onClick={onClose} fullWidth className="sm:w-auto sm:min-w-28">
            {buttonLabel}
          </Button>
        </div>
      }
    />
  )
}
