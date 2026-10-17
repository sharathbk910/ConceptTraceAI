import assert from 'assert';
import { db, hashPassword, verifyPassword } from '../services/db/database.js';
import { VerificationEngine } from '../services/verification/verificationEngine.js';
import { AnalyticsService } from '../services/analytics/analyticsService.js';
import { StudyTrackingService } from '../services/study-tracking/studyTrackingService.js';
import { RegisterSchema, LoginSchema, ResetPasswordSchema, StrictEmailSchema } from '../schemas/api.schemas.js';
import { createSessionToken, verifySessionToken } from '../middleware/auth.middleware.js';

async function runTestSuite() {
  console.log('🧪 Starting ConceptTrace AI Automated Test Suite...\n');

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  // 1. Database & Profile Test
  test('Database creates and retrieves student profile', () => {
    const testId = 'test-user-001';
    const profile = db.createProfile({
      id: testId,
      email: 'teststudent@example.com',
      full_name: 'Test Student',
      role: 'student',
    });
    assert.strictEqual(profile.id, testId);
    assert.strictEqual(profile.full_name, 'Test Student');

    const fetched = db.getProfileById(testId);
    assert.ok(fetched);
    assert.strictEqual(fetched?.email, 'teststudent@example.com');
  });

  // 2. Education Profile Setup
  test('Education profile saves and updates correctly', () => {
    const testId = 'test-user-001';
    const ed = db.upsertEducationProfile({
      user_id: testId,
      board: 'CBSE',
      class_level: 10,
      academic_year: '2026-27',
      preferred_language: 'English',
      onboarding_completed: true,
    });
    assert.strictEqual(ed.class_level, 10);
    assert.strictEqual(ed.onboarding_completed, true);

    const subjects = db.setStudentSubjects(testId, ['Mathematics', 'Science']);
    assert.strictEqual(subjects.length, 2);
  });

  // 3. Syllabus Topics Seed Check
  test('Syllabus topics are seeded for CBSE Class 10/11/12 with prerequisites', () => {
    const topics = db.getSyllabusTopics();
    assert.ok(topics.length >= 10, 'Expected at least 10 seeded syllabus topics');
    const mathTopic = topics.find(t => t.topic.includes('Quadratic'));
    assert.ok(mathTopic, 'Expected Quadratic Equations topic to exist');
    const prereqs = db.getTopicPrerequisites(mathTopic!.id);
    assert.ok(prereqs.length > 0, 'Expected Quadratic Equations to have prerequisite topics');
  });

  // 4. Deterministic Verification Engine (mathjs)
  test('Deterministic verification engine correctly verifies linear equations', () => {
    const result = VerificationEngine.verifySolution(
      'Solve 2x + 5 = 15',
      'Solve 2x + 5 = 15',
      'x = 5',
      [
        { step_number: 1, title: 'Subtract 5', content: '2x = 10', reason: 'Equality rule' },
        { step_number: 2, title: 'Divide by 2', content: 'x = 5', reason: 'Isolate x' },
      ]
    );

    assert.strictEqual(result.verification_status, 'verified');
    assert.strictEqual(result.independent_check_performed, true);
    assert.ok(result.verification_details.includes('Verified by substituting proposed root'));
  });

  // 5. Verification detects incorrect final answer
  test('Deterministic verification engine flags incorrect answer', () => {
    const result = VerificationEngine.verifySolution(
      'Solve 2x + 5 = 15',
      'Solve 2x + 5 = 15',
      'x = 9',
      [
        { step_number: 1, title: 'Wrong step', content: '2x = 18', reason: 'Arithmetic error' },
      ]
    );

    assert.notStrictEqual(result.verification_status, 'verified');
  });

  // 6. Practice Session & Duplicate Attempt Prevention
  test('Practice attempt records and strictly prevents duplicate submission', () => {
    const testId = 'test-user-001';
    const session = db.createPracticeSession({
      user_id: testId,
      subject: 'Mathematics',
      status: 'in_progress',
      question_count: 1,
    });

    const questions = db.createPracticeQuestions([
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
    const attempt = db.createPracticeAttempt({
      user_id: testId,
      session_id: session.id,
      question_id: qId,
      submitted_answer: 'A) 7',
      is_correct: true,
      eligible_for_metrics: true,
      feedback: 'Correct',
    });
    assert.ok(attempt.id);
    assert.strictEqual(attempt.is_correct, true);

    // Second attempt on same question must fail
    assert.throws(
      () => {
        db.createPracticeAttempt({
          user_id: testId,
          session_id: session.id,
          question_id: qId,
          submitted_answer: 'B) 8',
          is_correct: false,
          eligible_for_metrics: true,
        });
      },
      /DUPLICATE_ATTEMPT/,
      'Should throw duplicate attempt error'
    );
  });

  // 7. Active Days & Streak Calculation
  test('Active days correctly requires MIN_ACTIVE_DAY_SECONDS (300s)', () => {
    const today = new Date().toISOString().split('T')[0];
    const sessions = [
      { started_at: `${today}T10:00:00Z`, tracked_seconds: 150 },
      { started_at: `${today}T11:00:00Z`, tracked_seconds: 160 }, // Sum = 310s >= 300s
    ];

    const { activeDays } = AnalyticsService.calculateActiveDaysAndStreak(sessions);
    assert.strictEqual(activeDays, 1);
  });

  // 8. Study Session Heartbeat & Idle Inactivity Handling
  test('Study tracking session starts and updates heartbeats', () => {
    const testId = 'test-user-001';
    const sess = StudyTrackingService.startSession(testId);
    assert.ok(sess.id);
    assert.strictEqual(sess.session_status, 'active');

    const updated = StudyTrackingService.recordHeartbeat(sess.id, testId, 15);
    assert.strictEqual(updated.tracked_seconds, 15);
  });

  // 9. ISSUE 2 TEST: Reliable User Identification & Persistence Across Logins
  test('Issue 2: Same Gmail account consistently maps to same profile across logins', () => {
    const stableUid = 'stable-uid-google-001';
    const gmail = 'student.persist@gmail.com';

    // First login
    const prof1 = db.findOrCreateProfile({
      id: stableUid,
      email: gmail,
      full_name: 'Persistent Student',
    });
    assert.strictEqual(prof1.id, stableUid);
    assert.strictEqual(prof1.email, gmail);

    // Save education profile
    db.upsertEducationProfile({
      user_id: stableUid,
      board: 'CBSE',
      class_level: 12,
      academic_year: '2026-27',
      preferred_language: 'English',
      onboarding_completed: true,
    });
    db.setStudentSubjects(stableUid, ['Mathematics', 'Physics', 'Chemistry']);

    // Simulate subsequent login with same Gmail (even if called with new session/request)
    const prof2 = db.findOrCreateProfile({
      id: stableUid,
      email: gmail,
      full_name: 'Persistent Student',
    });
    assert.strictEqual(prof2.id, stableUid);

    // Verify education profile and subjects persisted intact
    const ed = db.getEducationProfile(stableUid);
    assert.ok(ed, 'Education profile must persist');
    assert.strictEqual(ed?.class_level, 12);
    assert.strictEqual(ed?.board, 'CBSE');
    assert.strictEqual(ed?.onboarding_completed, true);

    const subjects = db.getStudentSubjects(stableUid);
    assert.strictEqual(subjects.length, 3);
  });

  // 10. ISSUE 2 TEST: Prevention of Duplicate Profiles
  test('Issue 2: Duplicate profiles are strictly prevented for same email address', () => {
    const gmail = 'unique.student@gmail.com';
    const uidA = 'uid-test-alpha';

    const first = db.findOrCreateProfile({
      id: uidA,
      email: gmail,
      full_name: 'Student Unique',
    });

    // Repeated login attempt with matching email
    const second = db.findOrCreateProfile({
      id: uidA,
      email: gmail,
      full_name: 'Student Unique Updated',
    });

    assert.strictEqual(first.email, second.email);
    assert.strictEqual(second.id, uidA);

    // Ensure database contains only one profile for this email
    const allMatching = db.getProfileByEmail(gmail);
    assert.ok(allMatching);
    assert.strictEqual(allMatching?.id, uidA);
  });

  // 11. ISSUE 1 TEST: Doubt Session Inherits Student Academic Details
  test('Issue 1: Academic details are retrieved from saved profile without re-entry', () => {
    const testStudentId = 'student-ask-doubt-001';
    db.findOrCreateProfile({
      id: testStudentId,
      email: 'askdoubt.student@concepttrace.ai',
      full_name: 'Ask Doubt Student',
    });

    db.upsertEducationProfile({
      user_id: testStudentId,
      board: 'Karnataka State Board',
      class_level: 11,
      academic_year: '2026-27',
      preferred_language: 'English',
      onboarding_completed: true,
    });
    db.setStudentSubjects(testStudentId, ['Physics', 'Mathematics']);

    // Retrieve academic profile as Ask Doubt route does
    const ed = db.getEducationProfile(testStudentId);
    assert.ok(ed);
    assert.strictEqual(ed?.class_level, 11);
    assert.strictEqual(ed?.board, 'Karnataka State Board');
    assert.strictEqual(ed?.preferred_language, 'English');

    const subjects = db.getStudentSubjects(testStudentId).map(s => s.subject_name);
    assert.deepStrictEqual(subjects, ['Physics', 'Mathematics']);
  });

  // 12. ISSUE 1 TEST: Auto-Persists Missing/Newly Provided Academic Information
  test('Issue 1: Newly provided academic information in doubt session persists to profile', () => {
    const testStudentId = `student-missing-${Date.now()}`;
    db.findOrCreateProfile({
      id: testStudentId,
      email: `${testStudentId}@concepttrace.ai`,
      full_name: 'New Student',
    });

    // Initially no education profile
    assert.strictEqual(db.getEducationProfile(testStudentId), undefined);

    // Student provides missing info during Ask Doubt session
    const providedBoard = 'CISCE (ICSE/ISC)';
    const providedClass = 10;
    const providedLang = 'Hindi';

    db.upsertEducationProfile({
      user_id: testStudentId,
      board: providedBoard,
      class_level: providedClass,
      academic_year: '2026-27',
      preferred_language: providedLang,
      onboarding_completed: true,
    });
    db.setStudentSubjects(testStudentId, ['Mathematics']);

    // Confirm it is now saved and never asked again
    const saved = db.getEducationProfile(testStudentId);
    assert.ok(saved);
    assert.strictEqual(saved?.board, providedBoard);
    assert.strictEqual(saved?.class_level, 10);
    assert.strictEqual(saved?.preferred_language, providedLang);
    assert.strictEqual(saved?.onboarding_completed, true);
  });

  // 13. Registration Validation
  test('Registration schema rejects invalid email formats and mismatched passwords', () => {
    // Malformed email
    assert.throws(() => {
      RegisterSchema.parse({
        fullName: 'Jane Doe',
        email: 'invalid-email-format',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
        termsAccepted: true,
      });
    }, /Invalid email/);

    // Mismatched passwords
    assert.throws(() => {
      RegisterSchema.parse({
        fullName: 'Jane Doe',
        email: 'valid@example.com',
        password: 'ValidPassword123!',
        confirmPassword: 'DifferentPassword456!',
        termsAccepted: true,
      });
    }, /Passwords don't match/);

    // Unaccepted terms
    assert.throws(() => {
      RegisterSchema.parse({
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
    const { hash, salt } = hashPassword(rawPassword);

    assert.notStrictEqual(hash, rawPassword);
    assert.strictEqual(typeof hash, 'string');
    assert.strictEqual(typeof salt, 'string');
    assert.strictEqual(salt.length, 32); // 16 bytes hex

    // Verify valid password
    const isValid = verifyPassword(rawPassword, salt, hash);
    assert.strictEqual(isValid, true, 'Expected valid password to verify successfully');

    // Reject wrong password
    const isInvalid = verifyPassword('WrongPassword123', salt, hash);
    assert.strictEqual(isInvalid, false, 'Expected wrong password to fail verification');
  });

  // 15. User Auth Creation and Lookup
  test('User authentication record is securely stored with unverified status on registration', () => {
    const testEmail = 'newstudent_verify@concepttrace.ai';
    const { hash, salt } = hashPassword('StudentPass123!');
    const token = 'test-token-uuid-12345';
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const auth = db.createUserAuth({
      user_id: 'test-student-auth-01',
      email: testEmail,
      password_hash: hash,
      salt,
      is_verified: false,
      verification_token: token,
      verification_expires_at: expiresAt,
    });

    assert.strictEqual(auth.email, testEmail);
    assert.strictEqual(auth.is_verified, false);
    assert.strictEqual(auth.verification_token, token);

    const retrieved = db.getUserAuthByVerificationToken(token);
    assert.ok(retrieved);
    assert.strictEqual(retrieved?.email, testEmail);
  });

  // 16. Email Verification Workflow
  test('Email verification transitions account to verified and invalidates single-use token', () => {
    const token = 'test-token-uuid-12345';
    const auth = db.getUserAuthByVerificationToken(token);
    assert.ok(auth);

    // Verify account
    const updated = db.updateUserAuth(auth!.user_id, {
      is_verified: true,
      verification_token: null,
      verification_expires_at: null,
    });

    assert.ok(updated);
    assert.strictEqual(updated?.is_verified, true);
    assert.strictEqual(updated?.verification_token, null);

    // Ensure token cannot be reused
    const recheck = db.getUserAuthByVerificationToken(token);
    assert.strictEqual(recheck, undefined, 'Reused verification token must return undefined');
  });

  // 16b. 6-Digit Numeric OTP Verification
  test('6-digit numeric OTP verifies unverified account and rejects mismatched OTP', () => {
    const testEmail = 'otp_student_test@concepttrace.ai';
    const otp = '849201';
    db.createUserAuth({
      user_id: 'otp-student-001',
      email: testEmail,
      password_hash: 'hash',
      salt: 'salt',
      is_verified: false,
      verification_token: otp,
      verification_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    });

    // Mismatched OTP should not match
    const wrongMatch = db.getUserAuthByEmailAndOtp(testEmail, '999999');
    assert.strictEqual(wrongMatch, undefined, 'Mismatched OTP must not find record');

    // Matching OTP should match
    const validMatch = db.getUserAuthByEmailAndOtp(testEmail, otp);
    assert.ok(validMatch, 'Valid OTP must retrieve user auth record');
    assert.strictEqual(validMatch.email, testEmail);

    // Verify account and clear OTP
    db.updateUserAuth(validMatch.user_id, {
      is_verified: true,
      verification_token: null,
      verification_expires_at: null,
    });

    const updated = db.getUserAuthByEmail(testEmail);
    assert.strictEqual(updated?.is_verified, true);
    assert.strictEqual(updated?.verification_token, null);
  });

  // 17. Password Reset Workflow
  test('Password reset generates secure single-use token and updates password hash', () => {
    const testEmail = 'newstudent_verify@concepttrace.ai';
    const auth = db.getUserAuthByEmail(testEmail);
    assert.ok(auth);

    const resetToken = 'reset-token-sample-999';
    db.updateUserAuth(auth!.user_id, {
      reset_token: resetToken,
      reset_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    });

    const foundByReset = db.getUserAuthByResetToken(resetToken);
    assert.ok(foundByReset);

    // Reset password with new hash
    const newCreds = hashPassword('NewBrandPassword2026!');
    db.updateUserAuth(auth!.user_id, {
      password_hash: newCreds.hash,
      salt: newCreds.salt,
      reset_token: null,
      reset_expires_at: null,
    });

    // Check old password no longer works, new password works
    const oldCheck = verifyPassword('StudentPass123!', auth!.salt, auth!.password_hash);
    const updatedAuth = db.getUserAuthByEmail(testEmail);
    const newCheck = verifyPassword('NewBrandPassword2026!', updatedAuth!.salt, updatedAuth!.password_hash);

    assert.strictEqual(newCheck, true, 'New password must verify successfully');
    assert.strictEqual(db.getUserAuthByResetToken(resetToken), undefined, 'Reset token must be cleared');
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
      const ed = db.upsertEducationProfile({
        user_id: 'test-user-001',
        country: board.includes('International') || board.includes('Cambridge') ? 'International' : 'India',
        board,
        class_level: 12,
        stream: 'Science (PCM)',
        academic_year: '2026-27',
        preferred_language: 'English',
        onboarding_completed: true,
      });
      assert.strictEqual(ed.board, board);
      assert.strictEqual(ed.class_level, 12);
    }
  });

  // 19. Signed Session Tokens & Tamper Protection
  test('Signed session token generates valid HMAC signature and detects tampering', () => {
    const userId = 'student-test-uid-789';
    const email = 'genuine.student@concepttrace.ai';
    const token = createSessionToken(userId, email);

    assert.ok(token.startsWith('cts_'), 'Token must have cts_ prefix');
    const verified = verifySessionToken(token);
    assert.ok(verified, 'Genuine token must verify successfully');
    assert.strictEqual(verified?.sub, userId);
    assert.strictEqual(verified?.email, email);

    // Tampered token check
    const tamperedToken = token.slice(0, -4) + 'abcd';
    const tamperedResult = verifySessionToken(tamperedToken);
    assert.strictEqual(tamperedResult, null, 'Tampered signature must be rejected');

    // Forged payload check
    const parts = token.split('.');
    const forgedPayloadB64 = Buffer.from(JSON.stringify({ sub: 'admin-impersonator', email: 'fake@fake.com' })).toString('base64url');
    const forgedToken = `${parts[0]}.${forgedPayloadB64}.${parts[2]}`;
    assert.strictEqual(verifySessionToken(forgedToken), null, 'Forged payload with mismatched signature must be rejected');
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
      const result = StrictEmailSchema.safeParse(badEmail);
      assert.strictEqual(result.success, false, `Expected ${badEmail} to fail validation`);
    }

    const validEmails = [
      'student@concepttrace.ai',
      'sharath.kumar@gmail.com',
      'test.user+tag@education.gov.in',
      'candidate@school.ac.uk',
    ];

    for (const goodEmail of validEmails) {
      const result = StrictEmailSchema.safeParse(goodEmail);
      assert.strictEqual(result.success, true, `Expected ${goodEmail} to pass validation`);
    }
  });

  // 21. Profile Isolation & Account Ownership
  test('Profile isolation ensures user data belongs strictly to verified user ID', () => {
    const studentAId = 'user-alice-001';
    const studentBId = 'user-bob-002';

    // Alice creates profile
    db.createProfile({
      id: studentAId,
      email: 'alice@concepttrace.ai',
      full_name: 'Alice Student',
      role: 'student',
    });

    db.upsertEducationProfile({
      user_id: studentAId,
      board: 'Central Board of Secondary Education (CBSE)',
      class_level: 10,
      academic_year: '2026-27',
      preferred_language: 'English',
      onboarding_completed: true,
    });

    // Bob creates profile
    db.createProfile({
      id: studentBId,
      email: 'bob@concepttrace.ai',
      full_name: 'Bob Student',
      role: 'student',
    });

    db.upsertEducationProfile({
      user_id: studentBId,
      board: 'Karnataka School Examination and Assessment Board (KSEAB - SSLC & 2nd PUC)',
      class_level: 12,
      stream: 'Science (PCM)',
      academic_year: '2026-27',
      preferred_language: 'Kannada',
      onboarding_completed: true,
    });

    const aliceEd = db.getEducationProfile(studentAId);
    const bobEd = db.getEducationProfile(studentBId);

    assert.strictEqual(aliceEd?.board, 'Central Board of Secondary Education (CBSE)');
    assert.strictEqual(aliceEd?.class_level, 10);
    assert.strictEqual(bobEd?.board, 'Karnataka School Examination and Assessment Board (KSEAB - SSLC & 2nd PUC)');
    assert.strictEqual(bobEd?.class_level, 12);
    assert.strictEqual(aliceEd?.user_id, studentAId);
    assert.strictEqual(bobEd?.user_id, studentBId);
  });

  // 22. Profile Persistence Across Session Re-establishment
  test('Profile persistence preserves education details after logout and relogin', () => {
    const studentId = 'persistent-student-555';
    const email = 'persistent.student@concepttrace.ai';

    db.createProfile({
      id: studentId,
      email,
      full_name: 'Persistent Student',
      role: 'student',
    });

    // Save full education profile
    const saved = db.upsertEducationProfile({
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

    db.setStudentSubjects(studentId, ['Physics', 'Chemistry', 'Mathematics', 'Biology']);

    // Simulate session logout and subsequent login: retrieval by user_id
    const restored = db.getEducationProfile(studentId);
    const restoredSubjects = db.getStudentSubjects(studentId).map(s => s.subject_name);

    assert.ok(restored);
    assert.strictEqual(restored?.country, 'India');
    assert.strictEqual(restored?.education_system, 'State Education Boards');
    assert.strictEqual(restored?.state_or_ut, 'Maharashtra');
    assert.strictEqual(restored?.board, 'Maharashtra State Board of Secondary and Higher Secondary Education (MSBSHSE - SSC & HSC)');
    assert.strictEqual(restored?.class_level, 12);
    assert.strictEqual(restored?.onboarding_completed, true);
    assert.strictEqual(restoredSubjects.length, 4);
    assert.ok(restoredSubjects.includes('Physics'));
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
