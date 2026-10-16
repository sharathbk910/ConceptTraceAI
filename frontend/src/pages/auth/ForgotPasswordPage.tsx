import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../hooks/useToast.js';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { success, error } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      error('Required', 'Please enter your registered email address.');
      return;
    }
    setSubmitted(true);
    success('Password Recovery Sent', `If an account exists for ${email}, recovery instructions have been sent.`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/40 to-indigo-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/25 mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ConceptTrace AI</h1>
          <p className="text-xs text-brand-600 font-semibold uppercase tracking-wider mt-0.5">
            Learn • Improve • Succeed
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">Password Recovery</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your registered email address to receive password reset instructions.
            </p>
          </div>

          {submitted ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-semibold text-emerald-900">Recovery Instructions Sent</h4>
              <p className="text-xs text-emerald-700">
                Please check your inbox at <span className="font-semibold">{email}</span> for your reset link.
              </p>
              <Link
                to="/login"
                className="inline-block mt-2 text-xs font-bold text-brand-600 hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-500/20 transition-all"
              >
                Send Recovery Instructions
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
