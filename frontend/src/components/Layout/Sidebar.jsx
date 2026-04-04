import React from 'react';

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen, currentView, setCurrentView, onSync, syncLoading }) => (
  <>
    {isSidebarOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex animate-in fade-in duration-200" onClick={() => setIsSidebarOpen(false)}>
        <div
          className="w-72 bg-slate-950 border-r border-violet-700 border-opacity-50 h-full p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-left duration-300"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-8 mt-2">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">Menu</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white text-2xl font-bold">✕</button>
          </div>

          <button
            onClick={() => { setCurrentView('calculator'); setIsSidebarOpen(false); }}
            className={`text-left px-4 py-4 rounded-xl font-bold transition-all flex items-center gap-3 ${currentView === 'calculator' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : 'text-gray-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <span className="text-xl">🍽️</span> Calories Calculator
          </button>
          <button
            onClick={() => { setCurrentView('goals'); setIsSidebarOpen(false); }}
            className={`text-left px-4 py-4 rounded-xl font-bold transition-all flex items-center gap-3 ${currentView === 'goals' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : 'text-gray-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <span className="text-xl">🎯</span> Miei Obiettivi
          </button>

          <button
            onClick={onSync}
            disabled={syncLoading}
            className={`text-left px-4 py-4 rounded-xl font-bold transition-all flex items-center gap-3 ${syncLoading ? 'bg-slate-800 text-gray-500 cursor-not-allowed' : 'text-cyan-300 hover:bg-slate-800 hover:text-cyan-200'}`}
          >
            <span className="text-xl">🔄</span> {syncLoading ? 'Sincronizzazione...' : 'Sincronizza ora'}
          </button>
        </div>
      </div>
    )}
  </>
);

export default React.memo(Sidebar);