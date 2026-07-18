import React from 'react';
import { SpinnerIcon } from './Icons';

const LoadingScreen = ({ message = 'Caricamento dati in corso...' }) => (
  <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 px-4 text-center text-white">
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/40">
      <img src="/icona.png" alt="Calories Calculator" className="h-12 w-12 object-contain" />
    </div>
    <p className="mt-5 text-lg font-semibold tracking-tight">Calories Calculator</p>
    <p className="mt-1 max-w-xs text-sm text-zinc-500">{message}</p>
    <SpinnerIcon size={22} className="mt-6 text-violet-400" />
  </div>
);

export default React.memo(LoadingScreen);
