import { useEffect, useRef } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from './useAuth.js';

export const useStudyTracker = () => {
  const { isAuthenticated, user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isPausedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    let heartbeatTimer: any = null;
    let isMounted = true;

    // Start a study session on mount
    const startStudySession = async () => {
      try {
        const session = await api.post('/study-sessions', { activity_type: 'study_session' });
        if (isMounted) {
          sessionIdRef.current = session.id;
        }
      } catch (err) {
        console.warn('Failed to start study session:', err);
      }
    };

    startStudySession();

    // User activity listeners
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
      if (isPausedRef.current && sessionIdRef.current) {
        isPausedRef.current = false;
        api.post(`/study-sessions/${sessionIdRef.current}/resume`).catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPausedRef.current = true;
        if (sessionIdRef.current) {
          api.post(`/study-sessions/${sessionIdRef.current}/pause`).catch(() => {});
        }
      } else {
        handleUserActivity();
      }
    };

    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('click', handleUserActivity, { passive: true });
    window.addEventListener('scroll', handleUserActivity, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Heartbeat every 30 seconds
    heartbeatTimer = setInterval(async () => {
      if (!sessionIdRef.current || document.hidden) return;

      const idleDuration = (Date.now() - lastActivityRef.current) / 1000;
      // If idle for > 120s, do not send heartbeat
      if (idleDuration > 120) {
        if (!isPausedRef.current) {
          isPausedRef.current = true;
          api.post(`/study-sessions/${sessionIdRef.current}/pause`).catch(() => {});
        }
        return;
      }

      try {
        await api.post(`/study-sessions/${sessionIdRef.current}/heartbeat`, {
          active_seconds: 30,
        });
      } catch (err) {
        console.warn('Heartbeat error:', err);
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(heartbeatTimer);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (sessionIdRef.current) {
        api.post(`/study-sessions/${sessionIdRef.current}/end`).catch(() => {});
      }
    };
  }, [isAuthenticated, user?.id]);
};
