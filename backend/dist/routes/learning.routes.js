"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_js_1 = require("../services/db/database.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const conceptLearningService_js_1 = require("../services/learning/conceptLearningService.js");
const topicMasteryService_js_1 = require("../services/learning/topicMasteryService.js");
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.requireAuth);
/**
 * GET /api/v1/learning/map
 * Personalized Learning Map with concept mastery statuses, completion stats, and next recommended concept
 */
router.get('/learning/map', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { board, class_level, stream } = req.query;
        const classLevelNum = class_level ? parseInt(class_level, 10) : undefined;
        const validClass = classLevelNum === 10 || classLevelNum === 11 || classLevelNum === 12 ? classLevelNum : undefined;
        const learningMap = conceptLearningService_js_1.ConceptLearningService.getPersonalizedLearningMap(userId, {
            board: board ? board : undefined,
            classLevel: validClass,
            stream: stream !== undefined ? stream : undefined,
        });
        res.json({
            success: true,
            data: learningMap,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /api/v1/learning/quizzes/generate
 * Generates an adaptive 5-question quiz for a specific syllabus concept
 */
router.post('/learning/quizzes/generate', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { concept_id, subject } = req.body;
        if (!concept_id) {
            res.status(400).json({
                success: false,
                data: null,
                error: { code: 'MISSING_PARAM', message: 'concept_id is required' },
            });
            return;
        }
        const edProfile = database_js_1.db.getEducationProfile(userId);
        const classLevel = edProfile?.class_level || 10;
        const subjectName = subject || 'Mathematics';
        const quiz = await conceptLearningService_js_1.ConceptLearningService.generateConceptQuiz(userId, concept_id, subjectName, classLevel);
        res.status(201).json({
            success: true,
            data: quiz,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /api/v1/learning/quizzes/:id/submit
 * Submits quiz answers, evaluates score against 80% benchmark, diagnoses misconceptions
 */
router.post('/learning/quizzes/:id/submit', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sessionId = req.params.id;
        const { answers } = req.body;
        if (!answers || typeof answers !== 'object') {
            res.status(400).json({
                success: false,
                data: null,
                error: { code: 'INVALID_ANSWERS', message: 'answers map is required' },
            });
            return;
        }
        const result = await conceptLearningService_js_1.ConceptLearningService.submitConceptQuiz(userId, sessionId, answers);
        res.json({
            success: true,
            data: result,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/learning/concepts/:id/notes
 * Comprehensive Revision Notes for a concept
 */
router.get('/learning/concepts/:id/notes', async (req, res, next) => {
    try {
        const conceptId = req.params.id;
        const subject = req.query.subject || undefined;
        const edProfile = database_js_1.db.getEducationProfile(req.user.id);
        const classLevel = edProfile?.class_level || 10;
        const notes = await conceptLearningService_js_1.ConceptLearningService.getOrGenerateRevisionNotes(conceptId, subject, classLevel);
        res.json({
            success: true,
            data: notes,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/learning/concepts/:id/flashcards
 * Interactive Flashcards for a concept
 */
router.get('/learning/concepts/:id/flashcards', async (req, res, next) => {
    try {
        const conceptId = req.params.id;
        const subject = req.query.subject || undefined;
        const flashcards = await conceptLearningService_js_1.ConceptLearningService.getOrGenerateFlashcards(conceptId, subject);
        res.json({
            success: true,
            data: flashcards,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/learning/mistakes
 * Review Mistakes history with misconception diagnoses and learning tips
 */
router.get('/learning/mistakes', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const subject = req.query.subject || undefined;
        const mistakes = database_js_1.db.getUserMistakeLog(userId, subject);
        res.json({
            success: true,
            data: {
                mistakes,
                total: mistakes.length,
            },
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/learning/settings
 * User learning settings (mastery benchmark threshold)
 */
router.get('/learning/settings', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const settings = database_js_1.db.getUserLearningSettings(userId);
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
/**
 * PUT /api/v1/learning/settings
 * Update mastery threshold percentage
 */
router.put('/learning/settings', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { mastery_threshold_percentage, quiz_question_count, auto_recommend_next } = req.body;
        const updated = database_js_1.db.updateUserLearningSettings(userId, {
            ...(mastery_threshold_percentage !== undefined ? { mastery_threshold_percentage: Number(mastery_threshold_percentage) } : {}),
            ...(quiz_question_count !== undefined ? { quiz_question_count: Number(quiz_question_count) } : {}),
            ...(auto_recommend_next !== undefined ? { auto_recommend_next: Boolean(auto_recommend_next) } : {}),
        });
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
// =========================================================================
// TOPIC PRACTICE & MASTERY WORKFLOW ENDPOINTS (STEPS A THROUGH H)
// =========================================================================
/**
 * Step A: GET /api/v1/learning/mastery/topics
 * Structured Official Syllabus hierarchy with current mastery status
 */
router.get('/learning/mastery/topics', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { board, class_level, academic_year, stream, subject } = req.query;
        const classLevelNum = class_level ? parseInt(class_level, 10) : undefined;
        const validClass = classLevelNum === 10 || classLevelNum === 11 || classLevelNum === 12 ? classLevelNum : undefined;
        const hierarchy = topicMasteryService_js_1.TopicMasteryService.getAvailableTopics(userId, {
            board: board ? board : undefined,
            classLevel: validClass,
            academicYear: academic_year ? academic_year : undefined,
            stream: stream !== undefined ? stream : undefined,
            subject: subject ? subject : undefined,
        });
        res.json({
            success: true,
            data: hierarchy,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * Step B: POST /api/v1/learning/mastery/start
 * Starts or resumes a guided mastery workflow and generates Diagnostic Assessment
 */
router.post('/learning/mastery/start', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { concept_id, subject } = req.body;
        if (!concept_id) {
            res.status(400).json({
                success: false,
                data: null,
                error: { code: 'MISSING_PARAM', message: 'concept_id is required' },
            });
            return;
        }
        const subjectName = subject || 'Mathematics';
        const result = await topicMasteryService_js_1.TopicMasteryService.startOrResumeWorkflow(userId, concept_id, subjectName);
        res.status(201).json({
            success: true,
            data: result,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * Step C & D: POST /api/v1/learning/mastery/:id/submit-diagnostic
 * Submits diagnostic answers, diagnoses weak areas & cognitive traps, generates personalized short notes
 */
router.post('/learning/mastery/:id/submit-diagnostic', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sessionId = req.params.id;
        const { answers } = req.body;
        if (!answers || typeof answers !== 'object') {
            res.status(400).json({
                success: false,
                data: null,
                error: { code: 'INVALID_ANSWERS', message: 'answers map is required' },
            });
            return;
        }
        const updated = await topicMasteryService_js_1.TopicMasteryService.submitDiagnostic(userId, sessionId, answers);
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
/**
 * Step E: POST /api/v1/learning/mastery/:id/targeted-practice
 * Generates fresh questions targeting the student's identified weak concepts
 */
router.post('/learning/mastery/:id/targeted-practice', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sessionId = req.params.id;
        const result = await topicMasteryService_js_1.TopicMasteryService.startTargetedPractice(userId, sessionId);
        res.json({
            success: true,
            data: result,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * Submit Targeted Practice
 */
router.post('/learning/mastery/:id/submit-targeted-practice', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sessionId = req.params.id;
        const { answers } = req.body;
        if (!answers || typeof answers !== 'object') {
            res.status(400).json({
                success: false,
                data: null,
                error: { code: 'INVALID_ANSWERS', message: 'answers map is required' },
            });
            return;
        }
        const updated = await topicMasteryService_js_1.TopicMasteryService.submitTargetedPractice(userId, sessionId, answers);
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
/**
 * Step F: POST /api/v1/learning/mastery/:id/confirm-readiness
 * Records student readiness decision; if confirmed, generates Step G Final Assessment
 */
router.post('/learning/mastery/:id/confirm-readiness', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sessionId = req.params.id;
        const { is_ready } = req.body;
        const result = await topicMasteryService_js_1.TopicMasteryService.confirmReadiness(userId, sessionId, Boolean(is_ready));
        res.json({
            success: true,
            data: result,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * Step H: POST /api/v1/learning/mastery/:id/submit-final
 * Submits final assessment, compares with diagnostic, evaluates 80% benchmark, updates learning map
 */
router.post('/learning/mastery/:id/submit-final', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sessionId = req.params.id;
        const { answers } = req.body;
        if (!answers || typeof answers !== 'object') {
            res.status(400).json({
                success: false,
                data: null,
                error: { code: 'INVALID_ANSWERS', message: 'answers map is required' },
            });
            return;
        }
        const updated = await topicMasteryService_js_1.TopicMasteryService.submitFinalAssessment(userId, sessionId, answers);
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
/**
 * GET /api/v1/learning/mastery/:id
 * Retrieve current state of a mastery workflow session
 */
router.get('/learning/mastery/:id', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const session = database_js_1.db.getTopicMasterySession(req.params.id);
        if (!session || session.user_id !== userId) {
            res.status(404).json({
                success: false,
                data: null,
                error: { code: 'NOT_FOUND', message: 'Mastery session not found' },
            });
            return;
        }
        // Sanitize questions based on current stage
        let activeQuestions = undefined;
        if (session.stage === 'diagnostic') {
            activeQuestions = (session.diagnostic_questions || []).map(q => ({
                id: q.id,
                question_text: q.question_text,
                options: q.options,
                difficulty: q.difficulty,
                concept_tested: q.concept_tested,
            }));
        }
        else if (session.stage === 'targeted_practice') {
            activeQuestions = (session.targeted_practice_questions || []).map(q => ({
                id: q.id,
                question_text: q.question_text,
                options: q.options,
                difficulty: q.difficulty,
                concept_tested: q.concept_tested,
            }));
        }
        else if (session.stage === 'final_assessment') {
            activeQuestions = (session.final_questions || []).map(q => ({
                id: q.id,
                question_text: q.question_text,
                options: q.options,
                difficulty: q.difficulty,
                concept_tested: q.concept_tested,
            }));
        }
        res.json({
            success: true,
            data: {
                session,
                active_questions: activeQuestions,
            },
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/learning/mastery-sessions
 * List all mastery sessions for the student
 */
router.get('/learning/mastery-sessions', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sessions = database_js_1.db.listUserTopicMasterySessions(userId);
        res.json({
            success: true,
            data: sessions,
            error: null,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
