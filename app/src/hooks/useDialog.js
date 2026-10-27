import { createContext, useContext } from 'react'

export const DialogContext = createContext(null)

/**
 * Modali standard al posto di window.confirm e alert.
 * - confirm({ title, message, confirmLabel, cancelLabel, tone }) → Promise<boolean>
 * - notice({ title, message, tone, buttonLabel }) → Promise<void>
 * tone: 'danger' per le operazioni distruttive o gli errori, 'default' altrimenti.
 *
 * @example
 * if (!(await confirm({ title: 'Eliminare il piatto?', confirmLabel: 'Elimina', tone: 'danger' }))) return
 */
export function useDialog() {
  const context = useContext(DialogContext)
  if (!context) throw new Error('useDialog va usato dentro DialogProvider')
  return context
}
