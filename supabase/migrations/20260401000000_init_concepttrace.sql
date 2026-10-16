-- ConceptTrace AI: Production PostgreSQL Schema Migration
-- Tagline: Learn • Improve • Succeed
-- Target: Classes 10, 11, 12 (CBSE, CISCE/ICSE/ISC, Karnataka State Board, NIOS, Other)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. User Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 120),
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Education Profiles
CREATE TABLE IF NOT EXISTS public.education_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    board TEXT NOT NULL,
    class_level SMALLINT NOT NULL CHECK (class_level IN (10, 11, 12)),
    academic_year TEXT NOT NULL,
    preferred_language TEXT NOT NULL DEFAULT 'English',
    syllabus_file_path TEXT,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Student Selected Subjects
CREATE TABLE IF NOT EXISTS public.student_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, subject_name)
);

-- 4. Syllabus Topics
CREATE TABLE IF NOT EXISTS public.syllabus_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board TEXT NOT NULL,
    class_level SMALLINT NOT NULL CHECK (class_level IN (10, 11, 12)),
    academic_year TEXT NOT NULL,
    subject TEXT NOT NULL,
    chapter TEXT,
    topic TEXT NOT NULL,
    description TEXT,
    source_status TEXT NOT NULL DEFAULT 'configured' CHECK (source_status IN ('configured', 'imported')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure uniqueness handling nullable chapter
CREATE UNIQUE INDEX IF NOT EXISTS idx_syllabus_unique_topic 
ON public.syllabus_topics(board, class_level, academic_year, subject, COALESCE(chapter, ''), topic);

-- 5. Topic Prerequisites
CREATE TABLE IF NOT EXISTS public.topic_prerequisites (
    topic_id UUID NOT NULL REFERENCES public.syllabus_topics(id) ON DELETE CASCADE,
    prerequisite_topic_id UUID NOT NULL REFERENCES public.syllabus_topics(id) ON DELETE CASCADE,
    PRIMARY KEY (topic_id, prerequisite_topic_id),
    CHECK (topic_id <> prerequisite_topic_id)
);

-- 6. Queries / Questions Asked
CREATE TABLE IF NOT EXISTS public.queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    input_type TEXT NOT NULL CHECK (input_type IN ('text', 'image', 'document', 'mixed')),
    question_text TEXT,
    extracted_text TEXT,
    file_path TEXT,
    subject TEXT,
    topic_id UUID REFERENCES public.syllabus_topics(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'needs_review', 'failed')),
    extraction_confidence NUMERIC(4,3) CHECK (extraction_confidence IS NULL OR (extraction_confidence BETWEEN 0 AND 1)),
    error_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (question_text IS NOT NULL OR file_path IS NOT NULL OR extracted_text IS NOT NULL)
);

-- 7. Solutions and AI Analysis
CREATE TABLE IF NOT EXISTS public.solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID NOT NULL UNIQUE REFERENCES public.queries(id) ON DELETE CASCADE,
    explanation TEXT NOT NULL,
    structured_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    final_answer TEXT,
    verification_status TEXT NOT NULL DEFAULT 'needs_review' CHECK (verification_status IN ('verified', 'partially_verified', 'needs_review')),
    verification_method TEXT,
    verification_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    concept_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
    possible_mistakes JSONB NOT NULL DEFAULT '[]'::jsonb,
    prerequisite_concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
    practice_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    uncertainty_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
    model_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Practice Sessions
CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    topic_id UUID REFERENCES public.syllabus_topics(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    question_count INTEGER NOT NULL DEFAULT 0 CHECK (question_count >= 0),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- 9. Practice Questions
CREATE TABLE IF NOT EXISTS public.practice_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.syllabus_topics(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'short_answer')),
    options JSONB,
    correct_answer JSONB NOT NULL,
    explanation TEXT,
    difficulty TEXT CHECK (difficulty IS NULL OR difficulty IN ('easy', 'medium', 'hard')),
    validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'needs_review')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Practice Attempts
CREATE TABLE IF NOT EXISTS public.practice_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.practice_questions(id) ON DELETE CASCADE,
    submitted_answer JSONB NOT NULL,
    is_correct BOOLEAN,
    eligible_for_metrics BOOLEAN NOT NULL DEFAULT false,
    feedback TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, question_id)
);

-- 11. Study Sessions (Study-Time Tracking)
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    tracked_seconds INTEGER NOT NULL DEFAULT 0 CHECK (tracked_seconds >= 0),
    session_status TEXT NOT NULL DEFAULT 'active' CHECK (session_status IN ('active', 'paused', 'completed', 'interrupted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- 12. Learning Activity (Feed & Heatmap Events)
CREATE TABLE IF NOT EXISTS public.learning_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('question', 'solution_review', 'practice', 'guidance', 'study_session')),
    query_id UUID REFERENCES public.queries(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.practice_sessions(id) ON DELETE SET NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 13. User Settings & Preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_preferences JSONB NOT NULL DEFAULT '{"email": true, "weak_topic_alerts": true, "streak_reminders": true}'::jsonb,
    privacy_preferences JSONB NOT NULL DEFAULT '{"allow_analytics": true, "share_progress": false}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_queries_user_created ON public.queries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queries_user_status ON public.queries(user_id, status);
CREATE INDEX IF NOT EXISTS idx_queries_topic ON public.queries(topic_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_lookup ON public.syllabus_topics(board, class_level, academic_year, subject);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user ON public.practice_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_user_date ON public.practice_attempts(user_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_question ON public.practice_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON public.study_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_activity_user_date ON public.learning_activity(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;

-- Automatic updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_education_profiles_updated_at ON public.education_profiles;
CREATE TRIGGER trg_education_profiles_updated_at BEFORE UPDATE ON public.education_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_queries_updated_at ON public.queries;
CREATE TRIGGER trg_queries_updated_at BEFORE UPDATE ON public.queries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Enablement
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_prerequisites ENABLE ROW LEVEL SECURITY;

-- Syllabus read access for all authenticated students
CREATE POLICY "Read syllabus topics" ON public.syllabus_topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read topic prerequisites" ON public.topic_prerequisites FOR SELECT TO authenticated USING (true);

-- User Isolation Policies
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Read own education profile" ON public.education_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Insert own education profile" ON public.education_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own education profile" ON public.education_profiles FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Manage own subjects" ON public.student_subjects FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Read own queries" ON public.queries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Create own queries" ON public.queries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Delete own queries" ON public.queries FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Read solutions for own queries" ON public.solutions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.queries q WHERE q.id = solutions.query_id AND q.user_id = auth.uid())
);

CREATE POLICY "Read own practice sessions" ON public.practice_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Create own practice sessions" ON public.practice_sessions FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Read questions in own sessions" ON public.practice_questions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.practice_sessions s WHERE s.id = practice_questions.session_id AND s.user_id = auth.uid())
);

CREATE POLICY "Read own attempts" ON public.practice_attempts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Insert own attempts" ON public.practice_attempts FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Read own study sessions" ON public.study_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Create own study sessions" ON public.study_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own study sessions" ON public.study_sessions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Read own learning activity" ON public.learning_activity FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Insert own learning activity" ON public.learning_activity FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Manage own settings" ON public.user_settings FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Read own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Initial Syllabus Topics Seeding for CBSE, CISCE, and Karnataka State Board (Classes 10, 11, 12)
INSERT INTO public.syllabus_topics (id, board, class_level, academic_year, subject, chapter, topic, description) VALUES
-- Class 10 CBSE Mathematics
('10000001-0000-0000-0000-000000000001', 'CBSE', 10, '2026-27', 'Mathematics', 'Real Numbers', 'Fundamental Theorem of Arithmetic', 'Prime factorization and proofs of irrationality of square roots.'),
('10000001-0000-0000-0000-000000000002', 'CBSE', 10, '2026-27', 'Mathematics', 'Polynomials', 'Zeroes of a Polynomial', 'Relationship between zeroes and coefficients of quadratic polynomials.'),
('10000001-0000-0000-0000-000000000003', 'CBSE', 10, '2026-27', 'Mathematics', 'Quadratic Equations', 'Solving by Factorization & Quadratic Formula', 'Roots of quadratic equations, discriminant, and nature of roots.'),
('10000001-0000-0000-0000-000000000004', 'CBSE', 10, '2026-27', 'Mathematics', 'Arithmetic Progressions', 'nth Term and Sum of AP', 'Common difference, general term formula, and sum of n terms.'),
('10000001-0000-0000-0000-000000000005', 'CBSE', 10, '2026-27', 'Mathematics', 'Trigonometry', 'Trigonometric Ratios & Identities', 'Values of trigonometric ratios, sin^2 + cos^2 = 1.'),
-- Class 10 CBSE Science
('10000001-0000-0000-0000-000000000006', 'CBSE', 10, '2026-27', 'Science', 'Chemical Reactions and Equations', 'Balancing Chemical Equations', 'Types of chemical reactions: combination, decomposition, displacement, redox.'),
('10000001-0000-0000-0000-000000000007', 'CBSE', 10, '2026-27', 'Science', 'Light - Reflection and Refraction', 'Lens Formula & Magnification', 'Spherical mirrors, refraction through lenses, power of lens.'),
('10000001-0000-0000-0000-000000000008', 'CBSE', 10, '2026-27', 'Science', 'Electricity', 'Ohms Law and Resistance in Series & Parallel', 'Electric potential, resistivity, combination of resistors, heating effects.'),
-- Class 11 CBSE Physics
('10000001-0000-0000-0000-000000000009', 'CBSE', 11, '2026-27', 'Physics', 'Kinematics', 'Equations of Motion with Constant Acceleration', 'v = u + at, s = ut + 0.5at^2, v^2 = u^2 + 2as, projectile motion.'),
('10000001-0000-0000-0000-000000000010', 'CBSE', 11, '2026-27', 'Physics', 'Laws of Motion', 'Newtons Laws & Free Body Diagrams', 'Inertia, momentum, F=ma, impulse, static and kinetic friction.'),
('10000001-0000-0000-0000-000000000011', 'CBSE', 11, '2026-27', 'Physics', 'Work, Energy and Power', 'Work-Energy Theorem & Conservation of Energy', 'Kinetic energy, potential energy of a spring, power.'),
-- Class 11 CBSE Chemistry
('10000001-0000-0000-0000-000000000012', 'CBSE', 11, '2026-27', 'Chemistry', 'Some Basic Concepts of Chemistry', 'Mole Concept & Stoichiometry', 'Molar mass, empirical and molecular formulas, limiting reagent.'),
('10000001-0000-0000-0000-000000000013', 'CBSE', 11, '2026-27', 'Chemistry', 'Structure of Atom', 'Bohrs Model & Quantum Numbers', 'Planck quantum theory, de Broglie relation, Heisenberg uncertainty, electronic configuration.'),
('10000001-0000-0000-0000-000000000014', 'CBSE', 11, '2026-27', 'Chemistry', 'Thermodynamics', 'First and Second Laws of Thermodynamics', 'Enthalpy, entropy, Gibbs free energy and spontaneity.'),
-- Class 12 CBSE Mathematics
('10000001-0000-0000-0000-000000000015', 'CBSE', 12, '2026-27', 'Mathematics', 'Continuity and Differentiability', 'Chain Rule & Derivative of Implicit Functions', 'Limits, continuity, differentiability, logarithmic differentiation.'),
('10000001-0000-0000-0000-000000000016', 'CBSE', 12, '2026-27', 'Mathematics', 'Integrals', 'Definite Integrals & Properties', 'Substitution, integration by parts, partial fractions, fundamental theorem of calculus.'),
('10000001-0000-0000-0000-000000000017', 'CBSE', 12, '2026-27', 'Mathematics', 'Differential Equations', 'Homogeneous & Linear Differential Equations', 'Order and degree, general and particular solutions, integrating factor.'),
-- Class 12 CBSE Physics
('10000001-0000-0000-0000-000000000018', 'CBSE', 12, '2026-27', 'Physics', 'Electric Charges and Fields', 'Gauss Law and Applications', 'Coulombs law, electric field lines, electric flux, Gauss theorem.'),
('10000001-0000-0000-0000-000000000019', 'CBSE', 12, '2026-27', 'Physics', 'Current Electricity', 'Kirchhoffs Rules & Wheatstone Bridge', 'Drift velocity, junction rule, loop rule, meter bridge calculations.'),
('10000001-0000-0000-0000-000000000020', 'CBSE', 12, '2026-27', 'Physics', 'Ray Optics and Optical Instruments', 'Total Internal Reflection & Prism Dispersion', 'Refraction at spherical surfaces, lens maker formula, microscope, telescope.')
ON CONFLICT DO NOTHING;

-- Prerequisites linking
INSERT INTO public.topic_prerequisites (topic_id, prerequisite_topic_id) VALUES
('10000001-0000-0000-0000-000000000003', '10000001-0000-0000-0000-000000000002'), -- Quadratic Equations depends on Polynomials
('10000001-0000-0000-0000-000000000010', '10000001-0000-0000-0000-000000000009'), -- Laws of Motion depends on Kinematics
('10000001-0000-0000-0000-000000000011', '10000001-0000-0000-0000-000000000010'), -- Work Energy depends on Laws of Motion
('10000001-0000-0000-0000-000000000016', '10000001-0000-0000-0000-000000000015'), -- Integrals depends on Differentiability
('10000001-0000-0000-0000-000000000017', '10000001-0000-0000-0000-000000000016'), -- Differential Equations depends on Integrals
('10000001-0000-0000-0000-000000000019', '10000001-0000-0000-0000-000000000008')  -- Kirchhoffs Rules depends on Ohm's Law
ON CONFLICT DO NOTHING;
