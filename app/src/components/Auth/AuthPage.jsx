import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

const inputClass =
  'w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-base text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-violet-400/60';

const AuthPage = () => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) throw error;
        setSuccessMsg('Registrazione completata! Controlla la tua email per confermare l\'account.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 px-4 py-8 text-white">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/40">
            <img src="/icona.png" alt="Calories Calculator" className="h-10 w-10 object-contain" />
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold tracking-tight">Calories Calculator</p>
            <p className="mt-0.5 text-sm text-zinc-500">Il tuo diario alimentare</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-violet-400/25 bg-zinc-950 bg-gradient-to-br from-violet-500/25 to-violet-500/[0.08] p-5 sm:p-6">
          {/* Tab switcher */}
          <div className="mb-6 flex gap-1 rounded-xl bg-zinc-950 p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                mode === 'login'
                  ? 'bg-violet-600 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                mode === 'register'
                  ? 'bg-violet-600 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Registrati
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Nome
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Il tuo nome"
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.com"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caratteri"
                required
                minLength={6}
                className={inputClass}
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-400">
                {error}
              </p>
            )}

            {successMsg && (
              <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-2.5 text-sm text-emerald-400">
                {successMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex h-[46px] w-full items-center justify-center rounded-xl bg-violet-600 text-[15px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {loading ? 'Attendere...' : mode === 'login' ? 'Accedi' : 'Crea account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
