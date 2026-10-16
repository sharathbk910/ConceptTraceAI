import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { AnalyticsService } from '../services/analytics/analyticsService.js';
import { PdfReportService } from '../services/reports/pdfReportService.js';
import { AnalyticsFilterSchema } from '../schemas/api.schemas.js';

const router = Router();
router.use(requireAuth);

// 1. Dashboard summary
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const summary = AnalyticsService.getDashboardSummary(userId);
    res.json({
      success: true,
      data: summary,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Overview metrics
router.get('/analytics/overview', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const summary = AnalyticsService.getDashboardSummary(userId);
    res.json({
      success: true,
      data: {
        profile: summary.profile,
        metrics: summary.metrics,
        guidance: summary.learning_guidance,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Learning graphs
router.get('/analytics/graphs', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const validated = AnalyticsFilterSchema.parse(req.query);
    const graphs = AnalyticsService.getLearningGraphs(userId, validated.period);
    res.json({
      success: true,
      data: graphs,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 4. Subject accuracy
router.get('/analytics/subjects', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const summary = AnalyticsService.getDashboardSummary(userId);
    res.json({
      success: true,
      data: summary.subject_accuracy,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 5. Weak topics
router.get('/analytics/weak-topics', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const topics = AnalyticsService.getTopicMetrics(userId);
    res.json({
      success: true,
      data: topics,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 6. Study activity & heatmap
router.get('/analytics/activity', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const activity = AnalyticsService.getStudyActivityData(userId);
    res.json({
      success: true,
      data: activity,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 7. PDF Report generation
router.post('/reports/pdf', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const pdfBuffer = await PdfReportService.generateReport(userId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ConceptTrace_Progress_Report.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

export default router;
