import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, EducationProfile } from '../types/index.js';
import { api } from '../lib/api.js';

interface AuthContextType {
  user: User | null;
  educationProfile: EducationProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  saveEducationProfile: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [educationProfile, setEducationProfile] = useState<EducationProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('concepttrace_token');
      if (!token) {
        setUser(null);
        setEducationProfile(null);
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
      }

      if (edData.status === 'fulfilled') {
        setEducationProfile(edData.value || null);
      }
    } catch (e) {
      console.warn('Failed to refresh user profile:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('concepttrace_user');
    const token = localStorage.getItem('concepttrace_token');
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {}
    }
    refreshProfile();
  }, [refreshProfile]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await api.post('/auth/login', { email, password });
      localStorage.setItem('concepttrace_token', result.token);
      localStorage.setItem('concepttrace_user', JSON.stringify(result.user));
      setUser(result.user);
      await refreshProfile();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string, confirmPassword: string) => {
    setIsLoading(true);
    try {
      const result = await api.post('/auth/register', {
        fullName,
        email,
        password,
        confirmPassword,
        termsAccepted: true,
      });
      localStorage.setItem('concepttrace_token', result.token);
      localStorage.setItem('concepttrace_user', JSON.stringify(result.user));
      setUser(result.user);
      await refreshProfile();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('concepttrace_token');
    localStorage.removeItem('concepttrace_user');
    setUser(null);
    setEducationProfile(null);
  };

  const saveEducationProfile = async (data: any) => {
    const updated = await api.put('/education-profile', data);
    setEducationProfile(updated);
    await refreshProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        educationProfile,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
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
