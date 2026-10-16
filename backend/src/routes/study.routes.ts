import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { StudyTrackingService } from '../services/study-tracking/studyTrackingService.js';
import { StudyHeartbeatSchema } from '../schemas/api.schemas.js';

const router = Router();
router.use(requireAuth);

// 1. Start Study Session
router.post('/study-sessions', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const session = StudyTrackingService.startSession(userId);
    res.status(201).json({
      success: true,
      data: session,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Heartbeat
router.post('/study-sessions/:id/heartbeat', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const validated = StudyHeartbeatSchema.parse(req.body);
    const updated = StudyTrackingService.recordHeartbeat(
      req.params.id,
      userId,
      validated.active_seconds
    );

    res.json({
      success: true,
      data: updated,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Pause
router.post('/study-sessions/:id/pause', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const updated = StudyTrackingService.pauseSession(req.params.id, userId);
    res.json({
      success: true,
      data: updated,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 4. Resume
router.post('/study-sessions/:id/resume', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const updated = StudyTrackingService.resumeSession(req.params.id, userId);
    res.json({
      success: true,
      data: updated,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 5. End
router.post('/study-sessions/:id/end', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const updated = StudyTrackingService.endSession(req.params.id, userId);
    res.json({
      success: true,
      data: updated,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
