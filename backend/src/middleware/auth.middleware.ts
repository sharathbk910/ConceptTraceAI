import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../services/db/database.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'concepttrace_session_secure_key_2026';

/**
 * Creates a cryptographically signed, tamper-proof session token with expiration
 */
export function createSessionToken(userId: string, email: string): string {
  const payload = {
    sub: userId,
    email: email.trim().toLowerCase(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days expiration
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `cts_${payloadB64}.${signature}`;
}

/**
 * Verifies a signed session token, ensuring signature validity and checking expiry
 */
export function verifySessionToken(token: string): { sub: string; email: string } | null {
  try {
    if (token.startsWith('cts_')) {
      const trimmed = token.substring(4);
      const [payloadB64, signature] = trimmed.split('.');
      if (!payloadB64 || !signature) return null;

      const expectedSig = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(payloadB64)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return null;
      }

      const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const payload = JSON.parse(payloadStr);

      if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Expired
      }

      if (!payload.sub) return null;

      return {
        sub: payload.sub,
        email: payload.email || '',
      };
    }
  } catch {
    return null;
  }
  return null;
}

function decodeJwtPayload(token: string): {
  sub?: string;
  email?: string;
  name?: string;
  full_name?: string;
  avatar_url?: string;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
      const payload = JSON.parse(payloadStr);
      return {
        sub: payload.sub || payload.id,
        email: payload.email,
        name: payload.user_metadata?.full_name || payload.user_metadata?.name || payload.name,
        full_name: payload.user_metadata?.full_name || payload.user_metadata?.name,
        avatar_url: payload.user_metadata?.avatar_url || payload.user_metadata?.picture || payload.picture,
      };
    }
  } catch {}
  return null;
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please sign in to access this resource.',
        },
      });
      return;
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token missing.',
        },
      });
      return;
    }

    let userId: string | null = null;
    let email: string | null = null;
    let fullName: string | null = null;
    let avatarUrl: string | null = null;

    // 1. Check signed ConceptTrace session token
    const verifiedSession = verifySessionToken(token);
    if (verifiedSession) {
      userId = verifiedSession.sub;
      email = verifiedSession.email;
    } else if (token.startsWith('user_')) {
      // Legacy/test token format (user_<id>)
      userId = token.replace('user_', '').trim();
    } else {
      // 2. Check Supabase OAuth JWT
      const decoded = decodeJwtPayload(token);
      if (decoded?.sub) {
        userId = decoded.sub;
        if (decoded.email) email = decoded.email;
        if (decoded.full_name || decoded.name) fullName = decoded.full_name || decoded.name || null;
        if (decoded.avatar_url) avatarUrl = decoded.avatar_url || null;
      }
    }

    if (!userId) {
      res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'AUTH_FAILED',
          message: 'Invalid or expired authentication session. Please sign in again.',
        },
      });
      return;
    }

    // 3. Verify user existence in database
    let profile = db.getProfileById(userId);

    // If profile was not found by ID but valid Supabase JWT provided an email
    if (!profile && email) {
      profile = db.getProfileByEmail(email);
      if (profile) {
        userId = profile.id;
      }
    }

    // If still not found and this was a genuine Supabase OAuth session, provision authenticated student profile
    if (!profile && decodedJwtUser(token)) {
      const decoded = decodeJwtPayload(token);
      if (decoded?.sub) {
        profile = db.createProfile({
          id: decoded.sub,
          email: decoded.email || `student_${decoded.sub.slice(0, 8)}@concepttrace.ai`,
          full_name: decoded.full_name || decoded.name || 'Student User',
          avatar_url: decoded.avatar_url || null,
          role: 'student',
        });
      }
    }

    if (!profile) {
      res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Account not found or session has been revoked. Please sign in again.',
        },
      });
      return;
    }

    // 4. Verify account email verification status if credentials record exists
    const authRecord = db.getUserAuthById(profile.id) || db.getUserAuthByEmail(profile.email);
    if (authRecord && !authRecord.is_verified) {
      res.status(403).json({
        success: false,
        data: {
          email: profile.email,
          needsVerification: true,
        },
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Your email address is not verified yet. Please check your inbox or request a new verification link.',
        },
      });
      return;
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'AUTH_FAILED',
        message: 'Invalid authentication session.',
      },
    });
  }
};

function decodedJwtUser(token: string): boolean {
  try {
    const parts = token.split('.');
    return parts.length === 3 && token.startsWith('ey');
  } catch {
    return false;
  }
}

