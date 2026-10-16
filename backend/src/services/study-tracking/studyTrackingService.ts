import { db, StudySessionRecord } from '../db/database.js';
import { env } from '../../config/env.js';

export class StudyTrackingService {
  /**
   * Start a new study tracking session
   */
  public static startSession(userId: string): StudySessionRecord {
    // End or mark any currently active sessions
    const active = db.getActiveStudySession(userId);
    if (active) {
      db.updateStudySession(active.id, {
        session_status: 'completed',
        ended_at: new Date().toISOString(),
      });
    }

    const session = db.createStudySession(userId);

    // Record activity event
    db.recordActivity({
      user_id: userId,
      activity_type: 'study_session',
      metadata: { action: 'start', session_id: session.id },
    });

    return session;
  }

  /**
   * Heartbeat to record verified active learning seconds
   */
  public static recordHeartbeat(
    sessionId: string,
    userId: string,
    activeSeconds: number
  ): StudySessionRecord {
    const session = db.getStudySessionById(sessionId, userId);
    if (!session) {
      throw new Error('SESSION_NOT_FOUND: Study session not found or access denied');
    }

    if (session.session_status !== 'active') {
      throw new Error(`SESSION_NOT_ACTIVE: Current session status is ${session.session_status}`);
    }

    const now = new Date();
    const lastActive = new Date(session.last_active_at);
    const diffSeconds = Math.round((now.getTime() - lastActive.getTime()) / 1000);

    // Enforce inactivity timeout: if interval > idle timeout (120s), pause session
    if (diffSeconds > env.STUDY_IDLE_TIMEOUT_SECONDS + 30) {
      db.updateStudySession(sessionId, {
        session_status: 'paused',
        last_active_at: now.toISOString(),
      });
      throw new Error('INACTIVITY_DETECTED: Prolonged inactivity detected, tracking paused.');
    }

    // Clamp increment to legitimate heartbeat interval (up to 60s per heartbeat)
    const legitimateIncrement = Math.min(Math.max(1, activeSeconds), 60);

    const updated = db.updateStudySession(sessionId, {
      tracked_seconds: session.tracked_seconds + legitimateIncrement,
      last_active_at: now.toISOString(),
    });

    return updated!;
  }

  /**
   * Pause tracking
   */
  public static pauseSession(sessionId: string, userId: string): StudySessionRecord {
    const session = db.getStudySessionById(sessionId, userId);
    if (!session) throw new Error('SESSION_NOT_FOUND');
    const updated = db.updateStudySession(sessionId, {
      session_status: 'paused',
      last_active_at: new Date().toISOString(),
    });
    return updated!;
  }

  /**
   * Resume tracking
   */
  public static resumeSession(sessionId: string, userId: string): StudySessionRecord {
    const session = db.getStudySessionById(sessionId, userId);
    if (!session) throw new Error('SESSION_NOT_FOUND');
    const updated = db.updateStudySession(sessionId, {
      session_status: 'active',
      last_active_at: new Date().toISOString(),
    });
    return updated!;
  }

  /**
   * End tracking
   */
  public static endSession(sessionId: string, userId: string): StudySessionRecord {
    const session = db.getStudySessionById(sessionId, userId);
    if (!session) throw new Error('SESSION_NOT_FOUND');
    const now = new Date().toISOString();
    const updated = db.updateStudySession(sessionId, {
      session_status: 'completed',
      ended_at: now,
      last_active_at: now,
    });

    db.recordActivity({
      user_id: userId,
      activity_type: 'study_session',
      metadata: { action: 'end', session_id: sessionId, tracked_seconds: updated?.tracked_seconds },
    });

    return updated!;
  }
}
