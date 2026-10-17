import { z } from 'zod';

// 15.1 Input Extraction Schema
export const InputExtractionSchema = z.object({
  extracted_question: z.string(),
  questions: z.array(
    z.object({
      text: z.string(),
      question_index: z.union([z.number().int(), z.string().transform(Number)]).default(1),
    })
  ).default([]),
  extraction_confidence: z.union([z.number(), z.string().transform(Number)]).default(0.95),
  ambiguous_regions: z.array(z.string()).default([]),
  needs_clarification: z.boolean().default(false),
});

export type InputExtraction = z.infer<typeof InputExtractionSchema>;

// 15.2 Problem Understanding Schema
export const ProblemUnderstandingSchema = z.object({
  subject: z.string(),
  class_level: z.union([z.number().int(), z.string().transform(Number)]).default(10),
  chapter: z.string().nullable().optional(),
  topic: z.string().nullable().optional(),
  syllabus_topic_id: z.string().nullable().optional(),
  classification_confidence: z.union([z.number(), z.string().transform(Number)]).default(0.95),
  question_type: z.string().default('conceptual'),
  difficulty: z.union([z.enum(['easy', 'medium', 'hard', 'unknown']), z.string()]).transform(v => {
    const l = String(v).toLowerCase();
    if (l.includes('easy')) return 'easy';
    if (l.includes('hard')) return 'hard';
    if (l.includes('medium')) return 'medium';
    return 'unknown';
  }),
  classification_notes: z.array(z.string()).default([]),
});

export type ProblemUnderstanding = z.infer<typeof ProblemUnderstandingSchema>;

// 15.3 Solution Generation Schema
export const SolutionStepSchema = z.object({
  step_number: z.union([z.number().int(), z.string().transform(Number)]).default(1),
  title: z.string(),
  content: z.string(),
  reason: z.string().optional().default('Applies foundational academic principle.'),
});

export const SolutionGenerationSchema = z.object({
  explanation: z.string().default(''),
  solution_steps: z.array(SolutionStepSchema).default([]),
  final_answer: z.string().nullable().optional(),
  concepts: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  uncertainty_notes: z.array(z.string()).default([]),
});

export type SolutionGeneration = z.infer<typeof SolutionGenerationSchema>;

// 15.4 Solution Verification Schema
export const SolutionVerificationSchema = z.object({
  verification_status: z.union([z.enum(['verified', 'partially_verified', 'needs_review']), z.string()]).transform(v => {
    const l = String(v).toLowerCase();
    if (l.includes('verified')) return 'verified';
    if (l.includes('partial')) return 'partially_verified';
    return 'needs_review';
  }),
  verification_method: z.string().default('Algorithmic and model review'),
  independent_check_performed: z.boolean().default(true),
  checked_components: z.array(z.string()).default([]),
  issues_found: z.array(z.string()).default([]),
  verification_details: z.string().default('Completed review'),
  uncertainty_notes: z.array(z.string()).default([]),
});

export type SolutionVerification = z.infer<typeof SolutionVerificationSchema>;

// 15.5 Concept and Mistake Analysis Schema
export const ConceptItemSchema = z.object({
  concept: z.string(),
  evidence: z.string().optional().default('Directly applied in solution steps.'),
  confidence: z.union([z.number(), z.string().transform(Number)]).default(0.95),
});

export const PossibleMistakeSchema = z.object({
  mistake: z.string(),
  evidence: z.string().optional().default('Common misconception in this topic.'),
  suggested_correction: z.string().optional().default('Carefully review standard formulas and derivations.'),
});

export const PrerequisiteConceptSchema = z.object({
  concept: z.string(),
  reason: z.string().optional().default('Required foundational understanding.'),
});

export const RecommendedActionSchema = z.object({
  action: z.string(),
  reason: z.string().optional().default('Recommended practice step.'),
});

export const ConceptMistakeAnalysisSchema = z.object({
  concept_analysis: z.array(ConceptItemSchema).default([]),
  possible_mistakes: z.array(PossibleMistakeSchema).default([]),
  prerequisite_concepts: z.array(PrerequisiteConceptSchema).default([]),
  recommended_actions: z.array(RecommendedActionSchema).default([]),
});

export type ConceptMistakeAnalysis = z.infer<typeof ConceptMistakeAnalysisSchema>;

// 15.6 Practice Question Generation Schema
export const PracticeQuestionItemSchema = z.object({
  question_text: z.string(),
  question_type: z.union([z.enum(['mcq', 'short_answer']), z.string()]).transform(v => {
    const l = String(v).toLowerCase();
    return (l.includes('mcq') || l.includes('choice') || l.includes('option')) ? 'mcq' : 'short_answer';
  }),
  options: z.array(z.string()).optional(),
  correct_answer: z.any().optional().default('A'),
  explanation: z.string().optional().default(''),
  topic: z.string().optional().default('General Topic'),
  difficulty: z.union([z.enum(['easy', 'medium', 'hard']), z.string()]).transform(v => {
    const l = String(v).toLowerCase();
    if (l.includes('easy')) return 'easy';
    if (l.includes('hard')) return 'hard';
    return 'medium';
  }),
});

export const PracticeQuestionGenerationSchema = z.object({
  practice_questions: z.array(PracticeQuestionItemSchema),
});

export type PracticeQuestionGeneration = z.infer<typeof PracticeQuestionGenerationSchema>;

// 15.7 Unified Analysis Result
export const UnifiedAnalysisResultSchema = z.object({
  extracted_question: z.string(),
  extraction_confidence: z.union([z.number(), z.string().transform(Number)]).default(0.95),
  subject: z.string(),
  topic: z.string().nullable().optional(),
  chapter: z.string().nullable().optional(),
  solution_steps: z.array(SolutionStepSchema).default([]),
  final_answer: z.string().nullable().optional(),
  verification_status: z.union([z.enum(['verified', 'partially_verified', 'needs_review']), z.string()]).transform(v => {
    const l = String(v).toLowerCase();
    if (l.includes('verified')) return 'verified';
    if (l.includes('partial')) return 'partially_verified';
    return 'needs_review';
  }),
  verification_method: z.string().default('Algorithmic review'),
  verification_details: z.string().default('Verification completed'),
  concept_analysis: z.array(ConceptItemSchema).default([]),
  possible_mistakes: z.array(PossibleMistakeSchema).default([]),
  prerequisite_concepts: z.array(PrerequisiteConceptSchema).default([]),
  practice_questions: z.array(PracticeQuestionItemSchema).default([]),
  uncertainty_notes: z.array(z.string()).default([]),
});

export type UnifiedAnalysisResult = z.infer<typeof UnifiedAnalysisResultSchema>;
