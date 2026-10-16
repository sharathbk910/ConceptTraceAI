import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env.js';

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

export interface EducationProfile {
  user_id: string;
  board: string;
  class_level: 10 | 11 | 12;
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
  source_status: 'configured' | 'imported';
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

interface DatabaseSchema {
  profiles: Profile[];
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
}

export class DatabaseService {
  private static instance: DatabaseService;
  private dbPath: string;
  private data: DatabaseSchema;

  private constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = path.join(dataDir, 'concepttrace_db.json');
    this.data = this.loadDatabase();
    this.seedSyllabusIfNeeded();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private loadDatabase(): DatabaseSchema {
    if (fs.existsSync(this.dbPath)) {
      try {
        const fileContent = fs.readFileSync(this.dbPath, 'utf-8');
        return JSON.parse(fileContent);
      } catch (e) {
        console.error('Failed to parse database file, initializing empty schema:', e);
      }
    }

    return {
      profiles: [],
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

  private seedSyllabusIfNeeded(): void {
    if (this.data.syllabus_topics.length > 0) return;

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

    this.data.syllabus_topics = initialTopics;
    this.data.topic_prerequisites = initialPrereqs;
    this.saveDatabase();
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

  // --- EDUCATION PROFILES ---
  public getEducationProfile(userId: string): EducationProfile | undefined {
    return this.data.education_profiles.find(ep => ep.user_id === userId);
  }

  public upsertEducationProfile(educationProfile: Omit<EducationProfile, 'updated_at'>): EducationProfile {
    const now = new Date().toISOString();
    const existingIndex = this.data.education_profiles.findIndex(ep => ep.user_id === educationProfile.user_id);
    const newRecord: EducationProfile = { ...educationProfile, updated_at: now };

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
}

export const db = DatabaseService.getInstance();
