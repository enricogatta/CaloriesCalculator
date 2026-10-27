import React from 'react';
import {
  CloseIcon,
  UtensilsIcon,
  TargetIcon,
  KeyIcon,
  RefreshIcon,
  LogOutIcon,
} from '../UI/Icons';

const navItemClass = (active) =>
  `flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-colors ${
    active ? 'bg-white/[0.06] text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
  }`;

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen, currentView, setCurrentView, onSync, syncLoading, onSignOut, userEmail }) => (
  <>
    {isSidebarOpen && (
      <div
        className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm"
        onClick={() => setIsSidebarOpen(false)}
      >
        <div
          className="flex h-full w-72 max-w-[85vw] flex-col border-r border-white/5 bg-zinc-950 p-4"
          style={{
            paddingTop: 'calc(1rem + env(safe-area-inset-top))',
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="mb-6 flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <img src="/icona.png" alt="" className="h-8 w-8 rounded-lg object-contain" />
              <span className="text-sm font-semibold tracking-tight text-white">Calories Calculator</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Chiudi menu"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            <button
              onClick={() => { setCurrentView('calculator'); setIsSidebarOpen(false); }}
              className={navItemClass(currentView === 'calculator')}
            >
              <UtensilsIcon size={18} className={currentView === 'calculator' ? 'text-violet-400' : ''} />
              Diario alimentare
            </button>
            <button
              onClick={() => { setCurrentView('goals'); setIsSidebarOpen(false); }}
              className={navItemClass(currentView === 'goals')}
            >
              <TargetIcon size={18} className={currentView === 'goals' ? 'text-violet-400' : ''} />
              Obiettivi
            </button>
            <button
              onClick={() => { setCurrentView('settings'); setIsSidebarOpen(false); }}
              className={navItemClass(currentView === 'settings')}
            >
              <KeyIcon size={18} className={currentView === 'settings' ? 'text-violet-400' : ''} />
              Chiave API
            </button>
          </nav>

          <div className="my-3 h-px bg-white/5" />

          <button
            onClick={onSync}
            disabled={syncLoading}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-colors ${
              syncLoading
                ? 'cursor-not-allowed text-zinc-600'
                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
            }`}
          >
            <RefreshIcon size={18} className={syncLoading ? 'animate-spin' : ''} />
            {syncLoading ? 'Sincronizzazione...' : 'Sincronizza dati'}
          </button>

          <div className="mt-auto border-t border-white/5 pt-4">
            {userEmail && (
              <p className="mb-2 truncate px-3.5 text-xs text-zinc-600">{userEmail}</p>
            )}
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-400/10"
            >
              <LogOutIcon size={18} />
              Esci
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);

export default React.memo(Sidebar);
