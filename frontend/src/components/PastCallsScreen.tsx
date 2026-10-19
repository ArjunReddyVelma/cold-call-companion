import React, { useState } from 'react';
import { Search, Filter, PhoneCall, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { Call } from '../types/call';
import { OUTCOME_META, DEFAULT_STAGES } from '../constants/stages';

interface PastCallsScreenProps {
  calls: Call[];
  loading: boolean;
  error: string | null;
  onSelectCall: (call: Call) => void;
  onOpenStartCall: () => void;
  onRefresh: () => void;
}

export const PastCallsScreen: React.FC<PastCallsScreenProps> = ({
  calls,
  loading,
  error,
  onSelectCall,
  onOpenStartCall,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');

  const getStageName = (num: number) => {
    const s = DEFAULT_STAGES.find((stg) => stg.stage_number === num);
    return s ? s.name : `Stage ${num}`;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const filteredCalls = calls.filter((c) => {
    const matchesSearch =
      (c.prospect_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.summary || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOutcome =
      outcomeFilter === 'all' || c.final_outcome === outcomeFilter;

    return matchesSearch && matchesOutcome;
  });

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* Top Header & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Call History & Review
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Review past conversations, last stage reached, logged outcomes, and AI summaries.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenStartCall}
            className="flex items-center gap-1.5 bg-[#0029FF] hover:bg-blue-600 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow transition-colors self-start sm:self-auto"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Start New Call</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by prospect name, company, or summary notes..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0029FF] focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0029FF] bg-white text-slate-700"
            >
              <option value="all">All Outcomes ({calls.length})</option>
              {Object.entries(OUTCOME_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Error loading past calls</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1 bg-white border border-rose-300 rounded font-bold text-[11px] text-rose-700 hover:bg-rose-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && calls.length === 0 && (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="w-8 h-8 border-3 border-[#0029FF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600">Loading call history...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredCalls.length === 0 && (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <PhoneCall className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">No calls found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm || outcomeFilter !== 'all'
              ? 'No past calls matched your search criteria.'
              : 'You have not recorded any calls yet. Start your first call to guide your conversation.'}
          </p>
          <button
            type="button"
            onClick={onOpenStartCall}
            className="px-4 py-2 bg-[#0029FF] hover:bg-blue-600 text-white font-bold text-xs rounded-lg shadow inline-flex items-center gap-1.5"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Start First Call</span>
          </button>
        </div>
      )}

      {/* Calls List */}
      <div className="space-y-3">
        {filteredCalls.map((call) => {
          const outcomeMeta = call.final_outcome ? OUTCOME_META[call.final_outcome] : null;

          return (
            <div
              key={call.id}
              onClick={() => onSelectCall(call)}
              className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-4 sm:p-5 shadow-sm transition-all cursor-pointer hover:shadow group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-[#0029FF] transition-colors">
                      {call.prospect_name || 'Unknown Prospect'}
                    </h3>
                    {outcomeMeta && (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold border"
                        style={{
                          backgroundColor: outcomeMeta.bgColor,
                          color: outcomeMeta.color,
                          borderColor: outcomeMeta.borderColor
                        }}
                      >
                        {outcomeMeta.label}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-medium">
                    {call.prospect_role ? `${call.prospect_role}, ` : ''}
                    {call.company_name || 'Private Enterprise'}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                  <div className="text-right">
                    <div className="text-xs font-bold text-[#0029FF]">
                      Stage {call.last_stage_reached}: {getStageName(call.last_stage_reached)}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(call.started_at)}</span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0029FF] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Summary snippet */}
              {call.summary && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  <strong className="text-slate-800 font-mono text-[11px] uppercase mr-1">
                    AI Summary:
                  </strong>
                  {call.summary.replace(/\*\*/g, '')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
