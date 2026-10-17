"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
async function runEndToEndApiFlow() {
    console.log('🚀 Running ConceptTrace AI End-to-End API Workflow Verification...\n');
    const BASE_URL = 'http://localhost:8000/api/v1';
    let token = '';
    let userId = '';
    let questionId = '';
    let sessionId = '';
    // Helper
    async function api(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        };
        const res = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errText}`);
        }
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/pdf')) {
            return res.arrayBuffer();
        }
        const json = (await res.json());
        if (!json.success && json.error) {
            throw new Error(json.error.message || 'API error');
        }
        return json.data;
    }
    // 1. Register Student
    console.log('1. Registering student...');
    const regEmail = `student_${Date.now()}@concepttrace.ai`;
    const regRes = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            fullName: 'Sharath Kumar',
            email: regEmail,
            password: 'password123',
            confirmPassword: 'password123',
            termsAccepted: true,
        }),
    });
    assert_1.default.strictEqual(regRes.requires_verification, true);
    console.log(`   ✅ Registration submitted for: ${regEmail} (requires_verification: true)`);
    // Retrieve 6-digit OTP securely from written database file
    const fs = await import('fs');
    const path = await import('path');
    const dbPath = path.resolve(process.cwd(), 'data/concepttrace_db.json');
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const authRecord = dbData.user_auth.find((u) => u.email === regEmail);
    const verifyOtp = authRecord?.verification_token || '';
    assert_1.default.match(verifyOtp, /^\d{6}$/, 'Generated verification code must be exactly 6 digits');
    console.log(`   ✅ 6-digit OTP generated for registration: ${verifyOtp}`);
    // 1b. Verify Email OTP
    console.log('1b. Verifying email address with 6-digit OTP...');
    const verifyRes = await api('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: regEmail, otp: verifyOtp }),
    });
    console.log(`   ✅ Email verified: ${verifyRes.message}`);
    // 1c. Login to obtain session token
    console.log('1c. Logging in with verified account...');
    const loginRes = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email: regEmail,
            password: 'password123',
        }),
    });
    assert_1.default.ok(loginRes.token, 'Session token must be returned');
    token = loginRes.token;
    userId = loginRes.user.id;
    assert_1.default.strictEqual(loginRes.onboarding_completed, false, 'New student must require onboarding');
    console.log(`   ✅ Logged in successfully: ${loginRes.user.full_name} (${userId})`);
    // 2. Setup Education Profile
    console.log('2. Setting up education profile...');
    const edRes = await api('/education-profile', {
        method: 'PUT',
        body: JSON.stringify({
            board: 'CBSE',
            class_level: 10,
            academic_year: '2026-27',
            preferred_language: 'English',
            subjects: ['Mathematics', 'Science'],
        }),
    });
    assert_1.default.strictEqual(edRes.onboarding_completed, true);
    console.log(`   ✅ Education profile configured: Class ${edRes.class_level} (${edRes.board})`);
    // 3. Verify Dashboard Initial Honest Empty State
    console.log('3. Loading initial dashboard metrics...');
    const dashInitial = await api('/dashboard');
    assert_1.default.strictEqual(dashInitial.metrics.total_practice_attempts, 0);
    assert_1.default.strictEqual(dashInitial.learning_guidance.has_sufficient_evidence, false);
    console.log(`   ✅ Dashboard displays honest initial empty state: "${dashInitial.learning_guidance.summary}"`);
    // 4. Ask a Doubt & Run AI Pipeline
    console.log('4. Asking academic doubt: "Solve 2x + 5 = 15"...');
    const doubtRes = await api('/questions', {
        method: 'POST',
        body: JSON.stringify({
            question_text: 'Solve 2x + 5 = 15',
            subject: 'Mathematics',
            input_type: 'text',
        }),
    });
    questionId = doubtRes.question_id;
    assert_1.default.ok(questionId, 'Question ID must be generated');
    assert_1.default.strictEqual(doubtRes.solution.final_answer, 'x = 5');
    assert_1.default.strictEqual(doubtRes.solution.verification_status, 'verified');
    console.log(`   ✅ Doubt analyzed: Final Answer = ${doubtRes.solution.final_answer}`);
    console.log(`   ✅ Verification Status: ${doubtRes.solution.verification_status} (${doubtRes.solution.verification_method})`);
    // 5. Ask Follow-Up Question
    console.log('5. Asking contextual follow-up...');
    const followUpRes = await api(`/questions/${questionId}/follow-up`, {
        method: 'POST',
        body: JSON.stringify({
            follow_up_text: 'Why do we subtract 5 on both sides?',
        }),
    });
    assert_1.default.ok(followUpRes.response, 'Follow-up response returned');
    console.log(`   ✅ Follow-up response received: "${followUpRes.response.slice(0, 70)}..."`);
    // 6. Start Practice Session
    console.log('6. Starting practice session for Mathematics...');
    const practiceRes = await api('/practice/sessions', {
        method: 'POST',
        body: JSON.stringify({
            subject: 'Mathematics',
            question_count: 3,
            difficulty: 'medium',
        }),
    });
    sessionId = practiceRes.session.id;
    const questions = practiceRes.questions;
    assert_1.default.strictEqual(questions.length, 3);
    // Verify answer keys are hidden from initial question response!
    assert_1.default.strictEqual(questions[0].correct_answer, undefined, 'Answer keys must NOT be exposed before submission');
    console.log(`   ✅ Practice session started with ${questions.length} questions (Answer keys protected)`);
    // 7. Submit Answers and Verify Scoring
    console.log('7. Submitting practice answers...');
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const subRes = await api(`/practice/sessions/${sessionId}/submit`, {
            method: 'POST',
            body: JSON.stringify({
                question_id: q.id,
                submitted_answer: 'A', // Submit option A
            }),
        });
        assert_1.default.strictEqual(typeof subRes.is_correct, 'boolean');
        console.log(`   ✅ Question ${i + 1} scored: ${subRes.is_correct ? 'Correct' : 'Incorrect'} (Feedback: ${subRes.feedback})`);
    }
    // 8. Verify Duplicate Submission Prevention
    console.log('8. Verifying duplicate attempt prevention...');
    try {
        await api(`/practice/sessions/${sessionId}/submit`, {
            method: 'POST',
            body: JSON.stringify({
                question_id: questions[0].id,
                submitted_answer: 'B',
            }),
        });
        assert_1.default.fail('Should reject duplicate submission');
    }
    catch (err) {
        assert_1.default.ok(err.message.includes('409') || err.message.includes('DUPLICATE'), 'Duplicate attempt properly rejected');
        console.log(`   ✅ Duplicate submission successfully prevented (409 Conflict)`);
    }
    // 9. Complete Practice Session
    console.log('9. Completing practice session...');
    const completeRes = await api(`/practice/sessions/${sessionId}/complete`, {
        method: 'POST',
    });
    assert_1.default.strictEqual(completeRes.session.status, 'completed');
    console.log(`   ✅ Session finalized: Score = ${completeRes.score_percent}% (${completeRes.correct_count}/${completeRes.total_questions})`);
    // 10. Study-Time Tracking & Heartbeats
    console.log('10. Testing study-time session and heartbeats...');
    const studySess = await api('/study-sessions', {
        method: 'POST',
        body: JSON.stringify({ activity_type: 'study_session' }),
    });
    assert_1.default.ok(studySess.id);
    const hbRes = await api(`/study-sessions/${studySess.id}/heartbeat`, {
        method: 'POST',
        body: JSON.stringify({ active_seconds: 30 }),
    });
    assert_1.default.ok(hbRes.tracked_seconds >= 30);
    console.log(`   ✅ Study heartbeat recorded: ${hbRes.tracked_seconds}s active time tracked`);
    // 11. PDF Progress Report Generation
    console.log('11. Generating genuine PDF progress report...');
    const pdfBuffer = await api('/reports/pdf', {
        method: 'POST',
    });
    assert_1.default.ok(pdfBuffer.byteLength > 1000, 'PDF buffer must contain real report bytes');
    console.log(`   ✅ PDF generated successfully: ${pdfBuffer.byteLength} bytes`);
    // 12. Re-check Updated Dashboard Metrics
    console.log('12. Inspecting updated student dashboard...');
    const dashUpdated = await api('/dashboard');
    assert_1.default.strictEqual(dashUpdated.metrics.total_questions_analyzed, 1);
    assert_1.default.strictEqual(dashUpdated.metrics.total_practice_attempts, 3);
    console.log(`   ✅ Dashboard updated with real persisted records:`);
    console.log(`      • Questions Analyzed: ${dashUpdated.metrics.total_questions_analyzed}`);
    console.log(`      • Practice Attempts: ${dashUpdated.metrics.total_practice_attempts}`);
    console.log(`      • Overall Accuracy: ${dashUpdated.metrics.overall_accuracy}%`);
    console.log(`      • Tracked Time: ${dashUpdated.metrics.tracked_time_display}`);
    console.log('\n🎉 ALL END-TO-END WORKFLOWS VERIFIED SUCCESSFULLY!\n');
}
runEndToEndApiFlow().catch(err => {
    console.error('E2E Verification crashed:', err);
    process.exit(1);
});
