/**
 * Card component
 * Superficie piena sopra lo sfondo della pagina: niente bordo né ombra,
 * come le liste raggruppate di iOS.
 * @param {string|Function} as - Elemento da usare (predefinito: section)
 */
export function Card({ as: Tag = 'section', className = '', children, ...props }) {
  return (
    <Tag className={`rounded-lg bg-surface-raised ${className}`} {...props}>
      {children}
    </Tag>
  )
}
