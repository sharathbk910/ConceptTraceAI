import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Info, ShieldCheck, ShieldAlert } from 'lucide-react';

interface VerificationBadgeProps {
  status: 'verified' | 'partially_verified' | 'needs_review';
  method?: string | null;
  details?: string;
  uncertaintyNotes?: string[];
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  status,
  method,
  details,
  uncertaintyNotes = [],
}) => {
  const [showInfo, setShowInfo] = useState(false);

  const getBadgeConfig = () => {
    switch (status) {
      case 'verified':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
          label: 'Independently Verified',
          desc: 'This solution was verified using deterministic calculation and algebraic substitution.',
        };
      case 'partially_verified':
        return {
          bg: 'bg-sky-50 text-sky-800 border-sky-200',
          icon: <CheckCircle2 className="w-4 h-4 text-sky-600" />,
          label: 'Partially Verified',
          desc: 'Structural steps and reasoning coherence confirmed; non-algebraic concepts require qualitative review.',
        };
      case 'needs_review':
      default:
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <ShieldAlert className="w-4 h-4 text-amber-600" />,
          label: 'Needs Verification Review',
          desc: 'Independent symbolic execution was not applied; standard textbook or instructor review is recommended.',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div className="relative inline-block">
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm transition-all cursor-pointer ${config.bg}`}
        onClick={() => setShowInfo(!showInfo)}
      >
        {config.icon}
        <span>{config.label}</span>
        <Info className="w-3.5 h-3.5 opacity-60 hover:opacity-100 ml-0.5" />
      </div>

      {showInfo && (
        <div className="absolute left-0 mt-2 z-30 w-80 p-4 bg-white rounded-xl shadow-xl border border-slate-200 text-slate-700 text-xs animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-semibold text-slate-800">Verification Details</span>
            <button
              onClick={() => setShowInfo(false)}
              className="text-slate-400 hover:text-slate-600 text-sm font-bold"
            >
              ×
            </button>
          </div>
          <div className="mt-2.5 space-y-2">
            <div>
              <span className="text-slate-400 font-medium">Status: </span>
              <span className="font-semibold text-slate-800 capitalize">{status.replace('_', ' ')}</span>
            </div>
            {method && (
              <div>
                <span className="text-slate-400 font-medium">Method Executed: </span>
                <span className="text-slate-700">{method}</span>
              </div>
            )}
            {details && (
              <div>
                <span className="text-slate-400 font-medium">Validation Details: </span>
                <span className="text-slate-600">{details}</span>
              </div>
            )}
            {uncertaintyNotes.length > 0 && (
              <div className="pt-2 border-t border-slate-100 text-amber-700">
                <span className="font-semibold">Notes & Limitations: </span>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {uncertaintyNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
