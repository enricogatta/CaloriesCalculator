import React from 'react';

// Tinte soft per macro, coerenti con StatCard
const TONES = {
  orange: {
    card: 'border-orange-400/25 bg-gradient-to-br from-orange-500/25 to-orange-500/[0.08]',
    dot: 'bg-orange-400',
    label: 'text-orange-300/90',
  },
  sky: {
    card: 'border-sky-400/25 bg-gradient-to-br from-sky-500/25 to-sky-500/[0.08]',
    dot: 'bg-sky-400',
    label: 'text-sky-300/90',
  },
  amber: {
    card: 'border-amber-400/25 bg-gradient-to-br from-amber-500/25 to-amber-500/[0.08]',
    dot: 'bg-amber-400',
    label: 'text-amber-300/90',
  },
  emerald: {
    card: 'border-emerald-400/25 bg-gradient-to-br from-emerald-500/25 to-emerald-500/[0.08]',
    dot: 'bg-emerald-400',
    label: 'text-emerald-300/90',
  },
};

// Card modificabile per la pagina obiettivi
const EditableStatCard = ({ label, value, unit, tone = 'orange', onChange, onBlur }) => {
  const t = TONES[tone] ?? TONES.orange;

  return (
    <div className={`rounded-2xl border p-5 ${t.card}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${t.dot}`} />
        <p className={`text-xs font-medium tracking-wide uppercase ${t.label}`}>{label}</p>
      </div>
      <div className="flex items-baseline gap-2 rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 transition-colors focus-within:border-violet-400/60">
        <input
          type="number"
          value={value}
          onChange={onChange}
          onBlur={onBlur} // Salva su database al click esterno
          className="w-full bg-transparent text-right text-xl font-semibold text-white outline-none tabular-nums"
        />
        <span className="shrink-0 text-sm font-medium text-zinc-500">{unit}</span>
      </div>
    </div>
  );
};

export default React.memo(EditableStatCard);
