import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../services/db/database.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { ConceptLearningService } from '../services/learning/conceptLearningService.js';
import { TopicMasteryService } from '../services/learning/topicMasteryService.js';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/v1/learning/map
 * Personalized Learning Map with concept mastery statuses, completion stats, and next recommended concept
 */
router.get('/learning/map', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { board, class_level, stream } = req.query;

    const classLevelNum = class_level ? parseInt(class_level as string, 10) : undefined;
    const validClass = classLevelNum === 10 || classLevelNum === 11 || classLevelNum === 12 ? classLevelNum : undefined;

    const learningMap = ConceptLearningService.getPersonalizedLearningMap(userId, {
      board: board ? (board as string) : undefined,
      classLevel: validClass,
      stream: stream !== undefined ? (stream as string) : undefined,
    });

    res.json({
      success: true,
      data: learningMap,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/learning/quizzes/generate
 * Generates an adaptive 5-question quiz for a specific syllabus concept
 */
router.post('/learning/quizzes/generate', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { concept_id, subject } = req.body;

    if (!concept_id) {
      res.status(400).json({
        success: false,
        data: null,
        error: { code: 'MISSING_PARAM', message: 'concept_id is required' },
      });
      return;
    }

    const edProfile = db.getEducationProfile(userId);
    const classLevel = edProfile?.class_level || 10;
    const subjectName = subject || 'Mathematics';

    const quiz = await ConceptLearningService.generateConceptQuiz(
      userId,
      concept_id,
      subjectName,
      classLevel
    );

    res.status(201).json({
      success: true,
      data: quiz,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/learning/quizzes/:id/submit
 * Submits quiz answers, evaluates score against 80% benchmark, diagnoses misconceptions
 */
router.post('/learning/quizzes/:id/submit', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
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

    const result = await ConceptLearningService.submitConceptQuiz(userId, sessionId, answers);

    res.json({
      success: true,
      data: result,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/learning/concepts/:id/notes
 * Comprehensive Revision Notes for a concept
 */
router.get('/learning/concepts/:id/notes', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const conceptId = req.params.id;
    const subject = (req.query.subject as string) || undefined;
    const edProfile = db.getEducationProfile(req.user!.id);
    const classLevel = edProfile?.class_level || 10;

    const notes = await ConceptLearningService.getOrGenerateRevisionNotes(
      conceptId,
      subject,
      classLevel
    );

    res.json({
      success: true,
      data: notes,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/learning/concepts/:id/flashcards
 * Interactive Flashcards for a concept
 */
router.get('/learning/concepts/:id/flashcards', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const conceptId = req.params.id;
    const subject = (req.query.subject as string) || undefined;

    const flashcards = await ConceptLearningService.getOrGenerateFlashcards(conceptId, subject);

    res.json({
      success: true,
      data: flashcards,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/learning/mistakes
 * Review Mistakes history with misconception diagnoses and learning tips
 */
router.get('/learning/mistakes', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const subject = (req.query.subject as string) || undefined;
    const mistakes = db.getUserMistakeLog(userId, subject);

    res.json({
      success: true,
      data: {
        mistakes,
        total: mistakes.length,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/learning/settings
 * User learning settings (mastery benchmark threshold)
 */
router.get('/learning/settings', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const settings = db.getUserLearningSettings(userId);
    res.json({
      success: true,
      data: settings,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/learning/settings
 * Update mastery threshold percentage
 */
router.put('/learning/settings', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { mastery_threshold_percentage, quiz_question_count, auto_recommend_next } = req.body;

    const updated = db.updateUserLearningSettings(userId, {
      ...(mastery_threshold_percentage !== undefined ? { mastery_threshold_percentage: Number(mastery_threshold_percentage) } : {}),
      ...(quiz_question_count !== undefined ? { quiz_question_count: Number(quiz_question_count) } : {}),
      ...(auto_recommend_next !== undefined ? { auto_recommend_next: Boolean(auto_recommend_next) } : {}),
    });

    res.json({
      success: true,
      data: updated,
      error: null,
    });
  } catch (err) {
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
router.get('/learning/mastery/topics', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { board, class_level, academic_year, stream, subject } = req.query;

    const classLevelNum = class_level ? parseInt(class_level as string, 10) : undefined;
    const validClass = classLevelNum === 10 || classLevelNum === 11 || classLevelNum === 12 ? classLevelNum : undefined;

    const hierarchy = TopicMasteryService.getAvailableTopics(userId, {
      board: board ? (board as string) : undefined,
      classLevel: validClass,
      academicYear: academic_year ? (academic_year as string) : undefined,
      stream: stream !== undefined ? (stream as string) : undefined,
      subject: subject ? (subject as string) : undefined,
    });

    res.json({
      success: true,
      data: hierarchy,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Step B: POST /api/v1/learning/mastery/start
 * Starts or resumes a guided mastery workflow and generates Diagnostic Assessment
 */
router.post('/learning/mastery/start', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
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
    const result = await TopicMasteryService.startOrResumeWorkflow(userId, concept_id, subjectName);

    res.status(201).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Step C & D: POST /api/v1/learning/mastery/:id/submit-diagnostic
 * Submits diagnostic answers, diagnoses weak areas & cognitive traps, generates personalized short notes
 */
router.post('/learning/mastery/:id/submit-diagnostic', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
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

    const updated = await TopicMasteryService.submitDiagnostic(userId, sessionId, answers);

    res.json({
      success: true,
      data: updated,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Step E: POST /api/v1/learning/mastery/:id/targeted-practice
 * Generates fresh questions targeting the student's identified weak concepts
 */
router.post('/learning/mastery/:id/targeted-practice', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;

    const result = await TopicMasteryService.startTargetedPractice(userId, sessionId);

    res.json({
      success: true,
      data: result,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Submit Targeted Practice
 */
router.post('/learning/mastery/:id/submit-targeted-practice', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
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

    const updated = await TopicMasteryService.submitTargetedPractice(userId, sessionId, answers);

    res.json({
      success: true,
      data: updated,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Step F: POST /api/v1/learning/mastery/:id/confirm-readiness
 * Records student readiness decision; if confirmed, generates Step G Final Assessment
 */
router.post('/learning/mastery/:id/confirm-readiness', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;
    const { is_ready } = req.body;

    const result = await TopicMasteryService.confirmReadiness(userId, sessionId, Boolean(is_ready));

    res.json({
      success: true,
      data: result,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Step H: POST /api/v1/learning/mastery/:id/submit-final
 * Submits final assessment, compares with diagnostic, evaluates 80% benchmark, updates learning map
 */
router.post('/learning/mastery/:id/submit-final', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
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

    const updated = await TopicMasteryService.submitFinalAssessment(userId, sessionId, answers);

    res.json({
      success: true,
      data: updated,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/learning/mastery/:id
 * Retrieve current state of a mastery workflow session
 */
router.get('/learning/mastery/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const session = db.getTopicMasterySession(req.params.id);

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
    } else if (session.stage === 'targeted_practice') {
      activeQuestions = (session.targeted_practice_questions || []).map(q => ({
        id: q.id,
        question_text: q.question_text,
        options: q.options,
        difficulty: q.difficulty,
        concept_tested: q.concept_tested,
      }));
    } else if (session.stage === 'final_assessment') {
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
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/learning/mastery-sessions
 * List all mastery sessions for the student
 */
router.get('/learning/mastery-sessions', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessions = db.listUserTopicMasterySessions(userId);
    res.json({
      success: true,
      data: sessions,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
