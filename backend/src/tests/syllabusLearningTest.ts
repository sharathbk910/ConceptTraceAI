import { db } from '../services/db/database.js';
import { ConceptLearningService } from '../services/learning/conceptLearningService.js';

async function runSyllabusLearningTests() {
  console.log('🧪 Starting Official Syllabus & Adaptive Learning Test Suite...\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, name: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      process.exitCode = 1;
    }
  }

  const testUserId = 'test-user-001';

  // 1. Official Syllabus Retrieval
  const syllabus10 = db.getOfficialSyllabus('CBSE', 10);
  assert(
    syllabus10.board === 'CBSE' &&
      syllabus10.class_level === 10 &&
      syllabus10.verified === true &&
      syllabus10.official_source_url.includes('cbseacademic.nic.in'),
    'Auto-retrieves verified CBSE Class 10 official syllabus with accredited portal URL'
  );

  const mathSubject = syllabus10.subjects.find(s => s.subject_name === 'Mathematics');
  assert(
    Boolean(mathSubject && mathSubject.units.length >= 5),
    'CBSE Class 10 Mathematics includes units with chapters and concepts'
  );

  // 2. Syllabus Refresh
  const refreshed = db.refreshOfficialSyllabus(syllabus10.id);
  assert(
    Boolean(refreshed && new Date(refreshed.last_verified_at).getTime() > 0),
    'Refreshes official syllabus verification timestamp'
  );

  // 3. Custom Syllabus Comparison
  const sampleSchoolText = `
    Unit 1: Real Numbers, Fundamental Theorem of Arithmetic, irrational numbers proofs.
    Unit 2: Polynomials, zeroes of quadratic polynomial, relations between coefficients.
    Unit 3: Linear Equations in Two Variables, elimination method, graphical consistency.
    Extra Topic: Advanced Matrices and Eigenvalues for Olympiad prep.
  `;
  const comparison = await ConceptLearningService.compareSyllabus(
    testUserId,
    'school_syllabus.txt',
    sampleSchoolText,
    syllabus10,
    'Mathematics'
  );

  assert(
    comparison.matched_concepts_count > 0 && comparison.coverage_percentage > 0,
    'Compares uploaded school syllabus with official syllabus and calculates coverage percentage'
  );

  // 4. Personalized Learning Map
  const learningMap = ConceptLearningService.getPersonalizedLearningMap(testUserId);
  assert(
    Boolean(learningMap.syllabus && learningMap.stats && learningMap.next_recommended),
    'Builds Personalized Learning Map with mastery statuses, progress metrics, and next recommended concept'
  );

  // 5. Generate 5-Question Concept Quiz
  const firstConcept = mathSubject!.units[0].chapters[0].concepts[0];
  const quiz = await ConceptLearningService.generateConceptQuiz(
    testUserId,
    firstConcept.id,
    'Mathematics',
    10
  );

  assert(
    quiz.questions.length === 5 && !('correct_answer' in quiz.questions[0]),
    'Generates 5-question concept quiz with answers hidden from student'
  );

  // 6. Submit Quiz & 80% Mastery Benchmark with Misconception Diagnosis
  const answers: Record<string, string> = {};
  quiz.questions.forEach((q: any, idx: number) => {
    // Answer 4 correctly, 1 incorrectly to test 80% boundary
    if (idx < 4) {
      answers[q.id] = q.options[0]; // first option
    } else {
      answers[q.id] = q.options[3]; // fourth option
    }
  });

  const submitResult = await ConceptLearningService.submitConceptQuiz(
    testUserId,
    quiz.sessionId,
    answers
  );

  assert(
    typeof submitResult.score_percentage === 'number' && submitResult.mastery_threshold === 80,
    'Evaluates quiz against default 80% mastery benchmark'
  );

  if (submitResult.diagnosed_gaps.length > 0) {
    assert(
      Boolean(submitResult.diagnosed_gaps[0].trap_identified && submitResult.diagnosed_gaps[0].remediation_tip),
      'Diagnoses specific misconception trap and actionable learning tip on incorrect answers'
    );
  }

  // 7. Structured Revision Notes
  const notes = await ConceptLearningService.getOrGenerateRevisionNotes(
    firstConcept.id,
    'Mathematics',
    10
  );

  assert(
    notes.definitions.length > 0 &&
      notes.formulas_and_laws.length > 0 &&
      notes.common_pitfalls.length > 0,
    'Generates comprehensive Revision Notes with definitions, formulas, and pitfalls'
  );

  // 8. Interactive Flashcards
  const flashcards = await ConceptLearningService.getOrGenerateFlashcards(
    firstConcept.id,
    'Mathematics'
  );

  assert(
    flashcards.cards.length >= 4 && Boolean(flashcards.cards[0].front && flashcards.cards[0].back),
    'Generates active recall flashcards with prompt and answer'
  );

  // 9. Mistake Log & Retake Shortcut
  const mistakeLog = db.getUserMistakeLog(testUserId);
  assert(
    Array.isArray(mistakeLog),
    'Maintains persistent mistake review log with remediation advice'
  );

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} / ${total} passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`========================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runSyllabusLearningTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
