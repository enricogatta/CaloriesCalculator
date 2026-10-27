// Blocca lo scroll della pagina sotto un modale. Su iOS overflow:hidden sul body
// non basta: il body va fissato e poi riportato alla posizione di prima.
// Il contatore permette modali annidati (es. conferma sopra un form).

let lockCount = 0
let savedScrollY = 0

export function lockBodyScroll() {
  lockCount += 1
  if (lockCount > 1) return
  savedScrollY = window.scrollY
  const { style } = document.body
  style.position = 'fixed'
  style.top = `-${savedScrollY}px`
  style.left = '0'
  style.right = '0'
  style.overflow = 'hidden'
}

export function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount > 0) return
  const { style } = document.body
  style.position = ''
  style.top = ''
  style.left = ''
  style.right = ''
  style.overflow = ''
  window.scrollTo(0, savedScrollY)
}
