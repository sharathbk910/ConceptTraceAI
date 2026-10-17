import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../services/db/database.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { AIPipelineService } from '../services/ai/aiPipeline.js';
import { CreateQuestionSchema, FollowUpQuestionSchema } from '../schemas/api.schemas.js';

const router = Router();
router.use(requireAuth);

// 1. Ask a Doubt / Create Question
router.post(
  '/questions',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const file = req.file;

      const edProfile = db.getEducationProfile(userId);
      const userSubjects = db.getStudentSubjects(userId).map(s => s.subject_name);

      const subject = req.body.subject || (userSubjects.length > 0 ? userSubjects[0] : 'Mathematics');
      const classLevel = (req.body.class_level ? Number(req.body.class_level) : edProfile?.class_level || 10) as 10 | 11 | 12;
      const board = req.body.board || edProfile?.board || 'CBSE';
      const preferredLanguage = req.body.language || edProfile?.preferred_language || 'English';

      const bodyData = {
        question_text: req.body.question_text || null,
        subject,
        topic_id: req.body.topic_id || null,
        chapter: req.body.chapter || null,
        language: preferredLanguage,
        class_level: classLevel,
        board,
        file_path: file ? file.path : (req.body.file_path || null),
        input_type: file ? (req.body.question_text ? 'mixed' : file.mimetype === 'application/pdf' ? 'document' : 'image') : 'text',
      };

      const validated = CreateQuestionSchema.parse(bodyData);

      // Persist newly provided or missing academic information to the student's profile
      const hasMissingEdDetails = !edProfile || !edProfile.class_level || !edProfile.board || !edProfile.preferred_language;
      const hasUpdatedEdDetails = (req.body.class_level && Number(req.body.class_level) !== edProfile?.class_level) ||
                                  (req.body.board && req.body.board !== edProfile?.board) ||
                                  (req.body.language && req.body.language !== edProfile?.preferred_language);

      if (hasMissingEdDetails || hasUpdatedEdDetails) {
        db.upsertEducationProfile({
          user_id: userId,
          country: edProfile?.country || 'India',
          education_system: edProfile?.education_system || undefined,
          state_or_ut: edProfile?.state_or_ut || undefined,
          board,
          class_level: classLevel,
          stream: classLevel !== 10 ? (edProfile?.stream || undefined) : undefined,
          academic_year: edProfile?.academic_year || '2026-27',
          preferred_language: preferredLanguage,
          syllabus_file_path: edProfile?.syllabus_file_path || null,
          onboarding_completed: true,
        });
      }

      if (subject && !userSubjects.includes(subject)) {
        db.setStudentSubjects(userId, [...userSubjects, subject]);
      }

      // Step 1: Input Extraction
      let extraction: any;
      try {
        extraction = await AIPipelineService.extractQuestion(
          validated.question_text,
          validated.file_path
        );
      } catch (extractErr: any) {
        extraction = {
          extracted_question: validated.question_text?.trim() || 'Uploaded academic question',
          questions: [{ text: validated.question_text?.trim() || 'Uploaded academic question', question_index: 1 }],
          extraction_confidence: 0.8,
          ambiguous_regions: [],
          needs_clarification: false,
        };
      }

      // Create Query record in database with status 'processing'
      const queryRecord = db.createQuery({
        user_id: userId,
        input_type: validated.input_type as any,
        question_text: validated.question_text,
        extracted_text: extraction.extracted_question,
        file_path: validated.file_path,
        subject: validated.subject,
        topic_id: validated.topic_id,
        chapter: validated.chapter,
        status: 'processing',
        extraction_confidence: extraction.extraction_confidence,
      });

      console.log(`[AskDoubt] Processing question_id=${queryRecord.id} subject=${validated.subject} class=${classLevel} board=${board}`);

      // Step 2-6: Run Full AI Pipeline
      let analysisResult: any;
      try {
        analysisResult = await AIPipelineService.analyzeDoubt({
          questionText: validated.question_text,
          extractedText: extraction.extracted_question,
          filePath: validated.file_path,
          subject: validated.subject,
          topicId: validated.topic_id,
          classLevel,
          board,
          preferredLanguage,
        });
      } catch (aiErr: any) {
        console.error(`[AskDoubt] Analysis failed for question_id=${queryRecord.id}:`, aiErr.message || aiErr);
        db.updateQuery(queryRecord.id, {
          status: 'failed',
          error_code: aiErr.code || 'AI_ANALYSIS_FAILED',
          error_message: aiErr.message || 'AI processing encountered an error. Please retry.',
        });
        res.status(aiErr.statusCode || 502).json({
          success: false,
          data: {
            question_id: queryRecord.id,
            status: 'failed',
            query: db.getQueryById(queryRecord.id, userId),
            solution: null,
          },
          error: {
            code: aiErr.code || 'AI_ANALYSIS_FAILED',
            message: aiErr.message || 'Could not analyze question. Please retry.',
          },
        });
        return;
      }

      // Persist Solution Record
      const solutionRecord = db.createSolution({
        query_id: queryRecord.id,
        explanation: `Solution for: ${extraction.extracted_question}`,
        structured_steps: analysisResult.solution_steps,
        final_answer: analysisResult.final_answer,
        verification_status: analysisResult.verification_status,
        verification_method: analysisResult.verification_method,
        verification_details: { details: analysisResult.verification_details },
        concept_analysis: analysisResult.concept_analysis,
        possible_mistakes: analysisResult.possible_mistakes,
        prerequisite_concepts: analysisResult.prerequisite_concepts,
        practice_questions: analysisResult.practice_questions,
        uncertainty_notes: analysisResult.uncertainty_notes,
        model_metadata: { processed_at: new Date().toISOString() },
      });

      // Update Query Record to completed
      db.updateQuery(queryRecord.id, {
        status: 'completed',
        topic_id: queryRecord.topic_id || (analysisResult.topic ? queryRecord.topic_id : null),
        error_code: null,
        error_message: null,
      });

      // Record activity event
      db.recordActivity({
        user_id: userId,
        activity_type: 'question',
        query_id: queryRecord.id,
        metadata: { subject: validated.subject, topic: analysisResult.topic },
      });

      console.log(`[AskDoubt] Successfully completed analysis for question_id=${queryRecord.id}`);

      res.status(201).json({
        success: true,
        data: {
          question_id: queryRecord.id,
          status: 'completed',
          query: queryRecord,
          solution: solutionRecord,
          extraction,
        },
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// 2. List Questions History
router.get('/questions', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { subject, status, search, page = '1', limit = '10' } = req.query;

    const queries = db.listUserQueries(userId, {
      subject: subject as string,
      status: status as string,
      search: search as string,
    });

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = queries.slice(startIndex, startIndex + limitNum);

    // Attach solution summaries
    const items = paginated.map(q => {
      const sol = db.getSolutionByQueryId(q.id);
      return {
        ...q,
        solution_summary: sol
          ? {
              verification_status: sol.verification_status,
              verification_method: sol.verification_method,
              final_answer: sol.final_answer,
              steps_count: sol.structured_steps.length,
              concepts: (sol.concept_analysis as any[])?.map(c => c.concept) || [],
            }
          : null,
      };
    });

    res.json({
      success: true,
      data: {
        total: queries.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(queries.length / limitNum),
        items,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Get Specific Question & Solution
router.get('/questions/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const query = db.getQueryById(req.params.id, userId);

    if (!query) {
      res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Question not found or access denied.' },
      });
      return;
    }

    const solution = db.getSolutionByQueryId(query.id);

    // Record review activity
    db.recordActivity({
      user_id: userId,
      activity_type: 'solution_review',
      query_id: query.id,
      metadata: { subject: query.subject },
    });

    res.json({
      success: true,
      data: {
        query,
        solution,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 4. Retry Analysis
router.post('/questions/:id/analyze', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const query = db.getQueryById(req.params.id, userId);
    if (!query) {
      res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Question not found.' },
      });
      return;
    }

    const edProfile = db.getEducationProfile(userId);
    const classLevel = edProfile?.class_level || 10;
    const board = edProfile?.board || 'CBSE';
    const preferredLanguage = edProfile?.preferred_language || 'English';

    let analysisResult: any;
    try {
      analysisResult = await AIPipelineService.analyzeDoubt({
        questionText: query.question_text,
        extractedText: query.extracted_text,
        filePath: query.file_path,
        subject: query.subject || 'General',
        topicId: query.topic_id,
        classLevel,
        board,
        preferredLanguage,
      });
    } catch (aiErr: any) {
      console.error(`[AskDoubt] Retry failed for question_id=${query.id}:`, aiErr.message || aiErr);
      db.updateQuery(query.id, {
        status: 'failed',
        error_code: aiErr.code || 'AI_RETRY_FAILED',
        error_message: aiErr.message || 'Retry analysis could not be completed. Please retry.',
      });
      res.status(aiErr.statusCode || 502).json({
        success: false,
        data: {
          query: db.getQueryById(query.id, userId),
          solution: db.getSolutionByQueryId(query.id),
        },
        error: {
          code: aiErr.code || 'AI_RETRY_FAILED',
          message: aiErr.message || 'Could not re-analyze doubt. Please retry.',
        },
      });
      return;
    }

    // Replace solution
    const existingSol = db.getSolutionByQueryId(query.id);
    let solutionRecord;
    if (existingSol) {
      existingSol.structured_steps = analysisResult.solution_steps;
      existingSol.final_answer = analysisResult.final_answer;
      existingSol.verification_status = analysisResult.verification_status;
      existingSol.verification_method = analysisResult.verification_method;
      existingSol.verification_details = { details: analysisResult.verification_details };
      existingSol.concept_analysis = analysisResult.concept_analysis;
      existingSol.possible_mistakes = analysisResult.possible_mistakes;
      existingSol.prerequisite_concepts = analysisResult.prerequisite_concepts;
      existingSol.practice_questions = analysisResult.practice_questions;
      existingSol.uncertainty_notes = analysisResult.uncertainty_notes;
      solutionRecord = existingSol;
    } else {
      solutionRecord = db.createSolution({
        query_id: query.id,
        explanation: `Solution for: ${query.extracted_text || query.question_text}`,
        structured_steps: analysisResult.solution_steps,
        final_answer: analysisResult.final_answer,
        verification_status: analysisResult.verification_status,
        verification_method: analysisResult.verification_method,
        verification_details: { details: analysisResult.verification_details },
        concept_analysis: analysisResult.concept_analysis,
        possible_mistakes: analysisResult.possible_mistakes,
        prerequisite_concepts: analysisResult.prerequisite_concepts,
        practice_questions: analysisResult.practice_questions,
        uncertainty_notes: analysisResult.uncertainty_notes,
        model_metadata: { reanalyzed_at: new Date().toISOString() },
      });
    }

    const updatedQuery = db.updateQuery(query.id, {
      status: 'completed',
      error_code: null,
      error_message: null,
    });

    res.json({
      success: true,
      data: {
        query: updatedQuery || query,
        solution: solutionRecord,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 5. Follow-Up Question
router.post('/questions/:id/follow-up', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const query = db.getQueryById(req.params.id, userId);
    if (!query) {
      res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Question not found.' },
      });
      return;
    }

    const validated = FollowUpQuestionSchema.parse(req.body);
    const solution = db.getSolutionByQueryId(query.id);
    const edProfile = db.getEducationProfile(userId);

    const followUpAnswer = await AIPipelineService.answerFollowUp(
      query.extracted_text || query.question_text || '',
      solution,
      validated.follow_up_text,
      edProfile?.preferred_language || 'English'
    );

    res.json({
      success: true,
      data: {
        question_id: query.id,
        follow_up_text: validated.follow_up_text,
        response: followUpAnswer,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// 6. Delete Question
router.delete('/questions/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const deleted = db.deleteQuery(req.params.id, userId);
    if (!deleted) {
      res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Question not found or access denied.' },
      });
      return;
    }

    res.json({
      success: true,
      data: { message: 'Question and solution successfully removed from learning history.' },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
