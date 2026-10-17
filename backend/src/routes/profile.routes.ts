import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../services/db/database.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { ProfileUpdateSchema, EducationProfileSchema } from '../schemas/api.schemas.js';

const router = Router();
router.use(requireAuth);

// 1. Get Profile
router.get('/profile', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const profile = db.getProfileById(userId);
    res.json({
      success: true,
      data: profile,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Patch Profile
router.patch('/profile', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const validated = ProfileUpdateSchema.parse(req.body);
    const updated = db.updateProfile(userId, validated);
    res.json({
      success: true,
      data: updated,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Get Education Profile
router.get('/education-profile', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const edProfile = db.getEducationProfile(userId);
    const subjects = db.getStudentSubjects(userId).map(s => s.subject_name);

    res.json({
      success: true,
      data: edProfile ? { ...edProfile, subjects } : null,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 4. Put Education Profile
router.put('/education-profile', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const validated = EducationProfileSchema.parse(req.body);

    const savedEdProfile = db.upsertEducationProfile({
      user_id: userId,
      country: validated.country,
      education_system: validated.education_system || undefined,
      state_or_ut: validated.state_or_ut || undefined,
      board: validated.board,
      class_level: validated.class_level as 10 | 11 | 12,
      stream: validated.stream || undefined,
      academic_year: validated.academic_year,
      preferred_language: validated.preferred_language,
      syllabus_file_path: validated.syllabus_file_path,
      onboarding_completed: true,
    });

    db.setStudentSubjects(userId, validated.subjects);

    db.createNotification(
      userId,
      'Welcome to ConceptTrace AI! 🎉',
      `Your Class ${validated.class_level} (${validated.board}) profile is ready. Ask doubts or start practicing!`
    );

    res.json({
      success: true,
      data: {
        ...savedEdProfile,
        subjects: validated.subjects,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 5. Get Subjects
router.get('/subjects', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const subjects = db.getStudentSubjects(userId);
    res.json({
      success: true,
      data: subjects.map(s => s.subject_name),
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 6. Put Subjects
router.put('/subjects', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { subjects } = req.body;
    if (!Array.isArray(subjects) || subjects.length === 0) {
      res.status(400).json({
        success: false,
        data: null,
        error: { code: 'INVALID_SUBJECTS', message: 'At least one subject is required' },
      });
      return;
    }

    const updated = db.setStudentSubjects(userId, subjects);
    res.json({
      success: true,
      data: updated.map(s => s.subject_name),
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 7. Get Syllabus Topics (Configurable database topics)
router.get('/syllabus-topics', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { board, class_level, subject } = req.query;
    const topics = db.getSyllabusTopics({
      board: board as string,
      class_level: class_level ? parseInt(class_level as string, 10) : undefined,
      subject: subject as string,
    });

    res.json({
      success: true,
      data: topics,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
