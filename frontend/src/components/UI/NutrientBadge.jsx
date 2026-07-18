import React from 'react';

// color: classe Tailwind di background per il pallino (es. "bg-sky-400")
const NutrientBadge = ({ label, value, color }) => (
  <div className="flex items-center gap-1.5 rounded-md border border-white/5 bg-zinc-950/60 px-2 py-1">
    <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
    <span className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">{label}</span>
    <span className="text-xs font-semibold text-zinc-200 tabular-nums">{value}</span>
  </div>
);

export default React.memo(NutrientBadge);
