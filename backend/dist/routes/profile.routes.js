"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../services/db/database.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const api_schemas_js_1 = require("../schemas/api.schemas.js");
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.requireAuth);
// 1. Get Profile
router.get('/profile', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const profile = database_js_1.db.getProfileById(userId);
        res.json({
            success: true,
            data: profile,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 2. Patch Profile
router.patch('/profile', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const validated = api_schemas_js_1.ProfileUpdateSchema.parse(req.body);
        const updated = database_js_1.db.updateProfile(userId, validated);
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
// 3. Get Education Profile
router.get('/education-profile', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const edProfile = database_js_1.db.getEducationProfile(userId);
        const subjects = database_js_1.db.getStudentSubjects(userId).map(s => s.subject_name);
        res.json({
            success: true,
            data: edProfile ? { ...edProfile, subjects } : null,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 4. Put Education Profile
router.put('/education-profile', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const validated = api_schemas_js_1.EducationProfileSchema.parse(req.body);
        const savedEdProfile = database_js_1.db.upsertEducationProfile({
            user_id: userId,
            country: validated.country,
            education_system: validated.education_system || undefined,
            state_or_ut: validated.state_or_ut || undefined,
            board: validated.board,
            class_level: validated.class_level,
            stream: validated.stream || undefined,
            academic_year: validated.academic_year,
            preferred_language: validated.preferred_language,
            syllabus_file_path: validated.syllabus_file_path,
            onboarding_completed: true,
        });
        database_js_1.db.setStudentSubjects(userId, validated.subjects);
        database_js_1.db.createNotification(userId, 'Welcome to ConceptTrace AI! 🎉', `Your Class ${validated.class_level} (${validated.board}) profile is ready. Ask doubts or start practicing!`);
        res.json({
            success: true,
            data: {
                ...savedEdProfile,
                subjects: validated.subjects,
            },
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 5. Get Subjects
router.get('/subjects', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const subjects = database_js_1.db.getStudentSubjects(userId);
        res.json({
            success: true,
            data: subjects.map(s => s.subject_name),
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 6. Put Subjects
router.put('/subjects', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { subjects } = req.body;
        if (!Array.isArray(subjects) || subjects.length === 0) {
            res.status(400).json({
                success: false,
                data: null,
                error: { code: 'INVALID_SUBJECTS', message: 'At least one subject is required' },
            });
            return;
        }
        const updated = database_js_1.db.setStudentSubjects(userId, subjects);
        res.json({
            success: true,
            data: updated.map(s => s.subject_name),
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
// 7. Get Syllabus Topics (Configurable database topics)
router.get('/syllabus-topics', async (req, res, next) => {
    try {
        const { board, class_level, subject } = req.query;
        const topics = database_js_1.db.getSyllabusTopics({
            board: board,
            class_level: class_level ? parseInt(class_level, 10) : undefined,
            subject: subject,
        });
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
exports.default = router;
