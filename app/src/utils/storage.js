// localStorage può lanciare eccezioni (Safari in navigazione privata, storage
// bloccato): si degrada in silenzio invece di rompere l'app.

/**
 * @param {string} key
 * @returns {string|null}
 */
export function readStorage(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * @param {string} key
 * @param {string} value
 */
export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // preferenza non salvata: vale solo per questa sessione
  }
}
