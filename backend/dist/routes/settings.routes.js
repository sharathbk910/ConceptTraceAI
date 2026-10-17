"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../services/db/database.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const api_schemas_js_1 = require("../schemas/api.schemas.js");
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.requireAuth);
// 1. Get Settings
router.get('/settings', async (req, res, next) => {
    try {
        const userId = req.user.id;
        let settings = database_js_1.db.getUserSettings(userId);
        if (!settings) {
            settings = database_js_1.db.updateUserSettings(userId, {});
        }
        res.json({
            success: true,
            data: settings,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 2. Patch Settings
router.patch('/settings', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const validated = api_schemas_js_1.UserSettingsSchema.parse(req.body);
        const updated = database_js_1.db.updateUserSettings(userId, validated);
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
// 3. Notifications List
router.get('/notifications', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const notifications = database_js_1.db.getUserNotifications(userId);
        const unreadCount = notifications.filter(n => !n.read_at).length;
        res.json({
            success: true,
            data: {
                notifications,
                unread_count: unreadCount,
            },
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 4. Mark Notification as Read
router.patch('/notifications/:id/read', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const success = database_js_1.db.markNotificationAsRead(req.params.id, userId);
        res.json({
            success,
            data: { id: req.params.id, read: success },
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 5. Global Search across questions, solutions, and topics
router.get('/search', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const query = (req.query.q || '').trim().toLowerCase();
        if (!query) {
            res.json({
                success: true,
                data: { questions: [], topics: [] },
                error: null,
            });
            return;
        }
        // Search user's queries
        const userQueries = database_js_1.db.listUserQueries(userId);
        const matchedQuestions = userQueries
            .filter(q => {
            return ((q.question_text || '').toLowerCase().includes(query) ||
                (q.extracted_text || '').toLowerCase().includes(query) ||
                (q.subject || '').toLowerCase().includes(query));
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
        const allTopics = database_js_1.db.getSyllabusTopics();
        const matchedTopics = allTopics
            .filter(t => {
            return (t.topic.toLowerCase().includes(query) ||
                (t.chapter || '').toLowerCase().includes(query) ||
                t.subject.toLowerCase().includes(query));
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
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
