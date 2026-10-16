import { z } from 'zod';

// Registration
export const RegisterSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(120, 'Name must be under 120 characters'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Login
export const LoginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// Profile Update
export const ProfileUpdateSchema = z.object({
  full_name: z.string().trim().min(1).max(120).optional(),
  avatar_url: z.string().url().optional().nullable(),
});

// Education Profile Setup & Update
export const EducationProfileSchema = z.object({
  board: z.string().min(1, 'Education board is required'),
  class_level: z.union([z.literal(10), z.literal(11), z.literal(12), z.string().transform(Number)]).pipe(
    z.number().refine(n => [10, 11, 12].includes(n), { message: 'Class must be 10, 11, or 12' })
  ),
  academic_year: z.string().min(4, 'Academic year is required'),
  preferred_language: z.string().default('English'),
  subjects: z.array(z.string()).min(1, 'Please select at least one subject'),
  syllabus_file_path: z.string().optional().nullable(),
});

// Question Creation
export const CreateQuestionSchema = z.object({
  question_text: z.string().optional().nullable(),
  subject: z.string().min(1, 'Subject is required'),
  topic_id: z.string().uuid().optional().nullable(),
  chapter: z.string().optional().nullable(),
  language: z.string().default('English'),
  file_path: z.string().optional().nullable(),
  input_type: z.enum(['text', 'image', 'document', 'mixed']).default('text'),
}).refine(data => Boolean(data.question_text?.trim() || data.file_path), {
  message: 'Either question text or a document/image upload is required',
  path: ['question_text'],
});

// Follow-Up Question
export const FollowUpQuestionSchema = z.object({
  follow_up_text: z.string().trim().min(2, 'Follow-up question cannot be empty'),
});

// Practice Session Creation
export const CreatePracticeSessionSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  topic_id: z.string().uuid().optional().nullable(),
  question_count: z.number().int().min(1).max(20).default(5),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

// Practice Answer Submission
export const SubmitAnswerSchema = z.object({
  question_id: z.string().uuid(),
  submitted_answer: z.any(),
});

// Study Session Start
export const StartStudySessionSchema = z.object({
  activity_type: z.enum(['question', 'solution_review', 'practice', 'guidance', 'study_session']).default('study_session'),
  metadata: z.record(z.any()).optional(),
});

// Study Session Heartbeat
export const StudyHeartbeatSchema = z.object({
  active_seconds: z.number().min(1).max(120),
});

// Settings Update
export const UserSettingsSchema = z.object({
  notification_preferences: z.object({
    email: z.boolean().optional(),
    weak_topic_alerts: z.boolean().optional(),
    streak_reminders: z.boolean().optional(),
  }).optional(),
  privacy_preferences: z.object({
    allow_analytics: z.boolean().optional(),
    share_progress: z.boolean().optional(),
  }).optional(),
});

// Analytics Filter
export const AnalyticsFilterSchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'all', 'custom']).default('30d'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  subject: z.string().optional(),
});
