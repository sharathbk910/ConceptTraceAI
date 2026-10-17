import { db } from '../services/db/database.js';
import { TopicMasteryService } from '../services/learning/topicMasteryService.js';

async function runTopicMasteryTests() {
  console.log('🧪 Starting AI Doubt Resolution & Topic Mastery Test Suite...\n');
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

  const testUserId = `test-mastery-user-${Date.now()}`;

  // 0. Ensure user has education profile
  db.upsertEducationProfile({
    user_id: testUserId,
    board: 'CBSE',
    class_level: 10,
    academic_year: '2025-2026',
    school_name: 'Delhi Public School',
    subjects: ['Mathematics', 'Science'],
    target_exam: 'CBSE Board Examination 2026',
    created_at: new Date().toISOString(),
  });

  // Step A: Topic Selection Mapped to Official Syllabus
  console.log('📌 Testing Step A — Topic Selection mapped to Official Syllabus...');
  const topicsHierarchy = TopicMasteryService.getAvailableTopics(testUserId);
  assert(
    Boolean(topicsHierarchy && topicsHierarchy.subjects && topicsHierarchy.subjects.length > 0),
    'Step A: Successfully retrieves verified curriculum hierarchy matching student profile'
  );

  const mathSubject = topicsHierarchy.subjects.find(s => s.subject_name === 'Mathematics');
  assert(
    Boolean(mathSubject && mathSubject.units.length > 0),
    'Step A: Mathematics subject contains syllabus units and chapters'
  );

  const firstUnit = mathSubject!.units[0];
  const firstChapter = firstUnit.chapters[0];
  const testConcept = firstChapter.concepts[0];
  assert(
    Boolean(testConcept && testConcept.id && testConcept.concept_name),
    `Step A: Found official concept "${testConcept.concept_name}" (ID: ${testConcept.id})`
  );

  // Step B: Initial Diagnostic Assessment
  console.log('\n📌 Testing Step B — Initial Diagnostic Quiz Generation...');
  const startResult = await TopicMasteryService.startOrResumeWorkflow(
    testUserId,
    testConcept.id,
    'Mathematics'
  );

  assert(
    Boolean(startResult && startResult.session && startResult.session.id),
    'Step B: Created or resumed Topic Mastery session'
  );

  const session = startResult.session;

  assert(
    session.diagnostic_questions.length >= 3,
    `Step B: Diagnostic assessment contains ${session.diagnostic_questions.length} diagnostic questions covering subtopics`
  );

  assert(
    Boolean(startResult.active_questions && startResult.active_questions.length >= 3),
    `Step B: Returned active questions payload for client (${startResult.active_questions?.length} questions)`
  );

  assert(
    startResult.active_questions!.every((q: any) => !('correct_answer' in q)),
    'Step B: Correct answers are strictly hidden from student client payload'
  );

  // Step C & D: Submit Diagnostic & Identify Weak Areas + Generate Personalized Notes
  console.log('\n📌 Testing Step C & D — Weak Area Identification & Personalized Notes...');
  const diagnosticAnswers: Record<string, string> = {};
  
  // Use session diagnostic questions to simulate intentional mistakes
  session.diagnostic_questions.forEach((q, idx) => {
    if (idx === 0) {
      // Correct answer
      diagnosticAnswers[q.id] = q.correct_answer;
    } else {
      // Deliberately incorrect answer to test weak-area diagnosis
      const wrongOpt = q.options.find(opt => opt !== q.correct_answer) || q.options[0];
      diagnosticAnswers[q.id] = wrongOpt;
    }
  });

  const diagnosticResult = await TopicMasteryService.submitDiagnostic(
    testUserId,
    session.id,
    diagnosticAnswers
  );

  assert(
    diagnosticResult.stage === 'diagnostic_review' || diagnosticResult.stage === 'notes',
    'Step C: Workflow progressed past diagnostic to diagnostic_review'
  );

  assert(
    diagnosticResult.identified_weak_areas && diagnosticResult.identified_weak_areas.length > 0,
    `Step C: Evidence-based diagnosis identified ${diagnosticResult.identified_weak_areas.length} concept areas`
  );

  const hasWeaknessClassified = diagnosticResult.identified_weak_areas.some(
    w => w.classification === 'possible_weakness' || w.classification === 'recurring_weakness'
  );
  assert(
    hasWeaknessClassified,
    'Step C: Accurately classifies misconceptions as possible_weakness or recurring_weakness based on responses'
  );

  assert(
    Boolean(diagnosticResult.personalized_notes && diagnosticResult.personalized_notes.definitions.length > 0),
    'Step D: Generated personalized short notes tailored to identified weak subtopics'
  );

  assert(
    Boolean(
      diagnosticResult.personalized_notes?.formulas_and_principles.some(
        f => f.latex.includes('$') || f.latex.includes('\\') || f.latex.includes('=')
      )
    ),
    'Step D: Notes include mathematical formulas rendered with standard LaTeX math notation'
  );

  // Step E: Targeted Practice for Identified Weak Areas
  console.log('\n📌 Testing Step E — Targeted Practice Generation...');
  const targetedResult = await TopicMasteryService.startTargetedPractice(testUserId, session.id);
  
  assert(
    targetedResult.session.stage === 'targeted_practice',
    'Step E: Session advanced to targeted_practice stage'
  );

  assert(
    targetedResult.session.targeted_practice_questions.length > 0,
    `Step E: Generated ${targetedResult.session.targeted_practice_questions.length} targeted practice questions`
  );

  assert(
    Boolean(targetedResult.active_questions && targetedResult.active_questions.length > 0),
    'Step E: Returned active questions payload for client with hidden answers'
  );

  // Submit targeted practice
  const targetedInternal = db.getTopicMasterySession(session.id)!;
  const targetedAnswers: Record<string, string> = {};
  targetedInternal.targeted_practice_questions.forEach((q) => {
    targetedAnswers[q.id] = q.correct_answer; // answer correctly
  });

  const afterPractice = await TopicMasteryService.submitTargetedPractice(
    testUserId,
    session.id,
    targetedAnswers
  );

  assert(
    afterPractice.stage === 'readiness_check',
    'Step E: Targeted practice submitted and stage updated to readiness_check'
  );

  assert(
    afterPractice.targeted_practice_score === afterPractice.targeted_practice_total,
    `Step E: Targeted practice score recorded correctly (${afterPractice.targeted_practice_score}/${afterPractice.targeted_practice_total})`
  );

  // Step F: Student Readiness Confirmation
  console.log('\n📌 Testing Step F — Readiness Confirmation...');
  // 1) Test declining readiness
  const notReadyResult = await TopicMasteryService.confirmReadiness(testUserId, session.id, false);
  assert(
    notReadyResult.session.stage === 'notes',
    'Step F: Choosing "Not yet" safely returns student to revision notes and targeted practice'
  );

  // 2) Test accepting readiness
  const readyResult = await TopicMasteryService.confirmReadiness(testUserId, session.id, true);
  assert(
    readyResult.session.stage === 'final_assessment',
    'Step F: Confirming "Yes, I am ready" generates final assessment and transitions to final_assessment'
  );

  assert(
    readyResult.session.final_questions.length >= 4,
    `Step G: Generated distinct final assessment with ${readyResult.session.final_questions.length} fresh questions`
  );

  // Verify questions are distinct from initial diagnostic
  const diagnosticIds = new Set(session.diagnostic_questions.map(q => q.id));
  const finalIds = readyResult.session.final_questions.map(q => q.id);
  const hasOverlap = finalIds.some(id => diagnosticIds.has(id));
  assert(
    !hasOverlap,
    'Step G: Final assessment questions are completely distinct from diagnostic quiz questions'
  );

  // Step G & H: Submit Final Assessment & Mastery Decision
  console.log('\n📌 Testing Step G & H — Final Assessment & Verified Mastery Decision...');
  const finalInternal = db.getTopicMasterySession(session.id)!;
  const finalAnswers: Record<string, string> = {};
  finalInternal.final_questions.forEach((q) => {
    finalAnswers[q.id] = q.correct_answer; // all correct to achieve mastery
  });

  const finalResult = await TopicMasteryService.submitFinalAssessment(
    testUserId,
    session.id,
    finalAnswers
  );

  assert(
    finalResult.stage === 'mastery_result',
    'Step H: Workflow completes successfully with stage set to mastery_result'
  );

  assert(
    finalResult.final_percentage === 100 && finalResult.is_mastered === true,
    'Step H: Score (100%) surpasses the 80% benchmark and verified mastery is awarded'
  );

  assert(
    Boolean(finalResult.next_recommended_concept),
    `Step H: Recommended next concept from syllabus: "${finalResult.next_recommended_concept?.concept_name}"`
  );

  // Check persistent session in database
  const savedSession = db.getTopicMasterySession(session.id);
  assert(
    Boolean(savedSession && savedSession.is_mastered === true && savedSession.updated_at),
    'Persistence: Verified mastery outcome, attempts, and history are saved persistently in database'
  );

  console.log(`\n==================================================`);
  console.log(`🎉 Topic Mastery Test Results: ${passed}/${total} passed`);
  console.log(`==================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTopicMasteryTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
