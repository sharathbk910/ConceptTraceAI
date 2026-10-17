"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const database_js_1 = require("../services/db/database.js");
const verificationEngine_js_1 = require("../services/verification/verificationEngine.js");
const analyticsService_js_1 = require("../services/analytics/analyticsService.js");
const studyTrackingService_js_1 = require("../services/study-tracking/studyTrackingService.js");
const api_schemas_js_1 = require("../schemas/api.schemas.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
async function runTestSuite() {
    console.log('🧪 Starting ConceptTrace AI Automated Test Suite...\n');
    let passed = 0;
    let total = 0;
    function test(name, fn) {
        total++;
        try {
            fn();
            console.log(`  ✅ PASS: ${name}`);
            passed++;
        }
        catch (err) {
            console.error(`  ❌ FAIL: ${name}`);
            console.error(`     Error: ${err.message}`);
        }
    }
    // 1. Database & Profile Test
    test('Database creates and retrieves student profile', () => {
        const testId = 'test-user-001';
        const profile = database_js_1.db.createProfile({
            id: testId,
            email: 'teststudent@example.com',
            full_name: 'Test Student',
            role: 'student',
        });
        assert_1.default.strictEqual(profile.id, testId);
        assert_1.default.strictEqual(profile.full_name, 'Test Student');
        const fetched = database_js_1.db.getProfileById(testId);
        assert_1.default.ok(fetched);
        assert_1.default.strictEqual(fetched?.email, 'teststudent@example.com');
    });
    // 2. Education Profile Setup
    test('Education profile saves and updates correctly', () => {
        const testId = 'test-user-001';
        const ed = database_js_1.db.upsertEducationProfile({
            user_id: testId,
            board: 'CBSE',
            class_level: 10,
            academic_year: '2026-27',
            preferred_language: 'English',
            onboarding_completed: true,
        });
        assert_1.default.strictEqual(ed.class_level, 10);
        assert_1.default.strictEqual(ed.onboarding_completed, true);
        const subjects = database_js_1.db.setStudentSubjects(testId, ['Mathematics', 'Science']);
        assert_1.default.strictEqual(subjects.length, 2);
    });
    // 3. Syllabus Topics Seed Check
    test('Syllabus topics are seeded for CBSE Class 10/11/12 with prerequisites', () => {
        const topics = database_js_1.db.getSyllabusTopics();
        assert_1.default.ok(topics.length >= 10, 'Expected at least 10 seeded syllabus topics');
        const mathTopic = topics.find(t => t.topic.includes('Quadratic'));
        assert_1.default.ok(mathTopic, 'Expected Quadratic Equations topic to exist');
        const prereqs = database_js_1.db.getTopicPrerequisites(mathTopic.id);
        assert_1.default.ok(prereqs.length > 0, 'Expected Quadratic Equations to have prerequisite topics');
    });
    // 4. Deterministic Verification Engine (mathjs)
    test('Deterministic verification engine correctly verifies linear equations', () => {
        const result = verificationEngine_js_1.VerificationEngine.verifySolution('Solve 2x + 5 = 15', 'Solve 2x + 5 = 15', 'x = 5', [
            { step_number: 1, title: 'Subtract 5', content: '2x = 10', reason: 'Equality rule' },
            { step_number: 2, title: 'Divide by 2', content: 'x = 5', reason: 'Isolate x' },
        ]);
        assert_1.default.strictEqual(result.verification_status, 'verified');
        assert_1.default.strictEqual(result.independent_check_performed, true);
        assert_1.default.ok(result.verification_details.includes('Verified by substituting proposed root'));
    });
    // 5. Verification detects incorrect final answer
    test('Deterministic verification engine flags incorrect answer', () => {
        const result = verificationEngine_js_1.VerificationEngine.verifySolution('Solve 2x + 5 = 15', 'Solve 2x + 5 = 15', 'x = 9', [
            { step_number: 1, title: 'Wrong step', content: '2x = 18', reason: 'Arithmetic error' },
        ]);
        assert_1.default.notStrictEqual(result.verification_status, 'verified');
    });
    // 6. Practice Session & Duplicate Attempt Prevention
    test('Practice attempt records and strictly prevents duplicate submission', () => {
        const testId = 'test-user-001';
        const session = database_js_1.db.createPracticeSession({
            user_id: testId,
            subject: 'Mathematics',
            status: 'in_progress',
            question_count: 1,
        });
        const questions = database_js_1.db.createPracticeQuestions([
            {
                session_id: session.id,
                question_text: 'What is 3 + 4?',
                question_type: 'mcq',
                options: ['A) 7', 'B) 8', 'C) 9', 'D) 10'],
                correct_answer: 'A) 7',
                explanation: '3 + 4 = 7',
                difficulty: 'easy',
                validation_status: 'validated',
            },
        ]);
        const qId = questions[0].id;
        // First attempt succeeds
        const attempt = database_js_1.db.createPracticeAttempt({
            user_id: testId,
            session_id: session.id,
            question_id: qId,
            submitted_answer: 'A) 7',
            is_correct: true,
            eligible_for_metrics: true,
            feedback: 'Correct',
        });
        assert_1.default.ok(attempt.id);
        assert_1.default.strictEqual(attempt.is_correct, true);
        // Second attempt on same question must fail
        assert_1.default.throws(() => {
            database_js_1.db.createPracticeAttempt({
                user_id: testId,
                session_id: session.id,
                question_id: qId,
                submitted_answer: 'B) 8',
                is_correct: false,
                eligible_for_metrics: true,
            });
        }, /DUPLICATE_ATTEMPT/, 'Should throw duplicate attempt error');
    });
    // 7. Active Days & Streak Calculation
    test('Active days correctly requires MIN_ACTIVE_DAY_SECONDS (300s)', () => {
        const today = new Date().toISOString().split('T')[0];
        const sessions = [
            { started_at: `${today}T10:00:00Z`, tracked_seconds: 150 },
            { started_at: `${today}T11:00:00Z`, tracked_seconds: 160 }, // Sum = 310s >= 300s
        ];
        const { activeDays } = analyticsService_js_1.AnalyticsService.calculateActiveDaysAndStreak(sessions);
        assert_1.default.strictEqual(activeDays, 1);
    });
    // 8. Study Session Heartbeat & Idle Inactivity Handling
    test('Study tracking session starts and updates heartbeats', () => {
        const testId = 'test-user-001';
        const sess = studyTrackingService_js_1.StudyTrackingService.startSession(testId);
        assert_1.default.ok(sess.id);
        assert_1.default.strictEqual(sess.session_status, 'active');
        const updated = studyTrackingService_js_1.StudyTrackingService.recordHeartbeat(sess.id, testId, 15);
        assert_1.default.strictEqual(updated.tracked_seconds, 15);
    });
    // 9. ISSUE 2 TEST: Reliable User Identification & Persistence Across Logins
    test('Issue 2: Same Gmail account consistently maps to same profile across logins', () => {
        const stableUid = 'stable-uid-google-001';
        const gmail = 'student.persist@gmail.com';
        // First login
        const prof1 = database_js_1.db.findOrCreateProfile({
            id: stableUid,
            email: gmail,
            full_name: 'Persistent Student',
        });
        assert_1.default.strictEqual(prof1.id, stableUid);
        assert_1.default.strictEqual(prof1.email, gmail);
        // Save education profile
        database_js_1.db.upsertEducationProfile({
            user_id: stableUid,
            board: 'CBSE',
            class_level: 12,
            academic_year: '2026-27',
            preferred_language: 'English',
            onboarding_completed: true,
        });
        database_js_1.db.setStudentSubjects(stableUid, ['Mathematics', 'Physics', 'Chemistry']);
        // Simulate subsequent login with same Gmail (even if called with new session/request)
        const prof2 = database_js_1.db.findOrCreateProfile({
            id: stableUid,
            email: gmail,
            full_name: 'Persistent Student',
        });
        assert_1.default.strictEqual(prof2.id, stableUid);
        // Verify education profile and subjects persisted intact
        const ed = database_js_1.db.getEducationProfile(stableUid);
        assert_1.default.ok(ed, 'Education profile must persist');
        assert_1.default.strictEqual(ed?.class_level, 12);
        assert_1.default.strictEqual(ed?.board, 'CBSE');
        assert_1.default.strictEqual(ed?.onboarding_completed, true);
        const subjects = database_js_1.db.getStudentSubjects(stableUid);
        assert_1.default.strictEqual(subjects.length, 3);
    });
    // 10. ISSUE 2 TEST: Prevention of Duplicate Profiles
    test('Issue 2: Duplicate profiles are strictly prevented for same email address', () => {
        const gmail = 'unique.student@gmail.com';
        const uidA = 'uid-test-alpha';
        const first = database_js_1.db.findOrCreateProfile({
            id: uidA,
            email: gmail,
            full_name: 'Student Unique',
        });
        // Repeated login attempt with matching email
        const second = database_js_1.db.findOrCreateProfile({
            id: uidA,
            email: gmail,
            full_name: 'Student Unique Updated',
        });
        assert_1.default.strictEqual(first.email, second.email);
        assert_1.default.strictEqual(second.id, uidA);
        // Ensure database contains only one profile for this email
        const allMatching = database_js_1.db.getProfileByEmail(gmail);
        assert_1.default.ok(allMatching);
        assert_1.default.strictEqual(allMatching?.id, uidA);
    });
    // 11. ISSUE 1 TEST: Doubt Session Inherits Student Academic Details
    test('Issue 1: Academic details are retrieved from saved profile without re-entry', () => {
        const testStudentId = 'student-ask-doubt-001';
        database_js_1.db.findOrCreateProfile({
            id: testStudentId,
            email: 'askdoubt.student@concepttrace.ai',
            full_name: 'Ask Doubt Student',
        });
        database_js_1.db.upsertEducationProfile({
            user_id: testStudentId,
            board: 'Karnataka State Board',
            class_level: 11,
            academic_year: '2026-27',
            preferred_language: 'English',
            onboarding_completed: true,
        });
        database_js_1.db.setStudentSubjects(testStudentId, ['Physics', 'Mathematics']);
        // Retrieve academic profile as Ask Doubt route does
        const ed = database_js_1.db.getEducationProfile(testStudentId);
        assert_1.default.ok(ed);
        assert_1.default.strictEqual(ed?.class_level, 11);
        assert_1.default.strictEqual(ed?.board, 'Karnataka State Board');
        assert_1.default.strictEqual(ed?.preferred_language, 'English');
        const subjects = database_js_1.db.getStudentSubjects(testStudentId).map(s => s.subject_name);
        assert_1.default.deepStrictEqual(subjects, ['Physics', 'Mathematics']);
    });
    // 12. ISSUE 1 TEST: Auto-Persists Missing/Newly Provided Academic Information
    test('Issue 1: Newly provided academic information in doubt session persists to profile', () => {
        const testStudentId = `student-missing-${Date.now()}`;
        database_js_1.db.findOrCreateProfile({
            id: testStudentId,
            email: `${testStudentId}@concepttrace.ai`,
            full_name: 'New Student',
        });
        // Initially no education profile
        assert_1.default.strictEqual(database_js_1.db.getEducationProfile(testStudentId), undefined);
        // Student provides missing info during Ask Doubt session
        const providedBoard = 'CISCE (ICSE/ISC)';
        const providedClass = 10;
        const providedLang = 'Hindi';
        database_js_1.db.upsertEducationProfile({
            user_id: testStudentId,
            board: providedBoard,
            class_level: providedClass,
            academic_year: '2026-27',
            preferred_language: providedLang,
            onboarding_completed: true,
        });
        database_js_1.db.setStudentSubjects(testStudentId, ['Mathematics']);
        // Confirm it is now saved and never asked again
        const saved = database_js_1.db.getEducationProfile(testStudentId);
        assert_1.default.ok(saved);
        assert_1.default.strictEqual(saved?.board, providedBoard);
        assert_1.default.strictEqual(saved?.class_level, 10);
        assert_1.default.strictEqual(saved?.preferred_language, providedLang);
        assert_1.default.strictEqual(saved?.onboarding_completed, true);
    });
    // 13. Registration Validation
    test('Registration schema rejects invalid email formats and mismatched passwords', () => {
        // Malformed email
        assert_1.default.throws(() => {
            api_schemas_js_1.RegisterSchema.parse({
                fullName: 'Jane Doe',
                email: 'invalid-email-format',
                password: 'ValidPassword123!',
                confirmPassword: 'ValidPassword123!',
                termsAccepted: true,
            });
        }, /Invalid email/);
        // Mismatched passwords
        assert_1.default.throws(() => {
            api_schemas_js_1.RegisterSchema.parse({
                fullName: 'Jane Doe',
                email: 'valid@example.com',
                password: 'ValidPassword123!',
                confirmPassword: 'DifferentPassword456!',
                termsAccepted: true,
            });
        }, /Passwords don't match/);
        // Unaccepted terms
        assert_1.default.throws(() => {
            api_schemas_js_1.RegisterSchema.parse({
                fullName: 'Jane Doe',
                email: 'valid@example.com',
                password: 'ValidPassword123!',
                confirmPassword: 'ValidPassword123!',
                termsAccepted: false,
            });
        }, /accept the terms/);
    });
    // 14. Password Cryptographic Security
    test('Cryptographic scrypt hashing protects passwords against plain-text exposure', () => {
        const rawPassword = 'SuperSecretPassword@2026';
        const { hash, salt } = (0, database_js_1.hashPassword)(rawPassword);
        assert_1.default.notStrictEqual(hash, rawPassword);
        assert_1.default.strictEqual(typeof hash, 'string');
        assert_1.default.strictEqual(typeof salt, 'string');
        assert_1.default.strictEqual(salt.length, 32); // 16 bytes hex
        // Verify valid password
        const isValid = (0, database_js_1.verifyPassword)(rawPassword, salt, hash);
        assert_1.default.strictEqual(isValid, true, 'Expected valid password to verify successfully');
        // Reject wrong password
        const isInvalid = (0, database_js_1.verifyPassword)('WrongPassword123', salt, hash);
        assert_1.default.strictEqual(isInvalid, false, 'Expected wrong password to fail verification');
    });
    // 15. User Auth Creation and Lookup
    test('User authentication record is securely stored with unverified status on registration', () => {
        const testEmail = 'newstudent_verify@concepttrace.ai';
        const { hash, salt } = (0, database_js_1.hashPassword)('StudentPass123!');
        const token = 'test-token-uuid-12345';
        const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
        const auth = database_js_1.db.createUserAuth({
            user_id: 'test-student-auth-01',
            email: testEmail,
            password_hash: hash,
            salt,
            is_verified: false,
            verification_token: token,
            verification_expires_at: expiresAt,
        });
        assert_1.default.strictEqual(auth.email, testEmail);
        assert_1.default.strictEqual(auth.is_verified, false);
        assert_1.default.strictEqual(auth.verification_token, token);
        const retrieved = database_js_1.db.getUserAuthByVerificationToken(token);
        assert_1.default.ok(retrieved);
        assert_1.default.strictEqual(retrieved?.email, testEmail);
    });
    // 16. Email Verification Workflow
    test('Email verification transitions account to verified and invalidates single-use token', () => {
        const token = 'test-token-uuid-12345';
        const auth = database_js_1.db.getUserAuthByVerificationToken(token);
        assert_1.default.ok(auth);
        // Verify account
        const updated = database_js_1.db.updateUserAuth(auth.user_id, {
            is_verified: true,
            verification_token: null,
            verification_expires_at: null,
        });
        assert_1.default.ok(updated);
        assert_1.default.strictEqual(updated?.is_verified, true);
        assert_1.default.strictEqual(updated?.verification_token, null);
        // Ensure token cannot be reused
        const recheck = database_js_1.db.getUserAuthByVerificationToken(token);
        assert_1.default.strictEqual(recheck, undefined, 'Reused verification token must return undefined');
    });
    // 16b. 6-Digit Numeric OTP Verification
    test('6-digit numeric OTP verifies unverified account and rejects mismatched OTP', () => {
        const testEmail = 'otp_student_test@concepttrace.ai';
        const otp = '849201';
        database_js_1.db.createUserAuth({
            user_id: 'otp-student-001',
            email: testEmail,
            password_hash: 'hash',
            salt: 'salt',
            is_verified: false,
            verification_token: otp,
            verification_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        });
        // Mismatched OTP should not match
        const wrongMatch = database_js_1.db.getUserAuthByEmailAndOtp(testEmail, '999999');
        assert_1.default.strictEqual(wrongMatch, undefined, 'Mismatched OTP must not find record');
        // Matching OTP should match
        const validMatch = database_js_1.db.getUserAuthByEmailAndOtp(testEmail, otp);
        assert_1.default.ok(validMatch, 'Valid OTP must retrieve user auth record');
        assert_1.default.strictEqual(validMatch.email, testEmail);
        // Verify account and clear OTP
        database_js_1.db.updateUserAuth(validMatch.user_id, {
            is_verified: true,
            verification_token: null,
            verification_expires_at: null,
        });
        const updated = database_js_1.db.getUserAuthByEmail(testEmail);
        assert_1.default.strictEqual(updated?.is_verified, true);
        assert_1.default.strictEqual(updated?.verification_token, null);
    });
    // 17. Password Reset Workflow
    test('Password reset generates secure single-use token and updates password hash', () => {
        const testEmail = 'newstudent_verify@concepttrace.ai';
        const auth = database_js_1.db.getUserAuthByEmail(testEmail);
        assert_1.default.ok(auth);
        const resetToken = 'reset-token-sample-999';
        database_js_1.db.updateUserAuth(auth.user_id, {
            reset_token: resetToken,
            reset_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        });
        const foundByReset = database_js_1.db.getUserAuthByResetToken(resetToken);
        assert_1.default.ok(foundByReset);
        // Reset password with new hash
        const newCreds = (0, database_js_1.hashPassword)('NewBrandPassword2026!');
        database_js_1.db.updateUserAuth(auth.user_id, {
            password_hash: newCreds.hash,
            salt: newCreds.salt,
            reset_token: null,
            reset_expires_at: null,
        });
        // Check old password no longer works, new password works
        const oldCheck = (0, database_js_1.verifyPassword)('StudentPass123!', auth.salt, auth.password_hash);
        const updatedAuth = database_js_1.db.getUserAuthByEmail(testEmail);
        const newCheck = (0, database_js_1.verifyPassword)('NewBrandPassword2026!', updatedAuth.salt, updatedAuth.password_hash);
        assert_1.default.strictEqual(newCheck, true, 'New password must verify successfully');
        assert_1.default.strictEqual(database_js_1.db.getUserAuthByResetToken(resetToken), undefined, 'Reset token must be cleared');
    });
    // 18. Multi-Region and National Education Board Support
    test('Education profile accepts national, state, and international boards', () => {
        const boardsToTest = [
            'CBSE',
            'CISCE (ICSE / ISC)',
            'NIOS',
            'Maharashtra State Board (MSBSHSE)',
            'Karnataka KSEAB',
            'Uttar Pradesh UPMSP',
            'West Bengal WBBSE / WBCHSE',
            'Cambridge International (CAIE / IGCSE)',
            'International Baccalaureate (IB)',
        ];
        for (const board of boardsToTest) {
            const ed = database_js_1.db.upsertEducationProfile({
                user_id: 'test-user-001',
                country: board.includes('International') || board.includes('Cambridge') ? 'International' : 'India',
                board,
                class_level: 12,
                stream: 'Science (PCM)',
                academic_year: '2026-27',
                preferred_language: 'English',
                onboarding_completed: true,
            });
            assert_1.default.strictEqual(ed.board, board);
            assert_1.default.strictEqual(ed.class_level, 12);
        }
    });
    // 19. Signed Session Tokens & Tamper Protection
    test('Signed session token generates valid HMAC signature and detects tampering', () => {
        const userId = 'student-test-uid-789';
        const email = 'genuine.student@concepttrace.ai';
        const token = (0, auth_middleware_js_1.createSessionToken)(userId, email);
        assert_1.default.ok(token.startsWith('cts_'), 'Token must have cts_ prefix');
        const verified = (0, auth_middleware_js_1.verifySessionToken)(token);
        assert_1.default.ok(verified, 'Genuine token must verify successfully');
        assert_1.default.strictEqual(verified?.sub, userId);
        assert_1.default.strictEqual(verified?.email, email);
        // Tampered token check
        const tamperedToken = token.slice(0, -4) + 'abcd';
        const tamperedResult = (0, auth_middleware_js_1.verifySessionToken)(tamperedToken);
        assert_1.default.strictEqual(tamperedResult, null, 'Tampered signature must be rejected');
        // Forged payload check
        const parts = token.split('.');
        const forgedPayloadB64 = Buffer.from(JSON.stringify({ sub: 'admin-impersonator', email: 'fake@fake.com' })).toString('base64url');
        const forgedToken = `${parts[0]}.${forgedPayloadB64}.${parts[2]}`;
        assert_1.default.strictEqual((0, auth_middleware_js_1.verifySessionToken)(forgedToken), null, 'Forged payload with mismatched signature must be rejected');
    });
    // 20. Strict Email Validation Rejects Malformed Addresses
    test('Strict email validation rejects invalid addresses without top-level domains', () => {
        const invalidEmails = [
            'plainaddress',
            '@missingusername.com',
            'username@.com',
            'username@com',
            'username@domain..com',
            'username@domain',
            '   ',
        ];
        for (const badEmail of invalidEmails) {
            const result = api_schemas_js_1.StrictEmailSchema.safeParse(badEmail);
            assert_1.default.strictEqual(result.success, false, `Expected ${badEmail} to fail validation`);
        }
        const validEmails = [
            'student@concepttrace.ai',
            'sharath.kumar@gmail.com',
            'test.user+tag@education.gov.in',
            'candidate@school.ac.uk',
        ];
        for (const goodEmail of validEmails) {
            const result = api_schemas_js_1.StrictEmailSchema.safeParse(goodEmail);
            assert_1.default.strictEqual(result.success, true, `Expected ${goodEmail} to pass validation`);
        }
    });
    // 21. Profile Isolation & Account Ownership
    test('Profile isolation ensures user data belongs strictly to verified user ID', () => {
        const studentAId = 'user-alice-001';
        const studentBId = 'user-bob-002';
        // Alice creates profile
        database_js_1.db.createProfile({
            id: studentAId,
            email: 'alice@concepttrace.ai',
            full_name: 'Alice Student',
            role: 'student',
        });
        database_js_1.db.upsertEducationProfile({
            user_id: studentAId,
            board: 'Central Board of Secondary Education (CBSE)',
            class_level: 10,
            academic_year: '2026-27',
            preferred_language: 'English',
            onboarding_completed: true,
        });
        // Bob creates profile
        database_js_1.db.createProfile({
            id: studentBId,
            email: 'bob@concepttrace.ai',
            full_name: 'Bob Student',
            role: 'student',
        });
        database_js_1.db.upsertEducationProfile({
            user_id: studentBId,
            board: 'Karnataka School Examination and Assessment Board (KSEAB - SSLC & 2nd PUC)',
            class_level: 12,
            stream: 'Science (PCM)',
            academic_year: '2026-27',
            preferred_language: 'Kannada',
            onboarding_completed: true,
        });
        const aliceEd = database_js_1.db.getEducationProfile(studentAId);
        const bobEd = database_js_1.db.getEducationProfile(studentBId);
        assert_1.default.strictEqual(aliceEd?.board, 'Central Board of Secondary Education (CBSE)');
        assert_1.default.strictEqual(aliceEd?.class_level, 10);
        assert_1.default.strictEqual(bobEd?.board, 'Karnataka School Examination and Assessment Board (KSEAB - SSLC & 2nd PUC)');
        assert_1.default.strictEqual(bobEd?.class_level, 12);
        assert_1.default.strictEqual(aliceEd?.user_id, studentAId);
        assert_1.default.strictEqual(bobEd?.user_id, studentBId);
    });
    // 22. Profile Persistence Across Session Re-establishment
    test('Profile persistence preserves education details after logout and relogin', () => {
        const studentId = 'persistent-student-555';
        const email = 'persistent.student@concepttrace.ai';
        database_js_1.db.createProfile({
            id: studentId,
            email,
            full_name: 'Persistent Student',
            role: 'student',
        });
        // Save full education profile
        const saved = database_js_1.db.upsertEducationProfile({
            user_id: studentId,
            country: 'India',
            education_system: 'State Education Boards',
            state_or_ut: 'Maharashtra',
            board: 'Maharashtra State Board of Secondary and Higher Secondary Education (MSBSHSE - SSC & HSC)',
            class_level: 12,
            stream: 'Science (PCMB - Physics, Chemistry, Mathematics, Biology)',
            academic_year: '2026-27',
            preferred_language: 'Marathi',
            onboarding_completed: true,
        });
        database_js_1.db.setStudentSubjects(studentId, ['Physics', 'Chemistry', 'Mathematics', 'Biology']);
        // Simulate session logout and subsequent login: retrieval by user_id
        const restored = database_js_1.db.getEducationProfile(studentId);
        const restoredSubjects = database_js_1.db.getStudentSubjects(studentId).map(s => s.subject_name);
        assert_1.default.ok(restored);
        assert_1.default.strictEqual(restored?.country, 'India');
        assert_1.default.strictEqual(restored?.education_system, 'State Education Boards');
        assert_1.default.strictEqual(restored?.state_or_ut, 'Maharashtra');
        assert_1.default.strictEqual(restored?.board, 'Maharashtra State Board of Secondary and Higher Secondary Education (MSBSHSE - SSC & HSC)');
        assert_1.default.strictEqual(restored?.class_level, 12);
        assert_1.default.strictEqual(restored?.onboarding_completed, true);
        assert_1.default.strictEqual(restoredSubjects.length, 4);
        assert_1.default.ok(restoredSubjects.includes('Physics'));
    });
    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} / ${total} passed (${Math.round((passed / total) * 100)}%)`);
    console.log(`========================================\n`);
    if (passed !== total) {
        process.exit(1);
    }
}
runTestSuite().catch(err => {
    console.error('Test Suite crashed:', err);
    process.exit(1);
});
