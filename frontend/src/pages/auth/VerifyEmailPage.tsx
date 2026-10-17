import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Sparkles, Mail, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, LogIn, KeyRound, Zap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || searchParams.get('code') || '';
  const emailFromUrl = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailFromUrl);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>(
    tokenFromUrl ? 'verifying' : 'idle'
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const digitInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const { verifyOtp, verifyEmail, instantVerify, resendVerification } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const navigate = useNavigate();

  // Load active OTP and check if email is already verified
  useEffect(() => {
    if (!email.trim()) return;
    api.get<{ otp: string | null; is_verified: boolean }>(`/auth/dev-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`)
      .then(res => {
        if (res?.is_verified) {
          setStatus('success');
          toastSuccess('Email Already Verified! 🎉', 'Your email address is already verified. You may sign in.');
          return;
        }
        if (res?.otp && !res.is_verified) {
          setDevOtp(res.otp);
          const digits = res.otp.split('');
          if (digits.length === 6) {
            setOtpDigits(digits);
          }
        }
      })
      .catch(() => {});
  }, [email]);

  // Cooldown timer countdown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // If token is present in URL (e.g. clicked link from email), verify immediately
  useEffect(() => {
    if (tokenFromUrl) {
      if (/^\d{6}$/.test(tokenFromUrl.trim())) {
        const digits = tokenFromUrl.trim().split('');
        setOtpDigits(digits);
      }
      handleVerificationWithToken(tokenFromUrl.trim());
    } else {
      // Auto-focus first digit input box
      setTimeout(() => {
        digitInputsRef.current[0]?.focus();
      }, 150);
    }
  }, [tokenFromUrl]);

  const handleVerificationWithToken = async (tokenOrOtp: string) => {
    setStatus('verifying');
    setErrorMessage('');
    try {
      if (/^\d{6}$/.test(tokenOrOtp) && email.trim()) {
        await verifyOtp(email.trim(), tokenOrOtp);
      } else {
        await verifyEmail(tokenOrOtp, email.trim() || undefined);
      }
      setStatus('success');
      toastSuccess('Email Verified! 🎉', 'Your email has been verified. You may now log in.');
    } catch (err: any) {
      setStatus('error');
      const msg = err.message || 'Verification failed. The code may be invalid or expired.';
      setErrorMessage(msg);
      toastError('Verification Failed', msg);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric input
    const cleanValue = value.replace(/\D/g, '');

    // Handle paste of 6 digits into any box
    if (cleanValue.length >= 6) {
      const pastedDigits = cleanValue.slice(0, 6).split('');
      setOtpDigits(pastedDigits);
      digitInputsRef.current[5]?.focus();
      // Auto-submit if email is available
      if (email.trim()) {
        handleVerificationWithToken(pastedDigits.join(''));
      }
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleanValue.slice(-1); // Take latest single digit
    setOtpDigits(newDigits);

    // Auto advance to next box
    if (cleanValue && index < 5) {
      digitInputsRef.current[index + 1]?.focus();
    }

    // If all 6 digits completed, auto submit
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && email.trim()) {
      handleVerificationWithToken(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        digitInputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      digitInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      digitInputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (pasted.length >= 6) {
      const pastedDigits = pasted.slice(0, 6).split('');
      setOtpDigits(pastedDigits);
      digitInputsRef.current[5]?.focus();
      if (email.trim()) {
        handleVerificationWithToken(pastedDigits.join(''));
      }
    } else if (pasted.length > 0) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < pasted.length && i < 6; i++) {
        newDigits[i] = pasted[i];
      }
      setOtpDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      digitInputsRef.current[nextIdx]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpDigits.join('').trim();
    if (otpCode.length !== 6) {
      toastError('Incomplete Code', 'Please enter all 6 digits of your verification code.');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toastError('Email Required', 'Please enter your registered email address.');
      return;
    }
    handleVerificationWithToken(otpCode);
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0) return;

    const emailClean = email.trim().toLowerCase();
    if (!emailClean) {
      toastError('Email Required', 'Please enter your registered email address.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailClean)) {
      toastError('Invalid Email', 'Please enter a valid email address with a domain extension (e.g. student@example.com).');
      return;
    }

    setIsResending(true);
    setErrorMessage('');
    try {
      await resendVerification(emailClean);
      toastSuccess('Code Sent! 📬', 'A fresh 6-digit verification code has been sent to your email.');
      setCooldownSeconds(60);
      setOtpDigits(['', '', '', '', '', '']);
      setStatus('idle');
      digitInputsRef.current[0]?.focus();
    } catch (err: any) {
      const msg = err.message || 'Could not send verification code.';
      setErrorMessage(msg);
      toastError('Resend Failed', msg);
    } finally {
      setIsResending(false);
    }
  };

  const handleInstantVerify = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toastError('Email Required', 'Please enter your registered email address.');
      return;
    }
    setStatus('verifying');
    setErrorMessage('');
    try {
      await instantVerify(cleanEmail);
      setStatus('success');
      toastSuccess('Email Verified! 🎉', 'Your email has been verified. You may now log in.');
    } catch (err: any) {
      setStatus('error');
      const msg = err.message || 'Could not instant-verify email.';
      setErrorMessage(msg);
      toastError('Verification Failed', msg);
    }
  };

  const isOtpComplete = otpDigits.join('').length === 6;

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
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 backdrop-blur-sm">
          {status === 'verifying' && (
            <div className="text-center py-6 space-y-4">
              <RefreshCw className="w-10 h-10 text-brand-600 animate-spin mx-auto" />
              <h2 className="text-lg font-bold text-slate-800">Verifying Your Code...</h2>
              <p className="text-xs text-slate-500">
                Please wait while we confirm your email address.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Email Verified Successfully! 🎉</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Your email address is confirmed. You can now log in to access your personalized student dashboard.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Proceed to Sign In</span>
                </Link>
              </div>
            </div>
          )}

          {(status === 'idle' || status === 'error') && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3 border border-brand-100">
                  <Mail className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Verify Your Email</h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  We've sent a 6-digit verification code to
                  <br />
                  <span className="font-semibold text-slate-800 text-sm">{email || 'your email address'}</span>
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="font-medium">{errorMessage}</p>
                </div>
              )}

              {devOtp && (
                <div className="p-3.5 bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-200/80 rounded-2xl text-xs text-brand-950 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-brand-800">
                      <KeyRound className="w-3.5 h-3.5 text-brand-600" />
                      <span>Verification Code (Demo Mode):</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const digits = devOtp.split('');
                        setOtpDigits(digits);
                        handleVerificationWithToken(devOtp);
                      }}
                      className="font-bold text-xs text-white bg-brand-600 hover:bg-brand-700 px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-xs"
                    >
                      Auto-fill & Verify →
                    </button>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Active Code: <strong className="font-mono text-base text-brand-700 bg-white px-2.5 py-0.5 rounded border border-brand-200 font-bold tracking-widest">{devOtp}</strong>
                  </p>
                </div>
              )}

              {/* Email field if not provided in URL */}
              {!emailFromUrl && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              )}

              {/* 6-Digit OTP Input Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-3 text-center">
                    Enter the 6-digit verification code:
                  </label>
                  <div className="flex justify-between gap-2" onPaste={handlePaste}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => (digitInputsRef.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleKeyDown(idx, e)}
                        className="w-12 h-14 text-center text-xl font-bold font-mono text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-brand-600 focus:ring-4 focus:ring-brand-500/15 focus:outline-none transition-all shadow-sm"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!isOtpComplete || isResending}
                  className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify Email</span>
                </button>

                {/* Instant Verification Shortcut */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleInstantVerify}
                    className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl border border-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span>Instant Verify & Activate Account</span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-1.5">
                    Didn't receive email? Instant verify activates your account immediately.
                  </p>
                </div>
              </form>

              {/* Resend Code Section */}
              <div className="pt-2 border-t border-slate-100 text-center space-y-2">
                <p className="text-xs text-slate-500">Didn't receive the code?</p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending || cooldownSeconds > 0}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 disabled:text-slate-400 disabled:cursor-not-allowed inline-flex items-center gap-1.5 transition-colors"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : cooldownSeconds > 0 ? (
                    <span>Resend Code in {cooldownSeconds}s</span>
                  ) : (
                    <span>Resend Code</span>
                  )}
                </button>
              </div>

              {/* Back to Login */}
              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  Back to Sign In <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
