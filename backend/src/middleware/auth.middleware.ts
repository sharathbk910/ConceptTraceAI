import { Request, Response, NextFunction } from 'express';
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

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const userIdHeader = req.headers['x-user-id'] as string;

    let userId: string | null = null;
    let email: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      // If token is in local demo/mock format "user-<id>" or base64 or uuid
      if (token.startsWith('user_')) {
        userId = token.replace('user_', '');
      } else if (token.length >= 8) {
        // Assume direct user id or parse simple bearer token
        userId = token;
      }
    } else if (userIdHeader) {
      userId = userIdHeader;
    }

    if (!userId) {
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

    // Lookup user in database
    let profile = db.getProfileById(userId);

    // If not found, create a student profile if an email was passed in headers or fallback
    if (!profile) {
      const userEmail = (req.headers['x-user-email'] as string) || `student_${userId.slice(0, 6)}@concepttrace.ai`;
      const userName = (req.headers['x-user-name'] as string) || 'Student User';
      profile = db.createProfile({
        id: userId,
        email: userEmail,
        full_name: userName,
        role: 'student',
      });
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
