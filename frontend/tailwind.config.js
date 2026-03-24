/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lib-dark': 'var(--color-lib-dark)',
        'lib-secondary': 'var(--color-lib-secondary)',
        'lib-card': 'var(--color-lib-card)',
        'lib-border': 'var(--color-lib-border)',
        'lib-primary': 'var(--color-lib-primary)',
      },
      textColor: {
        'primary': 'var(--text-primary)',
        'secondary': 'var(--text-secondary)',
        'tertiary': 'var(--text-tertiary)',
        'lib-dark': '#0f0f14',
        'lib-secondary': '#1a1a24',
        'lib-card': '#16161e',
        'lib-border': '#2a2a35',
        'lib-primary': '#8b5cf6',
      },
    },
  },
  plugins: [],
}
