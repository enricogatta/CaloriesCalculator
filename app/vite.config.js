import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// Content Security Policy iniettata come <meta> solo in build: in sviluppo Vite
// usa uno script inline per l'hot reload di React, che questa policy bloccherebbe.
// frame-ancestors non vale nei meta: lo copre X-Frame-Options in netlify.toml.
function cspMeta(supabaseUrl) {
  const supabaseHost = new URL(supabaseUrl).host
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    // React applica stili inline (larghezze delle barre, posizione dei menu)
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')

  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
    ],
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      cspMeta(env.VITE_SUPABASE_URL),
    ],
  }
})
