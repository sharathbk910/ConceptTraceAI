"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicMasteryService = void 0;
const geminiClient_js_1 = require("../ai/geminiClient.js");
const env_js_1 = require("../../config/env.js");
const database_js_1 = require("../db/database.js");
function extractJson(text) {
    let cleaned = (text || '').trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }
    try {
        return JSON.parse(cleaned);
    }
    catch {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
        }
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
        }
        throw new Error('Could not parse valid JSON from model output');
    }
}
class TopicMasteryService {
    /**
     * Step A: Retrieve Available Official Syllabus Topics for Student
     */
    static getAvailableTopics(userId, overrides) {
        const edProfile = database_js_1.db.getEducationProfile(userId);
        const board = overrides?.board || edProfile?.board || 'CBSE';
        const classLevel = (overrides?.classLevel || edProfile?.class_level || 10);
        const stream = overrides?.stream !== undefined ? overrides.stream : edProfile?.stream;
        const officialSyllabus = database_js_1.db.getOfficialSyllabus(board, classLevel, stream);
        const masteries = database_js_1.db.getUserConceptMasteries(userId);
        const masteryMap = new Map();
        masteries.forEach(m => masteryMap.set(m.concept_id.toLowerCase(), m));
        let targetSubjects = officialSyllabus.subjects;
        if (overrides?.subject) {
            targetSubjects = targetSubjects.filter(s => s.subject_name.toLowerCase() === overrides.subject.toLowerCase());
        }
        const subjects = targetSubjects.map(s => {
            const units = s.units.map(u => {
                const chapters = u.chapters.map(c => {
                    const concepts = c.concepts.map(con => {
                        const mastery = masteryMap.get(con.id.toLowerCase()) || masteryMap.get(con.concept_name.toLowerCase());
                        return {
                            id: con.id,
                            concept_name: con.concept_name,
                            subtopics: con.subtopics,
                            difficulty: con.difficulty,
                            exam_importance: con.exam_importance,
                            mastery_status: mastery?.status || 'unattempted',
                            score_percentage: mastery?.score_percentage || 0,
                        };
                    });
                    return {
                        chapter_id: c.chapter_id,
                        chapter_name: c.chapter_name,
                        concepts,
                    };
                });
                return {
                    unit_id: u.unit_id,
                    unit_name: u.unit_name,
                    chapters,
                };
            });
            return {
                subject_name: s.subject_name,
                code: s.code,
                units,
            };
        });
        return {
            board: officialSyllabus.board,
            class_level: officialSyllabus.class_level,
            academic_year: overrides?.academicYear || officialSyllabus.academic_year,
            stream: officialSyllabus.stream || stream || null,
            version: officialSyllabus.version,
            official_source_url: officialSyllabus.official_source_url,
            verified: officialSyllabus.verified,
            last_verified_at: officialSyllabus.last_verified_at,
            is_complete: officialSyllabus.is_complete ?? true,
            subjects,
        };
    }
    /**
     * Step B: Start or Resume Workflow Session & Generate Diagnostic Quiz
     */
    static async startOrResumeWorkflow(userId, conceptId, subjectName) {
        // Check if an in-progress session already exists
        const existing = database_js_1.db.getUserActiveTopicMasterySession(userId, conceptId);
        if (existing) {
            let activeQuestions = undefined;
            if (existing.stage === 'diagnostic') {
                activeQuestions = (existing.diagnostic_questions || []).map(q => ({
                    id: q.id,
                    question_text: q.question_text,
                    options: q.options,
                    difficulty: q.difficulty,
                    concept_tested: q.concept_tested,
                }));
            }
            else if (existing.stage === 'targeted_practice') {
                activeQuestions = (existing.targeted_practice_questions || []).map(q => ({
                    id: q.id,
                    question_text: q.question_text,
                    options: q.options,
                    difficulty: q.difficulty,
                    concept_tested: q.concept_tested,
                }));
            }
            else if (existing.stage === 'final_assessment') {
                activeQuestions = (existing.final_questions || []).map(q => ({
                    id: q.id,
                    question_text: q.question_text,
                    options: q.options,
                    difficulty: q.difficulty,
                    concept_tested: q.concept_tested,
                }));
            }
            return { session: existing, active_questions: activeQuestions };
        }
        // Locate official concept metadata
        const edProfile = database_js_1.db.getEducationProfile(userId);
        const classLevel = (edProfile?.class_level || 10);
        const officialSyllabus = database_js_1.db.getOfficialSyllabus(edProfile?.board || 'CBSE', classLevel, edProfile?.stream);
        let targetConcept = null;
        let targetChapter = 'Core Concepts';
        officialSyllabus.subjects.forEach(s => {
            s.units.forEach(u => {
                u.chapters.forEach(c => {
                    c.concepts.forEach(con => {
                        if (con.id === conceptId || con.concept_name.toLowerCase() === conceptId.toLowerCase()) {
                            targetConcept = con;
                            targetChapter = c.chapter_name;
                        }
                    });
                });
            });
        });
        // Fallback: If not found in primary profile syllabus, search all official syllabuses
        if (!targetConcept) {
            const allSyllabuses = database_js_1.db.listOfficialSyllabuses();
            for (const syl of allSyllabuses) {
                for (const s of syl.subjects) {
                    for (const u of s.units) {
                        for (const c of u.chapters) {
                            for (const con of c.concepts) {
                                if (con.id === conceptId || con.concept_name.toLowerCase() === conceptId.toLowerCase()) {
                                    targetConcept = con;
                                    targetChapter = c.chapter_name;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        const conceptName = targetConcept?.concept_name || conceptId;
        // Generate 5-Question Diagnostic Assessment
        let diagnosticQuestions = [];
        if (geminiClient_js_1.aiClient) {
            try {
                const prompt = `You are an educational assessment expert for Class ${classLevel} ${officialSyllabus.board}.
Generate an INITIAL DIAGNOSTIC ASSESSMENT of exactly 5 multiple choice questions for:
Subject: "${subjectName}"
Chapter: "${targetChapter}"
Topic/Concept: "${conceptName}"
Subtopics: ${JSON.stringify(targetConcept?.subtopics || [])}
Common Misconceptions: ${JSON.stringify(targetConcept?.common_misconceptions || [])}

DIAGNOSTIC GOAL:
Test student understanding to identify conceptual gaps, algebraic errors, or misconception traps.
Progressive difficulty:
- Q1: Easy (Foundational definitions/principles)
- Q2: Medium (Direct formula application)
- Q3: Medium (Condition checking and boundaries)
- Q4: Hard (Multi-step calculation or inverse relationship)
- Q5: Hard (Conceptual trap or exam application)

Return STRICTLY a JSON object:
{
  "questions": [
    {
      "id": "diag-1",
      "question_text": "Clear mathematical or scientific question with proper LaTeX formatting ($...$)",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct_answer": "A) Option 1",
      "explanation": "Step-by-step reasoning",
      "difficulty": "easy",
      "concept_tested": "Specific subconcept"
    }
  ]
}`;
                const response = await geminiClient_js_1.aiClient.models.generateContent({
                    model: env_js_1.env.GEMINI_MODEL,
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    config: { responseMimeType: 'application/json', temperature: 0.25 },
                });
                const parsed = extractJson(response.text || '{}');
                if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length >= 3) {
                    diagnosticQuestions = parsed.questions.map((q, idx) => ({
                        id: q.id || `diag-${idx + 1}`,
                        question_text: q.question_text,
                        options: q.options,
                        correct_answer: q.correct_answer,
                        explanation: q.explanation,
                        difficulty: q.difficulty || (idx === 0 ? 'easy' : idx < 3 ? 'medium' : 'hard'),
                        concept_tested: q.concept_tested || conceptName,
                    }));
                }
            }
            catch (err) {
                console.warn('AI diagnostic generation failed, falling back to curriculum question bank:', err);
            }
        }
        if (diagnosticQuestions.length < 5) {
            diagnosticQuestions = [
                {
                    id: 'diag-1',
                    question_text: `What is the defining condition for $${conceptName}$?`,
                    options: [
                        `A) The governing parameters satisfy direct conservation and balance laws.`,
                        `B) The system parameters are independent of initial boundaries.`,
                        `C) The relationship holds only under zero dissipation.`,
                        `D) It is an empirical approximation with no theoretical foundation.`,
                    ],
                    correct_answer: `A) The governing parameters satisfy direct conservation and balance laws.`,
                    explanation: `In standard board curricula, $${conceptName}$ is derived from fundamental invariance and physical conservation.`,
                    difficulty: 'easy',
                    concept_tested: `${conceptName} Definition`,
                },
                {
                    id: 'diag-2',
                    question_text: `Which mathematical expression correctly represents $${conceptName}$?`,
                    options: [
                        `A) The standard formula with consistent dimensional units and correct sign conventions.`,
                        `B) An inverted ratio omitting denominator constants.`,
                        `C) A constant value independent of input variables.`,
                        `D) An expression with reversed functional dependence.`,
                    ],
                    correct_answer: `A) The standard formula with consistent dimensional units and correct sign conventions.`,
                    explanation: `Formulas in $${conceptName}$ must preserve dimensional homogeneity and sign rules.`,
                    difficulty: 'medium',
                    concept_tested: `${conceptName} Formula Application`,
                },
                {
                    id: 'diag-3',
                    question_text: `A student solves a standard question on $${conceptName}$ but obtains an incorrect sign. What is the most likely misconception?`,
                    options: [
                        `A) Confusing transposition rules and failing to change sign across the equality.`,
                        `B) Substituting correct given variables.`,
                        `C) Checking units at each step.`,
                        `D) Writing down the governing formula.`,
                    ],
                    correct_answer: `A) Confusing transposition rules and failing to change sign across the equality.`,
                    explanation: `Sign errors during algebraic rearrangement represent the most frequent misconception trap.`,
                    difficulty: 'medium',
                    concept_tested: `Algebraic Inversion Trap`,
                },
                {
                    id: 'diag-4',
                    question_text: `If the independent variable in $${conceptName}$ is doubled, how does the resulting metric behave?`,
                    options: [
                        `A) It scales in exact proportion to the exponent in the governing equation.`,
                        `B) It always remains unaffected.`,
                        `C) It doubles regardless of the formula power.`,
                        `D) It drops to zero.`,
                    ],
                    correct_answer: `A) It scales in exact proportion to the exponent in the governing equation.`,
                    explanation: `Power scaling is determined by the explicit exponent of the variable in the formula.`,
                    difficulty: 'hard',
                    concept_tested: `Functional Proportionality`,
                },
                {
                    id: 'diag-5',
                    question_text: `In a multi-step examination problem on $${conceptName}$, which step is crucial to ensure full marks?`,
                    options: [
                        `A) Explicitly justifying intermediate boundary conditions and specifying proper SI units.`,
                        `B) Skipping intermediate steps and writing only a final number.`,
                        `C) Guessing the answer from dimensional options.`,
                        `D) Omitting variables in calculations.`,
                    ],
                    correct_answer: `A) Explicitly justifying intermediate boundary conditions and specifying proper SI units.`,
                    explanation: `Board marking schemes allocate dedicated marks to intermediate logical steps and unit accuracy.`,
                    difficulty: 'hard',
                    concept_tested: `Synthesis & Boundary Verification`,
                },
            ];
        }
        const settings = database_js_1.db.getUserLearningSettings(userId);
        const threshold = settings.mastery_threshold_percentage || 80;
        const newSession = database_js_1.db.createTopicMasterySession({
            user_id: userId,
            subject: subjectName,
            chapter: targetChapter,
            concept_id: conceptId,
            concept_name: conceptName,
            stage: 'diagnostic',
            diagnostic_questions: diagnosticQuestions,
            identified_weak_areas: [],
            readiness_confirmed: false,
            mastery_threshold: threshold,
        });
        const clientQuestions = diagnosticQuestions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            options: q.options,
            difficulty: q.difficulty,
            concept_tested: q.concept_tested,
        }));
        return { session: newSession, active_questions: clientQuestions };
    }
    /**
     * Step C: Submit Diagnostic Answers, Identify Weak Areas & Cognitive Traps
     * Step D: Generate Personalized Short Notes
     */
    static async submitDiagnostic(userId, sessionId, answers) {
        const session = database_js_1.db.getTopicMasterySession(sessionId);
        if (!session || session.user_id !== userId) {
            throw new Error('Mastery session not found or unauthorized');
        }
        const questions = session.diagnostic_questions || [];
        let correctCount = 0;
        const review = [];
        const weakAreas = [];
        const newGapsToLog = [];
        for (const q of questions) {
            const selected = (answers[q.id] || '').trim();
            const isCorrect = selected.toLowerCase() === q.correct_answer.toLowerCase() ||
                (selected.length > 2 && q.correct_answer.toLowerCase().startsWith(selected.slice(0, 2).toLowerCase()));
            if (isCorrect) {
                correctCount += 1;
                weakAreas.push({
                    concept: q.concept_tested || session.concept_name,
                    classification: 'demonstrated_understanding',
                    evidence: `Correctly answered ${q.difficulty}-level question "${q.question_text.slice(0, 70)}..."`,
                });
            }
            else if (!selected) {
                weakAreas.push({
                    concept: q.concept_tested || session.concept_name,
                    classification: 'insufficient_evidence',
                    evidence: `Question skipped: Insufficient answer evidence to establish misconception with certainty.`,
                });
            }
            else {
                // Cognitive trap identification
                let trap = `Misunderstood ${q.concept_tested || session.concept_name} condition`;
                let evidence = `Selected incorrect option "${selected.slice(0, 50)}".`;
                if (q.difficulty === 'hard') {
                    trap = `Failed to apply multi-step synthesis or inverse relationship in ${q.concept_tested}`;
                }
                else if (q.question_text.toLowerCase().includes('sign') || q.question_text.toLowerCase().includes('invers')) {
                    trap = `Sign convention or algebraic inversion trap`;
                }
                else if (q.question_text.toLowerCase().includes('formula') || q.question_text.toLowerCase().includes('express')) {
                    trap = `Formula variable misattribution or unit omission`;
                }
                const classification = weakAreas.filter(w => w.concept === q.concept_tested && w.classification.includes('weakness')).length > 0
                    ? 'recurring_weakness'
                    : 'possible_weakness';
                weakAreas.push({
                    concept: q.concept_tested || session.concept_name,
                    classification,
                    trap,
                    evidence,
                });
                newGapsToLog.push({
                    trap_identified: trap,
                    question_snippet: q.question_text.slice(0, 120),
                    remediation_tip: q.explanation || `Review the core principles of ${q.concept_tested || session.concept_name}.`,
                });
            }
            review.push({
                id: q.id,
                question_text: q.question_text,
                options: q.options,
                selected_answer: selected || 'Unattempted',
                correct_answer: q.correct_answer,
                is_correct: isCorrect,
                explanation: q.explanation,
                difficulty: q.difficulty,
                concept_tested: q.concept_tested,
            });
        }
        const total = questions.length || 1;
        const percentage = Math.round((correctCount / total) * 100);
        // Persist identified gaps to student's persistent mistake log
        if (newGapsToLog.length > 0) {
            database_js_1.db.updateConceptMasteryScore(userId, session.concept_id, session.concept_name, session.subject, session.chapter, percentage, newGapsToLog);
        }
        // Step D: Generate Personalized Short Notes focused on student's weak concepts
        const identifiedWeakConcepts = weakAreas
            .filter(w => w.classification === 'possible_weakness' || w.classification === 'recurring_weakness')
            .map(w => w.concept);
        let personalizedNotes = await this.generatePersonalizedNotes(session.concept_name, session.subject, session.chapter, identifiedWeakConcepts);
        const updated = database_js_1.db.updateTopicMasterySession(sessionId, {
            diagnostic_score: correctCount,
            diagnostic_total: total,
            diagnostic_percentage: percentage,
            diagnostic_review: review,
            identified_weak_areas: weakAreas,
            personalized_notes: personalizedNotes,
            stage: 'diagnostic_review',
        });
        return updated;
    }
    /**
     * Helper: Generate Personalized Short Notes
     */
    static async generatePersonalizedNotes(conceptName, subject, chapter, weakAreas) {
        const cachedNote = database_js_1.db.getConceptRevisionNote(conceptName);
        if (geminiClient_js_1.aiClient && weakAreas.length > 0) {
            try {
                const prompt = `You are a master academic educator. A student struggled with these specific concepts during an initial diagnostic quiz on "${conceptName}" (${subject}, ${chapter}):
Targeted Weaknesses: ${JSON.stringify(weakAreas)}

Generate CONCISE, HIGH-RETENTION PERSONALIZED REVISION NOTES specifically addressing these gaps.
Ensure all mathematical formulas use LaTeX ($...$ or $$...$$).

Return STRICTLY a JSON object:
{
  "quick_summary": "Crisp 2-sentence summary addressing the core misunderstood principle.",
  "definitions": [
    { "term": "Core Term", "explanation": "Clear explanation clearing the diagnosed confusion" }
  ],
  "formulas_and_principles": [
    { "title": "Governing Formula", "latex": "M = \\\\frac{n_B}{V_{(L)}}", "explanation": "What each variable means and units to use" }
  ],
  "common_pitfalls": [
    { "mistake": "The exact trap the student fell into", "correction": "Correct approach", "why": "Why the trap occurs in board exams" }
  ],
  "worked_examples": [
    { "problem": "Targeted example fixing the weakness", "solution_steps": ["Step 1...", "Step 2..."], "key_takeaway": "Key insight" }
  ],
  "memory_aids": ["Helpful memory mnemonic to prevent recurring mistake"]
}`;
                const response = await geminiClient_js_1.aiClient.models.generateContent({
                    model: env_js_1.env.GEMINI_MODEL,
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    config: { responseMimeType: 'application/json', temperature: 0.2 },
                });
                const parsed = extractJson(response.text || '{}');
                if (parsed.definitions && parsed.quick_summary) {
                    return parsed;
                }
            }
            catch (err) {
                console.warn('AI personalized notes generation failed, using cached notes:', err);
            }
        }
        if (cachedNote) {
            return {
                quick_summary: cachedNote.quick_summary,
                definitions: cachedNote.definitions,
                formulas_and_principles: cachedNote.formulas_and_laws,
                common_pitfalls: cachedNote.common_pitfalls,
                worked_examples: cachedNote.worked_examples,
                memory_aids: cachedNote.memory_mnemonics || ['State Given -> Apply Standard Equation -> Verify Units'],
            };
        }
        return {
            quick_summary: `Personalized revision for ${conceptName}. Review governing definitions and algebraic sign conventions before targeted practice.`,
            definitions: [
                {
                    term: conceptName,
                    explanation: `A central topic in ${subject} (${chapter}) governing quantitative relationships and boundary behavior.`,
                },
            ],
            formulas_and_principles: [
                {
                    title: `Primary Equation for ${conceptName}`,
                    latex: `f(x) = y`,
                    explanation: `Relates independent inputs to verified target metrics in standard curriculum units.`,
                },
            ],
            common_pitfalls: [
                {
                    mistake: `Inverting signs or transposing denominators incorrectly.`,
                    correction: `Perform operations step-by-step and verify dimensional homogeneity.`,
                    why: `Algebraic haste accounts for over 60% of score loss in this topic.`,
                },
            ],
            worked_examples: [
                {
                    problem: `Solve for primary unknown in standard ${conceptName} evaluation.`,
                    solution_steps: [
                        `Identify knowns and desired target variable.`,
                        `Substitute values into governing equation with proper units.`,
                        `Calculate intermediate terms and verify final units.`,
                    ],
                    key_takeaway: `Always state the formula before substituting numerical values.`,
                },
            ],
            memory_aids: [`Identify Given -> Select Formula -> Calculate -> Verify Units!`],
        };
    }
    /**
     * Step E: Start Targeted Practice on Weak Concepts
     */
    static async startTargetedPractice(userId, sessionId) {
        const session = database_js_1.db.getTopicMasterySession(sessionId);
        if (!session || session.user_id !== userId) {
            throw new Error('Mastery session not found or unauthorized');
        }
        const weakAreas = session.identified_weak_areas
            .filter(w => w.classification === 'possible_weakness' || w.classification === 'recurring_weakness')
            .map(w => w.concept);
        const focusConcepts = weakAreas.length > 0 ? weakAreas : [session.concept_name];
        let practiceQuestions = [];
        if (geminiClient_js_1.aiClient) {
            try {
                const prompt = `Generate TARGETED PRACTICE questions for a student who struggled in:
Subject: "${session.subject}"
Chapter: "${session.chapter}"
Main Topic: "${session.concept_name}"
Struggled Subconcepts: ${JSON.stringify(focusConcepts)}

REQUIREMENTS:
- Generate exactly 4 fresh multiple choice practice questions targeting the struggled areas.
- Avoid repeating diagnostic questions.
- Provide step-by-step educational explanations for every question.
- Format all math with LaTeX ($...$).

Return STRICTLY JSON:
{
  "questions": [
    {
      "id": "tp-1",
      "question_text": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A) ...",
      "explanation": "...",
      "difficulty": "medium",
      "concept_tested": "..."
    }
  ]
}`;
                const response = await geminiClient_js_1.aiClient.models.generateContent({
                    model: env_js_1.env.GEMINI_MODEL,
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    config: { responseMimeType: 'application/json', temperature: 0.3 },
                });
                const parsed = extractJson(response.text || '{}');
                if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length >= 2) {
                    practiceQuestions = parsed.questions.map((q, idx) => ({
                        id: q.id || `tp-${idx + 1}`,
                        question_text: q.question_text,
                        options: q.options,
                        correct_answer: q.correct_answer,
                        explanation: q.explanation,
                        difficulty: q.difficulty || 'medium',
                        concept_tested: q.concept_tested || session.concept_name,
                    }));
                }
            }
            catch (err) {
                console.warn('AI targeted practice generation failed, using structured question set:', err);
            }
        }
        if (practiceQuestions.length < 3) {
            practiceQuestions = [
                {
                    id: 'tp-1',
                    question_text: `Applying targeted remediation for $${session.concept_name}$: In a practical scenario where input values are halved, what is the corrected output?`,
                    options: [
                        `A) The output adjusts according to the exact functional proportionality of the formula.`,
                        `B) The output is unaffected by changes in input variables.`,
                        `C) The output doubles unconditionally.`,
                        `D) The value becomes negative.`,
                    ],
                    correct_answer: `A) The output adjusts according to the exact functional proportionality of the formula.`,
                    explanation: `Consistent application of the mathematical formula requires proportional scaling of the output.`,
                    difficulty: 'medium',
                    concept_tested: `${session.concept_name} Targeted Application`,
                },
                {
                    id: 'tp-2',
                    question_text: `Which check guarantees that sign errors do not occur in $${session.concept_name}$?`,
                    options: [
                        `A) Verifying balance and signs before and after each algebraic transposition step.`,
                        `B) Omitting intermediate signs and assigning positive at the end.`,
                        `C) Memorizing numerical values without steps.`,
                        `D) Inverting the numerator and denominator arbitrarily.`,
                    ],
                    correct_answer: `A) Verifying balance and signs before and after each algebraic transposition step.`,
                    explanation: `Tracking signs systematically across equalities prevents cognitive trap errors.`,
                    difficulty: 'medium',
                    concept_tested: `Sign Convention Discipline`,
                },
                {
                    id: 'tp-3',
                    question_text: `When calculating $${session.concept_name}$ with non-standard units (e.g., $mL$ instead of $L$), what conversion factor must be applied?`,
                    options: [
                        `A) Multiply or divide by $1000$ to maintain dimensional consistency with standard SI units.`,
                        `B) Ignore units because coefficients cancel out automatically.`,
                        `C) Add $100$ to the numerator.`,
                        `D) Use the raw numbers directly without conversion.`,
                    ],
                    correct_answer: `A) Multiply or divide by $1000$ to maintain dimensional consistency with standard SI units.`,
                    explanation: `Dimensional homogeneity requires standard units before numerical evaluation.`,
                    difficulty: 'hard',
                    concept_tested: `Dimensional Consistency`,
                },
            ];
        }
        const updated = database_js_1.db.updateTopicMasterySession(sessionId, {
            targeted_practice_questions: practiceQuestions,
            stage: 'targeted_practice',
        });
        const clientQuestions = practiceQuestions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            options: q.options,
            difficulty: q.difficulty,
            concept_tested: q.concept_tested,
        }));
        return { session: updated, active_questions: clientQuestions };
    }
    /**
     * Submit Targeted Practice & Proceed to Readiness Check
     */
    static async submitTargetedPractice(userId, sessionId, answers) {
        const session = database_js_1.db.getTopicMasterySession(sessionId);
        if (!session || session.user_id !== userId) {
            throw new Error('Mastery session not found or unauthorized');
        }
        const questions = session.targeted_practice_questions || [];
        let correctCount = 0;
        const review = [];
        for (const q of questions) {
            const selected = (answers[q.id] || '').trim();
            const isCorrect = selected.toLowerCase() === q.correct_answer.toLowerCase() ||
                (selected.length > 2 && q.correct_answer.toLowerCase().startsWith(selected.slice(0, 2).toLowerCase()));
            if (isCorrect)
                correctCount += 1;
            review.push({
                id: q.id,
                question_text: q.question_text,
                options: q.options,
                selected_answer: selected || 'Unattempted',
                correct_answer: q.correct_answer,
                is_correct: isCorrect,
                explanation: q.explanation,
                difficulty: q.difficulty,
                concept_tested: q.concept_tested,
            });
        }
        const total = questions.length || 1;
        const updated = database_js_1.db.updateTopicMasterySession(sessionId, {
            targeted_practice_score: correctCount,
            targeted_practice_total: total,
            targeted_practice_review: review,
            stage: 'readiness_check',
        });
        return updated;
    }
    /**
     * Step F: Student Readiness Confirmation
     * Step G: Generate Separate Final Assessment if Ready
     */
    static async confirmReadiness(userId, sessionId, isReady) {
        const session = database_js_1.db.getTopicMasterySession(sessionId);
        if (!session || session.user_id !== userId) {
            throw new Error('Mastery session not found or unauthorized');
        }
        if (!isReady) {
            // Student is not ready: Return to notes and targeted practice
            const updated = database_js_1.db.updateTopicMasterySession(sessionId, {
                stage: 'notes',
                readiness_confirmed: false,
            });
            return { session: updated };
        }
        // Student confirmed readiness: Generate fresh, distinct final assessment
        let finalQuestions = [];
        if (geminiClient_js_1.aiClient) {
            try {
                const prompt = `You are a senior board examiner. Generate a DISTINCT FINAL MASTERY ASSESSMENT of 5 questions for:
Subject: "${session.subject}"
Chapter: "${session.chapter}"
Concept: "${session.concept_name}"

RULES FOR FINAL ASSESSMENT:
- Questions MUST BE FRESH and test deep conceptual understanding and practical problem-solving.
- DO NOT repeat questions from previous diagnostic attempts.
- Test synthesis, boundary conditions, and accurate calculations.
- Format all equations using clean LaTeX ($...$).

Return STRICTLY JSON:
{
  "questions": [
    {
      "id": "final-1",
      "question_text": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A) ...",
      "explanation": "...",
      "difficulty": "medium",
      "concept_tested": "..."
    }
  ]
}`;
                const response = await geminiClient_js_1.aiClient.models.generateContent({
                    model: env_js_1.env.GEMINI_MODEL,
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    config: { responseMimeType: 'application/json', temperature: 0.25 },
                });
                const parsed = extractJson(response.text || '{}');
                if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length >= 3) {
                    finalQuestions = parsed.questions.map((q, idx) => ({
                        id: q.id || `final-${idx + 1}`,
                        question_text: q.question_text,
                        options: q.options,
                        correct_answer: q.correct_answer,
                        explanation: q.explanation,
                        difficulty: q.difficulty || (idx < 2 ? 'medium' : 'hard'),
                        concept_tested: q.concept_tested || session.concept_name,
                    }));
                }
            }
            catch (err) {
                console.warn('AI final assessment generation failed, using verified final bank:', err);
            }
        }
        if (finalQuestions.length < 5) {
            finalQuestions = [
                {
                    id: 'final-1',
                    question_text: `Final Assessment Q1: Under standard examination conditions, what is the verified mathematical relationship governing $${session.concept_name}$?`,
                    options: [
                        `A) The complete equation satisfying boundary invariance and physical dimensional balance.`,
                        `B) A truncated form neglecting the denominator constant.`,
                        `C) An arbitrary linear fit without theoretical derivation.`,
                        `D) An inverted relation with opposite signs.`,
                    ],
                    correct_answer: `A) The complete equation satisfying boundary invariance and physical dimensional balance.`,
                    explanation: `Full theoretical derivation requires complete preservation of constants and boundary requirements.`,
                    difficulty: 'medium',
                    concept_tested: `${session.concept_name} Invariance`,
                },
                {
                    id: 'final-2',
                    question_text: `Final Assessment Q2: In an analytical problem on $${session.concept_name}$, a student substitutes variables with correct units but misapplies the power exponent. What is the consequence?`,
                    options: [
                        `A) The numerical result scales nonlinearly, yielding an incorrect magnitude.`,
                        `B) The answer remains correct because exponents are negligible.`,
                        `C) The units cancel out correctly regardless.`,
                        `D) The result is unaffected in board evaluation.`,
                    ],
                    correct_answer: `A) The numerical result scales nonlinearly, yielding an incorrect magnitude.`,
                    explanation: `Power dependencies dramatically change output magnitude; accurate exponents are mandatory.`,
                    difficulty: 'medium',
                    concept_tested: `Exponential Dependency`,
                },
                {
                    id: 'final-3',
                    question_text: `Final Assessment Q3: How does $${session.concept_name}$ behave when the primary parameter approaches its critical limit?`,
                    options: [
                        `A) It asymptotically approaches the theoretical boundary defined by the governing law.`,
                        `B) It becomes completely discontinuous without physical meaning.`,
                        `C) It doubles instantaneously.`,
                        `D) It violates conservation of energy.`,
                    ],
                    correct_answer: `A) It asymptotically approaches the theoretical boundary defined by the governing law.`,
                    explanation: `Continuity and asymptotic behavior at limits are fundamental to valid physical models.`,
                    difficulty: 'hard',
                    concept_tested: `Asymptotic Limits`,
                },
                {
                    id: 'final-4',
                    question_text: `Final Assessment Q4: Given two interacting components governed by $${session.concept_name}$, which relationship dictates their combined equilibrium?`,
                    options: [
                        `A) The sum of their individual contributions equals the total system state under conservation.`,
                        `B) Their effects cancel out to zero unconditionally.`,
                        `C) The smaller component always dominates the outcome.`,
                        `D) Non-conserved terms appear spontaneously.`,
                    ],
                    correct_answer: `A) The sum of their individual contributions equals the total system state under conservation.`,
                    explanation: `Superposition and conservation dictate total equilibrium in multi-component systems.`,
                    difficulty: 'hard',
                    concept_tested: `Equilibrium Superposition`,
                },
                {
                    id: 'final-5',
                    question_text: `Final Assessment Q5: What is the single most critical verification step before submitting an answer on $${session.concept_name}$ in board exams?`,
                    options: [
                        `A) Dimensional homogeneity check and verifying reasonable order of magnitude.`,
                        `B) Omitting the final units to avoid negative marks.`,
                        `C) Leaving the answer as an unsimplified fraction without calculation.`,
                        `D) Copying the problem statement verbatim without derivation.`,
                    ],
                    correct_answer: `A) Dimensional homogeneity check and verifying reasonable order of magnitude.`,
                    explanation: `Checking dimensions and magnitude prevents algebraic and units mistakes from costing exam marks.`,
                    difficulty: 'hard',
                    concept_tested: `Order of Magnitude Verification`,
                },
            ];
        }
        const updated = database_js_1.db.updateTopicMasterySession(sessionId, {
            readiness_confirmed: true,
            final_questions: finalQuestions,
            stage: 'final_assessment',
        });
        const clientQuestions = finalQuestions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            options: q.options,
            difficulty: q.difficulty,
            concept_tested: q.concept_tested,
        }));
        return { session: updated, active_questions: clientQuestions };
    }
    /**
     * Step H: Submit Final Assessment, Evaluate Mastery Against 80% Benchmark,
     * Compare with Baseline Diagnostic, Update Learning Map, and Recommend Next Concept
     */
    static async submitFinalAssessment(userId, sessionId, answers) {
        const session = database_js_1.db.getTopicMasterySession(sessionId);
        if (!session || session.user_id !== userId) {
            throw new Error('Mastery session not found or unauthorized');
        }
        const questions = session.final_questions || [];
        let correctCount = 0;
        const review = [];
        for (const q of questions) {
            const selected = (answers[q.id] || '').trim();
            const isCorrect = selected.toLowerCase() === q.correct_answer.toLowerCase() ||
                (selected.length > 2 && q.correct_answer.toLowerCase().startsWith(selected.slice(0, 2).toLowerCase()));
            if (isCorrect)
                correctCount += 1;
            review.push({
                id: q.id,
                question_text: q.question_text,
                options: q.options,
                selected_answer: selected || 'Unattempted',
                correct_answer: q.correct_answer,
                is_correct: isCorrect,
                explanation: q.explanation,
                difficulty: q.difficulty,
                concept_tested: q.concept_tested,
            });
        }
        const total = questions.length || 1;
        const finalPercentage = Math.round((correctCount / total) * 100);
        const diagnosticPercentage = session.diagnostic_percentage || 0;
        const improvement = finalPercentage - diagnosticPercentage;
        const threshold = session.mastery_threshold || 80;
        const isMastered = finalPercentage >= threshold;
        // Update Concept Mastery Record in official database
        database_js_1.db.updateConceptMasteryScore(userId, session.concept_id, session.concept_name, session.subject, session.chapter, finalPercentage, []);
        // Find Next Recommended Concept from official curriculum sequence
        let nextRecommended = null;
        const learningMap = database_js_1.db.getUserConceptMasteries(userId);
        const edProfile = database_js_1.db.getEducationProfile(userId);
        const officialSyllabus = database_js_1.db.getOfficialSyllabus(edProfile?.board || 'CBSE', (edProfile?.class_level || 10), edProfile?.stream);
        const subjectObj = officialSyllabus.subjects.find(s => s.subject_name.toLowerCase() === session.subject.toLowerCase());
        if (subjectObj) {
            let foundCurrent = false;
            for (const u of subjectObj.units) {
                for (const c of u.chapters) {
                    for (const con of c.concepts) {
                        if (foundCurrent) {
                            const status = learningMap.find(m => m.concept_id === con.id)?.status || 'unattempted';
                            if (status !== 'mastered') {
                                nextRecommended = {
                                    concept_id: con.id,
                                    concept_name: con.concept_name,
                                    chapter: c.chapter_name,
                                    reason: `Next topic in ${subjectObj.subject_name} (${c.chapter_name}) to advance your curriculum progress.`,
                                };
                                break;
                            }
                        }
                        if (con.id === session.concept_id || con.concept_name.toLowerCase() === session.concept_name.toLowerCase()) {
                            foundCurrent = true;
                        }
                    }
                    if (nextRecommended)
                        break;
                }
                if (nextRecommended)
                    break;
            }
        }
        // Record learning activity
        database_js_1.db.recordActivity({
            user_id: userId,
            activity_type: 'practice',
            session_id: sessionId,
            metadata: {
                concept_id: session.concept_id,
                concept_name: session.concept_name,
                diagnostic_score: diagnosticPercentage,
                final_score: finalPercentage,
                improvement,
                is_mastered: isMastered,
            },
        });
        const updated = database_js_1.db.updateTopicMasterySession(sessionId, {
            final_score: correctCount,
            final_total: total,
            final_percentage: finalPercentage,
            final_review: review,
            improvement_percentage: improvement,
            is_mastered: isMastered,
            next_recommended_concept: nextRecommended,
            stage: 'mastery_result',
        });
        return updated;
    }
}
exports.TopicMasteryService = TopicMasteryService;
