import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { db } from '../services/db/database.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { ConceptLearningService } from '../services/learning/conceptLearningService.js';

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();
router.use(requireAuth);

/**
 * GET /api/v1/syllabus/current
 * Retrieves the official syllabus applicable to the logged-in student
 */
router.get('/syllabus/current', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const edProfile = db.getEducationProfile(userId);
    const { board: qBoard, class_level: qClass, stream: qStream, academic_year: qYear } = req.query;

    const board = (qBoard as string) || edProfile?.board || 'CBSE';
    const classLevel = (qClass ? parseInt(qClass as string, 10) : edProfile?.class_level || 10) as 10 | 11 | 12;
    const stream = qStream !== undefined ? (qStream as string) : edProfile?.stream;
    const academicYear = (qYear as string) || edProfile?.academic_year || '2025-26';

    const syllabus = db.getOfficialSyllabus(board, classLevel, stream);

    res.json({
      success: true,
      data: {
        syllabus,
        profile_match: {
          board,
          class_level: classLevel,
          stream,
          academic_year: academicYear,
        },
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/syllabus/refresh
 * Validates official source and updates verification timestamp
 */
router.post('/syllabus/refresh', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const edProfile = db.getEducationProfile(userId);
    const board = edProfile?.board || 'CBSE';
    const classLevel = (edProfile?.class_level || 10) as 10 | 11 | 12;
    const stream = edProfile?.stream;

    const current = db.getOfficialSyllabus(board, classLevel, stream);
    const refreshed = db.refreshOfficialSyllabus(current.id);

    res.json({
      success: true,
      data: {
        syllabus: refreshed || current,
        message: `Successfully validated against official source: ${current.official_source_url}`,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/syllabus/compare
 * Upload or provide syllabus text to compare against the official syllabus
 */
router.post(
  '/syllabus/compare',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const edProfile = db.getEducationProfile(userId);
      const board = edProfile?.board || 'CBSE';
      const classLevel = (edProfile?.class_level || 10) as 10 | 11 | 12;
      const stream = edProfile?.stream;

      const officialSyllabus = db.getOfficialSyllabus(board, classLevel, stream);

      let textContent = req.body.text_content || '';
      let filename = 'pasted_syllabus.txt';

      if (req.file) {
        filename = req.file.originalname;
        textContent = req.file.buffer.toString('utf-8');
      }

      if (!textContent || textContent.trim().length === 0) {
        res.status(400).json({
          success: false,
          data: null,
          error: {
            code: 'EMPTY_CONTENT',
            message: 'Please provide syllabus text or upload a syllabus file.',
          },
        });
        return;
      }

      const subjectName = req.body.subject || officialSyllabus.subjects[0]?.subject_name || 'Mathematics';

      const comparison = await ConceptLearningService.compareSyllabus(
        userId,
        filename,
        textContent,
        officialSyllabus,
        subjectName
      );

      res.status(201).json({
        success: true,
        data: comparison,
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/syllabus/comparisons
 * Lists all previous comparisons for this user
 */
router.get('/syllabus/comparisons', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const list = db.listUserSyllabusComparisons(userId);
    res.json({
      success: true,
      data: list,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/syllabus/comparisons/:id
 * Fetches a specific comparison report
 */
router.get('/syllabus/comparisons/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const comparison = db.getSyllabusComparison(req.params.id);
    if (!comparison || comparison.user_id !== req.user!.id) {
      res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Syllabus comparison report not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: comparison,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
