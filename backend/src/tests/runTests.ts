import assert from 'assert';
import { db } from '../services/db/database.js';
import { VerificationEngine } from '../services/verification/verificationEngine.js';
import { AnalyticsService } from '../services/analytics/analyticsService.js';
import { StudyTrackingService } from '../services/study-tracking/studyTrackingService.js';

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
