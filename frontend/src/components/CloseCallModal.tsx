import React, { useState } from 'react';
import { X, CheckCircle, PhoneOff, Calendar, AlertTriangle } from 'lucide-react';
import { CallOutcome, CallCloseRequest } from '../types/call';
import { OUTCOME_META } from '../constants/stages';

interface CloseCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClose: (data: CallCloseRequest) => Promise<void>;
  currentStage: number;
  loading: boolean;
  errorMessage: string | null;
}

const ALL_OUTCOMES: CallOutcome[] = [
  'next_step_agreed',
  'agreed_to_receive_report',
  'interested',
  'follow_up',
  'call_again',
  'not_interested',
  'do_not_call',
  'wrong_person',
  'moved_company',
  'not_logged'
];

export const CloseCallModal: React.FC<CloseCallModalProps> = ({
  isOpen,
  onClose,
  onConfirmClose,
  currentStage,
  loading,
  errorMessage
}) => {
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome>('next_step_agreed');
  const [nextStep, setNextStep] = useState('');
  const [nextStepAt, setNextStepAt] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirmClose({
      final_outcome: selectedOutcome,
      next_step: nextStep.trim() || undefined,
      next_step_at: nextStepAt ? new Date(nextStepAt).toISOString() : undefined,
      last_stage_reached: currentStage
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-rose-950/90 text-white px-6 py-4 flex items-center justify-between border-b border-rose-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-rose-600 text-white">
              <PhoneOff className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">End Call & Record Outcome</h2>
              <p className="text-[11px] text-rose-200 font-mono mt-0.5">
                Closing from Stage {currentStage} of 8
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-rose-200 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Failed to close call</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Select Final Outcome <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 mb-3">
              Preserve reality accurately. Politeness is not interest; do not merge distinct outcomes.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_OUTCOMES.map((outcome) => {
                const meta = OUTCOME_META[outcome];
                const isSelected = selectedOutcome === outcome;
                return (
                  <button
                    key={outcome}
                    type="button"
                    onClick={() => setSelectedOutcome(outcome)}
                    className={`text-left p-2.5 rounded-lg border transition-all text-xs flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#0029FF] ring-2 ring-[#0029FF]/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                    style={{
                      backgroundColor: isSelected ? meta.bgColor : undefined
                    }}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: meta.color }}
                        />
                        {meta.label}
                      </span>
                      {isSelected && (
                        <CheckCircle className="w-3.5 h-3.5 text-[#0029FF] shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 leading-tight line-clamp-2">
                      {meta.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Agreed Next Step */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Agreed Next Step (Deliverable / Channel)
            </label>
            <input
              type="text"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="e.g. Send research profile on WhatsApp; Call back next Thursday 10:30 AM"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0029FF] focus:border-transparent"
            />
          </div>

          {/* Next Step Time */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Next Step Scheduled Time (if specific date/time agreed)</span>
            </label>
            <input
              type="datetime-local"
              value={nextStepAt}
              onChange={(e) => setNextStepAt(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0029FF] focus:border-transparent font-mono"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Resume Call
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Saving & Generating Summary...</span>
              ) : (
                <span>End & Close Call</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
