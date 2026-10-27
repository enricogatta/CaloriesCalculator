// Applica il tema prima del primo paint, così non c'è il lampo di colore sbagliato.
// File esterno e non script inline: la CSP non ammette script inline.
// Chiave e valori devono restare allineati a ThemeProvider (src/context/ThemeContext.jsx).
;(function () {
  var preference = 'system'
  try {
    preference = localStorage.getItem('cc-theme') || 'system'
  } catch (e) {
    // localStorage non disponibile (es. navigazione privata): vale il tema di sistema
  }
  var dark =
    preference === 'dark' ||
    (preference !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#000000' : '#f2f2f7')
})()
