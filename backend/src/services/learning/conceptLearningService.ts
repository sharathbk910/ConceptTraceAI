import { v4 as uuidv4 } from 'uuid';
import { aiClient } from '../ai/geminiClient.js';
import { env } from '../../config/env.js';
import {
  db,
  OfficialSyllabusRecord,
  SyllabusComparisonRecord,
  ConceptMasteryRecord,
  ConceptRevisionNoteRecord,
  ConceptFlashcardRecord,
  ConceptQuizSession,
} from '../db/database.js';

function extractJson(text: string): any {
  let cleaned = (text || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch {
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

export class ConceptLearningService {
  /**
   * 1. Compare uploaded school syllabus against official syllabus
   */
  public static async compareSyllabus(
    userId: string,
    filename: string,
    rawText: string,
    officialSyllabus: OfficialSyllabusRecord,
    subjectName: string
  ): Promise<SyllabusComparisonRecord> {
    const subject = officialSyllabus.subjects.find(
      s => s.subject_name.toLowerCase() === subjectName.toLowerCase()
    ) || officialSyllabus.subjects[0];

    const officialConcepts: Array<{ id: string; name: string; chapter: string }> = [];
    subject?.units.forEach(u => {
      u.chapters.forEach(c => {
        c.concepts.forEach(con => {
          officialConcepts.push({ id: con.id, name: con.concept_name, chapter: c.chapter_name });
        });
      });
    });

    // Default fallback comparison
    let comparisonResult: {
      matched_topics: Array<{ official_concept: string; extracted_topic: string; match_confidence: number }>;
      extra_topics: Array<{ topic_name: string; note: string }>;
      omitted_topics: Array<{ official_concept: string; chapter: string }>;
      summary_notes: string;
      similarity_score: number;
    } = {
      matched_topics: [],
      extra_topics: [],
      omitted_topics: [],
      summary_notes: '',
      similarity_score: 85,
    };

    if (aiClient) {
      try {
        const prompt = `You are an educational syllabus comparison expert.
Compare this student-uploaded syllabus text against the official ${officialSyllabus.board} Class ${officialSyllabus.class_level} ${subject?.subject_name} official curriculum.

OFFICIAL CONCEPTS LIST:
${JSON.stringify(officialConcepts.map(c => `${c.chapter}: ${c.name}`))}

STUDENT UPLOADED SYLLABUS CONTENT:
"""${rawText.slice(0, 4000)}"""

Analyze and return strictly a JSON object:
{
  "matched_topics": [
    { "official_concept": "Concept Name", "extracted_topic": "Found text phrase", "match_confidence": 0.95 }
  ],
  "extra_topics": [
    { "topic_name": "Additional topic found in school syllabus", "note": "Why it's extra or advanced" }
  ],
  "omitted_topics": [
    { "official_concept": "Official concept name", "chapter": "Chapter name" }
  ],
  "similarity_score": 85,
  "summary_notes": "Comprehensive breakdown explaining alignment, coverage, and preparation tips."
}`;

        const response = await aiClient.models.generateContent({
          model: env.GEMINI_MODEL,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json', temperature: 0.2 },
        });

        const parsed = extractJson(response.text || '{}');
        if (parsed.matched_topics) {
          comparisonResult = parsed;
        }
      } catch (err) {
        console.warn('AI syllabus comparison failed, running deterministic comparison:', err);
      }
    }

    // Deterministic fallback if comparisonResult is empty
    if (comparisonResult.matched_topics.length === 0) {
      const lowerText = rawText.toLowerCase();
      officialConcepts.forEach(c => {
        const words = c.name.toLowerCase().split(' ').filter(w => w.length > 3);
        const matches = words.some(w => lowerText.includes(w));
        if (matches) {
          comparisonResult.matched_topics.push({
            official_concept: c.name,
            extracted_topic: c.name,
            match_confidence: 0.9,
          });
        } else {
          comparisonResult.omitted_topics.push({
            official_concept: c.name,
            chapter: c.chapter,
          });
        }
      });

      const matchedCount = comparisonResult.matched_topics.length;
      const total = officialConcepts.length || 1;
      comparisonResult.similarity_score = Math.min(100, Math.round((matchedCount / total) * 100));
      comparisonResult.summary_notes = `Your uploaded syllabus covers ${matchedCount} of ${total} core official curriculum concepts (${comparisonResult.similarity_score}% match). You are well aligned with the official ${officialSyllabus.board} board requirements.`;
    }

    const totalConcepts = officialConcepts.length || 1;
    const coveragePercentage = Math.round(
      (comparisonResult.matched_topics.length / totalConcepts) * 100
    );

    return db.createSyllabusComparison({
      user_id: userId,
      uploaded_filename: filename,
      board: officialSyllabus.board,
      class_level: officialSyllabus.class_level,
      subject: subject?.subject_name || subjectName,
      total_official_concepts: totalConcepts,
      matched_concepts_count: comparisonResult.matched_topics.length,
      extra_topics_count: comparisonResult.extra_topics.length,
      omitted_topics_count: comparisonResult.omitted_topics.length,
      coverage_percentage: coveragePercentage,
      similarity_score: comparisonResult.similarity_score || coveragePercentage,
      matched_topics: comparisonResult.matched_topics,
      extra_topics: comparisonResult.extra_topics,
      omitted_topics: comparisonResult.omitted_topics,
      summary_notes: comparisonResult.summary_notes,
    });
  }

  /**
   * 2. Generate 5-Question Adaptive Concept Quiz
   */
  public static async generateConceptQuiz(
    userId: string,
    conceptId: string,
    subjectName: string,
    classLevel: number
  ): Promise<{ sessionId: string; conceptName: string; subject: string; chapter: string; questions: any[] }> {
    // Locate concept metadata
    const edProfile = db.getEducationProfile(userId);
    const officialSyllabus = db.getOfficialSyllabus(
      edProfile?.board || 'CBSE',
      classLevel as 10 | 11 | 12,
      edProfile?.stream
    );

    let targetConcept: any = null;
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

    const conceptName = targetConcept?.concept_name || conceptId;
    let questions: Array<{
      id: string;
      question_text: string;
      options: string[];
      correct_answer: string;
      explanation: string;
      difficulty: 'easy' | 'medium' | 'hard';
    }> = [];

    if (aiClient) {
      try {
        const prompt = `You are a master academic assessment designer for Class ${classLevel} students.
Generate an adaptive 5-question multiple choice quiz targeting THIS SPECIFIC CONCEPT:
Concept: "${conceptName}"
Chapter: "${targetChapter}"
Subject: "${subjectName}"
Board: "${officialSyllabus.board}"
Subtopics: ${JSON.stringify(targetConcept?.subtopics || [])}
Common Student Misconceptions to test: ${JSON.stringify(targetConcept?.common_misconceptions || [])}

RULES:
1. Generate exactly 5 questions.
2. Progressive difficulty: Q1 Easy, Q2 Medium, Q3 Medium, Q4 Hard, Q5 Hard.
3. Each question must have exactly 4 plausible options [A, B, C, D].
4. One unequivocally correct answer. The other three options must represent common cognitive traps or algebra/concept mistakes.
5. Provide a rigorous step-by-step explanation.

Return strictly JSON matching this structure:
{
  "questions": [
    {
      "id": "q1",
      "question_text": "Clearly phrased academic question",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
      "correct_answer": "A. Option 1",
      "explanation": "Clear step-by-step reasoning",
      "difficulty": "easy"
    }
  ]
}`;

        const response = await aiClient.models.generateContent({
          model: env.GEMINI_MODEL,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json', temperature: 0.3 },
        });

        const parsed = extractJson(response.text || '{}');
        if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length >= 3) {
          questions = parsed.questions.map((q: any, idx: number) => ({
            id: q.id || `q-${idx + 1}`,
            question_text: q.question_text,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            difficulty: q.difficulty || (idx < 2 ? 'easy' : idx < 4 ? 'medium' : 'hard'),
          }));
        }
      } catch (err) {
        console.warn('AI quiz generation failed, using deterministic high-yield question bank:', err);
      }
    }

    // Deterministic fallback if offline or failed
    if (questions.length < 5) {
      questions = [
        {
          id: 'q-1',
          question_text: `What is the fundamental principle governing ${conceptName}?`,
          options: [
            `A. It establishes consistent conservation and structural laws for the system.`,
            `B. It operates strictly in arbitrary open systems without conservation.`,
            `C. It applies only when energy dissipation is zero.`,
            `D. It is an empirical approximation with no mathematical basis.`,
          ],
          correct_answer: `A. It establishes consistent conservation and structural laws for the system.`,
          explanation: `${conceptName} is founded on core physical and mathematical invariance principles governing the domain.`,
          difficulty: 'easy',
        },
        {
          id: 'q-2',
          question_text: `Which of the following conditions must hold true when applying ${conceptName}?`,
          options: [
            `A. Boundary and sign conventions must be rigorously maintained.`,
            `B. Negatives can be disregarded during initial evaluations.`,
            `C. Units are independent of standard SI conventions.`,
            `D. Intermediate steps can omit algebraic balance.`,
          ],
          correct_answer: `A. Boundary and sign conventions must be rigorously maintained.`,
          explanation: `Accurate application of ${conceptName} requires strict adherence to sign conventions and physical boundary conditions.`,
          difficulty: 'medium',
        },
        {
          id: 'q-3',
          question_text: `When evaluating a standard problem in ${conceptName}, a common error occurs when:`,
          options: [
            `A. Forgetting to apply the inverse operation during formula transformation.`,
            `B. Following the standard order of operations.`,
            `C. Using the correct constant values.`,
            `D. Verifying physical dimensions on both sides.`,
          ],
          correct_answer: `A. Forgetting to apply the inverse operation during formula transformation.`,
          explanation: `Inverting relationships or signs incorrectly is the primary cause of errors in ${conceptName}.`,
          difficulty: 'medium',
        },
        {
          id: 'q-4',
          question_text: `If the parameters in ${conceptName} are doubled, how does the resulting metric scale?`,
          options: [
            `A. It scales according to the power dependency defined in the governing equation.`,
            `B. It always doubles regardless of exponent.`,
            `C. It remains completely invariant.`,
            `D. It scales inversely with no constant coefficient.`,
          ],
          correct_answer: `A. It scales according to the power dependency defined in the governing equation.`,
          explanation: `The scaling behavior directly follows the functional exponent in the formula.`,
          difficulty: 'hard',
        },
        {
          id: 'q-5',
          question_text: `In an advanced examination problem on ${conceptName}, what distinguishes a complete solution?`,
          options: [
            `A. Complete dimensional verification, step-by-step reasoning, and boundary checks.`,
            `B. Guessing the numerical answer without writing formulas.`,
            `C. Omitting units in the final numerical answer.`,
            `D. Skipping intermediate balance proofs.`,
          ],
          correct_answer: `A. Complete dimensional verification, step-by-step reasoning, and boundary checks.`,
          explanation: `Full credit in board exams requires clear justification of each logical step and correct units.`,
          difficulty: 'hard',
        },
      ];
    }

    const session = db.createConceptQuizSession({
      user_id: userId,
      concept_id: conceptId,
      concept_name: conceptName,
      subject: subjectName,
      chapter: targetChapter,
      questions,
      total_questions: questions.length,
    });

    // Strip answers and explanations before sending to student!
    const clientQuestions = questions.map(q => ({
      id: q.id,
      question_text: q.question_text,
      options: q.options,
      difficulty: q.difficulty,
    }));

    return {
      sessionId: session.id,
      conceptName,
      subject: subjectName,
      chapter: targetChapter,
      questions: clientQuestions,
    };
  }

  /**
   * 3. Submit Concept Quiz & Diagnose Misconceptions
   */
  public static async submitConceptQuiz(
    userId: string,
    sessionId: string,
    answers: Record<string, string> // questionId -> selectedOption
  ): Promise<{
    score_percentage: number;
    score: number;
    total: number;
    status: 'mastered' | 'needs_practice';
    mastery_threshold: number;
    questions_review: any[];
    diagnosed_gaps: any[];
    learning_tip: string;
  }> {
    const session = db.getConceptQuizSession(sessionId);
    if (!session) {
      throw new Error('Quiz session not found or expired');
    }

    const total = session.questions.length;
    let correctCount = 0;
    const questionsReview: any[] = [];
    const newGaps: Array<{ trap_identified: string; question_snippet: string; remediation_tip: string }> = [];

    for (const q of session.questions) {
      const selected = (answers[q.id] || '').trim();
      const isCorrect =
        selected.toLowerCase() === q.correct_answer.toLowerCase() ||
        (selected.length > 2 && q.correct_answer.toLowerCase().startsWith(selected.slice(0, 2).toLowerCase()));

      if (isCorrect) {
        correctCount += 1;
      } else {
        // Diagnose specific misconception
        let trap = `Misunderstood core condition in ${session.concept_name}`;
        let tip = q.explanation || `Review the foundational principles of ${session.concept_name}.`;

        if (aiClient) {
          try {
            const diagPrompt = `A student answered an exam question incorrectly. Diagnose their specific misconception:
Question: "${q.question_text}"
Correct Answer: "${q.correct_answer}"
Student Selected: "${selected || 'No answer selected'}"
Concept: "${session.concept_name}"

Return strictly JSON:
{
  "trap_identified": "Specific cognitive trap or algebraic misconception (max 10 words)",
  "remediation_tip": "One clear, actionable sentence explaining why they were trapped and how to avoid it in exams"
}`;

            const diagResp = await aiClient.models.generateContent({
              model: env.GEMINI_MODEL,
              contents: [{ role: 'user', parts: [{ text: diagPrompt }] }],
              config: { responseMimeType: 'application/json', temperature: 0.2 },
            });
            const diagParsed = extractJson(diagResp.text || '{}');
            if (diagParsed.trap_identified) {
              trap = diagParsed.trap_identified;
              tip = diagParsed.remediation_tip;
            }
          } catch {
            // keep default
          }
        }

        newGaps.push({
          trap_identified: trap,
          question_snippet: q.question_text.slice(0, 120),
          remediation_tip: tip,
        });
      }

      questionsReview.push({
        id: q.id,
        question_text: q.question_text,
        options: q.options,
        selected_answer: selected,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        explanation: q.explanation,
        difficulty: q.difficulty,
      });
    }

    const scorePercentage = Math.round((correctCount / total) * 100);
    const settings = db.getUserLearningSettings(userId);
    const threshold = settings.mastery_threshold_percentage || 80;
    const status: 'mastered' | 'needs_practice' = scorePercentage >= threshold ? 'mastered' : 'needs_practice';

    // Update Concept Mastery Record in Database
    db.updateConceptMasteryScore(
      userId,
      session.concept_id,
      session.concept_name,
      session.subject,
      session.chapter,
      scorePercentage,
      newGaps
    );

    // Update Quiz Session Record
    db.updateConceptQuizSession(sessionId, {
      status: 'submitted',
      score: correctCount,
      submitted_at: new Date().toISOString(),
    });

    // Record learning activity
    db.recordActivity({
      user_id: userId,
      activity_type: 'practice',
      session_id: sessionId,
      metadata: {
        concept_id: session.concept_id,
        concept_name: session.concept_name,
        score: scorePercentage,
        status,
      },
    });

    let overallTip =
      status === 'mastered'
        ? `🌟 Excellent! You demonstrated mastery (≥ ${threshold}%) in "${session.concept_name}". Move on to the next concept in your syllabus map.`
        : `⚠️ You achieved ${scorePercentage}%. Review the identified misconception traps below, study the Revision Notes, and take a targeted retake to reach ≥ ${threshold}% mastery.`;

    return {
      score_percentage: scorePercentage,
      score: correctCount,
      total,
      status,
      mastery_threshold: threshold,
      questions_review: questionsReview,
      diagnosed_gaps: newGaps,
      learning_tip: overallTip,
    };
  }

  /**
   * 4. Structured Concept Revision Notes
   */
  public static async getOrGenerateRevisionNotes(
    conceptId: string,
    subjectName?: string,
    classLevel = 10
  ): Promise<ConceptRevisionNoteRecord> {
    const cached = db.getConceptRevisionNote(conceptId);
    if (cached) return cached;

    // Generate fresh notes
    let notesData: any = null;

    if (aiClient) {
      try {
        const prompt = `You are a master academic textbook author and educator.
Create comprehensive, high-retention Revision Notes for this concept:
Concept: "${conceptId}"
Subject: "${subjectName || 'Academic Subject'}"
Class Level: Class ${classLevel}

Provide strictly a JSON object with this exact structure:
{
  "definitions": [
    { "term": "Core Term", "explanation": "Clear, precise academic definition" }
  ],
  "key_principles": [
    "Core principle 1",
    "Core principle 2"
  ],
  "formulas_and_laws": [
    { "title": "Formula Name", "latex": "E = mc^2", "explanation": "What each variable represents" }
  ],
  "common_pitfalls": [
    { "mistake": "What students frequently do wrong", "correction": "What to do instead", "why": "The underlying mathematical or conceptual reason" }
  ],
  "worked_examples": [
    { "problem": "Classic exam question", "solution_steps": ["Step 1...", "Step 2..."], "key_takeaway": "Main lesson" }
  ],
  "quick_summary": "Crisp 2-sentence summary of the concept",
  "memory_mnemonics": ["Memorable mnemonic rule"]
}`;

        const response = await aiClient.models.generateContent({
          model: env.GEMINI_MODEL,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json', temperature: 0.2 },
        });

        notesData = extractJson(response.text || '{}');
      } catch (err) {
        console.warn('AI notes generation failed, using structured template:', err);
      }
    }

    if (!notesData || !notesData.definitions) {
      notesData = {
        definitions: [
          {
            term: conceptId,
            explanation: `A fundamental topic in ${subjectName || 'the curriculum'} establishing core mathematical and scientific relationships.`,
          },
        ],
        key_principles: [
          `Ensure conservation and consistency across all operations.`,
          `Check boundary conditions and physical applicability of the model.`,
        ],
        formulas_and_laws: [
          {
            title: `Governing Relation for ${conceptId}`,
            latex: `f(x) = y`,
            explanation: `Relates independent variables to corresponding outcomes in accordance with standard curriculum definitions.`,
          },
        ],
        common_pitfalls: [
          {
            mistake: `Ignoring negative signs during transposition.`,
            correction: `Verify sign changes on both sides of equal signs.`,
            why: `Sign inversion is the most common cause of exam score deduction.`,
          },
        ],
        worked_examples: [
          {
            problem: `Calculate the primary unknown using standard values for ${conceptId}.`,
            solution_steps: [
              `State known variables and required output.`,
              `Substitute values into standard equation.`,
              `Compute intermediate numerical operations with units.`,
            ],
            key_takeaway: `Always verify units in the final answer.`,
          },
        ],
        quick_summary: `${conceptId} forms an essential high-yield foundation for board examinations. Master the definitions and formulas for optimal retention.`,
        memory_mnemonics: [`Remember: State Knowns -> Choose Formula -> Calculate -> Verify Units!`],
      };
    }

    const noteRecord: ConceptRevisionNoteRecord = {
      id: uuidv4(),
      concept_id: conceptId,
      concept_name: conceptId,
      subject: subjectName || 'Subject',
      chapter: 'Core Chapter',
      class_level: classLevel,
      definitions: notesData.definitions || [],
      key_principles: notesData.key_principles || [],
      formulas_and_laws: notesData.formulas_and_laws || [],
      common_pitfalls: notesData.common_pitfalls || [],
      worked_examples: notesData.worked_examples || [],
      quick_summary: notesData.quick_summary || 'Core concept revision summary.',
      memory_mnemonics: notesData.memory_mnemonics || [],
      created_at: new Date().toISOString(),
    };

    db.saveConceptRevisionNote(noteRecord);
    return noteRecord;
  }

  /**
   * 5. Interactive Flashcards
   */
  public static async getOrGenerateFlashcards(
    conceptId: string,
    subjectName?: string
  ): Promise<ConceptFlashcardRecord> {
    const cached = db.getConceptFlashcards(conceptId);
    if (cached) return cached;

    let cards: any[] = [];

    if (aiClient) {
      try {
        const prompt = `Generate 6 high-yield active-recall flashcards for:
Concept: "${conceptId}"
Subject: "${subjectName || 'Academic Subject'}"

Return strictly JSON:
{
  "cards": [
    {
      "card_id": "fc-1",
      "front": "Prompt or Question (concise, active recall)",
      "back": "Clear, direct answer or definition",
      "category": "definition",
      "hint": "Optional short hint"
    }
  ]
}`;

        const response = await aiClient.models.generateContent({
          model: env.GEMINI_MODEL,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json', temperature: 0.3 },
        });

        const parsed = extractJson(response.text || '{}');
        if (parsed.cards && Array.isArray(parsed.cards)) {
          cards = parsed.cards;
        }
      } catch (err) {
        console.warn('AI flashcards generation failed, using defaults:', err);
      }
    }

    if (cards.length === 0) {
      cards = [
        {
          card_id: 'fc-1',
          front: `What is the core definition of ${conceptId}?`,
          back: `The fundamental physical or mathematical relationship defining interactions and problem-solving in this topic.`,
          category: 'definition',
          hint: `Think about its textbook definition.`,
        },
        {
          card_id: 'fc-2',
          front: `What is the governing formula for ${conceptId}?`,
          back: `The standard equation connecting input variables to target outputs.`,
          category: 'formula',
          hint: `Recall standard units and coefficients.`,
        },
        {
          card_id: 'fc-3',
          front: `What is the most frequent exam pitfall in ${conceptId}?`,
          back: `Sign inversion errors or misinterpreting boundary assumptions.`,
          category: 'pitfall',
          hint: `Watch out for negative signs.`,
        },
        {
          card_id: 'fc-4',
          front: `How do you verify your result in ${conceptId}?`,
          back: `Check dimensional homogeneity and substitute back into original equation.`,
          category: 'concept',
          hint: `Dimension check.`,
        },
      ];
    }

    const flashcardRecord: ConceptFlashcardRecord = {
      id: uuidv4(),
      concept_id: conceptId,
      subject: subjectName || 'Subject',
      cards,
      created_at: new Date().toISOString(),
    };

    db.saveConceptFlashcards(flashcardRecord);
    return flashcardRecord;
  }

  /**
   * 6. Personalized Learning Map
   */
  public static getPersonalizedLearningMap(
    userId: string,
    overrides?: {
      board?: string;
      classLevel?: 10 | 11 | 12;
      stream?: string | null;
    }
  ) {
    const edProfile = db.getEducationProfile(userId);
    const board = overrides?.board || edProfile?.board || 'CBSE';
    const classLevel = (overrides?.classLevel || edProfile?.class_level || 10) as 10 | 11 | 12;
    const stream = overrides?.stream !== undefined ? overrides.stream : edProfile?.stream;

    const officialSyllabus = db.getOfficialSyllabus(board, classLevel, stream);
    const masteries = db.getUserConceptMasteries(userId);
    const masteryMap = new Map<string, ConceptMasteryRecord>();
    masteries.forEach(m => masteryMap.set(m.concept_id.toLowerCase(), m));

    let totalConcepts = 0;
    let masteredConcepts = 0;
    let needsPracticeConcepts = 0;
    let unattemptedConcepts = 0;

    let nextRecommended: {
      concept_id: string;
      concept_name: string;
      subject: string;
      chapter: string;
      reason: string;
    } | null = null;

    const mappedSubjects = officialSyllabus.subjects.map(s => {
      return {
        subject_name: s.subject_name,
        code: s.code,
        total_marks: s.total_marks,
        units: s.units.map(u => {
          return {
            unit_id: u.unit_id,
            unit_number: u.unit_number,
            unit_name: u.unit_name,
            weightage: u.weightage,
            chapters: u.chapters.map(c => {
              return {
                chapter_id: c.chapter_id,
                chapter_number: c.chapter_number,
                chapter_name: c.chapter_name,
                concepts: c.concepts.map(con => {
                  totalConcepts += 1;
                  const record = masteryMap.get(con.id.toLowerCase()) || masteryMap.get(con.concept_name.toLowerCase());
                  const status = record?.status || 'unattempted';
                  const score = record?.score_percentage || 0;
                  const attempts = record?.quizzes_attempted || 0;
                  const gapsCount = record?.identified_gaps?.length || 0;

                  if (status === 'mastered') {
                    masteredConcepts += 1;
                  } else if (status === 'needs_practice') {
                    needsPracticeConcepts += 1;
                    if (!nextRecommended) {
                      nextRecommended = {
                        concept_id: con.id,
                        concept_name: con.concept_name,
                        subject: s.subject_name,
                        chapter: c.chapter_name,
                        reason: `Targeted Retake: You scored ${score}%. Take a 5-question retake to achieve ≥ 80% mastery!`,
                      };
                    }
                  } else {
                    unattemptedConcepts += 1;
                    if (!nextRecommended) {
                      nextRecommended = {
                        concept_id: con.id,
                        concept_name: con.concept_name,
                        subject: s.subject_name,
                        chapter: c.chapter_name,
                        reason: `Next core curriculum topic in ${c.chapter_name}.`,
                      };
                    }
                  }

                  return {
                    id: con.id,
                    concept_name: con.concept_name,
                    subtopics: con.subtopics,
                    difficulty: con.difficulty,
                    exam_importance: con.exam_importance,
                    prerequisites: con.prerequisites,
                    learning_objectives: con.learning_objectives,
                    common_misconceptions: con.common_misconceptions,
                    mastery_status: status,
                    score_percentage: score,
                    quizzes_attempted: attempts,
                    identified_gaps_count: gapsCount,
                    last_attempted_at: record?.last_attempted_at || null,
                  };
                }),
              };
            }),
          };
        }),
      };
    });

    const completionPercentage = totalConcepts > 0 ? Math.round((masteredConcepts / totalConcepts) * 100) : 0;

    return {
      syllabus: {
        id: officialSyllabus.id,
        board: officialSyllabus.board,
        class_level: officialSyllabus.class_level,
        stream: officialSyllabus.stream,
        academic_year: officialSyllabus.academic_year,
        version: officialSyllabus.version,
        official_source_url: officialSyllabus.official_source_url,
        verified: officialSyllabus.verified,
        last_verified_at: officialSyllabus.last_verified_at,
        subjects: mappedSubjects,
      },
      stats: {
        total_concepts: totalConcepts,
        mastered_concepts: masteredConcepts,
        needs_practice_concepts: needsPracticeConcepts,
        unattempted_concepts: unattemptedConcepts,
        completion_percentage: completionPercentage,
        mastery_threshold: 80,
      },
      next_recommended: nextRecommended,
    };
  }
}
