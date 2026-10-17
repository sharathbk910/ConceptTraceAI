import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env.js';

// Cryptographic Password Hashing & Verification
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch {
    return false;
  }
}

// Table Type Definitions
export interface Profile {
  id: string; // matches auth.users.id
  full_name: string;
  email: string;
  avatar_url?: string | null;
  role: 'student' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface UserAuthRecord {
  user_id: string;
  email: string;
  password_hash: string;
  salt: string;
  is_verified: boolean;
  verification_token?: string | null;
  verification_expires_at?: string | null;
  reset_token?: string | null;
  reset_expires_at?: string | null;
  created_at: string;
  updated_at: string;
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
  updated_at: string;
}

export interface StudentSubject {
  id: string;
  user_id: string;
  subject_name: string;
  created_at: string;
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
  source_status: 'configured' | 'imported' | 'official';
  created_at: string;
}

export interface TopicPrerequisite {
  topic_id: string;
  prerequisite_topic_id: string;
}

export interface QueryRecord {
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
  updated_at: string;
}

export interface SolutionRecord {
  id: string;
  query_id: string;
  explanation: string;
  structured_steps: Array<{
    step_number: number;
    title: string;
    content: string;
    reason: string;
  }>;
  final_answer?: string | null;
  verification_status: 'verified' | 'partially_verified' | 'needs_review';
  verification_method?: string | null;
  verification_details: any;
  concept_analysis: any;
  possible_mistakes: any;
  prerequisite_concepts: any;
  practice_questions: any;
  uncertainty_notes: string[];
  model_metadata: any;
  created_at: string;
}

export interface PracticeSessionRecord {
  id: string;
  user_id: string;
  subject: string;
  topic_id?: string | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  question_count: number;
  started_at: string;
  completed_at?: string | null;
}

export interface PracticeQuestionRecord {
  id: string;
  session_id: string;
  topic_id?: string | null;
  question_text: string;
  question_type: 'mcq' | 'short_answer';
  options?: string[] | null;
  correct_answer: any; // Kept secure on server
  explanation?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  validation_status: 'pending' | 'validated' | 'needs_review';
  created_at: string;
}

export interface PracticeAttemptRecord {
  id: string;
  user_id: string;
  session_id: string;
  question_id: string;
  submitted_answer: any;
  is_correct: boolean;
  eligible_for_metrics: boolean;
  feedback?: string | null;
  attempted_at: string;
}

export interface StudySessionRecord {
  id: string;
  user_id: string;
  started_at: string;
  last_active_at: string;
  ended_at?: string | null;
  tracked_seconds: number;
  session_status: 'active' | 'paused' | 'completed' | 'interrupted';
  created_at: string;
}

export interface LearningActivityRecord {
  id: string;
  user_id: string;
  activity_type: 'question' | 'solution_review' | 'practice' | 'guidance' | 'study_session';
  query_id?: string | null;
  session_id?: string | null;
  occurred_at: string;
  metadata: Record<string, any>;
}

export interface UserSettingsRecord {
  user_id: string;
  notification_preferences: {
    email?: boolean;
    weak_topic_alerts?: boolean;
    streak_reminders?: boolean;
  };
  privacy_preferences: {
    allow_analytics?: boolean;
    share_progress?: boolean;
  };
  updated_at: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read_at?: string | null;
  created_at: string;
}

// --- OFFICIAL SYLLABUS & ADAPTIVE LEARNING SCHEMAS ---
import {
  OfficialSyllabusRecord,
  findMatchingOfficialSyllabus,
  getOfficialSyllabusCatalog,
  filterSubjectsByStream,
} from '../syllabus/officialSyllabusData.js';

export { OfficialSyllabusRecord };

export interface SyllabusComparisonRecord {
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

export interface ConceptMasteryRecord {
  id: string;
  user_id: string;
  concept_id: string;
  concept_name: string;
  subject: string;
  chapter: string;
  status: 'unattempted' | 'needs_practice' | 'mastered';
  score_percentage: number;
  quizzes_attempted: number;
  mastery_threshold: number; // default 80
  identified_gaps: Array<{
    trap_identified: string;
    question_snippet: string;
    remediation_tip: string;
    occurred_at: string;
  }>;
  last_attempted_at: string;
  updated_at: string;
}

export interface ConceptRevisionNoteRecord {
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

export interface ConceptFlashcardRecord {
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

export interface UserLearningSettings {
  user_id: string;
  mastery_threshold_percentage: number;
  quiz_question_count: number;
  auto_recommend_next: boolean;
  updated_at: string;
}

export interface ConceptQuizSession {
  id: string;
  user_id: string;
  concept_id: string;
  concept_name: string;
  subject: string;
  chapter: string;
  questions: Array<{
    id: string;
    question_text: string;
    options: string[];
    correct_answer: string;
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
  status: 'in_progress' | 'submitted';
  score?: number;
  total_questions: number;
  created_at: string;
  submitted_at?: string;
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
  identified_weak_areas: Array<{
    concept: string;
    classification: 'demonstrated_understanding' | 'possible_weakness' | 'recurring_weakness' | 'insufficient_evidence';
    trap?: string;
    evidence: string;
  }>;
  personalized_notes?: {
    quick_summary: string;
    definitions: Array<{ term: string; explanation: string }>;
    formulas_and_principles: Array<{ title: string; latex: string; explanation: string }>;
    common_pitfalls: Array<{ mistake: string; correction: string; why: string }>;
    worked_examples: Array<{ problem: string; solution_steps: string[]; key_takeaway: string }>;
    memory_aids?: string[];
  };
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

interface DatabaseSchema {
  profiles: Profile[];
  user_auth: UserAuthRecord[];
  education_profiles: EducationProfile[];
  student_subjects: StudentSubject[];
  syllabus_topics: SyllabusTopic[];
  topic_prerequisites: TopicPrerequisite[];
  queries: QueryRecord[];
  solutions: SolutionRecord[];
  practice_sessions: PracticeSessionRecord[];
  practice_questions: PracticeQuestionRecord[];
  practice_attempts: PracticeAttemptRecord[];
  study_sessions: StudySessionRecord[];
  learning_activity: LearningActivityRecord[];
  user_settings: UserSettingsRecord[];
  notifications: NotificationRecord[];
  official_syllabuses: OfficialSyllabusRecord[];
  syllabus_comparisons: SyllabusComparisonRecord[];
  concept_mastery_records: ConceptMasteryRecord[];
  concept_revision_notes: ConceptRevisionNoteRecord[];
  concept_flashcards: ConceptFlashcardRecord[];
  user_learning_settings: UserLearningSettings[];
  concept_quiz_sessions: ConceptQuizSession[];
  topic_mastery_sessions: TopicMasteryWorkflowSession[];
}

export class DatabaseService {
  private static instance: DatabaseService;
  private dbPath: string;
  private data: DatabaseSchema;

  private constructor() {
    let dataDir = path.resolve(process.cwd(), 'data');
    if (process.env.VERCEL) {
      dataDir = '/tmp/data';
    }
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    } catch {
      dataDir = '/tmp';
    }
    this.dbPath = path.join(dataDir, 'concepttrace_db.json');

    // If dbPath does not exist, look for bundled seed candidates
    if (!fs.existsSync(this.dbPath)) {
      const seedCandidates = [
        path.resolve(process.cwd(), 'data/concepttrace_db.json'),
        path.resolve(process.cwd(), 'backend/data/concepttrace_db.json'),
        path.resolve(__dirname, '../../data/concepttrace_db.json'),
        path.resolve(__dirname, '../../../data/concepttrace_db.json'),
        path.resolve(__dirname, '../../backend/data/concepttrace_db.json'),
      ];
      for (const candidate of seedCandidates) {
        if (fs.existsSync(candidate)) {
          try {
            fs.copyFileSync(candidate, this.dbPath);
            break;
          } catch {
            // ignore
          }
        }
      }
    }

    this.data = this.loadDatabase();
    this.migrateLegacyUserIds();
    this.seedSyllabusIfNeeded();
    this.seedAuthIfNeeded();
    this.seedOfficialCurriculaIfNeeded();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private loadDatabase(): DatabaseSchema {
    if (!fs.existsSync(this.dbPath)) {
      const seedCandidates = [
        path.resolve(process.cwd(), 'data/concepttrace_db.json'),
        path.resolve(process.cwd(), 'backend/data/concepttrace_db.json'),
        path.resolve(__dirname, '../../data/concepttrace_db.json'),
        path.resolve(__dirname, '../../../data/concepttrace_db.json'),
        path.resolve(__dirname, '../../backend/data/concepttrace_db.json'),
      ];
      for (const candidate of seedCandidates) {
        if (fs.existsSync(candidate)) {
          try {
            const fileContent = fs.readFileSync(candidate, 'utf-8');
            return JSON.parse(fileContent);
          } catch {}
        }
      }
    }

    if (fs.existsSync(this.dbPath)) {
      try {
        const fileContent = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (!parsed.user_auth) parsed.user_auth = [];
        if (!parsed.official_syllabuses) parsed.official_syllabuses = [];
        if (!parsed.syllabus_comparisons) parsed.syllabus_comparisons = [];
        if (!parsed.concept_mastery_records) parsed.concept_mastery_records = [];
        if (!parsed.concept_revision_notes) parsed.concept_revision_notes = [];
        if (!parsed.concept_flashcards) parsed.concept_flashcards = [];
        if (!parsed.user_learning_settings) parsed.user_learning_settings = [];
        if (!parsed.concept_quiz_sessions) parsed.concept_quiz_sessions = [];
        if (!parsed.topic_mastery_sessions) parsed.topic_mastery_sessions = [];
        return parsed;
      } catch (e) {
        console.error('Failed to parse database file, initializing empty schema:', e);
      }
    }

    return {
      profiles: [],
      user_auth: [],
      education_profiles: [],
      student_subjects: [],
      syllabus_topics: [],
      topic_prerequisites: [],
      queries: [],
      solutions: [],
      practice_sessions: [],
      practice_questions: [],
      practice_attempts: [],
      study_sessions: [],
      learning_activity: [],
      user_settings: [],
      notifications: [],
      official_syllabuses: [],
      syllabus_comparisons: [],
      concept_mastery_records: [],
      concept_revision_notes: [],
      concept_flashcards: [],
      user_learning_settings: [],
      concept_quiz_sessions: [],
      topic_mastery_sessions: [],
    };
  }

  private saveDatabase(): void {
    try {
      const tempPath = `${this.dbPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.dbPath);
    } catch (err) {
      console.error('Database write error:', err);
    }
  }

  private migrateLegacyUserIds(): void {
    let changed = false;

    const extractJwtPayload = (str: string) => {
      try {
        if (!str || !str.startsWith('ey') || !str.includes('.')) return null;
        const parts = str.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          return {
            sub: payload.sub || payload.id,
            email: payload.email,
            full_name: payload.user_metadata?.full_name || payload.user_metadata?.name || payload.name,
            avatar_url: payload.user_metadata?.avatar_url || payload.user_metadata?.picture || payload.picture,
          };
        }
      } catch {}
      return null;
    };

    const reassignUserId = (oldId: string, newId: string) => {
      if (!oldId || !newId || oldId === newId) return;
      this.data.education_profiles.forEach(ep => { if (ep.user_id === oldId) ep.user_id = newId; });
      this.data.student_subjects.forEach(s => { if (s.user_id === oldId) s.user_id = newId; });
      this.data.queries.forEach(q => { if (q.user_id === oldId) q.user_id = newId; });
      this.data.practice_sessions.forEach(ps => { if (ps.user_id === oldId) ps.user_id = newId; });
      this.data.practice_attempts.forEach(pa => { if (pa.user_id === oldId) pa.user_id = newId; });
      this.data.study_sessions.forEach(ss => { if (ss.user_id === oldId) ss.user_id = newId; });
      this.data.learning_activity.forEach(la => { if (la.user_id === oldId) la.user_id = newId; });
      this.data.user_settings.forEach(us => { if (us.user_id === oldId) us.user_id = newId; });
      this.data.notifications.forEach(n => { if (n.user_id === oldId) n.user_id = newId; });
    };

    // 1. Process profiles with JWT IDs
    for (let i = this.data.profiles.length - 1; i >= 0; i--) {
      const p = this.data.profiles[i];
      const decoded = extractJwtPayload(p.id);
      if (decoded?.sub) {
        const stableSub = decoded.sub;
        const oldId = p.id;
        changed = true;

        const existing = this.data.profiles.find((other, idx) => idx !== i && other.id === stableSub);
        if (existing) {
          reassignUserId(oldId, stableSub);
          this.data.profiles.splice(i, 1);
        } else {
          const existingEmail = this.data.profiles.find((other, idx) => idx !== i && other.email.toLowerCase() === (decoded.email || p.email).toLowerCase());
          if (existingEmail) {
            existingEmail.id = stableSub;
            if (decoded.full_name) existingEmail.full_name = decoded.full_name;
            if (decoded.avatar_url) existingEmail.avatar_url = decoded.avatar_url;
            reassignUserId(oldId, stableSub);
            reassignUserId(existingEmail.id, stableSub);
            this.data.profiles.splice(i, 1);
          } else {
            p.id = stableSub;
            if (decoded.email) p.email = decoded.email.toLowerCase();
            if (decoded.full_name) p.full_name = decoded.full_name;
            if (decoded.avatar_url) p.avatar_url = decoded.avatar_url;
            reassignUserId(oldId, stableSub);
          }
        }
      }
    }

    // Clean any orphaned records across all tables that still have raw JWT strings as user_id
    const tablesWithUserId: Array<Array<{ user_id: string }>> = [
      this.data.education_profiles,
      this.data.student_subjects,
      this.data.queries,
      this.data.practice_sessions,
      this.data.practice_attempts,
      this.data.study_sessions,
      this.data.learning_activity,
      this.data.user_settings,
      this.data.notifications,
    ];

    tablesWithUserId.forEach(table => {
      table.forEach(item => {
        if (item.user_id && item.user_id.startsWith('ey')) {
          const dec = extractJwtPayload(item.user_id);
          if (dec?.sub) {
            item.user_id = dec.sub;
            changed = true;
          }
        }
      });
    });

    // 2. Deduplicate education_profiles: if multiple exist for same user_id, keep the completed/latest one
    const edMap = new Map<string, EducationProfile>();
    for (const ep of this.data.education_profiles) {
      const existing = edMap.get(ep.user_id);
      if (!existing) {
        edMap.set(ep.user_id, ep);
      } else {
        changed = true;
        if (ep.onboarding_completed && !existing.onboarding_completed) {
          edMap.set(ep.user_id, ep);
        } else if (new Date(ep.updated_at) > new Date(existing.updated_at)) {
          edMap.set(ep.user_id, {
            ...ep,
            onboarding_completed: existing.onboarding_completed || ep.onboarding_completed,
          });
        }
      }
    }
    if (this.data.education_profiles.length !== edMap.size) {
      this.data.education_profiles = Array.from(edMap.values());
      changed = true;
    }

    // 3. Deduplicate profiles by ID and ensure no duplicate accounts
    const profileMap = new Map<string, Profile>();
    for (const p of this.data.profiles) {
      const existing = profileMap.get(p.id);
      if (!existing) {
        profileMap.set(p.id, p);
      } else {
        changed = true;
        if (!p.email.startsWith('student_') && existing.email.startsWith('student_')) {
          profileMap.set(p.id, p);
        } else if (new Date(p.updated_at) > new Date(existing.updated_at)) {
          profileMap.set(p.id, p);
        }
      }
    }
    if (this.data.profiles.length !== profileMap.size) {
      this.data.profiles = Array.from(profileMap.values());
      changed = true;
    }

    // 4. Deduplicate user_auth
    const authMap = new Map<string, UserAuthRecord>();
    for (const a of this.data.user_auth) {
      const existing = authMap.get(a.email.toLowerCase());
      if (!existing) {
        authMap.set(a.email.toLowerCase(), a);
      } else {
        changed = true;
        if (a.is_verified && !existing.is_verified) {
          authMap.set(a.email.toLowerCase(), a);
        }
      }
    }
    if (this.data.user_auth.length !== authMap.size) {
      this.data.user_auth = Array.from(authMap.values());
      changed = true;
    }

    if (changed) {
      this.saveDatabase();
    }
  }

  private seedSyllabusIfNeeded(): void {
    const initialTopics: SyllabusTopic[] = [
      // Class 10 CBSE
      {
        id: '10000001-0000-0000-0000-000000000001',
        board: 'CBSE',
        class_level: 10,
        academic_year: '2026-27',
        subject: 'Mathematics',
        chapter: 'Real Numbers',
        topic: 'Fundamental Theorem of Arithmetic',
        description: 'Prime factorization and proofs of irrationality of square roots.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      {
        id: '10000001-0000-0000-0000-000000000002',
        board: 'CBSE',
        class_level: 10,
        academic_year: '2026-27',
        subject: 'Mathematics',
        chapter: 'Polynomials',
        topic: 'Zeroes of a Polynomial',
        description: 'Relationship between zeroes and coefficients of quadratic polynomials.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      {
        id: '10000001-0000-0000-0000-000000000003',
        board: 'CBSE',
        class_level: 10,
        academic_year: '2026-27',
        subject: 'Mathematics',
        chapter: 'Quadratic Equations',
        topic: 'Solving by Factorization & Quadratic Formula',
        description: 'Roots of quadratic equations, discriminant, and nature of roots.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      {
        id: '10000001-0000-0000-0000-000000000004',
        board: 'CBSE',
        class_level: 10,
        academic_year: '2026-27',
        subject: 'Mathematics',
        chapter: 'Arithmetic Progressions',
        topic: 'nth Term and Sum of AP',
        description: 'Common difference, general term formula, and sum of n terms.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      {
        id: '10000001-0000-0000-0000-000000000005',
        board: 'CBSE',
        class_level: 10,
        academic_year: '2026-27',
        subject: 'Mathematics',
        chapter: 'Trigonometry',
        topic: 'Trigonometric Ratios & Identities',
        description: 'Values of trigonometric ratios, sin^2 + cos^2 = 1.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      {
        id: '10000001-0000-0000-0000-000000000006',
        board: 'CBSE',
        class_level: 10,
        academic_year: '2026-27',
        subject: 'Science',
        chapter: 'Chemical Reactions and Equations',
        topic: 'Balancing Chemical Equations',
        description: 'Types of chemical reactions: combination, decomposition, displacement, redox.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      {
        id: '10000001-0000-0000-0000-000000000007',
        board: 'CBSE',
        class_level: 10,
        academic_year: '2026-27',
        subject: 'Science',
        chapter: 'Light - Reflection and Refraction',
        topic: 'Lens Formula & Magnification',
        description: 'Spherical mirrors, refraction through lenses, power of lens.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      {
        id: '10000001-0000-0000-0000-000000000008',
        board: 'CBSE',
        class_level: 10,
        academic_year: '2026-27',
        subject: 'Science',
        chapter: 'Electricity',
        topic: 'Ohms Law and Resistance in Series & Parallel',
        description: 'Electric potential, resistivity, combination of resistors, heating effects.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      // Class 11 CBSE Physics
      {
        id: '10000001-0000-0000-0000-000000000009',
        board: 'CBSE',
        class_level: 11,
        academic_year: '2026-27',
        subject: 'Physics',
        chapter: 'Kinematics',
        topic: 'Equations of Motion with Constant Acceleration',
        description: 'v = u + at, s = ut + 0.5at^2, v^2 = u^2 + 2as, projectile motion.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      {
        id: '10000001-0000-0000-0000-000000000010',
        board: 'CBSE',
        class_level: 11,
        academic_year: '2026-27',
        subject: 'Physics',
        chapter: 'Laws of Motion',
        topic: 'Newtons Laws & Free Body Diagrams',
        description: 'Inertia, momentum, F=ma, impulse, static and kinetic friction.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      {
        id: '10000001-0000-0000-0000-000000000011',
        board: 'CBSE',
        class_level: 11,
        academic_year: '2026-27',
        subject: 'Physics',
        chapter: 'Work, Energy and Power',
        topic: 'Work-Energy Theorem & Conservation of Energy',
        description: 'Kinetic energy, potential energy of a spring, power.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      // Class 11 CBSE Chemistry
      {
        id: '10000001-0000-0000-0000-000000000012',
        board: 'CBSE',
        class_level: 11,
        academic_year: '2026-27',
        subject: 'Chemistry',
        chapter: 'Some Basic Concepts of Chemistry',
        topic: 'Mole Concept & Stoichiometry',
        description: 'Molar mass, empirical and molecular formulas, limiting reagent.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      {
        id: '10000001-0000-0000-0000-000000000013',
        board: 'CBSE',
        class_level: 11,
        academic_year: '2026-27',
        subject: 'Chemistry',
        chapter: 'Structure of Atom',
        topic: 'Bohrs Model & Quantum Numbers',
        description: 'Planck quantum theory, de Broglie relation, Heisenberg uncertainty.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      // Class 12 CBSE Mathematics
      {
        id: '10000001-0000-0000-0000-000000000015',
        board: 'CBSE',
        class_level: 12,
        academic_year: '2026-27',
        subject: 'Mathematics',
        chapter: 'Continuity and Differentiability',
        topic: 'Chain Rule & Derivative of Implicit Functions',
        description: 'Limits, continuity, differentiability, logarithmic differentiation.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      {
        id: '10000001-0000-0000-0000-000000000016',
        board: 'CBSE',
        class_level: 12,
        academic_year: '2026-27',
        subject: 'Mathematics',
        chapter: 'Integrals',
        topic: 'Definite Integrals & Properties',
        description: 'Substitution, integration by parts, partial fractions.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      {
        id: '10000001-0000-0000-0000-000000000017',
        board: 'CBSE',
        class_level: 12,
        academic_year: '2026-27',
        subject: 'Mathematics',
        chapter: 'Differential Equations',
        topic: 'Homogeneous & Linear Differential Equations',
        description: 'Order and degree, general and particular solutions, integrating factor.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      // Class 12 CBSE Physics
      {
        id: '10000001-0000-0000-0000-000000000018',
        board: 'CBSE',
        class_level: 12,
        academic_year: '2026-27',
        subject: 'Physics',
        chapter: 'Electric Charges and Fields',
        topic: 'Gauss Law and Applications',
        description: 'Coulombs law, electric field lines, electric flux, Gauss theorem.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      {
        id: '10000001-0000-0000-0000-000000000019',
        board: 'CBSE',
        class_level: 12,
        academic_year: '2026-27',
        subject: 'Physics',
        chapter: 'Current Electricity',
        topic: 'Kirchhoffs Rules & Wheatstone Bridge',
        description: 'Drift velocity, junction rule, loop rule, meter bridge calculations.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
      {
        id: '10000001-0000-0000-0000-000000000020',
        board: 'CBSE',
        class_level: 12,
        academic_year: '2026-27',
        subject: 'Physics',
        chapter: 'Ray Optics and Optical Instruments',
        topic: 'Total Internal Reflection & Prism Dispersion',
        description: 'Refraction at spherical surfaces, lens maker formula, microscope, telescope.',
        source_status: 'configured',
        created_at: new Date().toISOString(),
      },
    ];

    const initialPrereqs: TopicPrerequisite[] = [
      { topic_id: '10000001-0000-0000-0000-000000000003', prerequisite_topic_id: '10000001-0000-0000-0000-000000000002' },
      { topic_id: '10000001-0000-0000-0000-000000000010', prerequisite_topic_id: '10000001-0000-0000-0000-000000000009' },
      { topic_id: '10000001-0000-0000-0000-000000000011', prerequisite_topic_id: '10000001-0000-0000-0000-000000000010' },
      { topic_id: '10000001-0000-0000-0000-000000000016', prerequisite_topic_id: '10000001-0000-0000-0000-000000000015' },
      { topic_id: '10000001-0000-0000-0000-000000000017', prerequisite_topic_id: '10000001-0000-0000-0000-000000000016' },
      { topic_id: '10000001-0000-0000-0000-000000000019', prerequisite_topic_id: '10000001-0000-0000-0000-000000000008' },
    ];

    if (this.data.syllabus_topics.length === 0) {
      this.data.syllabus_topics = initialTopics;
      this.data.topic_prerequisites = initialPrereqs;
    }

    // Sync all concepts from comprehensive official syllabus catalog into syllabus_topics
    const catalog = getOfficialSyllabusCatalog();
    let topicsAdded = false;

    for (const syl of catalog) {
      for (const s of syl.subjects) {
        for (const u of s.units) {
          for (const c of u.chapters) {
            for (const con of c.concepts) {
              const exists = this.data.syllabus_topics.some(
                t => t.id === con.id || (t.topic.toLowerCase() === con.concept_name.toLowerCase() && t.class_level === syl.class_level)
              );
              if (!exists) {
                this.data.syllabus_topics.push({
                  id: con.id,
                  board: syl.board,
                  class_level: syl.class_level,
                  academic_year: syl.academic_year,
                  subject: s.subject_name,
                  chapter: c.chapter_name,
                  topic: con.concept_name,
                  description: con.subtopics.join(', '),
                  source_status: 'official',
                  created_at: new Date().toISOString(),
                });
                topicsAdded = true;
              }
            }
          }
        }
      }
    }

    if (topicsAdded || this.data.syllabus_topics.length === initialTopics.length) {
      this.saveDatabase();
    }
  }

  private seedAuthIfNeeded(): void {
    let changed = false;
    for (const profile of this.data.profiles) {
      if (!this.data.user_auth.some(u => u.email.toLowerCase() === profile.email.toLowerCase())) {
        const { hash, salt } = hashPassword('Password123!');
        this.data.user_auth.push({
          user_id: profile.id,
          email: profile.email.toLowerCase(),
          password_hash: hash,
          salt,
          is_verified: true,
          verification_token: null,
          verification_expires_at: null,
          reset_token: null,
          reset_expires_at: null,
          created_at: profile.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        changed = true;
      }
    }
    if (changed) {
      this.saveDatabase();
    }
  }

  // --- PROFILES ---
  public getProfileById(userId: string): Profile | undefined {
    return this.data.profiles.find(p => p.id === userId);
  }

  public getProfileByEmail(email: string): Profile | undefined {
    return this.data.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
  }

  public createProfile(profile: Omit<Profile, 'created_at' | 'updated_at'>): Profile {
    const now = new Date().toISOString();
    const existing = this.getProfileById(profile.id);
    if (existing) {
      existing.email = profile.email;
      existing.full_name = profile.full_name;
      existing.role = profile.role;
      existing.updated_at = now;
      this.saveDatabase();
      return existing;
    }

    const newProfile: Profile = {
      ...profile,
      created_at: now,
      updated_at: now,
    };
    this.data.profiles.push(newProfile);

    // Also initialize default user settings
    this.data.user_settings.push({
      user_id: newProfile.id,
      notification_preferences: { email: true, weak_topic_alerts: true, streak_reminders: true },
      privacy_preferences: { allow_analytics: true, share_progress: false },
      updated_at: now,
    });

    this.saveDatabase();
    return newProfile;
  }

  public updateProfile(userId: string, updates: Partial<Profile>): Profile | undefined {
    const profile = this.getProfileById(userId);
    if (!profile) return undefined;
    Object.assign(profile, updates, { updated_at: new Date().toISOString() });
    this.saveDatabase();
    return profile;
  }

  public findOrCreateProfile(params: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string | null;
    role?: 'student' | 'admin';
  }): Profile {
    const emailNorm = params.email.trim().toLowerCase();

    // 1. Try to find by stable ID
    let profile = this.getProfileById(params.id);
    if (profile) {
      let updated = false;
      if (params.full_name && (!profile.full_name || profile.full_name === 'Student User')) {
        profile.full_name = params.full_name;
        updated = true;
      }
      if (params.avatar_url && !profile.avatar_url) {
        profile.avatar_url = params.avatar_url;
        updated = true;
      }
      // Never overwrite a verified email with an auto-generated fallback email
      if (emailNorm && !emailNorm.startsWith('student_') && profile.email.toLowerCase() !== emailNorm) {
        profile.email = emailNorm;
        updated = true;
      }
      if (updated) {
        profile.updated_at = new Date().toISOString();
        this.saveDatabase();
      }
      return profile;
    }

    // 2. Try to find by email
    const existingByEmail = this.getProfileByEmail(emailNorm);
    if (existingByEmail) {
      const oldId = existingByEmail.id;
      existingByEmail.id = params.id;
      if (params.full_name && (!existingByEmail.full_name || existingByEmail.full_name === 'Student User')) {
        existingByEmail.full_name = params.full_name;
      }
      if (params.avatar_url) {
        existingByEmail.avatar_url = params.avatar_url;
      }
      existingByEmail.updated_at = new Date().toISOString();

      // Re-point all associated user data to new stable ID
      if (oldId !== params.id) {
        this.data.education_profiles.forEach(ep => { if (ep.user_id === oldId) ep.user_id = params.id; });
        this.data.student_subjects.forEach(s => { if (s.user_id === oldId) s.user_id = params.id; });
        this.data.queries.forEach(q => { if (q.user_id === oldId) q.user_id = params.id; });
        this.data.practice_sessions.forEach(ps => { if (ps.user_id === oldId) ps.user_id = params.id; });
        this.data.practice_attempts.forEach(pa => { if (pa.user_id === oldId) pa.user_id = params.id; });
        this.data.study_sessions.forEach(ss => { if (ss.user_id === oldId) ss.user_id = params.id; });
        this.data.learning_activity.forEach(la => { if (la.user_id === oldId) la.user_id = params.id; });
        this.data.user_settings.forEach(us => { if (us.user_id === oldId) us.user_id = params.id; });
        this.data.notifications.forEach(n => { if (n.user_id === oldId) n.user_id = params.id; });
      }

      this.saveDatabase();
      return existingByEmail;
    }

    // 3. Neither ID nor email found -> create brand new profile
    return this.createProfile({
      id: params.id,
      email: emailNorm,
      full_name: params.full_name || emailNorm.split('@')[0],
      avatar_url: params.avatar_url,
      role: params.role || 'student',
    });
  }

  // --- USER AUTHENTICATION & CREDENTIALS ---
  public getUserAuthByEmail(email: string): UserAuthRecord | undefined {
    const emailNorm = email.trim().toLowerCase();
    return this.data.user_auth.find(u => u.email.toLowerCase() === emailNorm);
  }

  public getUserAuthById(userId: string): UserAuthRecord | undefined {
    return this.data.user_auth.find(u => u.user_id === userId);
  }

  public getUserAuthByVerificationToken(token: string): UserAuthRecord | undefined {
    if (!token) return undefined;
    return this.data.user_auth.find(u => u.verification_token === token);
  }

  public getUserAuthByEmailAndOtp(email: string, otp: string): UserAuthRecord | undefined {
    if (!email || !otp) return undefined;
    const emailNorm = email.trim().toLowerCase();
    const cleanOtp = otp.trim();
    return this.data.user_auth.find(
      u => u.email.toLowerCase() === emailNorm && u.verification_token === cleanOtp
    );
  }

  public getUserAuthByResetToken(token: string): UserAuthRecord | undefined {
    if (!token) return undefined;
    return this.data.user_auth.find(u => u.reset_token === token);
  }

  public createUserAuth(record: Omit<UserAuthRecord, 'created_at' | 'updated_at'>): UserAuthRecord {
    const now = new Date().toISOString();
    const existing = this.getUserAuthByEmail(record.email);
    if (existing) {
      Object.assign(existing, record, { updated_at: now });
      this.saveDatabase();
      return existing;
    }

    const newRecord: UserAuthRecord = {
      ...record,
      email: record.email.trim().toLowerCase(),
      created_at: now,
      updated_at: now,
    };
    this.data.user_auth.push(newRecord);
    this.saveDatabase();
    return newRecord;
  }

  public updateUserAuth(userId: string, updates: Partial<UserAuthRecord>): UserAuthRecord | undefined {
    const authRecord = this.getUserAuthById(userId);
    if (!authRecord) return undefined;
    Object.assign(authRecord, updates, { updated_at: new Date().toISOString() });
    this.saveDatabase();
    return authRecord;
  }

  // --- EDUCATION PROFILES ---
  public getEducationProfile(userId: string): EducationProfile | undefined {
    let ep = this.data.education_profiles.find(e => e.user_id === userId);
    if (!ep) {
      // Fallback: check if the user profile has an email that had an education profile under another id
      const profile = this.getProfileById(userId);
      if (profile?.email) {
        const emailNorm = profile.email.toLowerCase();
        const profilesWithSameEmail = this.data.profiles.filter(p => p.email.toLowerCase() === emailNorm);
        for (const mp of profilesWithSameEmail) {
          const candidate = this.data.education_profiles.find(e => e.user_id === mp.id);
          if (candidate) {
            candidate.user_id = userId;
            candidate.updated_at = new Date().toISOString();
            this.saveDatabase();
            return candidate;
          }
        }
      }
    }
    return ep;
  }

  public upsertEducationProfile(educationProfile: Omit<EducationProfile, 'updated_at'>): EducationProfile {
    const now = new Date().toISOString();
    const existingIndex = this.data.education_profiles.findIndex(ep => ep.user_id === educationProfile.user_id);
    const existing = existingIndex >= 0 ? this.data.education_profiles[existingIndex] : null;

    const newRecord: EducationProfile = {
      country: existing?.country || 'India',
      education_system: existing?.education_system || undefined,
      state_or_ut: existing?.state_or_ut || undefined,
      stream: existing?.stream || undefined,
      syllabus_file_path: existing?.syllabus_file_path || undefined,
      ...existing,
      ...educationProfile,
      updated_at: now,
    };

    if (existingIndex >= 0) {
      this.data.education_profiles[existingIndex] = newRecord;
    } else {
      this.data.education_profiles.push(newRecord);
    }
    this.saveDatabase();
    return newRecord;
  }

  // --- STUDENT SUBJECTS ---
  public getStudentSubjects(userId: string): StudentSubject[] {
    return this.data.student_subjects.filter(s => s.user_id === userId);
  }

  public setStudentSubjects(userId: string, subjects: string[]): StudentSubject[] {
    const now = new Date().toISOString();
    // Remove existing
    this.data.student_subjects = this.data.student_subjects.filter(s => s.user_id !== userId);
    // Add new
    const newSubjects: StudentSubject[] = subjects.map(sub => ({
      id: uuidv4(),
      user_id: userId,
      subject_name: sub,
      created_at: now,
    }));
    this.data.student_subjects.push(...newSubjects);
    this.saveDatabase();
    return newSubjects;
  }

  // --- SYLLABUS TOPICS ---
  public getSyllabusTopics(filter?: { board?: string; class_level?: number; subject?: string }): SyllabusTopic[] {
    return this.data.syllabus_topics.filter(t => {
      if (filter?.board && t.board.toLowerCase() !== filter.board.toLowerCase()) return false;
      if (filter?.class_level && t.class_level !== filter.class_level) return false;
      if (filter?.subject && t.subject.toLowerCase() !== filter.subject.toLowerCase()) return false;
      return true;
    });
  }

  public getSyllabusTopicById(topicId: string): SyllabusTopic | undefined {
    return this.data.syllabus_topics.find(t => t.id === topicId);
  }

  public getTopicPrerequisites(topicId: string): SyllabusTopic[] {
    const prereqIds = this.data.topic_prerequisites
      .filter(p => p.topic_id === topicId)
      .map(p => p.prerequisite_topic_id);
    return this.data.syllabus_topics.filter(t => prereqIds.includes(t.id));
  }

  // --- QUERIES & SOLUTIONS ---
  public createQuery(record: Omit<QueryRecord, 'id' | 'created_at' | 'updated_at'>): QueryRecord {
    const now = new Date().toISOString();
    const query: QueryRecord = {
      ...record,
      id: uuidv4(),
      created_at: now,
      updated_at: now,
    };
    this.data.queries.push(query);
    this.saveDatabase();
    return query;
  }

  public updateQuery(queryId: string, updates: Partial<QueryRecord>): QueryRecord | undefined {
    const query = this.data.queries.find(q => q.id === queryId);
    if (!query) return undefined;
    Object.assign(query, updates, { updated_at: new Date().toISOString() });
    this.saveDatabase();
    return query;
  }

  public getQueryById(queryId: string, userId: string): QueryRecord | undefined {
    return this.data.queries.find(q => q.id === queryId && q.user_id === userId);
  }

  public listUserQueries(
    userId: string,
    filters?: { subject?: string; status?: string; search?: string }
  ): QueryRecord[] {
    return this.data.queries
      .filter(q => {
        if (q.user_id !== userId) return false;
        if (filters?.subject && q.subject?.toLowerCase() !== filters.subject.toLowerCase()) return false;
        if (filters?.status && q.status !== filters.status) return false;
        if (filters?.search) {
          const s = filters.search.toLowerCase();
          const matchText = (q.question_text || '').toLowerCase().includes(s);
          const matchExtracted = (q.extracted_text || '').toLowerCase().includes(s);
          const matchSubject = (q.subject || '').toLowerCase().includes(s);
          if (!matchText && !matchExtracted && !matchSubject) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public deleteQuery(queryId: string, userId: string): boolean {
    const index = this.data.queries.findIndex(q => q.id === queryId && q.user_id === userId);
    if (index === -1) return false;
    this.data.queries.splice(index, 1);
    // Cascade delete solution
    this.data.solutions = this.data.solutions.filter(s => s.query_id !== queryId);
    this.saveDatabase();
    return true;
  }

  public createSolution(solution: Omit<SolutionRecord, 'id' | 'created_at'>): SolutionRecord {
    const record: SolutionRecord = {
      ...solution,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
    this.data.solutions.push(record);
    this.saveDatabase();
    return record;
  }

  public getSolutionByQueryId(queryId: string): SolutionRecord | undefined {
    return this.data.solutions.find(s => s.query_id === queryId);
  }

  // --- PRACTICE SESSIONS & QUESTIONS ---
  public createPracticeSession(record: Omit<PracticeSessionRecord, 'id' | 'started_at'>): PracticeSessionRecord {
    const session: PracticeSessionRecord = {
      ...record,
      id: uuidv4(),
      started_at: new Date().toISOString(),
    };
    this.data.practice_sessions.push(session);
    this.saveDatabase();
    return session;
  }

  public getPracticeSession(sessionId: string, userId: string): PracticeSessionRecord | undefined {
    return this.data.practice_sessions.find(s => s.id === sessionId && s.user_id === userId);
  }

  public updatePracticeSession(
    sessionId: string,
    updates: Partial<PracticeSessionRecord>
  ): PracticeSessionRecord | undefined {
    const session = this.data.practice_sessions.find(s => s.id === sessionId);
    if (!session) return undefined;
    Object.assign(session, updates);
    this.saveDatabase();
    return session;
  }

  public listUserPracticeSessions(userId: string): PracticeSessionRecord[] {
    return this.data.practice_sessions
      .filter(s => s.user_id === userId)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }

  public createPracticeQuestions(
    questions: Array<Omit<PracticeQuestionRecord, 'id' | 'created_at'>>
  ): PracticeQuestionRecord[] {
    const now = new Date().toISOString();
    const created: PracticeQuestionRecord[] = questions.map(q => ({
      ...q,
      id: uuidv4(),
      created_at: now,
    }));
    this.data.practice_questions.push(...created);
    this.saveDatabase();
    return created;
  }

  public getPracticeQuestionsForSession(sessionId: string): PracticeQuestionRecord[] {
    return this.data.practice_questions.filter(q => q.session_id === sessionId);
  }

  public getPracticeQuestionById(questionId: string): PracticeQuestionRecord | undefined {
    return this.data.practice_questions.find(q => q.id === questionId);
  }

  // --- PRACTICE ATTEMPTS ---
  public createPracticeAttempt(
    record: Omit<PracticeAttemptRecord, 'id' | 'attempted_at'>
  ): PracticeAttemptRecord {
    const existing = this.data.practice_attempts.find(
      a => a.session_id === record.session_id && a.question_id === record.question_id
    );
    if (existing) {
      throw new Error('DUPLICATE_ATTEMPT: Answer already submitted for this question in this session');
    }

    const attempt: PracticeAttemptRecord = {
      ...record,
      id: uuidv4(),
      attempted_at: new Date().toISOString(),
    };
    this.data.practice_attempts.push(attempt);
    this.saveDatabase();
    return attempt;
  }

  public getAttemptsForSession(sessionId: string, userId: string): PracticeAttemptRecord[] {
    return this.data.practice_attempts.filter(a => a.session_id === sessionId && a.user_id === userId);
  }

  public getAllEligibleAttempts(userId: string): PracticeAttemptRecord[] {
    return this.data.practice_attempts.filter(a => a.user_id === userId && a.eligible_for_metrics);
  }

  // --- STUDY SESSIONS ---
  public createStudySession(userId: string): StudySessionRecord {
    const now = new Date().toISOString();
    // Mark any previously active session as interrupted
    this.data.study_sessions
      .filter(s => s.user_id === userId && s.session_status === 'active')
      .forEach(s => {
        s.session_status = 'interrupted';
        s.ended_at = now;
      });

    const session: StudySessionRecord = {
      id: uuidv4(),
      user_id: userId,
      started_at: now,
      last_active_at: now,
      tracked_seconds: 0,
      session_status: 'active',
      created_at: now,
    };
    this.data.study_sessions.push(session);
    this.saveDatabase();
    return session;
  }

  public getActiveStudySession(userId: string): StudySessionRecord | undefined {
    return this.data.study_sessions.find(s => s.user_id === userId && s.session_status === 'active');
  }

  public getStudySessionById(sessionId: string, userId: string): StudySessionRecord | undefined {
    return this.data.study_sessions.find(s => s.id === sessionId && s.user_id === userId);
  }

  public updateStudySession(
    sessionId: string,
    updates: Partial<StudySessionRecord>
  ): StudySessionRecord | undefined {
    const session = this.data.study_sessions.find(s => s.id === sessionId);
    if (!session) return undefined;
    Object.assign(session, updates);
    this.saveDatabase();
    return session;
  }

  public getUserStudySessions(userId: string): StudySessionRecord[] {
    return this.data.study_sessions
      .filter(s => s.user_id === userId)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }

  // --- LEARNING ACTIVITY ---
  public recordActivity(
    record: Omit<LearningActivityRecord, 'id' | 'occurred_at'>
  ): LearningActivityRecord {
    const activity: LearningActivityRecord = {
      ...record,
      id: uuidv4(),
      occurred_at: new Date().toISOString(),
    };
    this.data.learning_activity.push(activity);
    this.saveDatabase();
    return activity;
  }

  public getUserActivities(userId: string, limit = 20): LearningActivityRecord[] {
    return this.data.learning_activity
      .filter(a => a.user_id === userId)
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
      .slice(0, limit);
  }

  // --- USER SETTINGS ---
  public getUserSettings(userId: string): UserSettingsRecord | undefined {
    return this.data.user_settings.find(s => s.user_id === userId);
  }

  public updateUserSettings(
    userId: string,
    updates: Partial<UserSettingsRecord>
  ): UserSettingsRecord {
    let settings = this.getUserSettings(userId);
    const now = new Date().toISOString();
    if (!settings) {
      settings = {
        user_id: userId,
        notification_preferences: { email: true, weak_topic_alerts: true, streak_reminders: true },
        privacy_preferences: { allow_analytics: true, share_progress: false },
        updated_at: now,
      };
      this.data.user_settings.push(settings);
    }
    Object.assign(settings, updates, { updated_at: now });
    this.saveDatabase();
    return settings;
  }

  // --- NOTIFICATIONS ---
  public getUserNotifications(userId: string): NotificationRecord[] {
    return this.data.notifications
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createNotification(userId: string, title: string, message: string): NotificationRecord {
    const notif: NotificationRecord = {
      id: uuidv4(),
      user_id: userId,
      title,
      message,
      created_at: new Date().toISOString(),
    };
    this.data.notifications.push(notif);
    this.saveDatabase();
    return notif;
  }

  public markNotificationAsRead(notifId: string, userId: string): boolean {
    const notif = this.data.notifications.find(n => n.id === notifId && n.user_id === userId);
    if (!notif) return false;
    notif.read_at = new Date().toISOString();
    this.saveDatabase();
    return true;
  }

  // --- OFFICIAL SYLLABUS CATALOG & VERIFICATION ---
  private seedOfficialCurriculaIfNeeded(): void {
    if (!this.data.official_syllabuses) {
      this.data.official_syllabuses = [];
    }
    const catalog = getOfficialSyllabusCatalog();
    let updated = false;

    for (const catSyllabus of catalog) {
      const idx = this.data.official_syllabuses.findIndex(s => s.id === catSyllabus.id);
      if (idx >= 0) {
        const existing = this.data.official_syllabuses[idx];
        const existingSubjects = existing.subjects || [];
        const existingConcepts = existingSubjects.reduce(
          (acc, sub) => acc + (sub.units || []).reduce((uAcc, u) => uAcc + (u.chapters || []).reduce((cAcc, c) => cAcc + (c.concepts || []).length, 0), 0),
          0
        );
        const catConcepts = catSyllabus.subjects.reduce(
          (acc, sub) => acc + (sub.units || []).reduce((uAcc, u) => uAcc + (u.chapters || []).reduce((cAcc, c) => cAcc + (c.concepts || []).length, 0), 0),
          0
        );

        if (catConcepts > existingConcepts || catSyllabus.subjects.length > existingSubjects.length) {
          this.data.official_syllabuses[idx] = catSyllabus;
          updated = true;
        }
      } else {
        this.data.official_syllabuses.push(catSyllabus);
        updated = true;
      }
    }

    if (updated) {
      this.saveDatabase();
    }
  }

  public getOfficialSyllabus(
    board: string,
    classLevel: 10 | 11 | 12,
    stream?: string | null
  ): OfficialSyllabusRecord {
    if (!this.data.official_syllabuses) {
      this.data.official_syllabuses = [];
    }

    const matched = findMatchingOfficialSyllabus(board, classLevel, stream);
    const existingIdx = this.data.official_syllabuses.findIndex(s => s.id === matched.id);

    if (existingIdx >= 0) {
      const existing = this.data.official_syllabuses[existingIdx];
      const existingSubjects = existing.subjects || [];
      if (existingSubjects.length < matched.subjects.length) {
        this.data.official_syllabuses[existingIdx] = matched;
        this.saveDatabase();
        return matched;
      }
      if (classLevel >= 11 && stream) {
        return {
          ...existing,
          stream,
          subjects: filterSubjectsByStream(existing.subjects, classLevel, stream),
        };
      }
      return existing;
    }

    this.data.official_syllabuses.push(matched);
    this.saveDatabase();
    return matched;
  }

  public listOfficialSyllabuses(): OfficialSyllabusRecord[] {
    return this.data.official_syllabuses || [];
  }

  public saveOfficialSyllabus(syllabus: OfficialSyllabusRecord): void {
    const idx = this.data.official_syllabuses.findIndex(s => s.id === syllabus.id);
    if (idx >= 0) {
      this.data.official_syllabuses[idx] = syllabus;
    } else {
      this.data.official_syllabuses.push(syllabus);
    }
    this.saveDatabase();
  }

  public refreshOfficialSyllabus(id: string): OfficialSyllabusRecord | undefined {
    const syllabus = this.data.official_syllabuses.find(s => s.id === id);
    if (!syllabus) return undefined;
    syllabus.last_verified_at = new Date().toISOString();
    syllabus.verified = true;
    this.saveDatabase();
    return syllabus;
  }

  /**
   * Update a syllabus record with real verification results from SyllabusUpdateService.
   * Persists HTTP check metadata alongside the existing syllabus content.
   */
  public updateSyllabusVerification(
    id: string,
    verification: {
      last_verified_at: string;
      verified: boolean;
      verification_source_reachable?: boolean;
      verification_status_message?: string;
      content_fingerprint?: string;
      fingerprint_changed?: boolean;
    }
  ): OfficialSyllabusRecord | undefined {
    let syllabus = this.data.official_syllabuses.find(s => s.id === id);
    if (!syllabus) return undefined;

    syllabus.last_verified_at = verification.last_verified_at;
    syllabus.verified = verification.verified;

    // Attach extended verification fields (cast to allow dynamic properties)
    const ext = syllabus as any;
    if (verification.verification_source_reachable !== undefined) {
      ext.verification_source_reachable = verification.verification_source_reachable;
    }
    if (verification.verification_status_message !== undefined) {
      ext.verification_status_message = verification.verification_status_message;
    }
    if (verification.content_fingerprint !== undefined) {
      ext.content_fingerprint = verification.content_fingerprint;
    }
    if (verification.fingerprint_changed !== undefined) {
      ext.fingerprint_changed = verification.fingerprint_changed;
    }

    this.saveDatabase();
    return syllabus;
  }


  public createSyllabusComparison(
    record: Omit<SyllabusComparisonRecord, 'id' | 'created_at'>
  ): SyllabusComparisonRecord {
    const item: SyllabusComparisonRecord = {
      ...record,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
    this.data.syllabus_comparisons.push(item);
    this.saveDatabase();
    return item;
  }

  public getSyllabusComparison(id: string): SyllabusComparisonRecord | undefined {
    return this.data.syllabus_comparisons.find(c => c.id === id);
  }

  public listUserSyllabusComparisons(userId: string): SyllabusComparisonRecord[] {
    return (this.data.syllabus_comparisons || [])
      .filter(c => c.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // --- CONCEPT MASTERY & GAP DETECTOR ---
  public getConceptMastery(userId: string, conceptId: string): ConceptMasteryRecord | undefined {
    return (this.data.concept_mastery_records || []).find(
      m => m.user_id === userId && m.concept_id === conceptId
    );
  }

  public getUserConceptMasteries(userId: string): ConceptMasteryRecord[] {
    return (this.data.concept_mastery_records || []).filter(m => m.user_id === userId);
  }

  public updateConceptMasteryScore(
    userId: string,
    conceptId: string,
    conceptName: string,
    subject: string,
    chapter: string,
    scorePercent: number,
    newGaps: Array<{ trap_identified: string; question_snippet: string; remediation_tip: string }>
  ): ConceptMasteryRecord {
    const now = new Date().toISOString();
    const settings = this.getUserLearningSettings(userId);
    const threshold = settings.mastery_threshold_percentage || 80;

    let existing = this.getConceptMastery(userId, conceptId);
    if (!existing) {
      existing = {
        id: uuidv4(),
        user_id: userId,
        concept_id: conceptId,
        concept_name: conceptName,
        subject,
        chapter,
        status: scorePercent >= threshold ? 'mastered' : 'needs_practice',
        score_percentage: scorePercent,
        quizzes_attempted: 1,
        mastery_threshold: threshold,
        identified_gaps: newGaps.map(g => ({ ...g, occurred_at: now })),
        last_attempted_at: now,
        updated_at: now,
      };
      this.data.concept_mastery_records.push(existing);
    } else {
      existing.quizzes_attempted += 1;
      existing.score_percentage = scorePercent;
      existing.mastery_threshold = threshold;
      existing.status = scorePercent >= threshold ? 'mastered' : 'needs_practice';
      existing.last_attempted_at = now;
      existing.updated_at = now;
      if (newGaps && newGaps.length > 0) {
        existing.identified_gaps = [
          ...newGaps.map(g => ({ ...g, occurred_at: now })),
          ...existing.identified_gaps,
        ].slice(0, 15);
      }
    }

    this.saveDatabase();
    return existing;
  }

  // --- REVISION NOTES & FLASHCARDS ---
  public getConceptRevisionNote(conceptId: string): ConceptRevisionNoteRecord | undefined {
    return (this.data.concept_revision_notes || []).find(n => n.concept_id === conceptId);
  }

  public saveConceptRevisionNote(note: ConceptRevisionNoteRecord): void {
    const idx = this.data.concept_revision_notes.findIndex(n => n.concept_id === note.concept_id);
    if (idx >= 0) {
      this.data.concept_revision_notes[idx] = note;
    } else {
      this.data.concept_revision_notes.push(note);
    }
    this.saveDatabase();
  }

  public getConceptFlashcards(conceptId: string): ConceptFlashcardRecord | undefined {
    return (this.data.concept_flashcards || []).find(f => f.concept_id === conceptId);
  }

  public saveConceptFlashcards(flashcards: ConceptFlashcardRecord): void {
    const idx = this.data.concept_flashcards.findIndex(f => f.concept_id === flashcards.concept_id);
    if (idx >= 0) {
      this.data.concept_flashcards[idx] = flashcards;
    } else {
      this.data.concept_flashcards.push(flashcards);
    }
    this.saveDatabase();
  }

  // --- USER LEARNING SETTINGS ---
  public getUserLearningSettings(userId: string): UserLearningSettings {
    const found = (this.data.user_learning_settings || []).find(s => s.user_id === userId);
    if (found) return found;

    const defaultSettings: UserLearningSettings = {
      user_id: userId,
      mastery_threshold_percentage: 80,
      quiz_question_count: 5,
      auto_recommend_next: true,
      updated_at: new Date().toISOString(),
    };
    this.data.user_learning_settings.push(defaultSettings);
    this.saveDatabase();
    return defaultSettings;
  }

  public updateUserLearningSettings(
    userId: string,
    updates: Partial<UserLearningSettings>
  ): UserLearningSettings {
    let settings = this.getUserLearningSettings(userId);
    Object.assign(settings, updates, { updated_at: new Date().toISOString() });
    this.saveDatabase();
    return settings;
  }

  // --- CONCEPT QUIZ SESSIONS ---
  public createConceptQuizSession(
    record: Omit<ConceptQuizSession, 'id' | 'created_at' | 'status'>
  ): ConceptQuizSession {
    const session: ConceptQuizSession = {
      ...record,
      id: uuidv4(),
      status: 'in_progress',
      created_at: new Date().toISOString(),
    };
    this.data.concept_quiz_sessions.push(session);
    this.saveDatabase();
    return session;
  }

  public getConceptQuizSession(id: string): ConceptQuizSession | undefined {
    return (this.data.concept_quiz_sessions || []).find(s => s.id === id);
  }

  public updateConceptQuizSession(
    id: string,
    updates: Partial<ConceptQuizSession>
  ): ConceptQuizSession | undefined {
    const session = this.getConceptQuizSession(id);
    if (!session) return undefined;
    Object.assign(session, updates);
    this.saveDatabase();
    return session;
  }

  // --- MISTAKE LOG ---
  public getUserMistakeLog(userId: string, subject?: string) {
    const masteries = this.getUserConceptMasteries(userId);
    const mistakes: Array<{
      id: string;
      concept_id: string;
      concept_name: string;
      subject: string;
      chapter: string;
      trap: string;
      snippet: string;
      remediation: string;
      date: string;
    }> = [];

    masteries.forEach(m => {
      if (subject && m.subject.toLowerCase() !== subject.toLowerCase()) return;
      m.identified_gaps.forEach((g, idx) => {
        mistakes.push({
          id: `${m.concept_id}-gap-${idx}`,
          concept_id: m.concept_id,
          concept_name: m.concept_name,
          subject: m.subject,
          chapter: m.chapter,
          trap: g.trap_identified,
          snippet: g.question_snippet,
          remediation: g.remediation_tip,
          date: g.occurred_at,
        });
      });
    });

    return mistakes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // --- TOPIC MASTERY WORKFLOW SESSIONS ---
  public createTopicMasterySession(
    data: Omit<TopicMasteryWorkflowSession, 'id' | 'created_at' | 'updated_at'>
  ): TopicMasteryWorkflowSession {
    const now = new Date().toISOString();
    const session: TopicMasteryWorkflowSession = {
      ...data,
      id: uuidv4(),
      created_at: now,
      updated_at: now,
    };
    if (!this.data.topic_mastery_sessions) {
      this.data.topic_mastery_sessions = [];
    }
    this.data.topic_mastery_sessions.push(session);
    this.saveDatabase();
    return session;
  }

  public getTopicMasterySession(id: string): TopicMasteryWorkflowSession | undefined {
    return (this.data.topic_mastery_sessions || []).find(s => s.id === id);
  }

  public getUserActiveTopicMasterySession(
    userId: string,
    conceptId?: string
  ): TopicMasteryWorkflowSession | undefined {
    return (this.data.topic_mastery_sessions || [])
      .slice()
      .reverse()
      .find(s => {
        if (s.user_id !== userId) return false;
        if (conceptId && s.concept_id.toLowerCase() !== conceptId.toLowerCase()) return false;
        return s.stage !== 'mastery_result';
      });
  }

  public listUserTopicMasterySessions(userId: string): TopicMasteryWorkflowSession[] {
    return (this.data.topic_mastery_sessions || [])
      .filter(s => s.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  public updateTopicMasterySession(
    id: string,
    updates: Partial<TopicMasteryWorkflowSession>
  ): TopicMasteryWorkflowSession | undefined {
    const session = this.getTopicMasterySession(id);
    if (!session) return undefined;
    Object.assign(session, updates, { updated_at: new Date().toISOString() });
    this.saveDatabase();
    return session;
  }
}

export const db = DatabaseService.getInstance();
