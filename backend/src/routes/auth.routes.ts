import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/db/database.js';
import { RegisterSchema, LoginSchema } from '../schemas/api.schemas.js';

const router = Router();

router.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = RegisterSchema.parse(req.body);
    const existing = db.getProfileByEmail(validated.email);
    if (existing) {
      res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'USER_EXISTS',
          message: 'An account with this email address already exists.',
        },
      });
      return;
    }

    const userId = uuidv4();
    const profile = db.createProfile({
      id: userId,
      email: validated.email,
      full_name: validated.fullName,
      role: 'student',
    });

    res.status(201).json({
      success: true,
      data: {
        token: `user_${profile.id}`,
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
        },
        onboarding_completed: false,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = LoginSchema.parse(req.body);
    let profile = db.getProfileByEmail(validated.email);

    if (!profile) {
      // Auto-register demo student if email doesn't exist
      profile = db.createProfile({
        id: uuidv4(),
        email: validated.email,
        full_name: validated.email.split('@')[0],
        role: 'student',
      });
    }

    const edProfile = db.getEducationProfile(profile.id);

    res.json({
      success: true,
      data: {
        token: `user_${profile.id}`,
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
        },
        onboarding_completed: edProfile?.onboarding_completed ?? false,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
