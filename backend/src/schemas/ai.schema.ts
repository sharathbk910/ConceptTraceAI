import { z } from 'zod';

// 15.1 Input Extraction Schema
export const InputExtractionSchema = z.object({
  extracted_question: z.string(),
  questions: z.array(
    z.object({
      text: z.string(),
      question_index: z.number().int(),
    })
  ),
  extraction_confidence: z.number().min(0).max(1),
  ambiguous_regions: z.array(z.string()),
  needs_clarification: z.boolean(),
});

export type InputExtraction = z.infer<typeof InputExtractionSchema>;

// 15.2 Problem Understanding Schema
export const ProblemUnderstandingSchema = z.object({
  subject: z.string(),
  class_level: z.number().int(),
  chapter: z.string().nullable(),
  topic: z.string().nullable(),
  syllabus_topic_id: z.string().nullable(),
  classification_confidence: z.number().min(0).max(1),
  question_type: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'unknown']),
  classification_notes: z.array(z.string()),
});

export type ProblemUnderstanding = z.infer<typeof ProblemUnderstandingSchema>;

// 15.3 Solution Generation Schema
export const SolutionStepSchema = z.object({
  step_number: z.number().int(),
  title: z.string(),
  content: z.string(),
  reason: z.string(),
});

export const SolutionGenerationSchema = z.object({
  explanation: z.string(),
  solution_steps: z.array(SolutionStepSchema),
  final_answer: z.string().nullable(),
  concepts: z.array(z.string()),
  assumptions: z.array(z.string()),
  uncertainty_notes: z.array(z.string()),
});

export type SolutionGeneration = z.infer<typeof SolutionGenerationSchema>;

// 15.4 Solution Verification Schema
export const SolutionVerificationSchema = z.object({
  verification_status: z.enum(['verified', 'partially_verified', 'needs_review']),
  verification_method: z.string(),
  independent_check_performed: z.boolean(),
  checked_components: z.array(z.string()),
  issues_found: z.array(z.string()),
  verification_details: z.string(),
  uncertainty_notes: z.array(z.string()),
});

export type SolutionVerification = z.infer<typeof SolutionVerificationSchema>;

// 15.5 Concept and Mistake Analysis Schema
export const ConceptItemSchema = z.object({
  concept: z.string(),
  evidence: z.string(),
  confidence: z.number().min(0).max(1),
});

export const PossibleMistakeSchema = z.object({
  mistake: z.string(),
  evidence: z.string(),
  suggested_correction: z.string(),
});

export const PrerequisiteConceptSchema = z.object({
  concept: z.string(),
  reason: z.string(),
});

export const RecommendedActionSchema = z.object({
  action: z.string(),
  reason: z.string(),
});

export const ConceptMistakeAnalysisSchema = z.object({
  concept_analysis: z.array(ConceptItemSchema),
  possible_mistakes: z.array(PossibleMistakeSchema),
  prerequisite_concepts: z.array(PrerequisiteConceptSchema),
  recommended_actions: z.array(RecommendedActionSchema),
});

export type ConceptMistakeAnalysis = z.infer<typeof ConceptMistakeAnalysisSchema>;

// 15.6 Practice Question Generation Schema
export const PracticeQuestionItemSchema = z.object({
  question_text: z.string(),
  question_type: z.enum(['mcq', 'short_answer']),
  options: z.array(z.string()).optional(),
  correct_answer: z.any(),
  explanation: z.string(),
  topic: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

export const PracticeQuestionGenerationSchema = z.object({
  practice_questions: z.array(PracticeQuestionItemSchema),
});

export type PracticeQuestionGeneration = z.infer<typeof PracticeQuestionGenerationSchema>;

// 15.7 Unified Analysis Result
export const UnifiedAnalysisResultSchema = z.object({
  extracted_question: z.string(),
  extraction_confidence: z.number().min(0).max(1),
  subject: z.string(),
  topic: z.string().nullable(),
  chapter: z.string().nullable().optional(),
  solution_steps: z.array(SolutionStepSchema),
  final_answer: z.string().nullable(),
  verification_status: z.enum(['verified', 'partially_verified', 'needs_review']),
  verification_method: z.string(),
  verification_details: z.string(),
  concept_analysis: z.array(ConceptItemSchema),
  possible_mistakes: z.array(PossibleMistakeSchema),
  prerequisite_concepts: z.array(PrerequisiteConceptSchema),
  practice_questions: z.array(PracticeQuestionItemSchema),
  uncertainty_notes: z.array(z.string()),
});

export type UnifiedAnalysisResult = z.infer<typeof UnifiedAnalysisResultSchema>;
