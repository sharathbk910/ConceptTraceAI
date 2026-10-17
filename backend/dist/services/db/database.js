"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.DatabaseService = void 0;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
// Cryptographic Password Hashing & Verification
function hashPassword(password) {
    const salt = crypto_1.default.randomBytes(16).toString('hex');
    const hash = crypto_1.default.scryptSync(password, salt, 64).toString('hex');
    return { hash, salt };
}
function verifyPassword(password, salt, expectedHash) {
    try {
        const hash = crypto_1.default.scryptSync(password, salt, 64).toString('hex');
        return crypto_1.default.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
    }
    catch {
        return false;
    }
}
// --- OFFICIAL SYLLABUS & ADAPTIVE LEARNING SCHEMAS ---
const officialSyllabusData_js_1 = require("../syllabus/officialSyllabusData.js");
class DatabaseService {
    static instance;
    dbPath;
    data;
    constructor() {
        let dataDir = path_1.default.resolve(process.cwd(), 'data');
        if (process.env.VERCEL) {
            dataDir = '/tmp/data';
        }
        try {
            if (!fs_1.default.existsSync(dataDir)) {
                fs_1.default.mkdirSync(dataDir, { recursive: true });
            }
        }
        catch {
            dataDir = '/tmp';
        }
        this.dbPath = path_1.default.join(dataDir, 'concepttrace_db.json');
        // If dbPath does not exist, look for bundled seed candidates
        if (!fs_1.default.existsSync(this.dbPath)) {
            const seedCandidates = [
                path_1.default.resolve(process.cwd(), 'data/concepttrace_db.json'),
                path_1.default.resolve(process.cwd(), 'backend/data/concepttrace_db.json'),
                path_1.default.resolve(__dirname, '../../data/concepttrace_db.json'),
                path_1.default.resolve(__dirname, '../../../data/concepttrace_db.json'),
                path_1.default.resolve(__dirname, '../../backend/data/concepttrace_db.json'),
            ];
            for (const candidate of seedCandidates) {
                if (fs_1.default.existsSync(candidate)) {
                    try {
                        fs_1.default.copyFileSync(candidate, this.dbPath);
                        break;
                    }
                    catch {
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
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    loadDatabase() {
        if (!fs_1.default.existsSync(this.dbPath)) {
            const seedCandidates = [
                path_1.default.resolve(process.cwd(), 'data/concepttrace_db.json'),
                path_1.default.resolve(process.cwd(), 'backend/data/concepttrace_db.json'),
                path_1.default.resolve(__dirname, '../../data/concepttrace_db.json'),
                path_1.default.resolve(__dirname, '../../../data/concepttrace_db.json'),
                path_1.default.resolve(__dirname, '../../backend/data/concepttrace_db.json'),
            ];
            for (const candidate of seedCandidates) {
                if (fs_1.default.existsSync(candidate)) {
                    try {
                        const fileContent = fs_1.default.readFileSync(candidate, 'utf-8');
                        return JSON.parse(fileContent);
                    }
                    catch { }
                }
            }
        }
        if (fs_1.default.existsSync(this.dbPath)) {
            try {
                const fileContent = fs_1.default.readFileSync(this.dbPath, 'utf-8');
                const parsed = JSON.parse(fileContent);
                if (!parsed.user_auth)
                    parsed.user_auth = [];
                if (!parsed.official_syllabuses)
                    parsed.official_syllabuses = [];
                if (!parsed.syllabus_comparisons)
                    parsed.syllabus_comparisons = [];
                if (!parsed.concept_mastery_records)
                    parsed.concept_mastery_records = [];
                if (!parsed.concept_revision_notes)
                    parsed.concept_revision_notes = [];
                if (!parsed.concept_flashcards)
                    parsed.concept_flashcards = [];
                if (!parsed.user_learning_settings)
                    parsed.user_learning_settings = [];
                if (!parsed.concept_quiz_sessions)
                    parsed.concept_quiz_sessions = [];
                if (!parsed.topic_mastery_sessions)
                    parsed.topic_mastery_sessions = [];
                return parsed;
            }
            catch (e) {
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
    saveDatabase() {
        try {
            const tempPath = `${this.dbPath}.tmp`;
            fs_1.default.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
            fs_1.default.renameSync(tempPath, this.dbPath);
        }
        catch (err) {
            console.error('Database write error:', err);
        }
    }
    migrateLegacyUserIds() {
        let changed = false;
        const extractJwtPayload = (str) => {
            try {
                if (!str || !str.startsWith('ey') || !str.includes('.'))
                    return null;
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
            }
            catch { }
            return null;
        };
        const reassignUserId = (oldId, newId) => {
            if (!oldId || !newId || oldId === newId)
                return;
            this.data.education_profiles.forEach(ep => { if (ep.user_id === oldId)
                ep.user_id = newId; });
            this.data.student_subjects.forEach(s => { if (s.user_id === oldId)
                s.user_id = newId; });
            this.data.queries.forEach(q => { if (q.user_id === oldId)
                q.user_id = newId; });
            this.data.practice_sessions.forEach(ps => { if (ps.user_id === oldId)
                ps.user_id = newId; });
            this.data.practice_attempts.forEach(pa => { if (pa.user_id === oldId)
                pa.user_id = newId; });
            this.data.study_sessions.forEach(ss => { if (ss.user_id === oldId)
                ss.user_id = newId; });
            this.data.learning_activity.forEach(la => { if (la.user_id === oldId)
                la.user_id = newId; });
            this.data.user_settings.forEach(us => { if (us.user_id === oldId)
                us.user_id = newId; });
            this.data.notifications.forEach(n => { if (n.user_id === oldId)
                n.user_id = newId; });
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
                }
                else {
                    const existingEmail = this.data.profiles.find((other, idx) => idx !== i && other.email.toLowerCase() === (decoded.email || p.email).toLowerCase());
                    if (existingEmail) {
                        existingEmail.id = stableSub;
                        if (decoded.full_name)
                            existingEmail.full_name = decoded.full_name;
                        if (decoded.avatar_url)
                            existingEmail.avatar_url = decoded.avatar_url;
                        reassignUserId(oldId, stableSub);
                        reassignUserId(existingEmail.id, stableSub);
                        this.data.profiles.splice(i, 1);
                    }
                    else {
                        p.id = stableSub;
                        if (decoded.email)
                            p.email = decoded.email.toLowerCase();
                        if (decoded.full_name)
                            p.full_name = decoded.full_name;
                        if (decoded.avatar_url)
                            p.avatar_url = decoded.avatar_url;
                        reassignUserId(oldId, stableSub);
                    }
                }
            }
        }
        // Clean any orphaned records across all tables that still have raw JWT strings as user_id
        const tablesWithUserId = [
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
        const edMap = new Map();
        for (const ep of this.data.education_profiles) {
            const existing = edMap.get(ep.user_id);
            if (!existing) {
                edMap.set(ep.user_id, ep);
            }
            else {
                changed = true;
                if (ep.onboarding_completed && !existing.onboarding_completed) {
                    edMap.set(ep.user_id, ep);
                }
                else if (new Date(ep.updated_at) > new Date(existing.updated_at)) {
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
        const profileMap = new Map();
        for (const p of this.data.profiles) {
            const existing = profileMap.get(p.id);
            if (!existing) {
                profileMap.set(p.id, p);
            }
            else {
                changed = true;
                if (!p.email.startsWith('student_') && existing.email.startsWith('student_')) {
                    profileMap.set(p.id, p);
                }
                else if (new Date(p.updated_at) > new Date(existing.updated_at)) {
                    profileMap.set(p.id, p);
                }
            }
        }
        if (this.data.profiles.length !== profileMap.size) {
            this.data.profiles = Array.from(profileMap.values());
            changed = true;
        }
        // 4. Deduplicate user_auth
        const authMap = new Map();
        for (const a of this.data.user_auth) {
            const existing = authMap.get(a.email.toLowerCase());
            if (!existing) {
                authMap.set(a.email.toLowerCase(), a);
            }
            else {
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
    seedSyllabusIfNeeded() {
        const initialTopics = [
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
        const initialPrereqs = [
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
        const catalog = (0, officialSyllabusData_js_1.getOfficialSyllabusCatalog)();
        let topicsAdded = false;
        for (const syl of catalog) {
            for (const s of syl.subjects) {
                for (const u of s.units) {
                    for (const c of u.chapters) {
                        for (const con of c.concepts) {
                            const exists = this.data.syllabus_topics.some(t => t.id === con.id || (t.topic.toLowerCase() === con.concept_name.toLowerCase() && t.class_level === syl.class_level));
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
    seedAuthIfNeeded() {
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
    getProfileById(userId) {
        return this.data.profiles.find(p => p.id === userId);
    }
    getProfileByEmail(email) {
        return this.data.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    }
    createProfile(profile) {
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
        const newProfile = {
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
    updateProfile(userId, updates) {
        const profile = this.getProfileById(userId);
        if (!profile)
            return undefined;
        Object.assign(profile, updates, { updated_at: new Date().toISOString() });
        this.saveDatabase();
        return profile;
    }
    findOrCreateProfile(params) {
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
                this.data.education_profiles.forEach(ep => { if (ep.user_id === oldId)
                    ep.user_id = params.id; });
                this.data.student_subjects.forEach(s => { if (s.user_id === oldId)
                    s.user_id = params.id; });
                this.data.queries.forEach(q => { if (q.user_id === oldId)
                    q.user_id = params.id; });
                this.data.practice_sessions.forEach(ps => { if (ps.user_id === oldId)
                    ps.user_id = params.id; });
                this.data.practice_attempts.forEach(pa => { if (pa.user_id === oldId)
                    pa.user_id = params.id; });
                this.data.study_sessions.forEach(ss => { if (ss.user_id === oldId)
                    ss.user_id = params.id; });
                this.data.learning_activity.forEach(la => { if (la.user_id === oldId)
                    la.user_id = params.id; });
                this.data.user_settings.forEach(us => { if (us.user_id === oldId)
                    us.user_id = params.id; });
                this.data.notifications.forEach(n => { if (n.user_id === oldId)
                    n.user_id = params.id; });
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
    getUserAuthByEmail(email) {
        const emailNorm = email.trim().toLowerCase();
        return this.data.user_auth.find(u => u.email.toLowerCase() === emailNorm);
    }
    getUserAuthById(userId) {
        return this.data.user_auth.find(u => u.user_id === userId);
    }
    getUserAuthByVerificationToken(token) {
        if (!token)
            return undefined;
        return this.data.user_auth.find(u => u.verification_token === token);
    }
    getUserAuthByEmailAndOtp(email, otp) {
        if (!email || !otp)
            return undefined;
        const emailNorm = email.trim().toLowerCase();
        const cleanOtp = otp.trim();
        return this.data.user_auth.find(u => u.email.toLowerCase() === emailNorm && u.verification_token === cleanOtp);
    }
    getUserAuthByResetToken(token) {
        if (!token)
            return undefined;
        return this.data.user_auth.find(u => u.reset_token === token);
    }
    createUserAuth(record) {
        const now = new Date().toISOString();
        const existing = this.getUserAuthByEmail(record.email);
        if (existing) {
            Object.assign(existing, record, { updated_at: now });
            this.saveDatabase();
            return existing;
        }
        const newRecord = {
            ...record,
            email: record.email.trim().toLowerCase(),
            created_at: now,
            updated_at: now,
        };
        this.data.user_auth.push(newRecord);
        this.saveDatabase();
        return newRecord;
    }
    updateUserAuth(userId, updates) {
        const authRecord = this.getUserAuthById(userId);
        if (!authRecord)
            return undefined;
        Object.assign(authRecord, updates, { updated_at: new Date().toISOString() });
        this.saveDatabase();
        return authRecord;
    }
    // --- EDUCATION PROFILES ---
    getEducationProfile(userId) {
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
    upsertEducationProfile(educationProfile) {
        const now = new Date().toISOString();
        const existingIndex = this.data.education_profiles.findIndex(ep => ep.user_id === educationProfile.user_id);
        const existing = existingIndex >= 0 ? this.data.education_profiles[existingIndex] : null;
        const newRecord = {
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
        }
        else {
            this.data.education_profiles.push(newRecord);
        }
        this.saveDatabase();
        return newRecord;
    }
    // --- STUDENT SUBJECTS ---
    getStudentSubjects(userId) {
        return this.data.student_subjects.filter(s => s.user_id === userId);
    }
    setStudentSubjects(userId, subjects) {
        const now = new Date().toISOString();
        // Remove existing
        this.data.student_subjects = this.data.student_subjects.filter(s => s.user_id !== userId);
        // Add new
        const newSubjects = subjects.map(sub => ({
            id: (0, uuid_1.v4)(),
            user_id: userId,
            subject_name: sub,
            created_at: now,
        }));
        this.data.student_subjects.push(...newSubjects);
        this.saveDatabase();
        return newSubjects;
    }
    // --- SYLLABUS TOPICS ---
    getSyllabusTopics(filter) {
        return this.data.syllabus_topics.filter(t => {
            if (filter?.board && t.board.toLowerCase() !== filter.board.toLowerCase())
                return false;
            if (filter?.class_level && t.class_level !== filter.class_level)
                return false;
            if (filter?.subject && t.subject.toLowerCase() !== filter.subject.toLowerCase())
                return false;
            return true;
        });
    }
    getSyllabusTopicById(topicId) {
        return this.data.syllabus_topics.find(t => t.id === topicId);
    }
    getTopicPrerequisites(topicId) {
        const prereqIds = this.data.topic_prerequisites
            .filter(p => p.topic_id === topicId)
            .map(p => p.prerequisite_topic_id);
        return this.data.syllabus_topics.filter(t => prereqIds.includes(t.id));
    }
    // --- QUERIES & SOLUTIONS ---
    createQuery(record) {
        const now = new Date().toISOString();
        const query = {
            ...record,
            id: (0, uuid_1.v4)(),
            created_at: now,
            updated_at: now,
        };
        this.data.queries.push(query);
        this.saveDatabase();
        return query;
    }
    updateQuery(queryId, updates) {
        const query = this.data.queries.find(q => q.id === queryId);
        if (!query)
            return undefined;
        Object.assign(query, updates, { updated_at: new Date().toISOString() });
        this.saveDatabase();
        return query;
    }
    getQueryById(queryId, userId) {
        return this.data.queries.find(q => q.id === queryId && q.user_id === userId);
    }
    listUserQueries(userId, filters) {
        return this.data.queries
            .filter(q => {
            if (q.user_id !== userId)
                return false;
            if (filters?.subject && q.subject?.toLowerCase() !== filters.subject.toLowerCase())
                return false;
            if (filters?.status && q.status !== filters.status)
                return false;
            if (filters?.search) {
                const s = filters.search.toLowerCase();
                const matchText = (q.question_text || '').toLowerCase().includes(s);
                const matchExtracted = (q.extracted_text || '').toLowerCase().includes(s);
                const matchSubject = (q.subject || '').toLowerCase().includes(s);
                if (!matchText && !matchExtracted && !matchSubject)
                    return false;
            }
            return true;
        })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    deleteQuery(queryId, userId) {
        const index = this.data.queries.findIndex(q => q.id === queryId && q.user_id === userId);
        if (index === -1)
            return false;
        this.data.queries.splice(index, 1);
        // Cascade delete solution
        this.data.solutions = this.data.solutions.filter(s => s.query_id !== queryId);
        this.saveDatabase();
        return true;
    }
    createSolution(solution) {
        const record = {
            ...solution,
            id: (0, uuid_1.v4)(),
            created_at: new Date().toISOString(),
        };
        this.data.solutions.push(record);
        this.saveDatabase();
        return record;
    }
    getSolutionByQueryId(queryId) {
        return this.data.solutions.find(s => s.query_id === queryId);
    }
    // --- PRACTICE SESSIONS & QUESTIONS ---
    createPracticeSession(record) {
        const session = {
            ...record,
            id: (0, uuid_1.v4)(),
            started_at: new Date().toISOString(),
        };
        this.data.practice_sessions.push(session);
        this.saveDatabase();
        return session;
    }
    getPracticeSession(sessionId, userId) {
        return this.data.practice_sessions.find(s => s.id === sessionId && s.user_id === userId);
    }
    updatePracticeSession(sessionId, updates) {
        const session = this.data.practice_sessions.find(s => s.id === sessionId);
        if (!session)
            return undefined;
        Object.assign(session, updates);
        this.saveDatabase();
        return session;
    }
    listUserPracticeSessions(userId) {
        return this.data.practice_sessions
            .filter(s => s.user_id === userId)
            .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    }
    createPracticeQuestions(questions) {
        const now = new Date().toISOString();
        const created = questions.map(q => ({
            ...q,
            id: (0, uuid_1.v4)(),
            created_at: now,
        }));
        this.data.practice_questions.push(...created);
        this.saveDatabase();
        return created;
    }
    getPracticeQuestionsForSession(sessionId) {
        return this.data.practice_questions.filter(q => q.session_id === sessionId);
    }
    getPracticeQuestionById(questionId) {
        return this.data.practice_questions.find(q => q.id === questionId);
    }
    // --- PRACTICE ATTEMPTS ---
    createPracticeAttempt(record) {
        const existing = this.data.practice_attempts.find(a => a.session_id === record.session_id && a.question_id === record.question_id);
        if (existing) {
            throw new Error('DUPLICATE_ATTEMPT: Answer already submitted for this question in this session');
        }
        const attempt = {
            ...record,
            id: (0, uuid_1.v4)(),
            attempted_at: new Date().toISOString(),
        };
        this.data.practice_attempts.push(attempt);
        this.saveDatabase();
        return attempt;
    }
    getAttemptsForSession(sessionId, userId) {
        return this.data.practice_attempts.filter(a => a.session_id === sessionId && a.user_id === userId);
    }
    getAllEligibleAttempts(userId) {
        return this.data.practice_attempts.filter(a => a.user_id === userId && a.eligible_for_metrics);
    }
    // --- STUDY SESSIONS ---
    createStudySession(userId) {
        const now = new Date().toISOString();
        // Mark any previously active session as interrupted
        this.data.study_sessions
            .filter(s => s.user_id === userId && s.session_status === 'active')
            .forEach(s => {
            s.session_status = 'interrupted';
            s.ended_at = now;
        });
        const session = {
            id: (0, uuid_1.v4)(),
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
    getActiveStudySession(userId) {
        return this.data.study_sessions.find(s => s.user_id === userId && s.session_status === 'active');
    }
    getStudySessionById(sessionId, userId) {
        return this.data.study_sessions.find(s => s.id === sessionId && s.user_id === userId);
    }
    updateStudySession(sessionId, updates) {
        const session = this.data.study_sessions.find(s => s.id === sessionId);
        if (!session)
            return undefined;
        Object.assign(session, updates);
        this.saveDatabase();
        return session;
    }
    getUserStudySessions(userId) {
        return this.data.study_sessions
            .filter(s => s.user_id === userId)
            .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    }
    // --- LEARNING ACTIVITY ---
    recordActivity(record) {
        const activity = {
            ...record,
            id: (0, uuid_1.v4)(),
            occurred_at: new Date().toISOString(),
        };
        this.data.learning_activity.push(activity);
        this.saveDatabase();
        return activity;
    }
    getUserActivities(userId, limit = 20) {
        return this.data.learning_activity
            .filter(a => a.user_id === userId)
            .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
            .slice(0, limit);
    }
    // --- USER SETTINGS ---
    getUserSettings(userId) {
        return this.data.user_settings.find(s => s.user_id === userId);
    }
    updateUserSettings(userId, updates) {
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
    getUserNotifications(userId) {
        return this.data.notifications
            .filter(n => n.user_id === userId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    createNotification(userId, title, message) {
        const notif = {
            id: (0, uuid_1.v4)(),
            user_id: userId,
            title,
            message,
            created_at: new Date().toISOString(),
        };
        this.data.notifications.push(notif);
        this.saveDatabase();
        return notif;
    }
    markNotificationAsRead(notifId, userId) {
        const notif = this.data.notifications.find(n => n.id === notifId && n.user_id === userId);
        if (!notif)
            return false;
        notif.read_at = new Date().toISOString();
        this.saveDatabase();
        return true;
    }
    // --- OFFICIAL SYLLABUS CATALOG & VERIFICATION ---
    seedOfficialCurriculaIfNeeded() {
        if (!this.data.official_syllabuses) {
            this.data.official_syllabuses = [];
        }
        const catalog = (0, officialSyllabusData_js_1.getOfficialSyllabusCatalog)();
        let updated = false;
        for (const catSyllabus of catalog) {
            const idx = this.data.official_syllabuses.findIndex(s => s.id === catSyllabus.id);
            if (idx >= 0) {
                const existing = this.data.official_syllabuses[idx];
                const existingSubjects = existing.subjects || [];
                const existingConcepts = existingSubjects.reduce((acc, sub) => acc + (sub.units || []).reduce((uAcc, u) => uAcc + (u.chapters || []).reduce((cAcc, c) => cAcc + (c.concepts || []).length, 0), 0), 0);
                const catConcepts = catSyllabus.subjects.reduce((acc, sub) => acc + (sub.units || []).reduce((uAcc, u) => uAcc + (u.chapters || []).reduce((cAcc, c) => cAcc + (c.concepts || []).length, 0), 0), 0);
                if (catConcepts > existingConcepts || catSyllabus.subjects.length > existingSubjects.length) {
                    this.data.official_syllabuses[idx] = catSyllabus;
                    updated = true;
                }
            }
            else {
                this.data.official_syllabuses.push(catSyllabus);
                updated = true;
            }
        }
        if (updated) {
            this.saveDatabase();
        }
    }
    getOfficialSyllabus(board, classLevel, stream) {
        if (!this.data.official_syllabuses) {
            this.data.official_syllabuses = [];
        }
        const matched = (0, officialSyllabusData_js_1.findMatchingOfficialSyllabus)(board, classLevel, stream);
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
                    subjects: (0, officialSyllabusData_js_1.filterSubjectsByStream)(existing.subjects, classLevel, stream),
                };
            }
            return existing;
        }
        this.data.official_syllabuses.push(matched);
        this.saveDatabase();
        return matched;
    }
    listOfficialSyllabuses() {
        return this.data.official_syllabuses || [];
    }
    saveOfficialSyllabus(syllabus) {
        const idx = this.data.official_syllabuses.findIndex(s => s.id === syllabus.id);
        if (idx >= 0) {
            this.data.official_syllabuses[idx] = syllabus;
        }
        else {
            this.data.official_syllabuses.push(syllabus);
        }
        this.saveDatabase();
    }
    refreshOfficialSyllabus(id) {
        const syllabus = this.data.official_syllabuses.find(s => s.id === id);
        if (!syllabus)
            return undefined;
        syllabus.last_verified_at = new Date().toISOString();
        syllabus.verified = true;
        this.saveDatabase();
        return syllabus;
    }
    // --- SYLLABUS COMPARISONS ---
    createSyllabusComparison(record) {
        const item = {
            ...record,
            id: (0, uuid_1.v4)(),
            created_at: new Date().toISOString(),
        };
        this.data.syllabus_comparisons.push(item);
        this.saveDatabase();
        return item;
    }
    getSyllabusComparison(id) {
        return this.data.syllabus_comparisons.find(c => c.id === id);
    }
    listUserSyllabusComparisons(userId) {
        return (this.data.syllabus_comparisons || [])
            .filter(c => c.user_id === userId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    // --- CONCEPT MASTERY & GAP DETECTOR ---
    getConceptMastery(userId, conceptId) {
        return (this.data.concept_mastery_records || []).find(m => m.user_id === userId && m.concept_id === conceptId);
    }
    getUserConceptMasteries(userId) {
        return (this.data.concept_mastery_records || []).filter(m => m.user_id === userId);
    }
    updateConceptMasteryScore(userId, conceptId, conceptName, subject, chapter, scorePercent, newGaps) {
        const now = new Date().toISOString();
        const settings = this.getUserLearningSettings(userId);
        const threshold = settings.mastery_threshold_percentage || 80;
        let existing = this.getConceptMastery(userId, conceptId);
        if (!existing) {
            existing = {
                id: (0, uuid_1.v4)(),
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
        }
        else {
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
    getConceptRevisionNote(conceptId) {
        return (this.data.concept_revision_notes || []).find(n => n.concept_id === conceptId);
    }
    saveConceptRevisionNote(note) {
        const idx = this.data.concept_revision_notes.findIndex(n => n.concept_id === note.concept_id);
        if (idx >= 0) {
            this.data.concept_revision_notes[idx] = note;
        }
        else {
            this.data.concept_revision_notes.push(note);
        }
        this.saveDatabase();
    }
    getConceptFlashcards(conceptId) {
        return (this.data.concept_flashcards || []).find(f => f.concept_id === conceptId);
    }
    saveConceptFlashcards(flashcards) {
        const idx = this.data.concept_flashcards.findIndex(f => f.concept_id === flashcards.concept_id);
        if (idx >= 0) {
            this.data.concept_flashcards[idx] = flashcards;
        }
        else {
            this.data.concept_flashcards.push(flashcards);
        }
        this.saveDatabase();
    }
    // --- USER LEARNING SETTINGS ---
    getUserLearningSettings(userId) {
        const found = (this.data.user_learning_settings || []).find(s => s.user_id === userId);
        if (found)
            return found;
        const defaultSettings = {
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
    updateUserLearningSettings(userId, updates) {
        let settings = this.getUserLearningSettings(userId);
        Object.assign(settings, updates, { updated_at: new Date().toISOString() });
        this.saveDatabase();
        return settings;
    }
    // --- CONCEPT QUIZ SESSIONS ---
    createConceptQuizSession(record) {
        const session = {
            ...record,
            id: (0, uuid_1.v4)(),
            status: 'in_progress',
            created_at: new Date().toISOString(),
        };
        this.data.concept_quiz_sessions.push(session);
        this.saveDatabase();
        return session;
    }
    getConceptQuizSession(id) {
        return (this.data.concept_quiz_sessions || []).find(s => s.id === id);
    }
    updateConceptQuizSession(id, updates) {
        const session = this.getConceptQuizSession(id);
        if (!session)
            return undefined;
        Object.assign(session, updates);
        this.saveDatabase();
        return session;
    }
    // --- MISTAKE LOG ---
    getUserMistakeLog(userId, subject) {
        const masteries = this.getUserConceptMasteries(userId);
        const mistakes = [];
        masteries.forEach(m => {
            if (subject && m.subject.toLowerCase() !== subject.toLowerCase())
                return;
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
    createTopicMasterySession(data) {
        const now = new Date().toISOString();
        const session = {
            ...data,
            id: (0, uuid_1.v4)(),
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
    getTopicMasterySession(id) {
        return (this.data.topic_mastery_sessions || []).find(s => s.id === id);
    }
    getUserActiveTopicMasterySession(userId, conceptId) {
        return (this.data.topic_mastery_sessions || [])
            .slice()
            .reverse()
            .find(s => {
            if (s.user_id !== userId)
                return false;
            if (conceptId && s.concept_id.toLowerCase() !== conceptId.toLowerCase())
                return false;
            return s.stage !== 'mastery_result';
        });
    }
    listUserTopicMasterySessions(userId) {
        return (this.data.topic_mastery_sessions || [])
            .filter(s => s.user_id === userId)
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    updateTopicMasterySession(id, updates) {
        const session = this.getTopicMasterySession(id);
        if (!session)
            return undefined;
        Object.assign(session, updates, { updated_at: new Date().toISOString() });
        this.saveDatabase();
        return session;
    }
}
exports.DatabaseService = DatabaseService;
exports.db = DatabaseService.getInstance();
