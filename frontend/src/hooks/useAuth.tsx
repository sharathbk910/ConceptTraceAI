import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, EducationProfile } from '../types/index.js';
import { api } from '../lib/api.js';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

interface AuthContextType {
  user: User | null;
  educationProfile: EducationProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<any>;
  loginWithGoogle: () => Promise<void>;
  register: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<any>;
  verifyOtp: (email: string, otp: string) => Promise<any>;
  verifyEmail: (token: string, email?: string) => Promise<any>;
  instantVerify: (email: string) => Promise<any>;
  resendVerification: (email: string) => Promise<any>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (token: string, password: string, confirmPassword: string) => Promise<any>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  saveEducationProfile: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const token = localStorage.getItem('concepttrace_token');
      if (!token) return null;
      const u = localStorage.getItem('concepttrace_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const [educationProfile, setEducationProfile] = useState<EducationProfile | null>(() => {
    try {
      const token = localStorage.getItem('concepttrace_token');
      if (!token) return null;
      const ep = localStorage.getItem('concepttrace_education_profile');
      return ep ? JSON.parse(ep) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('concepttrace_token');
      if (!token) {
        setUser(null);
        setEducationProfile(null);
        localStorage.removeItem('concepttrace_user');
        localStorage.removeItem('concepttrace_education_profile');
        setIsLoading(false);
        return;
      }

      const [profileData, edData] = await Promise.allSettled([
        api.get<User>('/profile'),
        api.get<EducationProfile>('/education-profile'),
      ]);

      if (profileData.status === 'fulfilled' && profileData.value) {
        setUser(profileData.value);
        localStorage.setItem('concepttrace_user', JSON.stringify(profileData.value));
      } else if (profileData.status === 'rejected') {
        // Token is invalid or expired
        localStorage.removeItem('concepttrace_token');
        localStorage.removeItem('concepttrace_user');
        localStorage.removeItem('concepttrace_education_profile');
        setUser(null);
        setEducationProfile(null);
        setIsLoading(false);
        return;
      }

      if (edData.status === 'fulfilled') {
        if (edData.value) {
          setEducationProfile(edData.value);
          localStorage.setItem('concepttrace_education_profile', JSON.stringify(edData.value));
        } else {
          setEducationProfile(null);
          localStorage.removeItem('concepttrace_education_profile');
        }
      }
    } catch (e) {
      console.warn('Failed to refresh user profile:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (supabase && isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
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
            setUser(googleUser);
          }
        } catch (err) {
          console.warn('Supabase session initialization notice:', err);
        }
      }
      await refreshProfile();
    };

    initAuth();
  }, [refreshProfile]);

  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
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
        setUser(googleUser);
        await refreshProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const loginWithGoogle = async () => {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase OAuth is not configured. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable Google OAuth sign-in.');
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const emailNorm = email.trim().toLowerCase();
    try {
      // 1. If Supabase is configured, authenticate via Supabase Auth
      if (supabase && isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: emailNorm,
            password,
          });

          if (error) {
            const errLower = error.message.toLowerCase();
            if (errLower.includes('email not confirmed') || errLower.includes('unconfirmed')) {
              throw new Error('Email not confirmed. Please enter the verification code sent to your email.');
            }
            if (errLower.includes('invalid login credentials')) {
              // Try backend fallback in case user was registered in local file database
              const localResult = await api.post<{
                token: string;
                user: User;
                onboarding_completed: boolean;
              }>('/auth/login', { email: emailNorm, password });

              localStorage.setItem('concepttrace_token', localResult.token);
              localStorage.setItem('concepttrace_user', JSON.stringify(localResult.user));
              setUser(localResult.user);
              await refreshProfile();
              return localResult;
            }
            throw new Error(error.message);
          }

          if (data.session) {
            localStorage.setItem('concepttrace_token', data.session.access_token);
            const studentUser: User = {
              id: data.user.id,
              email: data.user.email || emailNorm,
              full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'Student',
              avatar_url: data.user.user_metadata?.avatar_url || null,
              role: 'student',
            };
            localStorage.setItem('concepttrace_user', JSON.stringify(studentUser));
            setUser(studentUser);
            await refreshProfile();

            const ep = localStorage.getItem('concepttrace_education_profile');
            const parsedEp = ep ? JSON.parse(ep) : null;
            return {
              token: data.session.access_token,
              user: studentUser,
              onboarding_completed: Boolean(parsedEp?.onboarding_completed),
            };
          }
        } catch (supaErr: any) {
          if (supaErr.message.includes('Email not confirmed') || supaErr.message.includes('not verified')) {
            throw supaErr;
          }
          // Try local fallback
          const localResult = await api.post<{
            token: string;
            user: User;
            onboarding_completed: boolean;
          }>('/auth/login', { email: emailNorm, password });

          localStorage.setItem('concepttrace_token', localResult.token);
          localStorage.setItem('concepttrace_user', JSON.stringify(localResult.user));
          setUser(localResult.user);
          await refreshProfile();
          return localResult;
        }
      }

      // 2. Local Express Auth fallback
      const result = await api.post<{
        token: string;
        user: User;
        onboarding_completed: boolean;
      }>('/auth/login', { email: emailNorm, password });

      localStorage.setItem('concepttrace_token', result.token);
      localStorage.setItem('concepttrace_user', JSON.stringify(result.user));
      setUser(result.user);
      await refreshProfile();
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string, confirmPassword: string) => {
    setIsLoading(true);
    const emailNorm = email.trim().toLowerCase();
    const nameClean = fullName.trim();

    try {
      // 1. If Supabase is configured, register user and trigger genuine email delivery
      if (supabase && isSupabaseConfigured) {
        const { data: supaData, error: supaError } = await supabase.auth.signUp({
          email: emailNorm,
          password,
          options: {
            data: {
              full_name: nameClean,
            },
          },
        });

        if (supaError) {
          if (supaError.message.toLowerCase().includes('already registered')) {
            throw new Error('An account with this email address already exists. Please log in or reset your password.');
          }
          throw new Error(supaError.message);
        }

        // Also synchronize account with backend local DB for persistence
        api.post('/auth/register', {
          fullName: nameClean,
          email: emailNorm,
          password,
          confirmPassword,
          termsAccepted: true,
        }).catch((e) => console.warn('Backend sync notice:', e));

        const isAutoConfirmed = Boolean(supaData.session || supaData.user?.email_confirmed_at);
        if (isAutoConfirmed && supaData.session) {
          localStorage.setItem('concepttrace_token', supaData.session.access_token);
          const studentUser: User = {
            id: supaData.user?.id || '',
            email: supaData.user?.email || emailNorm,
            full_name: nameClean,
            avatar_url: null,
            role: 'student',
          };
          localStorage.setItem('concepttrace_user', JSON.stringify(studentUser));
          setUser(studentUser);
          await refreshProfile();
        }

        return {
          success: true,
          email: emailNorm,
          requires_verification: !isAutoConfirmed,
          delivery_mode: 'supabase',
          user: supaData.user,
          session: supaData.session,
        };
      }

      // 2. Local Express Auth registration
      return await api.post('/auth/register', {
        fullName: nameClean,
        email: emailNorm,
        password,
        confirmPassword,
        termsAccepted: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    const emailNorm = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    // 1. If Supabase is configured, verify OTP through Supabase
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: emailNorm,
          token: cleanOtp,
          type: 'signup',
        });

        if (!error && data.session) {
          localStorage.setItem('concepttrace_token', data.session.access_token);
          const studentUser: User = {
            id: data.user?.id || '',
            email: data.user?.email || emailNorm,
            full_name: data.user?.user_metadata?.full_name || data.user?.user_metadata?.name || 'Student',
            avatar_url: data.user?.user_metadata?.avatar_url || null,
            role: 'student',
          };
          localStorage.setItem('concepttrace_user', JSON.stringify(studentUser));
          setUser(studentUser);

          // Synchronize verification with backend database
          await api.post('/auth/verify-otp', { email: emailNorm, otp: cleanOtp }).catch(() => {});
          await refreshProfile();
          return { success: true, message: 'Email verified successfully!' };
        }

        if (error) {
          // If signup type failed, try email type
          const retryRes = await supabase.auth.verifyOtp({
            email: emailNorm,
            token: cleanOtp,
            type: 'email',
          });

          if (!retryRes.error && retryRes.data.session) {
            localStorage.setItem('concepttrace_token', retryRes.data.session.access_token);
            await api.post('/auth/verify-otp', { email: emailNorm, otp: cleanOtp }).catch(() => {});
            await refreshProfile();
            return { success: true, message: 'Email verified successfully!' };
          }
        }
      } catch (err: any) {
        console.warn('Supabase verifyOtp notice:', err);
      }
    }

    // 2. Verify via local Express backend
    return await api.post('/auth/verify-otp', { email: emailNorm, otp: cleanOtp });
  };

  const verifyEmail = async (token: string, email?: string) => {
    // If token looks like a 6-digit OTP and email is provided, call verifyOtp
    if (/^\d{6}$/.test(token.trim()) && email) {
      return await verifyOtp(email, token);
    }
    return await api.post('/auth/verify-email', { token, email });
  };

  const resendVerification = async (email: string) => {
    const emailNorm = email.trim().toLowerCase();

    // 1. If Supabase is configured, trigger resend through Supabase
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailNorm,
      });

      if (error) {
        // Also trigger backend resend
        await api.post('/auth/resend-verification', { email: emailNorm }).catch(() => {});
        throw new Error(error.message);
      }

      await api.post('/auth/resend-verification', { email: emailNorm }).catch(() => {});
      return { success: true, message: 'A new 6-digit verification code has been sent to your email.' };
    }

    // 2. Local Express resend
    return await api.post('/auth/resend-verification', { email: emailNorm });
  };

  const forgotPassword = async (email: string) => {
    return await api.post('/auth/forgot-password', { email });
  };

  const resetPassword = async (token: string, password: string, confirmPassword: string) => {
    return await api.post('/auth/reset-password', { token, password, confirmPassword });
  };

  const instantVerify = async (email: string) => {
    const emailNorm = email.trim().toLowerCase();
    const res = await api.post<{ email: string; is_verified: boolean; message: string }>('/auth/instant-verify', { email: emailNorm });
    return res;
  };

  const logout = () => {
    if (supabase) {
      supabase.auth.signOut().catch((e) => console.warn('Supabase sign-out notice:', e));
    }
    localStorage.removeItem('concepttrace_token');
    localStorage.removeItem('concepttrace_user');
    localStorage.removeItem('concepttrace_education_profile');
    setUser(null);
    setEducationProfile(null);
  };

  const saveEducationProfile = async (data: any) => {
    const updated = await api.put('/education-profile', data);
    setEducationProfile(updated);
    localStorage.setItem('concepttrace_education_profile', JSON.stringify(updated));
    await refreshProfile();
  };

  const hasValidToken = Boolean(typeof window !== 'undefined' && localStorage.getItem('concepttrace_token'));

  return (
    <AuthContext.Provider
      value={{
        user,
        educationProfile,
        isLoading,
        isAuthenticated: Boolean(user && hasValidToken),
        login,
        loginWithGoogle,
        register,
        verifyOtp,
        verifyEmail,
        instantVerify,
        resendVerification,
        forgotPassword,
        resetPassword,
        logout,
        refreshProfile,
        saveEducationProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
