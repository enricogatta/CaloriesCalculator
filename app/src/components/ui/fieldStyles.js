// Classi condivise da input, select e autocomplete: stessi stati ovunque.
// Testo a 16px (text-base): sotto, iOS zooma al focus.

/**
 * @param {string|boolean} error - Se presente il bordo e il focus diventano rossi
 * @returns {string}
 */
export function inputClass(error) {
  return [
    'w-full min-h-11 rounded-md bg-surface-sunken px-4 text-base text-content',
    'placeholder:text-content-subtle',
    'border', error ? 'border-danger' : 'border-transparent',
    'transition-colors duration-150',
    'focus:outline-none focus-visible:ring-2',
    error ? 'focus-visible:ring-danger' : 'focus-visible:ring-accent-text',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' ')
}
