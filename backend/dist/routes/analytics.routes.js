"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const analyticsService_js_1 = require("../services/analytics/analyticsService.js");
const pdfReportService_js_1 = require("../services/reports/pdfReportService.js");
const api_schemas_js_1 = require("../schemas/api.schemas.js");
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.requireAuth);
// 1. Dashboard summary
router.get('/dashboard', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const summary = analyticsService_js_1.AnalyticsService.getDashboardSummary(userId);
        res.json({
            success: true,
            data: summary,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 2. Overview metrics
router.get('/analytics/overview', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const summary = analyticsService_js_1.AnalyticsService.getDashboardSummary(userId);
        res.json({
            success: true,
            data: {
                profile: summary.profile,
                metrics: summary.metrics,
                guidance: summary.learning_guidance,
            },
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 3. Learning graphs
router.get('/analytics/graphs', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const validated = api_schemas_js_1.AnalyticsFilterSchema.parse(req.query);
        const graphs = analyticsService_js_1.AnalyticsService.getLearningGraphs(userId, validated.period);
        res.json({
            success: true,
            data: graphs,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 4. Subject accuracy
router.get('/analytics/subjects', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const summary = analyticsService_js_1.AnalyticsService.getDashboardSummary(userId);
        res.json({
            success: true,
            data: summary.subject_accuracy,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 5. Weak topics
router.get('/analytics/weak-topics', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const topics = analyticsService_js_1.AnalyticsService.getTopicMetrics(userId);
        res.json({
            success: true,
            data: topics,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 6. Study activity & heatmap
router.get('/analytics/activity', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const activity = analyticsService_js_1.AnalyticsService.getStudyActivityData(userId);
        res.json({
            success: true,
            data: activity,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 7. PDF Report generation
router.post('/reports/pdf', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const pdfBuffer = await pdfReportService_js_1.PdfReportService.generateReport(userId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="ConceptTrace_Progress_Report.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
