import { useState } from 'react'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { FormField } from '../components/ui/FormField'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { inputClass } from '../components/ui/fieldStyles'
import { supabase } from '../services/supabaseClient'

const MODES = [
  { value: 'login', label: 'Accedi' },
  { value: 'register', label: 'Registrati' },
]

// Messaggi di Supabase Auth tradotti; il resto diventa un messaggio generico
function translateAuthError(error) {
  const message = error?.message || ''
  if (/invalid login credentials/i.test(message)) return 'Email o password non corretti.'
  if (/email not confirmed/i.test(message)) return 'Prima conferma l\'email: apri il link che ti abbiamo mandato.'
  if (/already registered|already been registered/i.test(message)) return 'Esiste già un account con questa email: accedi.'
  if (/password should be at least/i.test(message)) return 'La password deve avere almeno 6 caratteri.'
  if (/rate limit|too many/i.test(message)) return 'Troppi tentativi. Riprova fra qualche minuto.'
  if (/failed to fetch|network/i.test(message)) return 'Connessione assente. Controlla la rete e riprova.'
  return 'Operazione non riuscita. Riprova fra poco.'
}

/**
 * LoginPage
 * Accesso e registrazione con email e password (nessun redirect esterno: funziona
 * anche nell'app aggiunta alla schermata Home di iPhone).
 */
export function LoginPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  const switchMode = (next) => {
    setMode(next)
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const { error: authError } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        })

    setLoading(false)
    if (authError) {
      setError(translateAuthError(authError))
      return
    }
    if (mode === 'register') {
      setSuccess('Account creato. Controlla la tua email e apri il link di conferma, poi accedi.')
    }
  }

  return (
    <div className="flex min-h-screen-dvh items-center justify-center bg-surface px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <img src="/icons/icon-192.png" alt="" className="size-20 rounded-lg" />
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-content">
            Calories <span className="text-accent-text">Calculator.</span>
          </h1>
          <p className="text-base text-content-muted">Il tuo diario alimentare, calcolato con l'AI.</p>
        </div>

        <div className="flex flex-col gap-6 rounded-lg bg-surface-raised p-6">
          <SegmentedControl label="Accesso o registrazione" options={MODES} value={mode} onChange={switchMode} />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <FormField label="Nome">
                {(field) => (
                  <input
                    {...field}
                    type="text"
                    autoComplete="given-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className={inputClass()}
                  />
                )}
              </FormField>
            )}
            <FormField label="Email">
              {(field) => (
                <input
                  {...field}
                  type="email"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  placeholder="nome@esempio.it"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass()}
                />
              )}
            </FormField>
            <FormField label="Password" hint={mode === 'register' ? 'Almeno 6 caratteri.' : undefined}>
              {(field) => (
                <input
                  {...field}
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClass()}
                />
              )}
            </FormField>

            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-md bg-danger/10 p-4 text-sm text-danger">
                <span className="flex h-5 shrink-0 items-center" aria-hidden="true"><TriangleAlert className="size-4" /></span>
                {error}
              </p>
            )}
            {success && (
              <p role="status" className="flex items-start gap-2 rounded-md bg-success/10 p-4 text-sm text-success">
                <span className="flex h-5 shrink-0 items-center" aria-hidden="true"><CircleCheck className="size-4" /></span>
                {success}
              </p>
            )}

            <Button type="submit" size="lg" fullWidth loading={loading} className="mt-2">
              {mode === 'login' ? 'Accedi' : 'Crea account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
