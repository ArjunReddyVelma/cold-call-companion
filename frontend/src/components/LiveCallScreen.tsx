import React, { useState, useEffect } from 'react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  PhoneOff,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { Call, StageDefinition } from '../types/call';

interface LiveCallScreenProps {
  call: Call;
  stages: StageDefinition[];
  currentStageNumber: number;
  onSelectStage: (stageNum: number) => void;
  onSaveStageResult: (
    stageNum: number,
    selectedResult: string,
    prospectWords: string
  ) => Promise<boolean>;
  onOpenEndCall: () => void;
  saveLoading: boolean;
  saveError: string | null;
}

export const LiveCallScreen: React.FC<LiveCallScreenProps> = ({
  call,
  stages,
  currentStageNumber,
  onSelectStage,
  onSaveStageResult,
  onOpenEndCall,
  saveLoading,
  saveError
}) => {
  const currentStage = stages.find((s) => s.stage_number === currentStageNumber) || stages[0];
  const nextStage = stages.find((s) => s.stage_number === currentStageNumber + 1);

  // Form states per stage
  const [selectedResult, setSelectedResult] = useState<string>('');
  const [prospectWords, setProspectWords] = useState<string>('');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);

  // Call timer (seconds)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    const startTime = new Date(call.started_at).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startTime) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [call.started_at]);

  // When changing stage, pre-fill with latest visit result if already recorded
  useEffect(() => {
    if (call.stage_results) {
      const visitsForThisStage = call.stage_results.filter(
        (sr) => sr.stage_number === currentStageNumber
      );
      if (visitsForThisStage.length > 0) {
        const latest = visitsForThisStage[visitsForThisStage.length - 1];
        setSelectedResult(latest.selected_result);
        setProspectWords(latest.prospect_words || '');
      } else {
        // default to first tap option if unselected
        setSelectedResult(currentStage.quick_tap_options[0] || '');
        setProspectWords('');
      }
    } else {
      setSelectedResult(currentStage.quick_tap_options[0] || '');
      setProspectWords('');
    }
    setSaveSuccessNotice(false);
  }, [currentStageNumber, call.stage_results, currentStage.quick_tap_options]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextClick = async () => {
    // If a result is selected or words entered, persist before moving
    if (selectedResult) {
      const success = await onSaveStageResult(currentStageNumber, selectedResult, prospectWords);
      if (success) {
        setSaveSuccessNotice(true);
        if (nextStage) {
          onSelectStage(nextStage.stage_number);
        }
      }
    } else if (nextStage) {
      onSelectStage(nextStage.stage_number);
    }
  };

  const handlePrevClick = () => {
    if (currentStageNumber > 1) {
      onSelectStage(currentStageNumber - 1);
    }
  };

  const handleExplicitSave = async () => {
    if (selectedResult) {
      const success = await onSaveStageResult(currentStageNumber, selectedResult, prospectWords);
      if (success) {
        setSaveSuccessNotice(true);
        setTimeout(() => setSaveSuccessNotice(false), 2500);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* Top Prospect & Timer Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 mb-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {call.prospect_name || 'Unknown Prospect'}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#0029FF] border border-blue-200">
                first call
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {call.prospect_role ? `${call.prospect_role}, ` : ''}
              {call.company_name || 'Private Enterprise'}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            {/* Live Timer */}
            <div className="flex items-center gap-2 bg-slate-900 text-white font-mono text-base font-extrabold px-3 py-1.5 rounded-lg shadow-sm border border-slate-800">
              <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            {/* Quick End Call Trigger */}
            <button
              type="button"
              onClick={onOpenEndCall}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow transition-colors"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>End call</span>
            </button>
          </div>
        </div>

        {/* 8-Stage Breadcrumb Navigation Bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
            <span>STAGE PROGRESSION</span>
            <span>{currentStageNumber} of 8</span>
          </div>

          <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
            {stages.map((stg) => {
              const isCurrent = stg.stage_number === currentStageNumber;
              const isVisited =
                call.stage_results &&
                call.stage_results.some((sr) => sr.stage_number === stg.stage_number);

              return (
                <button
                  key={stg.stage_number}
                  type="button"
                  onClick={() => onSelectStage(stg.stage_number)}
                  className={`flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-lg border transition-all ${
                    isCurrent
                      ? 'bg-[#0029FF] text-white border-[#0029FF] shadow ring-2 ring-[#0029FF]/20 font-black'
                      : isVisited
                      ? 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100 font-bold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 font-semibold'
                  }`}
                  title={`${stg.stage_number}. ${stg.name}`}
                >
                  <span className="text-xs sm:text-sm font-mono">{stg.stage_number}</span>
                  <span className="hidden sm:inline text-[10px] truncate max-w-[80px] mt-0.5">
                    {stg.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Stage Execution Surface */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-7 shadow-sm space-y-6">
        {/* Stage Header & Purpose */}
        <div className="border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-black uppercase tracking-wider text-[#0029FF]">
              Stage {currentStage.stage_number} of 8
            </span>
            {saveSuccessNotice && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved to call log
              </span>
            )}
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            {currentStage.name}
          </h3>
          <p className="text-sm text-slate-600 font-medium leading-relaxed mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
            <strong className="text-slate-800">What it is for: </strong>
            {currentStage.purpose}
          </p>
        </div>

        {/* Error notice if save failed */}
        {saveError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Failed to persist stage result</p>
              <p className="mt-0.5">{saveError}</p>
              <p className="mt-1 text-[11px] text-slate-500 font-mono">
                Your notes are kept in the box below. You can retry anytime.
              </p>
            </div>
          </div>
        )}

        {/* They May Say (3 Transcript-Derived Examples) */}
        <div>
          <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#0029FF]" />
            <span>They may say</span>
          </h4>
          <div className="grid gap-2">
            {currentStage.likely_responses.map((quote, idx) => (
              <div
                key={idx}
                className="text-xs sm:text-sm text-slate-700 bg-slate-50 border border-slate-200/60 rounded-lg px-3.5 py-2.5 italic leading-relaxed"
              >
                {quote}
              </div>
            ))}
          </div>
        </div>

        {/* What Happened (Quick-Tap Options) */}
        <div>
          <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-[#0029FF]" />
            <span>What happened</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {currentStage.quick_tap_options.map((option) => {
              const isSelected = selectedResult === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedResult(option)}
                  className={`text-left px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm font-bold transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-50 text-[#0029FF] border-[#0029FF] ring-2 ring-[#0029FF]/20 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{option}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-[#0029FF]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prospect's Words (Free text verbatim notes) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#0029FF]" />
              <span>Prospect's words</span>
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              The only free text on the screen
            </span>
          </div>
          <textarea
            rows={3}
            value={prospectWords}
            onChange={(e) => setProspectWords(e.target.value)}
            placeholder="Record verbatim phrasing, numbers, objections, or alternate contact numbers..."
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0029FF] focus:border-transparent font-sans leading-relaxed"
          />
        </div>

        {/* Navigation & Action Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrevClick}
              disabled={currentStageNumber <= 1 || saveLoading}
              className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={handleExplicitSave}
              disabled={!selectedResult || saveLoading}
              className="px-3 py-2 text-xs font-bold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-40"
              title="Save current notes without moving"
            >
              {saveLoading ? 'Saving...' : 'Save Notes'}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {nextStage ? (
              <button
                type="button"
                onClick={handleNextClick}
                disabled={saveLoading}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white bg-[#0029FF] hover:bg-blue-600 rounded-lg shadow transition-colors disabled:opacity-50"
              >
                <span>Next: {nextStage.name}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenEndCall}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow transition-colors"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Complete Call (Stage 8)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
