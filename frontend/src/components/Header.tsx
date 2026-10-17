import React from 'react';
import { PhoneCall, History, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Call } from '../types/call';

interface HeaderProps {
  activeTab: 'live' | 'history';
  onSelectTab: (tab: 'live' | 'history') => void;
  activeCall: Call | null;
  onOpenStartCall: () => void;
  backendHealthy: boolean | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  activeCall,
  onOpenStartCall,
  backendHealthy
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-4 md:px-8 py-3.5 sticky top-0 z-40 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#0029FF] flex items-center justify-center font-mono font-black text-white text-sm tracking-wider shadow">
            DT
          </div>
          <div>
            <h1 className="font-extrabold text-sm md:text-base tracking-tight leading-none text-white">
              Cold Call <span className="text-[#3b82f6]">Companion</span>
            </h1>
            <p className="font-mono text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
              DeepThought FDE · Hyderabad
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
          <button
            type="button"
            onClick={() => onSelectTab('live')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'live'
                ? 'bg-[#0029FF] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Live Call</span>
            {activeCall && !activeCall.is_closed && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('history')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-[#0029FF] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Past Calls</span>
          </button>
        </nav>

        {/* Actions & Health */}
        <div className="flex items-center gap-3">
          {/* Health Indicator */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/50 border border-slate-700/50 text-[11px] font-mono"
            title={backendHealthy ? "Backend API & Database Connected" : "Backend Disconnected"}
          >
            {backendHealthy === true ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">API OK</span>
              </>
            ) : backendHealthy === false ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-300">API Offline</span>
              </>
            ) : (
              <span className="text-slate-400">Checking...</span>
            )}
          </div>

          {/* New Call Button */}
          <button
            type="button"
            onClick={onOpenStartCall}
            className="flex items-center gap-1.5 bg-[#0029FF] hover:bg-blue-600 text-white font-bold text-xs px-3 py-1.5 rounded-md shadow transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Call</span>
          </button>
        </div>
      </div>
    </header>
  );
};
