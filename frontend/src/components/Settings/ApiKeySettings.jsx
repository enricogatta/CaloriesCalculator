import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { CheckIcon, AlertIcon } from '../UI/Icons';

const ApiKeySettings = ({ user }) => {
  const [keyInput, setKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('gemini_api_key')
        .eq('id', user.id)
        .single();
      if (!error && data?.gemini_api_key) {
        setHasKey(true);
      }
      setLoading(false);
    };
    loadProfile();
  }, [user.id]);

  const handleSave = async () => {
    const trimmedKey = keyInput.trim();
    if (!trimmedKey) return;
    setSaving(true);
    setFeedback(null);
    const { error } = await supabase
      .from('profiles')
      .update({ gemini_api_key: trimmedKey })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      setFeedback({ type: 'error', msg: `Errore nel salvataggio: ${error.message}` });
    } else {
      setHasKey(true);
      setKeyInput('');
      setFeedback({ type: 'success', msg: 'Chiave API salvata correttamente.' });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-white">Chiave API Gemini</h2>
        <p className="mt-1 text-sm text-zinc-400">
          La chiave viene usata per analizzare gli alimenti con Google Gemini AI.
        </p>
      </div>

      <div className="rounded-2xl border border-violet-400/25 bg-zinc-950 bg-gradient-to-br from-violet-500/25 to-violet-500/[0.08] p-5 sm:p-6">
        {loading ? (
          <p className="py-4 text-center text-sm text-zinc-500">Caricamento...</p>
        ) : (
          <>
            <div className="mb-6">
              <p className="mb-2 text-xs font-medium text-zinc-400">Stato attuale</p>
              {hasKey ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-400">
                  <CheckIcon size={16} />
                  <span>Chiave API impostata</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3.5 py-2.5 text-sm font-medium text-amber-400">
                  <AlertIcon size={16} />
                  <span>Nessuna chiave API impostata</span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                {hasKey ? 'Aggiorna chiave API' : 'Inserisci la tua chiave API'}
              </label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => { setKeyInput(e.target.value); setFeedback(null); }}
                onKeyDown={handleKeyDown}
                placeholder="AIzaSy..."
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2.5 font-mono text-base text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-violet-400/60"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !keyInput.trim()}
              className="flex h-[46px] w-full items-center justify-center rounded-xl bg-violet-600 text-[15px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {saving ? 'Salvataggio...' : 'Salva chiave API'}
            </button>

            {feedback && (
              <p className={`mt-4 text-center text-sm font-medium ${feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {feedback.msg}
              </p>
            )}

            <div className="mt-6 border-t border-white/5 pt-5">
              <p className="text-xs leading-relaxed text-zinc-500">
                Puoi ottenere una chiave gratuita su{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-violet-400 underline-offset-2 hover:underline"
                >
                  Google AI Studio
                </a>
                . La chiave viene salvata nel tuo profilo e non lascia mai il server.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ApiKeySettings;
