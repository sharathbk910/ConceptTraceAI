"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
async function main() {
    const BASE_URL = 'http://localhost:8000/api/v1';
    console.log('🌐 Testing Live ConceptTrace AI Backend API on port 8000...\n');
    // Register a test user
    const email = `test_live_${Date.now()}@concepttrace.ai`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fullName: 'Test Student',
            email,
            password: 'password123',
            confirmPassword: 'password123',
            termsAccepted: true,
        }),
    });
    const regData = (await regRes.json());
    assert_1.default.ok(regData.success, 'Registration must succeed');
    const token = regData.data.token;
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    };
    // Configure profile
    await fetch(`${BASE_URL}/profile/education`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
            board: 'CBSE',
            class_level: 10,
            academic_year: '2026-27',
            preferred_language: 'English',
            subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'],
        }),
    });
    // 1. Math Doubt
    console.log('1. Submitting Math Doubt: "Solve 2x + 5 = 15"...');
    const mathRes = await fetch(`${BASE_URL}/questions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            question_text: 'Solve 2x + 5 = 15',
            subject: 'Mathematics',
            class_level: 10,
            board: 'CBSE',
            language: 'English',
        }),
    });
    const mathData = (await mathRes.json());
    if (!mathData.success) {
        console.error('Math error:', mathData.error);
    }
    assert_1.default.ok(mathData.success, 'Math doubt must succeed');
    assert_1.default.ok(mathData.data.solution.final_answer.includes('5'), 'Final answer must solve for 5');
    console.log('   ✅ Math Answer:', mathData.data.solution.final_answer);
    // 2. Physics Doubt
    console.log('2. Submitting Physics Doubt: "Explain Newton\'s second law and give a numerical example."...');
    const physRes = await fetch(`${BASE_URL}/questions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            question_text: 'Explain Newton\'s second law and give a numerical example.',
            subject: 'Physics',
            class_level: 11,
            board: 'CBSE',
            language: 'English',
        }),
    });
    const physData = (await physRes.json());
    assert_1.default.ok(physData.success, 'Physics doubt must succeed');
    assert_1.default.notStrictEqual(physData.data.solution.final_answer, 'x = 5');
    assert_1.default.ok(physData.data.solution.final_answer.includes('F = ma'));
    console.log('   ✅ Physics Answer:', physData.data.solution.final_answer);
    // 3. Chemistry Doubt
    console.log('3. Submitting Chemistry Doubt: "Explain the difference between ionic and covalent bonding."...');
    const chemRes = await fetch(`${BASE_URL}/questions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            question_text: 'Explain the difference between ionic and covalent bonding.',
            subject: 'Chemistry',
            class_level: 11,
            board: 'CBSE',
            language: 'English',
        }),
    });
    const chemData = (await chemRes.json());
    assert_1.default.ok(chemData.success, 'Chemistry doubt must succeed');
    assert_1.default.notStrictEqual(chemData.data.solution.final_answer, 'x = 5');
    assert_1.default.ok(chemData.data.solution.final_answer.toLowerCase().includes('ionic') && chemData.data.solution.final_answer.toLowerCase().includes('covalent'));
    console.log('   ✅ Chemistry Answer:', chemData.data.solution.final_answer.substring(0, 80) + '...');
    await new Promise(r => setTimeout(r, 1500));
    // 4. Biology Doubt
    console.log('4. Submitting Biology Doubt: "Explain the role of mitochondria in a cell."...');
    const bioRes = await fetch(`${BASE_URL}/questions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            question_text: 'Explain the role of mitochondria in a cell.',
            subject: 'Biology',
            class_level: 10,
            board: 'CBSE',
            language: 'English',
        }),
    });
    const bioData = (await bioRes.json());
    assert_1.default.ok(bioData.success, 'Biology doubt must succeed');
    assert_1.default.notStrictEqual(bioData.data.solution.final_answer, 'x = 5');
    assert_1.default.ok(bioData.data.solution.final_answer.includes('ATP'));
    console.log('   ✅ Biology Answer:', bioData.data.solution.final_answer);
    await new Promise(r => setTimeout(r, 1500));
    // 5. English Doubt
    console.log('5. Submitting English Doubt: "Identify the subject and verb in the sentence \'The students completed their assignment.\'"...');
    const engRes = await fetch(`${BASE_URL}/questions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            question_text: 'Identify the subject and verb in the sentence "The students completed their assignment."',
            subject: 'English',
            class_level: 10,
            board: 'CBSE',
            language: 'English',
        }),
    });
    const engData = (await engRes.json());
    assert_1.default.ok(engData.success, 'English doubt must succeed');
    assert_1.default.notStrictEqual(engData.data.solution.final_answer, 'x = 5');
    assert_1.default.ok(engData.data.solution.final_answer.includes('The students') && engData.data.solution.final_answer.includes('completed'));
    console.log('   ✅ English Answer:', engData.data.solution.final_answer);
    await new Promise(r => setTimeout(r, 1500));
    // 6. Two Different Questions in Math
    console.log('6. Submitting a second distinct Math Doubt: "Solve 4x - 8 = 16"...');
    const math2Res = await fetch(`${BASE_URL}/questions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            question_text: 'Solve 4x - 8 = 16',
            subject: 'Mathematics',
            class_level: 10,
            board: 'CBSE',
            language: 'English',
        }),
    });
    const math2Data = (await math2Res.json());
    assert_1.default.ok(math2Data.success, 'Math 2 doubt must succeed');
    assert_1.default.ok(math2Data.data.solution.final_answer.includes('6'), 'Second math answer must solve for 6');
    assert_1.default.notStrictEqual(math2Data.data.solution.final_answer, mathData.data.solution.final_answer, 'Two math questions must yield distinct answers');
    assert_1.default.notStrictEqual(math2Data.data.solution.final_answer, mathData.data.solution.final_answer, 'Two math questions must yield distinct answers');
    console.log('   ✅ Distinct Math Answer:', math2Data.data.solution.final_answer);
    // 7. Verify Learning History Retrieval
    console.log('7. Verifying Learning History retrieval...');
    const histRes = await fetch(`${BASE_URL}/questions`, { headers });
    const histData = (await histRes.json());
    assert_1.default.ok(histData.success);
    assert_1.default.strictEqual(histData.data.items.length, 6, 'All 6 questions must appear in history');
    console.log(`   ✅ Successfully retrieved ${histData.data.items.length} questions from Learning History`);
    // 8. Test contextual follow-up
    console.log('8. Testing follow-up on Physics doubt...');
    const fuRes = await fetch(`${BASE_URL}/questions/${physData.data.question_id}/follow-up`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            follow_up_text: 'What happens if acceleration is zero?',
        }),
    });
    const fuData = (await fuRes.json());
    assert_1.default.ok(fuData.success);
    assert_1.default.ok(fuData.data.response.includes('zero') || fuData.data.response.includes('F = ma'));
    console.log('   ✅ Follow-up Answer:', fuData.data.response.substring(0, 100) + '...');
    console.log('\n🎉 ALL LIVE API INTEGRATION SCENARIOS TESTED AND VERIFIED SUCCESSFULLY!');
}
main().catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
});
