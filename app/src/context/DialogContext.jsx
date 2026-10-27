import { useCallback, useMemo, useState } from 'react'
import { DialogContext } from '../hooks/useDialog'
import { ConfirmModal } from '../components/modals/ConfirmModal'
import { NoticeModal } from '../components/modals/NoticeModal'

/**
 * DialogProvider
 * Monta un solo ConfirmModal e un solo NoticeModal per tutta l'app e li apre
 * con le opzioni della singola richiesta. Vedi useDialog.
 */
export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null)

  const confirm = useCallback(
    (options) => new Promise(resolve => setDialog({ type: 'confirm', options, resolve })),
    [],
  )
  const notice = useCallback(
    (options) => new Promise(resolve => setDialog({ type: 'notice', options, resolve })),
    [],
  )

  const close = (result) => {
    dialog?.resolve(result)
    setDialog(null)
  }

  const value = useMemo(() => ({ confirm, notice }), [confirm, notice])
  const options = dialog?.options ?? {}

  return (
    <DialogContext.Provider value={value}>
      {children}
      <ConfirmModal
        isOpen={dialog?.type === 'confirm'}
        onClose={() => close(false)}
        onConfirm={() => close(true)}
        {...options}
      />
      <NoticeModal
        isOpen={dialog?.type === 'notice'}
        onClose={() => close(undefined)}
        {...options}
      />
    </DialogContext.Provider>
  )
}
