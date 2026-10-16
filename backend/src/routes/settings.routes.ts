import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../services/db/database.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { UserSettingsSchema } from '../schemas/api.schemas.js';

const router = Router();
router.use(requireAuth);

// 1. Get Settings
router.get('/settings', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    let settings = db.getUserSettings(userId);
    if (!settings) {
      settings = db.updateUserSettings(userId, {});
    }
    res.json({
      success: true,
      data: settings,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Patch Settings
router.patch('/settings', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const validated = UserSettingsSchema.parse(req.body);
    const updated = db.updateUserSettings(userId, validated as any);
    res.json({
      success: true,
      data: updated,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Notifications List
router.get('/notifications', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const notifications = db.getUserNotifications(userId);
    const unreadCount = notifications.filter(n => !n.read_at).length;
    res.json({
      success: true,
      data: {
        notifications,
        unread_count: unreadCount,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 4. Mark Notification as Read
router.patch('/notifications/:id/read', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const success = db.markNotificationAsRead(req.params.id, userId);
    res.json({
      success,
      data: { id: req.params.id, read: success },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 5. Global Search across questions, solutions, and topics
router.get('/search', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const query = ((req.query.q as string) || '').trim().toLowerCase();

    if (!query) {
      res.json({
        success: true,
        data: { questions: [], topics: [] },
        error: null,
      });
      return;
    }

    // Search user's queries
    const userQueries = db.listUserQueries(userId);
    const matchedQuestions = userQueries
      .filter(q => {
        return (
          (q.question_text || '').toLowerCase().includes(query) ||
          (q.extracted_text || '').toLowerCase().includes(query) ||
          (q.subject || '').toLowerCase().includes(query)
        );
      })
      .slice(0, 10)
      .map(q => ({
        id: q.id,
        title: q.question_text || q.extracted_text || 'Question',
        subject: q.subject,
        status: q.status,
        created_at: q.created_at,
      }));

    // Search syllabus topics
    const allTopics = db.getSyllabusTopics();
    const matchedTopics = allTopics
      .filter(t => {
        return (
          t.topic.toLowerCase().includes(query) ||
          (t.chapter || '').toLowerCase().includes(query) ||
          t.subject.toLowerCase().includes(query)
        );
      })
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        questions: matchedQuestions,
        topics: matchedTopics,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
