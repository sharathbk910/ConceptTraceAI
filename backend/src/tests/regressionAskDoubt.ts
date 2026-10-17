import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { AIPipelineService, AIPipelineError } from '../services/ai/aiPipeline.js';
import { db } from '../services/db/database.js';

console.log('================================================================');
console.log('🧪 CONCEPTTRACE AI — ASK A DOUBT REGRESSION & VALIDATION TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName: string, fn: () => Promise<void> | void) {
  totalTests++;
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passedTests++;
      console.log(`✅ [PASS] ${testName}`);
    })
    .catch((err) => {
      console.error(`❌ [FAIL] ${testName}:`, err.message || err);
    });
}

async function main() {
  // Test 1: Mathematics
  await runTest('Test 1 — Mathematics: Solve 2x + 5 = 15', async () => {
    const question = 'Solve 2x + 5 = 15';
    const result = await AIPipelineService.analyzeDoubt({
      questionText: question,
      subject: 'Mathematics',
      classLevel: 10,
      board: 'CBSE',
      preferredLanguage: 'English',
    });

    assert.strictEqual(result.subject, 'Mathematics');
    assert.strictEqual(result.final_answer, 'x = 5');
    assert.ok(result.solution_steps.length >= 2, 'Should contain step-by-step solution');
    assert.ok(result.solution_steps.some(s => s.content.toLowerCase().includes('subtract') && s.content.includes('5')), 'Steps should explain subtracting 5');
    assert.ok(result.final_answer?.includes('5'), 'Answer must be x = 5');
    assert.strictEqual(result.verification_status, 'verified', 'Algebraic verification should succeed');
  });

  // Test 2: Physics
  await runTest('Test 2 — Physics: Newton\'s second law and numerical example', async () => {
    const question = 'Explain Newton\'s second law and give a numerical example.';
    const result = await AIPipelineService.analyzeDoubt({
      questionText: question,
      subject: 'Physics',
      classLevel: 11,
      board: 'CBSE',
      preferredLanguage: 'English',
    });

    assert.strictEqual(result.subject, 'Physics');
    assert.notStrictEqual(result.final_answer, 'x = 5', 'Must NOT return hardcoded x = 5 for Physics');
    assert.ok(result.final_answer?.toLowerCase().includes('f = ma') || result.final_answer?.toLowerCase().includes('force') || result.final_answer?.toLowerCase().includes('mass'), 'Must include F = ma or force');
    assert.ok(result.solution_steps.some(s => s.content.toLowerCase().includes('example') || s.content.includes('kg') || s.content.includes('N') || s.content.includes('=') || s.content.toLowerCase().includes('calculate')), 'Must include numerical example');
    assert.ok(result.concept_analysis.some(c => c.concept.toLowerCase().includes('motion') || c.concept.toLowerCase().includes('newton') || c.concept.toLowerCase().includes('force')), 'Must identify physics concepts');
  });

  // Test 3: Chemistry
  await runTest('Test 3 — Chemistry: Difference between ionic and covalent bonding', async () => {
    const question = 'Explain the difference between ionic and covalent bonding.';
    const result = await AIPipelineService.analyzeDoubt({
      questionText: question,
      subject: 'Chemistry',
      classLevel: 11,
      board: 'CBSE',
      preferredLanguage: 'English',
    });

    assert.strictEqual(result.subject, 'Chemistry');
    assert.notStrictEqual(result.final_answer, 'x = 5', 'Must NOT return hardcoded x = 5 for Chemistry');
    assert.ok(result.solution_steps.some(s => s.content.toLowerCase().includes('transfer') && s.content.toLowerCase().includes('electron')), 'Must explain electron transfer');
    assert.ok(result.solution_steps.some(s => s.content.toLowerCase().includes('shar')), 'Must explain electron sharing');
    assert.ok(result.final_answer?.toLowerCase().includes('transfer') && result.final_answer?.toLowerCase().includes('shar'), 'Answer must explain transfer vs sharing');
  });

  // Test 4: Biology
  await runTest('Test 4 — Biology: Role of mitochondria in a cell', async () => {
    const question = 'Explain the role of mitochondria in a cell.';
    const result = await AIPipelineService.analyzeDoubt({
      questionText: question,
      subject: 'Biology',
      classLevel: 10,
      board: 'CBSE',
      preferredLanguage: 'English',
    });

    assert.strictEqual(result.subject, 'Biology');
    assert.notStrictEqual(result.final_answer, 'x = 5', 'Must NOT return hardcoded x = 5 for Biology');
    assert.ok(result.solution_steps.some(s => s.content.includes('ATP') || s.content.includes('respiration')), 'Must explain cellular respiration and ATP');
    assert.ok(result.final_answer?.toLowerCase().includes('atp') || result.final_answer?.toLowerCase().includes('energy') || result.final_answer?.toLowerCase().includes('powerhouse'), 'Final answer must address mitochondria energy production');
  });

  // Test 5: English
  await runTest('Test 5 — English: Subject and verb in "The students completed their assignment."', async () => {
    const question = 'Identify the subject and verb in the sentence "The students completed their assignment."';
    const result = await AIPipelineService.analyzeDoubt({
      questionText: question,
      subject: 'English',
      classLevel: 10,
      board: 'CBSE',
      preferredLanguage: 'English',
    });

    assert.strictEqual(result.subject, 'English');
    assert.notStrictEqual(result.final_answer, 'x = 5', 'Must NOT return hardcoded x = 5 for English');
    assert.ok(result.final_answer?.includes('The students'), 'Must identify "The students" as subject');
    assert.ok(result.final_answer?.includes('completed'), 'Must identify "completed" as verb');
    assert.ok(result.solution_steps.some(s => s.title.includes('Subject')), 'Step should identify Subject');
    assert.ok(result.solution_steps.some(s => s.title.includes('Verb')), 'Step should identify Verb');
  });

  // Test 6: Different questions within the same subject produce different answers
  await runTest('Test 6 — Distinct Solutions for Different Math Questions', async () => {
    const q1 = 'Solve 2x + 5 = 15';
    const q2 = 'Solve 4x - 8 = 16';

    const res1 = await AIPipelineService.analyzeDoubt({
      questionText: q1,
      subject: 'Mathematics',
      classLevel: 10,
      board: 'CBSE',
      preferredLanguage: 'English',
    });

    const res2 = await AIPipelineService.analyzeDoubt({
      questionText: q2,
      subject: 'Mathematics',
      classLevel: 10,
      board: 'CBSE',
      preferredLanguage: 'English',
    });

    assert.strictEqual(res1.final_answer, 'x = 5');
    assert.strictEqual(res2.final_answer, 'x = 6');
    assert.notStrictEqual(res1.final_answer, res2.final_answer, 'Two distinct questions must produce distinct answers!');
    assert.notStrictEqual(res1.solution_steps[0].content, res2.solution_steps[0].content, 'Steps must be question-specific');
  });

  // Test 7: Uploaded File Extraction & Multimodal Support
  await runTest('Test 7 — Uploaded Academic File Extraction', async () => {
    const testFilePath = path.join(process.cwd(), 'scratch_test_question.txt');
    fs.writeFileSync(testFilePath, 'What is the role of mitochondria?');

    const extraction = await AIPipelineService.extractQuestion(null, testFilePath);
    assert.ok(extraction.extracted_question.length > 0);
    assert.ok(extraction.extraction_confidence > 0.5);

    const result = await AIPipelineService.analyzeDoubt({
      extractedText: 'Explain the role of mitochondria in cellular energy production.',
      filePath: testFilePath,
      subject: 'Biology',
      classLevel: 10,
      board: 'CBSE',
      preferredLanguage: 'English',
    });

    assert.strictEqual(result.subject, 'Biology');
    assert.ok(result.final_answer?.toLowerCase().includes('atp') || result.final_answer?.toLowerCase().includes('respiration'));

    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  // Test 8: Contextual Follow-Up
  await runTest('Test 8 — Contextual Follow-Up Questioning', async () => {
    const origQ = 'Explain Newton\'s second law of motion.';
    const origSol = { final_answer: 'F = ma' };
    const followUp = 'What happens if acceleration is zero?';

    const answer = await AIPipelineService.answerFollowUp(origQ, origSol, followUp, 'English');
    assert.ok(answer.length > 20, 'Should provide pedagogical follow-up');
    assert.ok(answer.includes('zero') || answer.includes('F = ma') || answer.includes('constant velocity'), 'Must answer zero acceleration context');
  });

  // Test 9: Failure Handling (No Silent Fake Answers)
  await runTest('Test 9 — Failure Handling: Throws Explicit Error on Provider Failure', async () => {
    // Inject a failing mock provider
    AIPipelineService.setMockProviderForTesting(async () => {
      throw new AIPipelineError('AI_RATE_LIMIT_EXCEEDED', 'Provider quota limit reached.', 429);
    });

    try {
      await AIPipelineService.analyzeDoubt({
        questionText: 'Any question',
        subject: 'Physics',
        classLevel: 11,
        board: 'CBSE',
        preferredLanguage: 'English',
      });
      assert.fail('Should have thrown an error instead of returning a fake answer!');
    } catch (err: any) {
      assert.strictEqual(err.code, 'AI_RATE_LIMIT_EXCEEDED');
      assert.strictEqual(err.statusCode, 429);
    } finally {
      AIPipelineService.setMockProviderForTesting(null);
    }
  });

  // Test 10: Database Persistence & Status Integrity
  await runTest('Test 10 — Database Query Persistence and Status Tracking', async () => {
    const testUserId = 'test-reg-user-123';
    const query = db.createQuery({
      user_id: testUserId,
      input_type: 'text',
      question_text: 'Solve 2x + 5 = 15',
      subject: 'Mathematics',
      status: 'processing',
    });

    assert.strictEqual(query.status, 'processing');
    assert.ok(query.id);

    // Update query with completed status
    const updated = db.updateQuery(query.id, {
      status: 'completed',
      error_code: null,
      error_message: null,
    });
    assert.strictEqual(updated?.status, 'completed');

    // Retrieve by ID and verify isolation
    const fetched = db.getQueryById(query.id, testUserId);
    assert.strictEqual(fetched?.id, query.id);
    assert.strictEqual(fetched?.status, 'completed');

    // Cross-user isolation check
    const otherUserFetch = db.getQueryById(query.id, 'other-unauthorized-user');
    assert.strictEqual(otherUserFetch, undefined, 'User data must be isolated');

    // Clean up
    db.deleteQuery(query.id, testUserId);
  });

  console.log('\n================================================================');
  console.log(`📊 SUMMARY: ${passedTests}/${totalTests} Tests Passed successfully!`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
