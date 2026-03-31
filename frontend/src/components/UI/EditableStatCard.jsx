// Nuova card modificabile per la pagina obiettivi
const EditableStatCard = ({ label, value, unit, icon, gradient, onChange, onBlur }) => (
  <div className={`bg-gradient-to-br ${gradient} p-6 rounded-2xl text-white shadow-lg border border-white border-opacity-10`}>
    <div className="flex items-center justify-between mb-4">
      <p className="text-xs uppercase font-bold opacity-90 tracking-wider">{label}</p>
      <span className="text-2xl">{icon}</span>
    </div>
    <div className="flex items-baseline gap-2 bg-black bg-opacity-20 p-2 rounded-xl border border-transparent focus-within:border-white focus-within:border-opacity-30 transition-all">
      <input
        type="number"
        value={value}
        onChange={onChange}
        onBlur={onBlur} // Salva su database al click esterno
        className="text-2xl font-black bg-transparent border-none outline-none w-full text-right"
      />
      <span className="text-sm font-semibold opacity-80">{unit}</span>
    </div>
  </div>
);

export default EditableStatCard;