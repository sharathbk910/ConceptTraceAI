import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { db } from '../services/db/database.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { ConceptLearningService } from '../services/learning/conceptLearningService.js';
import {
  verifyOfficialSource,
  verifyAllBoardSources,
  maybeRunBackgroundCheck,
  findSourceInfo,
  OFFICIAL_BOARD_SOURCES,
  VerificationResult,
} from '../services/syllabus/syllabusUpdateService.js';

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();
router.use(requireAuth);

// Track in-flight refresh requests to prevent duplicate calls
const activeRefreshUsers = new Set<string>();

/**
 * GET /api/v1/syllabus/current
 * Retrieves the official syllabus applicable to the logged-in student,
 * based on their education profile. Triggers a background staleness check.
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
    const sourceInfo = findSourceInfo(board, classLevel);

    // Trigger a background staleness check without blocking the response
    // Only runs if last check was > 12 hours ago
    maybeRunBackgroundCheck(board, classLevel, stream).then(verification => {
      if (verification) {
        // Update the verification timestamp in the DB non-blocking
        try {
          const updated = db.updateSyllabusVerification(syllabus.id, {
            last_verified_at: verification.verified_at,
            verified: verification.success,
            verification_source_reachable: verification.source_reachable,
            verification_status_message: verification.status_message,
            content_fingerprint: verification.content_fingerprint ?? undefined,
            fingerprint_changed: verification.fingerprint_changed,
          });
        } catch {
          // Non-critical — don't surface this to the student
        }
      }
    }).catch(() => {/* background check failure — silently ignored */});

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
        source_info: sourceInfo
          ? {
              description: sourceInfo.source_description,
              official_url: sourceInfo.official_url,
              supported: true,
            }
          : {
              description: `${board} Class ${classLevel} — embedded NCF/NCERT-aligned curriculum`,
              official_url: 'https://ncert.nic.in/syllabus.php',
              supported: false,
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
 * Performs a REAL verification check against the official board source URL,
 * updates the verification timestamp and status, then returns the verified syllabus.
 *
 * This replaces the previous stub that only updated last_verified_at locally.
 */
router.post('/syllabus/refresh', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Prevent duplicate concurrent refresh for same user
    if (activeRefreshUsers.has(userId)) {
      res.status(429).json({
        success: false,
        data: null,
        error: {
          code: 'REFRESH_IN_PROGRESS',
          message: 'A syllabus refresh is already in progress. Please wait for it to complete.',
        },
      });
      return;
    }

    activeRefreshUsers.add(userId);

    try {
      const edProfile = db.getEducationProfile(userId);
      const board = edProfile?.board || 'CBSE';
      const classLevel = (edProfile?.class_level || 10) as 10 | 11 | 12;
      const stream = edProfile?.stream;

      const current = db.getOfficialSyllabus(board, classLevel, stream);

      // Perform REAL HTTP HEAD verification against the official source
      const verification = await verifyOfficialSource(board, classLevel, stream);

      // Update the syllabus record with the real verification result
      const updatedSyllabus = db.updateSyllabusVerification(current.id, {
        last_verified_at: verification.verified_at,
        verified: verification.success,
        verification_source_reachable: verification.source_reachable,
        verification_status_message: verification.status_message,
        content_fingerprint: verification.content_fingerprint ?? undefined,
        fingerprint_changed: verification.fingerprint_changed,
      });

      res.json({
        success: true,
        data: {
          syllabus: updatedSyllabus || current,
          verification: {
            source_reachable: verification.source_reachable,
            official_url: verification.official_url,
            http_status: verification.http_status,
            fingerprint_changed: verification.fingerprint_changed,
            server_last_modified: verification.server_last_modified,
            verified_at: verification.verified_at,
          },
          message: verification.status_message,
        },
        error: null,
      });
    } finally {
      activeRefreshUsers.delete(userId);
    }
  } catch (err) {
    // Ensure the user is removed from active set on error
    if (req.user?.id) activeRefreshUsers.delete(req.user.id);
    next(err);
  }
});

/**
 * GET /api/v1/syllabus/status
 * Returns the current verification status of the student's applicable syllabus
 * including when it was last checked, source availability, version info, etc.
 */
router.get('/syllabus/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const edProfile = db.getEducationProfile(userId);
    const board = edProfile?.board || 'CBSE';
    const classLevel = (edProfile?.class_level || 10) as 10 | 11 | 12;
    const stream = edProfile?.stream;
    const academicYear = edProfile?.academic_year || '2025-26';

    const syllabus = db.getOfficialSyllabus(board, classLevel, stream);
    const sourceInfo = findSourceInfo(board, classLevel);

    // Calculate hours since last verification
    const lastVerified = syllabus.last_verified_at ? new Date(syllabus.last_verified_at) : null;
    const hoursSinceCheck = lastVerified
      ? Math.round((Date.now() - lastVerified.getTime()) / (1000 * 60 * 60))
      : null;

    res.json({
      success: true,
      data: {
        board,
        class_level: classLevel,
        stream,
        academic_year: academicYear,
        syllabus_id: syllabus.id,
        syllabus_version: syllabus.version,
        syllabus_academic_year: syllabus.academic_year,
        is_verified: syllabus.verified,
        last_verified_at: syllabus.last_verified_at,
        hours_since_last_check: hoursSinceCheck,
        verification_due: hoursSinceCheck === null || hoursSinceCheck > 12,
        refresh_in_progress: activeRefreshUsers.has(userId),
        source: sourceInfo
          ? {
              supported: true,
              description: sourceInfo.source_description,
              official_url: sourceInfo.official_url,
            }
          : {
              supported: false,
              description: `${board} — embedded NCF/NCERT-aligned curriculum (no direct online source configured)`,
              official_url: 'https://ncert.nic.in/syllabus.php',
            },
        // Extended fields from verification update (if present)
        source_reachable: (syllabus as any).verification_source_reachable ?? null,
        status_message: (syllabus as any).verification_status_message ?? null,
        fingerprint_changed: (syllabus as any).fingerprint_changed ?? false,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/syllabus/sync-all
 * Admin/background job endpoint — verifies all supported board sources.
 * Protected: only allowed from server-side calls (requires internal token or admin role).
 * This is the endpoint that a Vercel cron job should call.
 */
router.post('/syllabus/sync-all', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // For background cron calls, accept an internal bearer token or require admin
    const internalToken = req.headers['x-internal-token'];
    const validToken = process.env.INTERNAL_CRON_TOKEN || 'concepttrace-internal-sync';
    const isAdmin = (req.user as any)?.role === 'admin';

    if (!isAdmin && internalToken !== validToken) {
      res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'Sync-all requires admin privileges or valid internal token.' },
      });
      return;
    }

    const results = await verifyAllBoardSources();

    // Update all verified syllabuses in the DB
    for (const result of results) {
      try {
        const syllabus = db.getOfficialSyllabus(result.board, result.class_level as 10 | 11 | 12);
        db.updateSyllabusVerification(syllabus.id, {
          last_verified_at: result.verified_at,
          verified: result.success,
          verification_source_reachable: result.source_reachable,
          verification_status_message: result.status_message,
          content_fingerprint: result.content_fingerprint ?? undefined,
          fingerprint_changed: result.fingerprint_changed,
        });
      } catch {
        // Continue with remaining boards
      }
    }

    res.json({
      success: true,
      data: {
        sync_run_at: new Date().toISOString(),
        boards_checked: results.length,
        sources_reachable: results.filter(r => r.source_reachable).length,
        changes_detected: results.filter(r => r.fingerprint_changed).length,
        results: results.map(r => ({
          board: r.board,
          class_level: r.class_level,
          official_url: r.official_url,
          source_reachable: r.source_reachable,
          http_status: r.http_status,
          fingerprint_changed: r.fingerprint_changed,
          status_message: r.status_message,
          verified_at: r.verified_at,
        })),
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/syllabus/sources
 * Lists all configured official board sources (publicly readable)
 */
router.get('/syllabus/sources', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        supported_sources: OFFICIAL_BOARD_SOURCES.map(s => ({
          board: s.board,
          class_level: s.class_level,
          official_url: s.official_url,
          description: s.source_description,
        })),
        note: 'Syllabus content is curated from these official sources and embedded in the application. HTTP fingerprinting detects when the source page changes. Large PDF parsing is not automated — changes trigger a manual review flag.',
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
