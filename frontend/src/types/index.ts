export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: 'student' | 'admin';
}

export interface EducationProfile {
  user_id: string;
  board: string;
  class_level: 10 | 11 | 12;
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
