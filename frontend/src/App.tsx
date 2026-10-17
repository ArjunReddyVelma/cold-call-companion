import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LiveCallScreen } from './components/LiveCallScreen';
import { PastCallsScreen } from './components/PastCallsScreen';
import { StartCallModal } from './components/StartCallModal';
import { CloseCallModal } from './components/CloseCallModal';
import { CallDetailModal } from './components/CallDetailModal';
import { Call, CallCreateRequest, CallCloseRequest, StageDefinition } from './types/call';
import { DEFAULT_STAGES } from './constants/stages';
import { api, ApiError } from './services/api';
import { PhoneCall } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [stages, setStages] = useState<StageDefinition[]>(DEFAULT_STAGES);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [currentStageNumber, setCurrentStageNumber] = useState<number>(1);
  const [pastCalls, setPastCalls] = useState<Call[]>([]);
  
  // Modals
  const [isStartModalOpen, setIsStartModalOpen] = useState<boolean>(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [selectedCallDetail, setSelectedCallDetail] = useState<Call | null>(null);

  // Status & Loading states
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [startLoading, setStartLoading] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [closeLoading, setCloseLoading] = useState<boolean>(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  // 1. Initial health and data load
  const checkHealthAndLoadData = useCallback(async () => {
    try {
      const health = await api.checkHealth();
      setBackendHealthy(health.status === 'ok');
    } catch {
      setBackendHealthy(false);
    }

    try {
      const fetchedStages = await api.getStages();
      if (fetchedStages && fetchedStages.length === 8) {
        setStages(fetchedStages);
      }
    } catch {
      // Gracefully retain DEFAULT_STAGES if endpoint offline
    }

    // Load past calls
    loadPastCalls();
  }, []);

  const loadPastCalls = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await api.getCalls();
      setPastCalls(res.items);
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Could not fetch past calls.';
      setHistoryError(msg);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    checkHealthAndLoadData();
  }, [checkHealthAndLoadData]);

  // Restore active call from localStorage if page reloaded mid-call
  useEffect(() => {
    const savedCallId = localStorage.getItem('ccc_active_call_id');
    if (savedCallId && !activeCall) {
      api.getCallDetail(savedCallId)
        .then((call) => {
          if (!call.is_closed) {
            setActiveCall(call);
            setCurrentStageNumber(call.last_stage_reached || 1);
          } else {
            localStorage.removeItem('ccc_active_call_id');
          }
        })
        .catch(() => {
          localStorage.removeItem('ccc_active_call_id');
        });
    }
  }, [activeCall]);

  // Start new call
  const handleStartCall = async (data: CallCreateRequest) => {
    setStartLoading(true);
    try {
      const newCall = await api.createCall(data);
      setActiveCall(newCall);
      setCurrentStageNumber(1);
      localStorage.setItem('ccc_active_call_id', newCall.id);
      setIsStartModalOpen(false);
      setActiveTab('live');
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : 'Failed to start call. Ensure backend is running.');
    } finally {
      setStartLoading(false);
    }
  };

  // Save stage result (immutable visit append)
  const handleSaveStageResult = async (
    stageNum: number,
    selectedResult: string,
    prospectWords: string
  ): Promise<boolean> => {
    if (!activeCall) return false;
    setSaveLoading(true);
    setSaveError(null);

    try {
      const stageResult = await api.recordStageResult(activeCall.id, {
        stage_number: stageNum,
        selected_result: selectedResult,
        prospect_words: prospectWords || undefined
      });

      // Update local state without losing other visits
      setActiveCall((prev) => {
        if (!prev) return null;
        const currentResults = prev.stage_results ? [...prev.stage_results] : [];
        return {
          ...prev,
          last_stage_reached: Math.max(prev.last_stage_reached, stageNum),
          stage_results: [...currentResults, stageResult]
        };
      });

      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Network error saving stage result.';
      setSaveError(msg);
      return false;
    } finally {
      setSaveLoading(false);
    }
  };

  // Close call
  const handleConfirmClose = async (data: CallCloseRequest) => {
    if (!activeCall) return;
    setCloseLoading(true);
    setCloseError(null);

    try {
      const closedCall = await api.closeCall(activeCall.id, data);
      localStorage.removeItem('ccc_active_call_id');
      setIsCloseModalOpen(false);
      setActiveCall(null);
      
      // Refresh past calls list and inspect closed call
      await loadPastCalls();
      setSelectedCallDetail(closedCall);
      setActiveTab('history');
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Failed to close call.';
      setCloseError(msg);
    } finally {
      setCloseLoading(false);
    }
  };

  // Inspect past call detail
  const handleInspectCall = async (call: Call) => {
    try {
      const fullDetail = await api.getCallDetail(call.id);
      setSelectedCallDetail(fullDetail);
    } catch {
      setSelectedCallDetail(call);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 font-sans text-slate-900 flex flex-col">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeCall={activeCall}
        onOpenStartCall={() => setIsStartModalOpen(true)}
        backendHealthy={backendHealthy}
      />

      <main className="flex-1 p-4 sm:p-6 md:p-8">
        {activeTab === 'live' ? (
          activeCall ? (
            <LiveCallScreen
              call={activeCall}
              stages={stages}
              currentStageNumber={currentStageNumber}
              onSelectStage={setCurrentStageNumber}
              onSaveStageResult={handleSaveStageResult}
              onOpenEndCall={() => setIsCloseModalOpen(true)}
              saveLoading={saveLoading}
              saveError={saveError}
            />
          ) : (
            /* Standby State when no call is active */
            <div className="max-w-xl mx-auto my-12 bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-[#0029FF] flex items-center justify-center mx-auto shadow-inner">
                <PhoneCall className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Ready for Live Call
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                Keep this screen open beside your active phone call. Navigate across all eight stages, tap what happens, and record the prospect's exact words.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsStartModalOpen(true)}
                  className="px-6 py-3 bg-[#0029FF] hover:bg-blue-600 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 inline-flex items-center gap-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Start a Call</span>
                </button>
              </div>
              <p className="text-[11px] font-mono text-slate-400 pt-2">
                All 8 official stages · Append-only visit tracking · 10 distinct outcomes
              </p>
            </div>
          )
        ) : (
          <PastCallsScreen
            calls={pastCalls}
            loading={historyLoading}
            error={historyError}
            onSelectCall={handleInspectCall}
            onOpenStartCall={() => setIsStartModalOpen(true)}
            onRefresh={loadPastCalls}
          />
        )}
      </main>

      {/* Start Call Modal */}
      <StartCallModal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        onStartCall={handleStartCall}
        loading={startLoading}
      />

      {/* End Call Modal */}
      <CloseCallModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        onConfirmClose={handleConfirmClose}
        currentStage={currentStageNumber}
        loading={closeLoading}
        errorMessage={closeError}
      />

      {/* Call Detail Modal */}
      <CallDetailModal
        call={selectedCallDetail}
        onClose={() => setSelectedCallDetail(null)}
      />
    </div>
  );
};
