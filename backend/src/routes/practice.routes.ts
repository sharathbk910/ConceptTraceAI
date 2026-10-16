import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../services/db/database.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { AIPipelineService } from '../services/ai/aiPipeline.js';
import { CreatePracticeSessionSchema, SubmitAnswerSchema } from '../schemas/api.schemas.js';

const router = Router();
router.use(requireAuth);

// 1. Create Practice Session
router.post('/practice/sessions', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const validated = CreatePracticeSessionSchema.parse(req.body);
    const edProfile = db.getEducationProfile(userId);
    const classLevel = edProfile?.class_level || 10;

    let topicName = 'General Concepts';
    if (validated.topic_id) {
      const topicObj = db.getSyllabusTopicById(validated.topic_id);
      if (topicObj) topicName = topicObj.topic;
    }

    // Create session record
    const session = db.createPracticeSession({
      user_id: userId,
      subject: validated.subject,
      topic_id: validated.topic_id,
      status: 'in_progress',
      question_count: validated.question_count,
    });

    // Generate practice questions
    const generated = await AIPipelineService.generateTopicPracticeQuestions(
      validated.subject,
      topicName,
      classLevel,
      validated.difficulty,
      validated.question_count
    );

    // Persist questions in database
    const questionsToInsert = generated.practice_questions.map(q => ({
      session_id: session.id,
      topic_id: validated.topic_id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options || null,
      correct_answer: q.correct_answer, // Stored safely on server!
      explanation: q.explanation,
      difficulty: q.difficulty,
      validation_status: 'validated' as const,
    }));

    const savedQuestions = db.createPracticeQuestions(questionsToInsert);

    // Record activity
    db.recordActivity({
      user_id: userId,
      activity_type: 'practice',
      session_id: session.id,
      metadata: { subject: validated.subject, topic: topicName, count: savedQuestions.length },
    });

    // Strip out correct answers and explanations before sending to client!
    const clientQuestions = savedQuestions.map(q => ({
      id: q.id,
      session_id: q.session_id,
      topic_id: q.topic_id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      difficulty: q.difficulty,
    }));

    res.status(201).json({
      success: true,
      data: {
        session,
        questions: clientQuestions,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 2. List Practice Sessions
router.get('/practice/sessions', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessions = db.listUserPracticeSessions(userId);

    const withMetrics = sessions.map(s => {
      const attempts = db.getAttemptsForSession(s.id, userId);
      const correct = attempts.filter(a => a.is_correct).length;
      return {
        ...s,
        attempts_count: attempts.length,
        correct_count: correct,
        score_percent: attempts.length > 0 ? Math.round((correct / attempts.length) * 100) : 0,
      };
    });

    res.json({
      success: true,
      data: withMetrics,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Get Practice Session Details & Questions
router.get('/practice/sessions/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const session = db.getPracticeSession(req.params.id, userId);
    if (!session) {
      res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Practice session not found.' },
      });
      return;
    }

    const questions = db.getPracticeQuestionsForSession(session.id);
    const attempts = db.getAttemptsForSession(session.id, userId);
    const isCompleted = session.status === 'completed';

    // Only expose correct_answer and explanation for questions that HAVE BEEN ATTEMPTED or if session is completed
    const safeQuestions = questions.map(q => {
      const attempt = attempts.find(a => a.question_id === q.id);
      if (attempt || isCompleted) {
        return {
          id: q.id,
          session_id: q.session_id,
          topic_id: q.topic_id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          attempt: attempt
            ? {
                submitted_answer: attempt.submitted_answer,
                is_correct: attempt.is_correct,
                feedback: attempt.feedback,
                attempted_at: attempt.attempted_at,
              }
            : null,
        };
      }
      return {
        id: q.id,
        session_id: q.session_id,
        topic_id: q.topic_id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        difficulty: q.difficulty,
        attempt: null,
      };
    });

    res.json({
      success: true,
      data: {
        session,
        questions: safeQuestions,
        completed: isCompleted,
        score: {
          total: questions.length,
          attempted: attempts.length,
          correct: attempts.filter(a => a.is_correct).length,
        },
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 4. Submit Answer for a Question
router.post('/practice/sessions/:id/submit', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;
    const session = db.getPracticeSession(sessionId, userId);

    if (!session) {
      res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Practice session not found.' },
      });
      return;
    }

    if (session.status === 'completed') {
      res.status(400).json({
        success: false,
        data: null,
        error: { code: 'SESSION_COMPLETED', message: 'This practice session is already completed.' },
      });
      return;
    }

    const validated = SubmitAnswerSchema.parse(req.body);
    const question = db.getPracticeQuestionById(validated.question_id);

    if (!question || question.session_id !== sessionId) {
      res.status(404).json({
        success: false,
        data: null,
        error: { code: 'QUESTION_NOT_FOUND', message: 'Question does not belong to this session.' },
      });
      return;
    }

    // Server-Side Correctness Evaluation
    let isCorrect = false;
    const cleanUser = String(validated.submitted_answer).trim().toLowerCase();
    const cleanCorrect = String(question.correct_answer).trim().toLowerCase();

    if (cleanUser === cleanCorrect) {
      isCorrect = true;
    } else {
      // Check option letter (e.g. "A" vs "A) 9")
      const userLetter = cleanUser.match(/^[a-d]/)?.[0];
      const correctLetter = cleanCorrect.match(/^[a-d]/)?.[0];
      if (userLetter && correctLetter && userLetter === correctLetter) {
        isCorrect = true;
      }
    }

    const feedback = isCorrect
      ? 'Correct! Excellent concept application.'
      : `Incorrect. The correct answer is: ${question.correct_answer}.`;

    // Persist attempt (throws if duplicate)
    const attempt = db.createPracticeAttempt({
      user_id: userId,
      session_id: sessionId,
      question_id: question.id,
      submitted_answer: validated.submitted_answer,
      is_correct: isCorrect,
      eligible_for_metrics: true, // Counts toward topic accuracy
      feedback,
    });

    res.json({
      success: true,
      data: {
        attempt_id: attempt.id,
        is_correct: isCorrect,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        feedback,
      },
      error: null,
    });
  } catch (err: any) {
    if (err.message && err.message.startsWith('DUPLICATE_ATTEMPT')) {
      res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'DUPLICATE_ATTEMPT',
          message: 'An answer has already been submitted for this question.',
        },
      });
      return;
    }
    next(err);
  }
});

// 5. Complete Session
router.post('/practice/sessions/:id/complete', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;
    const session = db.getPracticeSession(sessionId, userId);

    if (!session) {
      res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Practice session not found.' },
      });
      return;
    }

    const updated = db.updatePracticeSession(sessionId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    const attempts = db.getAttemptsForSession(sessionId, userId);
    const questions = db.getPracticeQuestionsForSession(sessionId);
    const correctCount = attempts.filter(a => a.is_correct).length;
    const scorePercent = attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 0;

    res.json({
      success: true,
      data: {
        session: updated,
        total_questions: questions.length,
        attempted_count: attempts.length,
        correct_count: correctCount,
        score_percent: scorePercent,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 6. Retry Practice Session
router.post('/practice/sessions/:id/retry', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const session = db.getPracticeSession(req.params.id, userId);

    if (!session) {
      res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Original practice session not found.' },
      });
      return;
    }

    const edProfile = db.getEducationProfile(userId);
    const classLevel = edProfile?.class_level || 10;
    let topicName = 'General Concepts';
    if (session.topic_id) {
      const topicObj = db.getSyllabusTopicById(session.topic_id);
      if (topicObj) topicName = topicObj.topic;
    }

    const newSession = db.createPracticeSession({
      user_id: userId,
      subject: session.subject,
      topic_id: session.topic_id,
      status: 'in_progress',
      question_count: session.question_count,
    });

    const generated = await AIPipelineService.generateTopicPracticeQuestions(
      session.subject,
      topicName,
      classLevel,
      'medium',
      session.question_count
    );

    const questionsToInsert = generated.practice_questions.map(q => ({
      session_id: newSession.id,
      topic_id: session.topic_id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options || null,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      validation_status: 'validated' as const,
    }));

    const savedQuestions = db.createPracticeQuestions(questionsToInsert);

    const clientQuestions = savedQuestions.map(q => ({
      id: q.id,
      session_id: q.session_id,
      topic_id: q.topic_id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      difficulty: q.difficulty,
    }));

    res.status(201).json({
      success: true,
      data: {
        session: newSession,
        questions: clientQuestions,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
