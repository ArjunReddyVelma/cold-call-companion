import React, { useState } from 'react';
import { X, PhoneCall, Building2, User, Briefcase } from 'lucide-react';
import { CallCreateRequest } from '../types/call';

interface StartCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCall: (data: CallCreateRequest) => Promise<void>;
  loading: boolean;
}

export const StartCallModal: React.FC<StartCallModalProps> = ({
  isOpen,
  onClose,
  onStartCall,
  loading
}) => {
  const [prospectName, setProspectName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [prospectRole, setProspectRole] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onStartCall({
      prospect_name: prospectName.trim() || undefined,
      company_name: companyName.trim() || undefined,
      prospect_role: prospectRole.trim() || undefined
    });
    setProspectName('');
    setCompanyName('');
    setProspectRole('');
  };

  const handleQuickDemo = async (name: string, company: string, role: string) => {
    await onStartCall({
      prospect_name: name,
      company_name: company,
      prospect_role: role
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-[#0029FF] text-white">
              <PhoneCall className="w-4 h-4" />
            </div>
            <h2 className="text-base font-extrabold text-white">Start New Cold Call</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Enter target prospect details if known, or start immediately. Metadata is optional and can be left blank.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Prospect Name</span>
            </label>
            <input
              type="text"
              value={prospectName}
              onChange={(e) => setProspectName(e.target.value)}
              placeholder="e.g. Senthil Kumar, Dr. Anjali Menon"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0029FF] focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Company Name</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Kalyx Enterprises, Modern Lighting"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0029FF] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span>Prospect Role / Title</span>
            </label>
            <input
              type="text"
              value={prospectRole}
              onChange={(e) => setProspectRole(e.target.value)}
              placeholder="e.g. Managing Director, Founder, Plant Head"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0029FF] focus:border-transparent"
            />
          </div>

          {/* Transcript presets for quick demo */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
              Sample Transcript Profiles (for verification)
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickDemo("Senthil Kumar", "Kalyx Enterprises", "Director (T046)")}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded transition-colors"
              >
                T046 · Kalyx Ent.
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("Anand Verma", "Modern Lighting Solutions", "Founder / Managing Director")}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded transition-colors"
              >
                T082 · Modern Lighting
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("Dr. Anjali Menon", "Menon Family Clinic", "Owner (Reference)")}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded transition-colors"
              >
                Reference · Menon Clinic
              </button>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-[#0029FF] hover:bg-blue-600 rounded-md shadow transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Starting...</span>
              ) : (
                <span>Start Call Guide</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
