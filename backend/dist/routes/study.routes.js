"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const studyTrackingService_js_1 = require("../services/study-tracking/studyTrackingService.js");
const api_schemas_js_1 = require("../schemas/api.schemas.js");
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.requireAuth);
// 1. Start Study Session
router.post('/study-sessions', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const session = studyTrackingService_js_1.StudyTrackingService.startSession(userId);
        res.status(201).json({
            success: true,
            data: session,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 2. Heartbeat
router.post('/study-sessions/:id/heartbeat', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const validated = api_schemas_js_1.StudyHeartbeatSchema.parse(req.body);
        const updated = studyTrackingService_js_1.StudyTrackingService.recordHeartbeat(req.params.id, userId, validated.active_seconds);
        res.json({
            success: true,
            data: updated,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 3. Pause
router.post('/study-sessions/:id/pause', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const updated = studyTrackingService_js_1.StudyTrackingService.pauseSession(req.params.id, userId);
        res.json({
            success: true,
            data: updated,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 4. Resume
router.post('/study-sessions/:id/resume', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const updated = studyTrackingService_js_1.StudyTrackingService.resumeSession(req.params.id, userId);
        res.json({
            success: true,
            data: updated,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 5. End
router.post('/study-sessions/:id/end', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const updated = studyTrackingService_js_1.StudyTrackingService.endSession(req.params.id, userId);
        res.json({
            success: true,
            data: updated,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
