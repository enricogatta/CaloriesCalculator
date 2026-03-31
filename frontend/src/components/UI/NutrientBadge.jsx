const NutrientBadge = ({ label, value, color }) => (
  <div className="flex items-center gap-1.5 bg-slate-800 bg-opacity-50 px-2.5 py-1 rounded-md border border-slate-700 border-opacity-50">
    <span className={`text-[10px] font-black ${color} uppercase tracking-tighter`}>{label}</span>
    <span className="text-xs font-bold text-white">{value}</span>
  </div>
);

export default NutrientBadge;