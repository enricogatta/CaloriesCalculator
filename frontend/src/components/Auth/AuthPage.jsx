import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

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
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-950 text-white relative overflow-hidden px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-slate-950 to-cyan-950 opacity-90" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-20 h-20 rounded-3xl bg-slate-900/80 border border-violet-500/30 shadow-2xl shadow-violet-500/20 flex items-center justify-center">
            <img src="/icona.png" alt="Calories Calculator" className="w-14 h-14 object-contain" />
          </div>
          <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-300">
            Calories Calculator
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-violet-700/30 rounded-2xl p-6 shadow-2xl shadow-violet-900/20">
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-slate-800/60 p-1 mb-6 gap-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                mode === 'login'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                mode === 'register'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Registrati
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Nome
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Il tuo nome"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="la@tua.email"
                required
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-700/30 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            {successMsg && (
              <p className="text-green-400 text-sm bg-green-900/20 border border-green-700/30 rounded-xl px-4 py-3">
                {successMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white shadow-lg shadow-violet-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
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
