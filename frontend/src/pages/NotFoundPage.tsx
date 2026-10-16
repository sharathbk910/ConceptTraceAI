import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl border border-slate-200">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4 border border-brand-100">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-slate-900">404</h1>
        <h2 className="text-base font-bold text-slate-800 mt-1">Page Not Found</h2>
        <p className="text-xs text-slate-500 mt-2">
          The educational resource or route you requested does not exist or has been moved.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            to="/home"
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
          <Link
            to="/ask"
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            Ask a Doubt
          </Link>
        </div>
      </div>
    </div>
  );
};
