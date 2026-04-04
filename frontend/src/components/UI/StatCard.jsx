import React from 'react';

const StatCard = ({ label, value, unit, icon, gradient, percentage }) => (
  <div className={`bg-gradient-to-br ${gradient} p-6 rounded-2xl text-white shadow-lg border border-white border-opacity-10 group hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between`}>
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase font-bold opacity-90 tracking-wider">{label}</p>
        <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-black">{value}</span>
        <span className="text-xs font-semibold opacity-80">{unit}</span>
      </div>
    </div>
    {percentage !== undefined && (
      <div className="mt-4">
        <div className="h-1.5 w-full bg-black bg-opacity-30 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${percentage > 100 ? 'bg-red-400' : 'bg-white'}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <p className={`text-[10px] mt-1 font-bold text-right opacity-90 ${percentage > 100 ? 'text-red-300' : ''}`}>
          {percentage}% {percentage > 100 ? '(Superato)' : ''}
        </p>
      </div>
    )}
  </div>
);

export default React.memo(StatCard);