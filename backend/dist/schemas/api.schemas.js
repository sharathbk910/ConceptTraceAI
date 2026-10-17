"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsFilterSchema = exports.UserSettingsSchema = exports.StudyHeartbeatSchema = exports.StartStudySessionSchema = exports.SubmitAnswerSchema = exports.CreatePracticeSessionSchema = exports.FollowUpQuestionSchema = exports.CreateQuestionSchema = exports.EducationProfileSchema = exports.ProfileUpdateSchema = exports.ResetPasswordSchema = exports.ForgotPasswordSchema = exports.ResendVerificationSchema = exports.VerifyOtpSchema = exports.VerifyEmailSchema = exports.LoginSchema = exports.RegisterSchema = exports.StrictEmailSchema = void 0;
const zod_1 = require("zod");
exports.StrictEmailSchema = zod_1.z
    .string({ required_error: 'Email is required' })
    .trim()
    .min(1, 'Email address cannot be empty')
    .max(254, 'Email must be under 254 characters')
    .email('Invalid email address format')
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Email address must contain a valid domain extension (e.g. .com, .edu, .org, .in)')
    .toLowerCase();
// Registration
exports.RegisterSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(1, 'Full name is required').max(120, 'Name must be under 120 characters'),
    email: exports.StrictEmailSchema,
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: zod_1.z.string().min(6),
    termsAccepted: zod_1.z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});
// Login
exports.LoginSchema = zod_1.z.object({
    email: exports.StrictEmailSchema,
    password: zod_1.z.string().min(1, 'Password is required'),
});
// Email Verification
exports.VerifyEmailSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Verification code or token is required'),
    email: exports.StrictEmailSchema.optional(),
});
exports.VerifyOtpSchema = zod_1.z.object({
    email: exports.StrictEmailSchema,
    otp: zod_1.z.string().trim().regex(/^\d{6}$/, 'Verification code must be exactly 6 digits'),
});
exports.ResendVerificationSchema = zod_1.z.object({
    email: exports.StrictEmailSchema,
});
// Password Reset
exports.ForgotPasswordSchema = zod_1.z.object({
    email: exports.StrictEmailSchema,
});
exports.ResetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Reset token is required'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: zod_1.z.string().min(6, 'Please confirm your password'),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});
// Profile Update
exports.ProfileUpdateSchema = zod_1.z.object({
    full_name: zod_1.z.string().trim().min(1).max(120).optional(),
    avatar_url: zod_1.z.string().url().optional().nullable(),
});
// Education Profile Setup & Update
exports.EducationProfileSchema = zod_1.z.object({
    country: zod_1.z.string().default('India'),
    education_system: zod_1.z.string().optional().nullable(),
    state_or_ut: zod_1.z.string().optional().nullable(),
    board: zod_1.z.string().min(1, 'Education board is required'),
    class_level: zod_1.z.union([zod_1.z.literal(10), zod_1.z.literal(11), zod_1.z.literal(12), zod_1.z.string().transform(Number)]).pipe(zod_1.z.number().refine(n => [10, 11, 12].includes(n), { message: 'Class must be 10, 11, or 12' })),
    stream: zod_1.z.string().optional().nullable(),
    academic_year: zod_1.z.string().min(4, 'Academic year is required'),
    preferred_language: zod_1.z.string().default('English'),
    subjects: zod_1.z.array(zod_1.z.string()).min(1, 'Please select at least one subject'),
    syllabus_file_path: zod_1.z.string().optional().nullable(),
});
// Question Creation
exports.CreateQuestionSchema = zod_1.z.object({
    question_text: zod_1.z.string().optional().nullable(),
    subject: zod_1.z.string().default('Mathematics'),
    topic_id: zod_1.z.string().uuid().optional().nullable(),
    chapter: zod_1.z.string().optional().nullable(),
    language: zod_1.z.string().default('English'),
    class_level: zod_1.z.union([zod_1.z.literal(10), zod_1.z.literal(11), zod_1.z.literal(12), zod_1.z.string().transform(Number)]).pipe(zod_1.z.number().refine(n => [10, 11, 12].includes(n), { message: 'Class must be 10, 11, or 12' })).optional().nullable(),
    board: zod_1.z.string().optional().nullable(),
    file_path: zod_1.z.string().optional().nullable(),
    input_type: zod_1.z.enum(['text', 'image', 'document', 'mixed']).default('text'),
}).refine(data => Boolean(data.question_text?.trim() || data.file_path), {
    message: 'Either question text or a document/image upload is required',
    path: ['question_text'],
});
// Follow-Up Question
exports.FollowUpQuestionSchema = zod_1.z.object({
    follow_up_text: zod_1.z.string().trim().min(2, 'Follow-up question cannot be empty'),
});
// Practice Session Creation
exports.CreatePracticeSessionSchema = zod_1.z.object({
    subject: zod_1.z.string().min(1, 'Subject is required'),
    topic_id: zod_1.z.string().uuid().optional().nullable(),
    question_count: zod_1.z.number().int().min(1).max(20).default(5),
    difficulty: zod_1.z.enum(['easy', 'medium', 'hard']).default('medium'),
});
// Practice Answer Submission
exports.SubmitAnswerSchema = zod_1.z.object({
    question_id: zod_1.z.string().uuid(),
    submitted_answer: zod_1.z.any(),
});
// Study Session Start
exports.StartStudySessionSchema = zod_1.z.object({
    activity_type: zod_1.z.enum(['question', 'solution_review', 'practice', 'guidance', 'study_session']).default('study_session'),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
// Study Session Heartbeat
exports.StudyHeartbeatSchema = zod_1.z.object({
    active_seconds: zod_1.z.number().min(1).max(120),
});
// Settings Update
exports.UserSettingsSchema = zod_1.z.object({
    notification_preferences: zod_1.z.object({
        email: zod_1.z.boolean().optional(),
        weak_topic_alerts: zod_1.z.boolean().optional(),
        streak_reminders: zod_1.z.boolean().optional(),
    }).optional(),
    privacy_preferences: zod_1.z.object({
        allow_analytics: zod_1.z.boolean().optional(),
        share_progress: zod_1.z.boolean().optional(),
    }).optional(),
});
// Analytics Filter
exports.AnalyticsFilterSchema = zod_1.z.object({
    period: zod_1.z.enum(['7d', '30d', '90d', 'all', 'custom']).default('30d'),
    start_date: zod_1.z.string().optional(),
    end_date: zod_1.z.string().optional(),
    subject: zod_1.z.string().optional(),
});
