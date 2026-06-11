import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

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
    <div className="max-w-lg mx-auto">
      <h2 className="text-3xl font-bold mb-8 text-white flex items-center gap-3 justify-center">
        <span>🔑</span> Chiave API Gemini
      </h2>

      <div className="bg-slate-900 border border-violet-700/40 rounded-2xl p-6 shadow-xl">
        {loading ? (
          <p className="text-gray-400 text-center py-4">Caricamento...</p>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-300 text-sm mb-1">Stato attuale</p>
              {hasKey ? (
                <div className="flex items-center gap-2 text-green-400 font-semibold">
                  <span className="text-lg">✓</span>
                  <span>Chiave API impostata</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-400 font-semibold">
                  <span className="text-lg">⚠</span>
                  <span>Nessuna chiave API impostata</span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                {hasKey ? 'Aggiorna chiave API' : 'Inserisci la tua chiave API'}
              </label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => { setKeyInput(e.target.value); setFeedback(null); }}
                onKeyDown={handleKeyDown}
                placeholder="AIzaSy..."
                className="w-full bg-slate-800 border border-violet-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 font-mono text-sm"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !keyInput.trim()}
              className="w-full py-3 rounded-xl font-bold transition-all bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvataggio...' : 'Salva chiave API'}
            </button>

            {feedback && (
              <p className={`mt-4 text-sm text-center font-medium ${feedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {feedback.msg}
              </p>
            )}

            <div className="mt-6 pt-5 border-t border-violet-700/30">
              <p className="text-gray-400 text-xs leading-relaxed">
                La chiave API viene usata per analizzare i tuoi alimenti tramite Google Gemini AI.
                Puoi ottenerne una gratuita su{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 underline"
                >
                  Google AI Studio
                </a>
                .
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ApiKeySettings;
