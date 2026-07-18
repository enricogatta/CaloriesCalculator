import React from 'react';

// Tinte soft per macro: card colorata ma non satura, testo valore sempre bianco
const TONES = {
  orange: {
    card: 'border-orange-400/25 bg-gradient-to-br from-orange-500/25 to-orange-500/[0.08]',
    label: 'text-orange-300/90',
    pct: 'text-orange-300/80',
    bar: 'bg-orange-400',
  },
  sky: {
    card: 'border-sky-400/25 bg-gradient-to-br from-sky-500/25 to-sky-500/[0.08]',
    label: 'text-sky-300/90',
    pct: 'text-sky-300/80',
    bar: 'bg-sky-400',
  },
  amber: {
    card: 'border-amber-400/25 bg-gradient-to-br from-amber-500/25 to-amber-500/[0.08]',
    label: 'text-amber-300/90',
    pct: 'text-amber-300/80',
    bar: 'bg-amber-400',
  },
  emerald: {
    card: 'border-emerald-400/25 bg-gradient-to-br from-emerald-500/25 to-emerald-500/[0.08]',
    label: 'text-emerald-300/90',
    pct: 'text-emerald-300/80',
    bar: 'bg-emerald-400',
  },
};

const StatCard = ({ label, value, unit, goal, tone = 'orange', percentage }) => {
  const t = TONES[tone] ?? TONES.orange;
  const over = percentage !== undefined && percentage > 100;

  return (
    <div className={`flex flex-col justify-between rounded-2xl border p-4 ${t.card}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs font-medium ${t.label}`}>{label}</p>
        {percentage !== undefined && (
          <span className={`text-[11px] font-semibold tabular-nums ${over ? 'text-red-400' : t.pct}`}>
            {percentage}%
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-2xl font-semibold tracking-tight text-white tabular-nums">{value}</span>
        <span className="text-xs font-medium text-zinc-400 tabular-nums">
          {goal !== undefined ? `/ ${goal} ${unit}` : unit}
        </span>
      </div>
      {percentage !== undefined && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-400' : t.bar}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(StatCard);
