import { useEffect, useState } from 'react'
import { CircleCheck, KeyRound, LogOut, RefreshCw, TriangleAlert } from 'lucide-react'
import { PageTitle } from '../components/layout/PageTitle'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { FormField } from '../components/ui/FormField'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { inputClass } from '../components/ui/fieldStyles'
import { useAuth } from '../hooks/useAuth'
import { useData } from '../hooks/useData'
import { useDialog } from '../hooks/useDialog'
import { useTheme } from '../hooks/useTheme'
import { hasAiApiKey, removeAiApiKey, saveAiApiKey } from '../services/profileService'

const THEME_OPTIONS = [
  { value: 'light', label: 'Chiaro' },
  { value: 'dark', label: 'Scuro' },
  { value: 'system', label: 'Sistema' },
]

// Le chiavi Groq iniziano con gsk_ e non contengono spazi
const GROQ_KEY_PATTERN = /^gsk_\S{20,}$/

/**
 * Section component
 * Gruppo di impostazioni stile iOS: titolo piccolo sopra una card.
 */
function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-4 text-sm font-semibold uppercase tracking-widest text-content-muted">{title}</h2>
      <Card className="flex flex-col gap-4 p-4">{children}</Card>
    </section>
  )
}

/**
 * ApiKeySection component
 * Stato della chiave Groq (il browser sa solo se esiste, non la legge),
 * salvataggio e rimozione.
 */
function ApiKeySection() {
  const { user } = useAuth()
  const { confirm } = useDialog()
  const [hasKey, setHasKey] = useState(null) // null = sto controllando
  const [loadError, setLoadError] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [inputError, setInputError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    let cancelled = false
    hasAiApiKey().then(({ data, error }) => {
      if (cancelled) return
      setLoadError(Boolean(error))
      setHasKey(data ?? false)
    })
    return () => { cancelled = true }
  }, [])

  const handleSave = async (event) => {
    event.preventDefault()
    const key = keyInput.trim()
    setFeedback(null)
    if (!GROQ_KEY_PATTERN.test(key)) {
      setInputError('Incolla la chiave completa da GroqCloud: inizia con «gsk_» e non contiene spazi.')
      return
    }
    setInputError(null)
    setSaving(true)
    const { error } = await saveAiApiKey(user.id, key)
    setSaving(false)
    if (error) {
      setFeedback({ tone: 'danger', text: 'Salvataggio non riuscito. Controlla la connessione e riprova.' })
      return
    }
    setHasKey(true)
    setKeyInput('')
    setFeedback({ tone: 'success', text: 'Chiave salvata.' })
  }

  const handleRemove = async () => {
    const ok = await confirm({
      title: 'Rimuovere la chiave Groq?',
      message: 'Senza chiave potrai ancora usare gli alimenti già nella tua libreria, ma non analizzarne di nuovi.',
      confirmLabel: 'Rimuovi',
      tone: 'danger',
    })
    if (!ok) return
    const { error } = await removeAiApiKey(user.id)
    if (error) {
      setFeedback({ tone: 'danger', text: 'Rimozione non riuscita. Riprova.' })
      return
    }
    setHasKey(false)
    setFeedback({ tone: 'success', text: 'Chiave rimossa.' })
  }

  return (
    <Section title="Chiave API Groq">
      {hasKey === null && <p className="text-base text-content-muted">Controllo la chiave…</p>}
      {hasKey !== null && loadError && (
        <p className="flex items-center gap-2 text-base text-warning">
          <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
          Non riesco a verificare la chiave in questo momento.
        </p>
      )}
      {hasKey !== null && !loadError && (
        <p className={`flex items-center gap-2 text-base ${hasKey ? 'text-success' : 'text-warning'}`}>
          {hasKey
            ? <CircleCheck className="size-5 shrink-0" aria-hidden="true" />
            : <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />}
          {hasKey ? 'Chiave impostata' : 'Nessuna chiave: serve per analizzare alimenti nuovi'}
        </p>
      )}

      <form onSubmit={handleSave} noValidate className="flex flex-col gap-4">
        <FormField
          label={hasKey ? 'Sostituisci la chiave' : 'Incolla la tua chiave'}
          error={inputError}
          hint="La chiave resta sul server: dopo il salvataggio non è più visibile, nemmeno a te."
        >
          {(field) => (
            <input
              {...field}
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="gsk_…"
              value={keyInput}
              onChange={(event) => { setKeyInput(event.target.value); setInputError(null); setFeedback(null) }}
              className={`${inputClass(inputError)} font-mono`}
            />
          )}
        </FormField>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" icon={KeyRound} loading={saving} disabled={!keyInput.trim()}>
            Salva chiave
          </Button>
          {hasKey && <Button variant="danger-ghost" onClick={handleRemove}>Rimuovi</Button>}
        </div>
        {feedback && (
          <p role="status" className={`text-sm ${feedback.tone === 'success' ? 'text-success' : 'text-danger'}`}>
            {feedback.text}
          </p>
        )}
      </form>

      <p className="text-sm text-content-muted">
        Una chiave gratuita si crea su{' '}
        <a
          href="https://console.groq.com/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-accent-text underline-offset-2 hover:underline"
        >
          GroqCloud
        </a>.
      </p>
    </Section>
  )
}

/**
 * ImpostazioniPage
 * Aspetto (tema), chiave Groq, ricarica dati, account.
 */
export function ImpostazioniPage() {
  const { user, signOut } = useAuth()
  const { refreshAll } = useData()
  const { preference, setPreference } = useTheme()
  const [refreshed, setRefreshed] = useState(false)

  return (
    <>
      <PageTitle eyebrow="Account" title="Le tue" accent="impostazioni." />

      <div className="flex flex-col gap-8">
        <Section title="Aspetto">
          <SegmentedControl label="Tema" options={THEME_OPTIONS} value={preference} onChange={setPreference} />
          <p className="text-sm text-content-muted">
            «Sistema» segue il tema chiaro o scuro impostato sul telefono.
          </p>
        </Section>

        <ApiKeySection />

        <Section title="Dati">
          <p className="text-sm text-content-muted">
            I dati si aggiornano da soli quando riapri l'app. Se li hai modificati da un altro dispositivo
            puoi ricaricarli subito.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" icon={RefreshCw} onClick={() => { refreshAll(); setRefreshed(true) }}>
              Ricarica dati
            </Button>
            {refreshed && <span role="status" className="text-sm text-content-muted">Dati ricaricati.</span>}
          </div>
        </Section>

        <Section title="Account">
          <p className="truncate text-base text-content">{user.email}</p>
          <div>
            <Button variant="danger-ghost" icon={LogOut} onClick={signOut} className="-ml-4">
              Esci
            </Button>
          </div>
        </Section>
      </div>
    </>
  )
}
