import React from 'react';

const LoadingScreen = ({ message = 'Caricamento dati in corso...' }) => (
  <div className="min-h-[100dvh] flex items-center justify-center bg-slate-950 text-white relative overflow-hidden px-4">
    <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-slate-950 to-cyan-950 opacity-90" />
    <div className="relative z-10 flex flex-col items-center justify-center gap-4 sm:gap-5 px-5 sm:px-6 text-center max-w-sm w-full">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-900/80 border border-violet-500/30 shadow-2xl shadow-violet-500/20 flex items-center justify-center animate-pulse">
        <img
          src="/icona.png"
          alt="Calories Calculator"
          className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
        />
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-300">
          Calories Calculator
        </p>
        <p className="text-xs sm:text-sm text-gray-300 mt-2 tracking-wide leading-relaxed">
          {message}
        </p>
      </div>
      <div className="w-36 sm:w-40 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full w-1/2 bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full animate-[pulse_1.4s_ease-in-out_infinite]" />
      </div>
    </div>
  </div>
);

export default React.memo(LoadingScreen);
