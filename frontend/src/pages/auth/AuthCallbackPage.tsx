import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';
import { useAuth } from '../../hooks/useAuth.js';
import { User } from '../../types/index.js';

export const AuthCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    let isCancelled = false;

    const handleOAuthCallback = async () => {
      // 1. Inspect URL parameters for error reports
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      const error = urlParams.get('error') || hashParams.get('error');
      const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

      if (error || errorDescription) {
        if (!isCancelled) {
          setStatus('error');
          setErrorMessage(decodeURIComponent(errorDescription || error || 'Authentication was declined or failed.'));
        }
        return;
      }

      if (!supabase || !isSupabaseConfigured) {
        if (!isCancelled) {
          setStatus('error');
          setErrorMessage('Supabase client is not configured. Please ensure VITE_SUPABASE_URL is set.');
        }
        return;
      }

      try {
        // 2. Fetch session from Supabase (Supabase JS auto-exchanges the code/hash)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          const u = session.user;
          const googleUser: User = {
            id: u.id,
            email: u.email || '',
            full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Student',
            avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
            role: 'student',
          };

          localStorage.setItem('concepttrace_token', session.access_token);
          localStorage.setItem('concepttrace_user', JSON.stringify(googleUser));

          if (!isCancelled) {
            setStatus('success');
          }

          await refreshProfile();
          setTimeout(() => {
            if (!isCancelled) {
              const cachedEd = localStorage.getItem('concepttrace_education_profile');
              let hasOnboarding = false;
              if (cachedEd) {
                try {
                  const parsed = JSON.parse(cachedEd);
                  hasOnboarding = Boolean(parsed?.onboarding_completed);
                } catch {}
              }
              navigate(hasOnboarding ? '/home' : '/setup-profile', { replace: true });
            }
          }, 400);
          return;
        }

        // 3. Fallback: Wait for onAuthStateChange if session exchange is in flight
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (newSession?.user) {
            subscription.unsubscribe();
            const u = newSession.user;
            const googleUser: User = {
              id: u.id,
              email: u.email || '',
              full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Student',
              avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
              role: 'student',
            };

            localStorage.setItem('concepttrace_token', newSession.access_token);
            localStorage.setItem('concepttrace_user', JSON.stringify(googleUser));

            if (!isCancelled) {
              setStatus('success');
            }

            await refreshProfile();
            setTimeout(() => {
              if (!isCancelled) {
                const cachedEd = localStorage.getItem('concepttrace_education_profile');
                let hasOnboarding = false;
                if (cachedEd) {
                  try {
                    const parsed = JSON.parse(cachedEd);
                    hasOnboarding = Boolean(parsed?.onboarding_completed);
                  } catch {}
                }
                navigate(hasOnboarding ? '/home' : '/setup-profile', { replace: true });
              }
            }, 400);
          }
        });

        // 4. Timeout after 8 seconds
        setTimeout(() => {
          if (!isCancelled && !localStorage.getItem('concepttrace_token')) {
            subscription.unsubscribe();
            setStatus('error');
            setErrorMessage('Unable to retrieve Google session. Please verify that your Google credentials are saved in Supabase.');
          }
        }, 8000);

      } catch (err: any) {
        if (!isCancelled) {
          setStatus('error');
          setErrorMessage(err.message || 'An unexpected error occurred during Google authentication.');
        }
      }
    };

    handleOAuthCallback();

    return () => {
      isCancelled = true;
    };
  }, [navigate, refreshProfile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/40 to-indigo-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/25 mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ConceptTrace AI</h1>
          <p className="text-xs text-brand-600 font-semibold uppercase tracking-wider mt-0.5">
            Learn • Improve • Succeed
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 backdrop-blur-sm text-center">
          {status === 'processing' && (
            <div className="py-6">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-4 text-brand-600">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Authenticating with Google...</h2>
              <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
                Securing your session and setting up your personalized academic dashboard.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-600">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Authentication Successful!</h2>
              <p className="text-xs text-slate-500 mt-2">
                Redirecting you to your learning workspace...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4 text-rose-600">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Sign In Incomplete</h2>
              <p className="text-xs text-rose-600 mt-2 bg-rose-50 p-3 rounded-xl border border-rose-100 break-words">
                {errorMessage}
              </p>
              <div className="mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
