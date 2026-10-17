"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedAnalysisResultSchema = exports.PracticeQuestionGenerationSchema = exports.PracticeQuestionItemSchema = exports.ConceptMistakeAnalysisSchema = exports.RecommendedActionSchema = exports.PrerequisiteConceptSchema = exports.PossibleMistakeSchema = exports.ConceptItemSchema = exports.SolutionVerificationSchema = exports.SolutionGenerationSchema = exports.SolutionStepSchema = exports.ProblemUnderstandingSchema = exports.InputExtractionSchema = void 0;
const zod_1 = require("zod");
// 15.1 Input Extraction Schema
exports.InputExtractionSchema = zod_1.z.object({
    extracted_question: zod_1.z.string(),
    questions: zod_1.z.array(zod_1.z.object({
        text: zod_1.z.string(),
        question_index: zod_1.z.union([zod_1.z.number().int(), zod_1.z.string().transform(Number)]).default(1),
    })).default([]),
    extraction_confidence: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform(Number)]).default(0.95),
    ambiguous_regions: zod_1.z.array(zod_1.z.string()).default([]),
    needs_clarification: zod_1.z.boolean().default(false),
});
// 15.2 Problem Understanding Schema
exports.ProblemUnderstandingSchema = zod_1.z.object({
    subject: zod_1.z.string(),
    class_level: zod_1.z.union([zod_1.z.number().int(), zod_1.z.string().transform(Number)]).default(10),
    chapter: zod_1.z.string().nullable().optional(),
    topic: zod_1.z.string().nullable().optional(),
    syllabus_topic_id: zod_1.z.string().nullable().optional(),
    classification_confidence: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform(Number)]).default(0.95),
    question_type: zod_1.z.string().default('conceptual'),
    difficulty: zod_1.z.union([zod_1.z.enum(['easy', 'medium', 'hard', 'unknown']), zod_1.z.string()]).transform(v => {
        const l = String(v).toLowerCase();
        if (l.includes('easy'))
            return 'easy';
        if (l.includes('hard'))
            return 'hard';
        if (l.includes('medium'))
            return 'medium';
        return 'unknown';
    }),
    classification_notes: zod_1.z.array(zod_1.z.string()).default([]),
});
// 15.3 Solution Generation Schema
exports.SolutionStepSchema = zod_1.z.object({
    step_number: zod_1.z.union([zod_1.z.number().int(), zod_1.z.string().transform(Number)]).default(1),
    title: zod_1.z.string(),
    content: zod_1.z.string(),
    reason: zod_1.z.string().optional().default('Applies foundational academic principle.'),
});
exports.SolutionGenerationSchema = zod_1.z.object({
    explanation: zod_1.z.string().default(''),
    solution_steps: zod_1.z.array(exports.SolutionStepSchema).default([]),
    final_answer: zod_1.z.string().nullable().optional(),
    concepts: zod_1.z.array(zod_1.z.string()).default([]),
    assumptions: zod_1.z.array(zod_1.z.string()).default([]),
    uncertainty_notes: zod_1.z.array(zod_1.z.string()).default([]),
});
// 15.4 Solution Verification Schema
exports.SolutionVerificationSchema = zod_1.z.object({
    verification_status: zod_1.z.union([zod_1.z.enum(['verified', 'partially_verified', 'needs_review']), zod_1.z.string()]).transform(v => {
        const l = String(v).toLowerCase();
        if (l.includes('verified'))
            return 'verified';
        if (l.includes('partial'))
            return 'partially_verified';
        return 'needs_review';
    }),
    verification_method: zod_1.z.string().default('Algorithmic and model review'),
    independent_check_performed: zod_1.z.boolean().default(true),
    checked_components: zod_1.z.array(zod_1.z.string()).default([]),
    issues_found: zod_1.z.array(zod_1.z.string()).default([]),
    verification_details: zod_1.z.string().default('Completed review'),
    uncertainty_notes: zod_1.z.array(zod_1.z.string()).default([]),
});
// 15.5 Concept and Mistake Analysis Schema
exports.ConceptItemSchema = zod_1.z.object({
    concept: zod_1.z.string(),
    evidence: zod_1.z.string().optional().default('Directly applied in solution steps.'),
    confidence: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform(Number)]).default(0.95),
});
exports.PossibleMistakeSchema = zod_1.z.object({
    mistake: zod_1.z.string(),
    evidence: zod_1.z.string().optional().default('Common misconception in this topic.'),
    suggested_correction: zod_1.z.string().optional().default('Carefully review standard formulas and derivations.'),
});
exports.PrerequisiteConceptSchema = zod_1.z.object({
    concept: zod_1.z.string(),
    reason: zod_1.z.string().optional().default('Required foundational understanding.'),
});
exports.RecommendedActionSchema = zod_1.z.object({
    action: zod_1.z.string(),
    reason: zod_1.z.string().optional().default('Recommended practice step.'),
});
exports.ConceptMistakeAnalysisSchema = zod_1.z.object({
    concept_analysis: zod_1.z.array(exports.ConceptItemSchema).default([]),
    possible_mistakes: zod_1.z.array(exports.PossibleMistakeSchema).default([]),
    prerequisite_concepts: zod_1.z.array(exports.PrerequisiteConceptSchema).default([]),
    recommended_actions: zod_1.z.array(exports.RecommendedActionSchema).default([]),
});
// 15.6 Practice Question Generation Schema
exports.PracticeQuestionItemSchema = zod_1.z.object({
    question_text: zod_1.z.string(),
    question_type: zod_1.z.union([zod_1.z.enum(['mcq', 'short_answer']), zod_1.z.string()]).transform(v => {
        const l = String(v).toLowerCase();
        return (l.includes('mcq') || l.includes('choice') || l.includes('option')) ? 'mcq' : 'short_answer';
    }),
    options: zod_1.z.array(zod_1.z.string()).optional(),
    correct_answer: zod_1.z.any().optional().default('A'),
    explanation: zod_1.z.string().optional().default(''),
    topic: zod_1.z.string().optional().default('General Topic'),
    difficulty: zod_1.z.union([zod_1.z.enum(['easy', 'medium', 'hard']), zod_1.z.string()]).transform(v => {
        const l = String(v).toLowerCase();
        if (l.includes('easy'))
            return 'easy';
        if (l.includes('hard'))
            return 'hard';
        return 'medium';
    }),
});
exports.PracticeQuestionGenerationSchema = zod_1.z.object({
    practice_questions: zod_1.z.array(exports.PracticeQuestionItemSchema),
});
// 15.7 Unified Analysis Result
exports.UnifiedAnalysisResultSchema = zod_1.z.object({
    extracted_question: zod_1.z.string(),
    extraction_confidence: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform(Number)]).default(0.95),
    subject: zod_1.z.string(),
    topic: zod_1.z.string().nullable().optional(),
    chapter: zod_1.z.string().nullable().optional(),
    solution_steps: zod_1.z.array(exports.SolutionStepSchema).default([]),
    final_answer: zod_1.z.string().nullable().optional(),
    verification_status: zod_1.z.union([zod_1.z.enum(['verified', 'partially_verified', 'needs_review']), zod_1.z.string()]).transform(v => {
        const l = String(v).toLowerCase();
        if (l.includes('verified'))
            return 'verified';
        if (l.includes('partial'))
            return 'partially_verified';
        return 'needs_review';
    }),
    verification_method: zod_1.z.string().default('Algorithmic review'),
    verification_details: zod_1.z.string().default('Verification completed'),
    concept_analysis: zod_1.z.array(exports.ConceptItemSchema).default([]),
    possible_mistakes: zod_1.z.array(exports.PossibleMistakeSchema).default([]),
    prerequisite_concepts: zod_1.z.array(exports.PrerequisiteConceptSchema).default([]),
    practice_questions: zod_1.z.array(exports.PracticeQuestionItemSchema).default([]),
    uncertainty_notes: zod_1.z.array(zod_1.z.string()).default([]),
});
