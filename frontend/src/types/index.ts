export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: 'student' | 'admin';
}

export interface EducationProfile {
  user_id: string;
  country?: string;
  education_system?: string;
  state_or_ut?: string | null;
  board: string;
  class_level: 10 | 11 | 12;
  stream?: string | null;
  academic_year: string;
  preferred_language: string;
  syllabus_file_path?: string | null;
  onboarding_completed: boolean;
  subjects: string[];
}

export interface SyllabusTopic {
  id: string;
  board: string;
  class_level: 10 | 11 | 12;
  academic_year: string;
  subject: string;
  chapter?: string | null;
  topic: string;
  description?: string | null;
}

export interface SolutionStep {
  step_number: number;
  title: string;
  content: string;
  reason: string;
}

export interface Solution {
  id: string;
  query_id: string;
  explanation: string;
  structured_steps: SolutionStep[];
  final_answer: string | null;
  verification_status: 'verified' | 'partially_verified' | 'needs_review';
  verification_method: string | null;
  verification_details: { details?: string } | any;
  concept_analysis: Array<{ concept: string; evidence: string; confidence: number }>;
  possible_mistakes: Array<{ mistake: string; evidence: string; suggested_correction: string }>;
  prerequisite_concepts: Array<{ concept: string; reason: string }>;
  practice_questions: Array<{
    question_text: string;
    question_type: 'mcq' | 'short_answer';
    options?: string[];
    correct_answer?: any;
    explanation?: string;
    topic?: string;
    difficulty?: string;
  }>;
  uncertainty_notes: string[];
  created_at: string;
}

export interface QueryItem {
  id: string;
  user_id: string;
  input_type: 'text' | 'image' | 'document' | 'mixed';
  question_text?: string | null;
  extracted_text?: string | null;
  file_path?: string | null;
  subject?: string | null;
  topic_id?: string | null;
  chapter?: string | null;
  status: 'pending' | 'processing' | 'completed' | 'needs_review' | 'failed';
  extraction_confidence?: number | null;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
  solution_summary?: {
    verification_status: 'verified' | 'partially_verified' | 'needs_review';
    verification_method?: string;
    final_answer?: string;
    steps_count: number;
    concepts: string[];
  } | null;
}

export interface PracticeQuestion {
  id: string;
  session_id: string;
  topic_id?: string | null;
  question_text: string;
  question_type: 'mcq' | 'short_answer';
  options?: string[] | null;
  correct_answer?: any; // Only available after attempt/session completion
  explanation?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  attempt?: {
    submitted_answer: any;
    is_correct: boolean;
    feedback?: string | null;
    attempted_at: string;
  } | null;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  subject: string;
  topic_id?: string | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  question_count: number;
  started_at: string;
  completed_at?: string | null;
  attempts_count?: number;
  correct_count?: number;
  score_percent?: number;
}

export interface TopicMetric {
  topic_id: string;
  topic_name: string;
  subject: string;
  chapter?: string | null;
  total_attempts: number;
  correct_attempts: number;
  incorrect_attempts: number;
  accuracy: number;
  status: 'Needs More Evidence' | 'Needs Practice' | 'Improving' | 'Doing Well';
  recent_trend: 'improving' | 'declining' | 'stable';
  sample_count_sufficient: boolean;
  min_samples_required: number;
  prerequisites: SyllabusTopic[];
  mistake_patterns: string[];
  recommendation: string;
}

export interface DashboardSummary {
  profile: {
    full_name: string;
    email: string;
    board: string;
    class_level: number;
    academic_year: string;
    preferred_language: string;
    subjects: string[];
  };
  metrics: {
    active_days: number;
    tracked_seconds: number;
    tracked_time_display: string;
    current_streak: number;
    longest_streak: number;
    overall_accuracy: number;
    total_questions_analyzed: number;
    total_practice_attempts: number;
    topics_practiced_count: number;
  };
  learning_guidance: {
    summary: string;
    has_sufficient_evidence: boolean;
    recommendations: string[];
  };
  subject_accuracy: Array<{
    subject: string;
    accuracy: number;
    total_attempts: number;
    correct_attempts: number;
  }>;
  recent_activities: Array<{
    id: string;
    activity_type: string;
    occurred_at: string;
    metadata: any;
  }>;
  weak_topics: TopicMetric[];
  motivational_quote: {
    text: string;
    author: string;
  };
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read_at?: string | null;
  created_at: string;
}

// --- OFFICIAL SYLLABUS & ADAPTIVE LEARNING TYPES ---
export interface SyllabusConcept {
  id: string;
  concept_name: string;
  subtopics: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  exam_importance: 'core' | 'high_yield' | 'standard';
  prerequisites: string[];
  learning_objectives: string[];
  common_misconceptions: string[];
  mastery_status?: 'unattempted' | 'needs_practice' | 'mastered';
  score_percentage?: number;
  quizzes_attempted?: number;
  identified_gaps_count?: number;
  last_attempted_at?: string | null;
}

export interface SyllabusChapter {
  chapter_id: string;
  chapter_number: number;
  chapter_name: string;
  concepts: SyllabusConcept[];
}

export interface SyllabusUnit {
  unit_id: string;
  unit_number: number;
  unit_name: string;
  weightage?: number;
  chapters: SyllabusChapter[];
}

export interface SyllabusSubject {
  subject_name: string;
  code?: string;
  total_marks?: number;
  units: SyllabusUnit[];
}

export interface OfficialSyllabus {
  id: string;
  board: string;
  class_level: 10 | 11 | 12;
  stream?: string | null;
  academic_year: string;
  version: string;
  official_source_url: string;
  verified: boolean;
  last_verified_at: string;
  subjects: SyllabusSubject[];
}

export interface LearningMapResponse {
  syllabus: OfficialSyllabus;
  stats: {
    total_concepts: number;
    mastered_concepts: number;
    needs_practice_concepts: number;
    unattempted_concepts: number;
    completion_percentage: number;
    mastery_threshold: number;
  };
  next_recommended: {
    concept_id: string;
    concept_name: string;
    subject: string;
    chapter: string;
    reason: string;
  } | null;
}

export interface SyllabusComparison {
  id: string;
  user_id: string;
  uploaded_filename: string;
  board: string;
  class_level: number;
  subject: string;
  total_official_concepts: number;
  matched_concepts_count: number;
  extra_topics_count: number;
  omitted_topics_count: number;
  coverage_percentage: number;
  similarity_score: number;
  matched_topics: Array<{ official_concept: string; extracted_topic: string; match_confidence: number }>;
  extra_topics: Array<{ topic_name: string; note: string }>;
  omitted_topics: Array<{ official_concept: string; chapter: string }>;
  summary_notes: string;
  created_at: string;
}

export interface ConceptRevisionNote {
  id: string;
  concept_id: string;
  concept_name: string;
  subject: string;
  chapter: string;
  class_level: number;
  definitions: Array<{ term: string; explanation: string }>;
  key_principles: string[];
  formulas_and_laws: Array<{ title: string; latex: string; explanation: string }>;
  common_pitfalls: Array<{ mistake: string; correction: string; why: string }>;
  worked_examples: Array<{ problem: string; solution_steps: string[]; key_takeaway: string }>;
  quick_summary: string;
  memory_mnemonics?: string[];
  created_at: string;
}

export interface ConceptFlashcard {
  id: string;
  concept_id: string;
  subject: string;
  cards: Array<{
    card_id: string;
    front: string;
    back: string;
    category: 'definition' | 'formula' | 'concept' | 'pitfall';
    hint?: string;
  }>;
  created_at: string;
}

export interface MistakeItem {
  id: string;
  concept_id: string;
  concept_name: string;
  subject: string;
  chapter: string;
  trap: string;
  snippet: string;
  remediation: string;
  date: string;
}

export interface TopicMasteryWeakArea {
  concept: string;
  classification: 'demonstrated_understanding' | 'possible_weakness' | 'recurring_weakness' | 'insufficient_evidence';
  trap?: string;
  evidence: string;
}

export interface TopicMasteryPersonalizedNotes {
  quick_summary: string;
  definitions: Array<{ term: string; explanation: string }>;
  formulas_and_principles: Array<{ title: string; latex: string; explanation: string }>;
  common_pitfalls: Array<{ mistake: string; correction: string; why: string }>;
  worked_examples: Array<{ problem: string; solution_steps: string[]; key_takeaway: string }>;
  memory_aids?: string[];
}

export interface TopicMasteryWorkflowSession {
  id: string;
  user_id: string;
  subject: string;
  chapter: string;
  concept_id: string;
  concept_name: string;
  stage:
    | 'diagnostic'
    | 'diagnostic_review'
    | 'notes'
    | 'targeted_practice'
    | 'readiness_check'
    | 'final_assessment'
    | 'mastery_result';
  diagnostic_session_id?: string;
  diagnostic_score?: number;
  diagnostic_total?: number;
  diagnostic_percentage?: number;
  diagnostic_questions?: any[];
  diagnostic_review?: any[];
  identified_weak_areas: TopicMasteryWeakArea[];
  personalized_notes?: TopicMasteryPersonalizedNotes;
  targeted_practice_session_id?: string;
  targeted_practice_questions?: any[];
  targeted_practice_review?: any[];
  targeted_practice_score?: number;
  targeted_practice_total?: number;
  readiness_confirmed: boolean;
  final_session_id?: string;
  final_questions?: any[];
  final_score?: number;
  final_total?: number;
  final_percentage?: number;
  final_review?: any[];
  is_mastered?: boolean;
  mastery_threshold: number;
  improvement_percentage?: number;
  next_recommended_concept?: {
    concept_id: string;
    concept_name: string;
    chapter: string;
    reason: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface MasteryCurriculumHierarchy {
  board: string;
  class_level: number;
  academic_year: string;
  stream?: string | null;
  version?: string;
  official_source_url?: string;
  verified?: boolean;
  last_verified_at?: string;
  is_complete?: boolean;
  subjects: Array<{
    subject_name: string;
    code?: string;
    units: Array<{
      unit_id: string;
      unit_number?: number;
      unit_name: string;
      chapters: Array<{
        chapter_id: string;
        chapter_number?: number;
        chapter_name: string;
        concepts: Array<{
          id: string;
          concept_name: string;
          subtopics: string[];
          difficulty: string;
          exam_importance: string;
          mastery_status: 'unattempted' | 'needs_practice' | 'mastered';
          score_percentage: number;
        }>;
      }>;
    }>;
  }>;
}

