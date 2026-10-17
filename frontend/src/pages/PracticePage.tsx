import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  BookOpenCheck,
  Target,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
  FileText,
  HelpCircle,
  Lightbulb,
  Check,
  TrendingDown,
  Play,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton.js';
import { MathText } from '../components/common/MathText.js';
import {
  MasteryCurriculumHierarchy,
  TopicMasteryWorkflowSession,
  TopicMasteryWeakArea,
  SyllabusTopic,
  TopicMetric,
} from '../types/index.js';

export const PracticePage: React.FC = () => {
  const { educationProfile } = useAuth();
  const { success, error, warning } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation state passed from Syllabus or Weak Topics
  const stateSubject = (location.state as any)?.subject;
  const stateConceptId = (location.state as any)?.conceptId || (location.state as any)?.topicId;

  // Active Mode: 'mastery' (Guided 8-Step Workflow) vs 'drill' (Custom Quick Practice Session)
  const [activeTab, setActiveTab] = useState<'mastery' | 'drill'>('mastery');

  // Hierarchy Data
  const [curriculum, setCurriculum] = useState<MasteryCurriculumHierarchy | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>(
    stateSubject || educationProfile?.subjects?.[0] || 'Mathematics'
  );
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [selectedConceptId, setSelectedConceptId] = useState<string>(stateConceptId || '');
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(true);

  // Guided Mastery Workflow State
  const [masterySession, setMasterySession] = useState<TopicMasteryWorkflowSession | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Drill Form State
  const [drillTopicId, setDrillTopicId] = useState('');
  const [drillCount, setDrillCount] = useState(5);
  const [drillDifficulty, setDrillDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isStartingDrill, setIsStartingDrill] = useState(false);
  const [legacyTopics, setLegacyTopics] = useState<SyllabusTopic[]>([]);
  const [weakTopics, setWeakTopics] = useState<TopicMetric[]>([]);

  // 1. Fetch Official Syllabus Hierarchy
  const fetchCurriculum = async () => {
    try {
      const res = await api.get<MasteryCurriculumHierarchy>('/learning/mastery/topics');
      setCurriculum(res);

      if (res.subjects && res.subjects.length > 0) {
        const foundSub = res.subjects.find(
          s => s.subject_name.toLowerCase() === selectedSubject.toLowerCase()
        ) || res.subjects[0];
        setSelectedSubject(foundSub.subject_name);

        if (stateConceptId) {
          for (const u of foundSub.units || []) {
            for (const ch of u.chapters || []) {
              if (ch.concepts?.some(c => c.id === stateConceptId)) {
                setSelectedChapterId(ch.chapter_id);
                setSelectedConceptId(stateConceptId);
                break;
              }
            }
          }
        } else {
          const firstUnit = foundSub.units?.[0];
          const firstChapter = firstUnit?.chapters?.[0];
          if (firstChapter && !selectedChapterId) {
            setSelectedChapterId(firstChapter.chapter_id);
            if (firstChapter.concepts?.[0] && !selectedConceptId) {
              setSelectedConceptId(firstChapter.concepts[0].id);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('Failed to load curriculum hierarchy:', err);
    } finally {
      setIsLoadingCurriculum(false);
    }
  };

  useEffect(() => {
    fetchCurriculum();
  }, []);

  // 2. Fetch Legacy Topics for Drill Tab
  useEffect(() => {
    const fetchDrillData = async () => {
      try {
        const [topicsData, weakData] = await Promise.all([
          api.get('/syllabus-topics', {
            subject: selectedSubject,
            class_level: educationProfile?.class_level || 10,
            board: educationProfile?.board || 'CBSE',
          }),
          api.get('/analytics/weak-topics'),
        ]);
        setLegacyTopics(topicsData || []);
        setWeakTopics((weakData || []).filter((w: TopicMetric) => w.status === 'Needs Practice'));
      } catch {}
    };
    fetchDrillData();
  }, [selectedSubject]);

  // Current Subject Object in Hierarchy
  const currentSubjectObj = curriculum?.subjects.find(
    s => s.subject_name.toLowerCase() === selectedSubject.toLowerCase()
  );

  // All Chapters in Current Subject
  const allChapters = currentSubjectObj
    ? currentSubjectObj.units.flatMap(u => u.chapters)
    : [];

  // Active Chapter Object
  const currentChapterObj = allChapters.find(c => c.chapter_id === selectedChapterId) || allChapters[0];

  // Active Concept Object
  const currentConceptObj = currentChapterObj?.concepts.find(c => c.id === selectedConceptId) || currentChapterObj?.concepts[0];

  // Auto-launch if navigated with state concept
  useEffect(() => {
    if (stateConceptId && currentConceptObj && !masterySession) {
      handleStartWorkflow(stateConceptId, stateSubject || selectedSubject);
    }
  }, [stateConceptId, currentConceptObj]);

  // =========================================================================
  // WORKFLOW ACTION HANDLERS
  // =========================================================================

  // Step B: Start or Resume Topic Mastery Workflow
  const handleStartWorkflow = async (conceptIdToStart?: string, subjectToStart?: string) => {
    const cId = conceptIdToStart || selectedConceptId;
    const sName = subjectToStart || selectedSubject;

    if (!cId) {
      warning('Topic Required', 'Please select a syllabus topic to begin.');
      return;
    }

    setIsSubmitting(true);
    setAnswers({});
    try {
      const res = await api.post<{ session: TopicMasteryWorkflowSession; active_questions?: any[] }>(
        '/learning/mastery/start',
        {
          concept_id: cId,
          subject: sName,
        }
      );

      setMasterySession(res.session);
      setActiveQuestions(res.active_questions || []);
      success('Diagnostic Ready', `Adaptive diagnostic loaded for ${res.session.concept_name}.`);
    } catch (err: any) {
      error('Could Not Start Workflow', err.message || 'Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step C & D: Submit Diagnostic Assessment
  const handleSubmitDiagnostic = async () => {
    if (!masterySession) return;
    if (Object.keys(answers).length === 0) {
      warning('Answers Required', 'Please answer at least one question before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await api.post<TopicMasteryWorkflowSession>(
        `/learning/mastery/${masterySession.id}/submit-diagnostic`,
        { answers }
      );
      setMasterySession(updated);
      setAnswers({});
      success('Diagnosis Complete', 'Weak areas identified and personalized notes prepared.');
    } catch (err: any) {
      error('Evaluation Failed', err.message || 'Could not evaluate diagnostic.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step E: Start Targeted Practice on Weak Concepts
  const handleStartTargetedPractice = async () => {
    if (!masterySession) return;
    setIsSubmitting(true);
    setAnswers({});
    try {
      const res = await api.post<{ session: TopicMasteryWorkflowSession; active_questions: any[] }>(
        `/learning/mastery/${masterySession.id}/targeted-practice`
      );
      setMasterySession(res.session);
      setActiveQuestions(res.active_questions || []);
      success('Targeted Practice Ready', 'Fresh practice questions targeting your weak concepts.');
    } catch (err: any) {
      error('Could Not Generate Practice', err.message || 'Failed to start targeted practice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Targeted Practice
  const handleSubmitTargetedPractice = async () => {
    if (!masterySession) return;
    if (Object.keys(answers).length === 0) {
      warning('Answers Required', 'Please answer at least one question before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await api.post<TopicMasteryWorkflowSession>(
        `/learning/mastery/${masterySession.id}/submit-targeted-practice`,
        { answers }
      );
      setMasterySession(updated);
      setAnswers({});
      success('Targeted Practice Evaluated', 'Review your results and confirm your final assessment readiness.');
    } catch (err: any) {
      error('Submission Failed', err.message || 'Could not evaluate targeted practice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step F: Confirm Readiness (Yes or Not Yet)
  const handleConfirmReadiness = async (isReady: boolean) => {
    if (!masterySession) return;
    setIsSubmitting(true);
    try {
      const res = await api.post<{ session: TopicMasteryWorkflowSession; active_questions?: any[] }>(
        `/learning/mastery/${masterySession.id}/confirm-readiness`,
        { is_ready: isReady }
      );

      setMasterySession(res.session);
      if (isReady && res.active_questions) {
        setActiveQuestions(res.active_questions);
        setAnswers({});
        success('Final Assessment Ready', 'Demonstrate your mastery across all concepts.');
      } else {
        success('Revision Retained', 'Take all the time you need to review notes and practice.');
      }
    } catch (err: any) {
      error('Action Failed', err.message || 'Could not record readiness confirmation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step H: Submit Final Assessment
  const handleSubmitFinalAssessment = async () => {
    if (!masterySession) return;
    if (Object.keys(answers).length === 0) {
      warning('Answers Required', 'Please answer at least one question before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await api.post<TopicMasteryWorkflowSession>(
        `/learning/mastery/${masterySession.id}/submit-final`,
        { answers }
      );
      setMasterySession(updated);
      setAnswers({});

      if (updated.is_mastered) {
        success('Topic Mastered! 🌟', `Congratulations! Verified ${updated.final_percentage}% score.`);
      } else {
        warning('Practice Recommended', `Final score: ${updated.final_percentage}%. Review notes and practice again.`);
      }

      // Refresh curriculum tree
      fetchCurriculum();
    } catch (err: any) {
      error('Final Evaluation Failed', err.message || 'Could not evaluate final assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Drill Start Handler
  const handleStartDrillSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsStartingDrill(true);
    try {
      const res = await api.post('/practice/sessions', {
        subject: selectedSubject,
        topic_id: drillTopicId || null,
        question_count: drillCount,
        difficulty: drillDifficulty,
      });
      navigate(`/practice/${res.session.id}`);
    } catch (err: any) {
      error('Could Not Start Drill', err.message || 'Please check your connection and try again.');
    } finally {
      setIsStartingDrill(false);
    }
  };

  // Step Breadcrumb Navigation Label
  const getStageStepNumber = (stage: TopicMasteryWorkflowSession['stage']): number => {
    switch (stage) {
      case 'diagnostic':
        return 2;
      case 'diagnostic_review':
        return 3;
      case 'notes':
        return 4;
      case 'targeted_practice':
        return 5;
      case 'readiness_check':
        return 6;
      case 'final_assessment':
        return 7;
      case 'mastery_result':
        return 8;
      default:
        return 1;
    }
  };

  if (isLoadingCurriculum) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <LoadingSkeleton rows={4} height="h-28" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-indigo-700 to-purple-800 text-white p-6 sm:p-8 shadow-card">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-3 border border-white/20">
            <Target className="w-3.5 h-3.5 text-amber-300" />
            <span>Official Syllabus Aligned • 80% Benchmark</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Topic Practice & Verified Mastery
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-brand-100 font-medium leading-relaxed">
            Diagnose your misconceptions, review targeted short notes, practice weak spots, and verify understanding with a fresh final assessment.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-60 h-60 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('mastery')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'mastery'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Guided Topic Mastery Workflow</span>
          </button>

          <button
            onClick={() => setActiveTab('drill')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'drill'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Quick Practice Drills</span>
          </button>
        </div>

        {masterySession && (
          <button
            onClick={() => {
              setMasterySession(null);
              setAnswers({});
            }}
            className="text-xs font-bold text-slate-500 hover:text-brand-600 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Workflow / Choose Another Topic</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GUIDED TOPIC MASTERY WORKFLOW (STEPS A THROUGH H)                  */}
      {/* ========================================================================= */}
      {activeTab === 'mastery' && (
        <div className="space-y-6">
          {/* Workflow Steps Indicator */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-soft overflow-x-auto">
            <div className="flex items-center min-w-[650px] justify-between text-[11px] font-bold">
              {[
                { step: 1, title: 'Select Topic' },
                { step: 2, title: 'Diagnostic Quiz' },
                { step: 3, title: 'Diagnose Traps' },
                { step: 4, title: 'Personalized Notes' },
                { step: 5, title: 'Targeted Practice' },
                { step: 6, title: 'Readiness Check' },
                { step: 7, title: 'Final Assessment' },
                { step: 8, title: 'Verified Mastery' },
              ].map((s, idx) => {
                const currentStep = masterySession ? getStageStepNumber(masterySession.stage) : 1;
                const isPassed = currentStep > s.step;
                const isCurrent = currentStep === s.step;

                return (
                  <div key={s.step} className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold transition-all ${
                        isPassed
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                          ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isPassed ? <Check className="w-3 h-3 stroke-[3]" /> : s.step}
                    </div>
                    <span
                      className={`whitespace-nowrap ${
                        isCurrent
                          ? 'text-brand-700 font-extrabold'
                          : isPassed
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {s.title}
                    </span>
                    {idx < 7 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* STEP A: TOPIC SELECTION (When no session active)                       */}
          {/* --------------------------------------------------------------------- */}
          {!masterySession && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-brand-600" />
                    <span>Step A — Select Official Curriculum Topic</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select a topic from verified {curriculum?.board} Class {curriculum?.class_level} curriculum to begin your guided mastery journey.
                  </p>
                </div>

                <Link
                  to="/syllabus"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  <span>Explore Full Syllabus Tree</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Subject Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Academic Subject
                </label>
                <div className="flex flex-wrap gap-2">
                  {curriculum?.subjects.map(s => (
                    <button
                      key={s.subject_name}
                      type="button"
                      onClick={() => {
                        setSelectedSubject(s.subject_name);
                        const firstCh = s.units?.[0]?.chapters?.[0];
                        if (firstCh) {
                          setSelectedChapterId(firstCh.chapter_id);
                          if (firstCh.concepts?.[0]) {
                            setSelectedConceptId(firstCh.concepts[0].id);
                          }
                        }
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        selectedSubject.toLowerCase() === s.subject_name.toLowerCase()
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-700 border border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      {s.subject_name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chapter Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  2. Curriculum Chapter / Unit
                </label>
                <select
                  value={selectedChapterId}
                  onChange={e => {
                    setSelectedChapterId(e.target.value);
                    const ch = allChapters.find(c => c.chapter_id === e.target.value);
                    if (ch && ch.concepts?.[0]) {
                      setSelectedConceptId(ch.concepts[0].id);
                    }
                  }}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {allChapters.map(ch => (
                    <option key={ch.chapter_id} value={ch.chapter_id}>
                      {ch.chapter_name} ({ch.concepts.length} Concepts)
                    </option>
                  ))}
                </select>
              </div>

              {/* Concept / Topic Cards Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  3. Select Specific Concept to Master
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentChapterObj?.concepts.map(con => {
                    const isSelected = selectedConceptId === con.id;
                    const isMastered = con.mastery_status === 'mastered';
                    const needsPractice = con.mastery_status === 'needs_practice';

                    return (
                      <div
                        key={con.id}
                        onClick={() => setSelectedConceptId(con.id)}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all space-y-2 ${
                          isSelected
                            ? 'bg-brand-50/70 border-brand-500 ring-2 ring-brand-500/20 shadow-sm'
                            : 'bg-white border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            <MathText text={con.concept_name} inline />
                          </h4>
                          {isMastered ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              ✓ Mastered
                            </span>
                          ) : needsPractice ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                              Needs Practice
                            </span>
                          ) : (
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium">
                              Unattempted
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {con.subtopics.map(st => (
                            <span key={st} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded">
                              <MathText text={st} inline />
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Start Workflow CTA Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!selectedConceptId || isSubmitting}
                  onClick={() => handleStartWorkflow()}
                  className="w-full py-4 px-6 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    {isSubmitting
                      ? 'Generating Adaptive Diagnostic Quiz...'
                      : `Start Guided Mastery for ${currentConceptObj?.concept_name || 'Selected Topic'}`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* STEP B: INITIAL DIAGNOSTIC QUIZ                                       */}
          {/* --------------------------------------------------------------------- */}
          {masterySession && masterySession.stage === 'diagnostic' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 block">
                    Step B: Initial Diagnostic Assessment
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    <MathText text={masterySession.concept_name} inline />
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold rounded-xl">
                    {Object.keys(answers).length} of {activeQuestions.length} Answered
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {activeQuestions.map((q, idx) => (
                  <div key={q.id} className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">
                        Question {idx + 1} of {activeQuestions.length}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 capitalize">
                        {q.difficulty}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-800">
                      <MathText text={q.question_text} />
                    </div>

                    <div className="space-y-2 pt-1">
                      {q.options.map((opt: string) => {
                        const isSelected = answers[q.id] === opt;
                        return (
                          <div
                            key={opt}
                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                            className={`p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50/20'
                            }`}
                          >
                            <MathText text={opt} inline />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={Object.keys(answers).length === 0 || isSubmitting}
                  onClick={handleSubmitDiagnostic}
                  className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
                >
                  <span>{isSubmitting ? 'Diagnosing Misconceptions...' : 'Submit Diagnostic Answers'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* STEP C: DIAGNOSTIC REVIEW & IDENTIFIED WEAK AREAS                     */}
          {/* --------------------------------------------------------------------- */}
          {masterySession && masterySession.stage === 'diagnostic_review' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-6">
              {/* Score Hero Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  Step C: Diagnostic Baseline Score
                </span>
                <div className="text-3xl font-black text-amber-900">
                  {masterySession.diagnostic_percentage}%
                </div>
                <p className="text-xs text-amber-800 font-semibold">
                  {masterySession.diagnostic_score} of {masterySession.diagnostic_total} Questions Correct
                </p>
                <p className="text-xs text-slate-600 mt-2 max-w-lg mx-auto">
                  This diagnostic assessment establishes your starting baseline. Review the diagnosed cognitive traps below before proceeding to your personalized short notes.
                </p>
              </div>

              {/* Identified Weak Areas & Cognitive Traps Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Concept-by-Concept Cognitive Traps & Gaps</span>
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {masterySession.identified_weak_areas.map((w, idx) => {
                    const isDemonstrated = w.classification === 'demonstrated_understanding';
                    const isInsufficient = w.classification === 'insufficient_evidence';

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border text-xs space-y-1 ${
                          isDemonstrated
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : isInsufficient
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-rose-50/60 border-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900 font-bold">
                            <MathText text={w.concept} inline />
                          </strong>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isDemonstrated
                                ? 'bg-emerald-100 text-emerald-800'
                                : isInsufficient
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {w.classification.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {w.trap && (
                          <p className="text-slate-800 font-semibold">
                            <span className="text-rose-700 font-bold">⚠️ Cognitive Trap:</span> <MathText text={w.trap} inline />
                          </p>
                        )}
                        <p className="text-slate-600 font-medium">
                          Evidence: <MathText text={w.evidence} inline />
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Diagnostic Question-by-Question Review */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Question Breakdown & Reasoning
                </h4>
                <div className="space-y-3">
                  {masterySession.diagnostic_review?.map((q, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border text-xs space-y-2 ${
                        q.is_correct ? 'bg-slate-50 border-slate-200' : 'bg-rose-50/40 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Question {idx + 1}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            q.is_correct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {q.is_correct ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                      <div className="font-medium text-slate-900">
                        <MathText text={q.question_text} />
                      </div>
                      <div className="space-y-1 pt-1 border-t border-slate-200/60 text-[11px]">
                        <p className="text-slate-600">
                          <strong>Your Answer:</strong> <MathText text={q.selected_answer} inline />
                        </p>
                        {!q.is_correct && (
                          <p className="text-emerald-700 font-semibold">
                            <strong>Correct Answer:</strong> <MathText text={q.correct_answer} inline />
                          </p>
                        )}
                        <div className="text-slate-500 pt-1 leading-relaxed">
                          <strong>Explanation:</strong> <MathText text={q.explanation} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMasterySession(prev => prev ? { ...prev, stage: 'notes' } : null);
                  }}
                  className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
                >
                  <span>Step D: Review Personalized Short Notes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* STEP D: PERSONALIZED SHORT REVISION NOTES                             */}
          {/* --------------------------------------------------------------------- */}
          {masterySession && masterySession.stage === 'notes' && masterySession.personalized_notes && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider block">
                      Step D — AI-Generated Personalized Short Notes
                    </span>
                    <h3 className="text-base font-extrabold text-slate-800">
                      Targeted Revision: <MathText text={masterySession.concept_name} inline />
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                  Personalized to Diagnosed Gaps
                </span>
              </div>

              {/* Quick Summary */}
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs leading-relaxed font-medium">
                <strong className="block text-purple-700 font-bold mb-1 uppercase tracking-wider text-[10px]">
                  Targeted Revision Summary
                </strong>
                <MathText text={masterySession.personalized_notes.quick_summary} />
              </div>

              {/* Core Definitions */}
              {masterySession.personalized_notes.definitions?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Core Definitions & Misconception Fixes
                  </h4>
                  <div className="space-y-2">
                    {masterySession.personalized_notes.definitions.map((def, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <strong className="text-slate-900 font-bold">
                          <MathText text={def.term} inline />:
                        </strong>{' '}
                        <span className="text-slate-600">
                          <MathText text={def.explanation} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulas & Principles */}
              {masterySession.personalized_notes.formulas_and_principles?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Formulas & Laws (High-Yield)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {masterySession.personalized_notes.formulas_and_principles.map((form, idx) => (
                      <div key={idx} className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1.5">
                        <span className="font-bold text-indigo-900 text-xs">
                          <MathText text={form.title} inline />
                        </span>
                        <div className="text-sm text-brand-900 font-bold bg-white p-2.5 rounded-lg border border-indigo-100 text-center overflow-x-auto">
                          <MathText text={form.latex} block />
                        </div>
                        <p className="text-[11px] text-slate-600">
                          <MathText text={form.explanation} />
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Common Pitfalls */}
              {masterySession.personalized_notes.common_pitfalls?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Watch Out: Exam Pitfalls</span>
                  </h4>
                  <div className="space-y-2">
                    {masterySession.personalized_notes.common_pitfalls.map((pit, idx) => (
                      <div key={idx} className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs space-y-1.5">
                        <p className="font-bold text-rose-700">
                          ❌ Mistake: <span className="text-slate-800 font-medium"><MathText text={pit.mistake} inline /></span>
                        </p>
                        <p className="font-semibold text-emerald-700">
                          ✓ Correction: <span className="text-slate-800 font-medium"><MathText text={pit.correction} inline /></span>
                        </p>
                        <p className="text-[11px] text-slate-500 italic">
                          Why: <MathText text={pit.why} inline />
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Worked Examples */}
              {masterySession.personalized_notes.worked_examples?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Worked Example
                  </h4>
                  {masterySession.personalized_notes.worked_examples.map((ex, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="font-bold text-slate-900">
                        Problem: <MathText text={ex.problem} />
                      </div>
                      <div className="space-y-1.5 pl-3 border-l-2 border-brand-400">
                        {ex.solution_steps.map((st, sidx) => (
                          <div key={sidx} className="text-slate-600 leading-relaxed">
                            <MathText text={st} />
                          </div>
                        ))}
                      </div>
                      <div className="text-[11px] font-semibold text-brand-700 bg-brand-50 p-2 rounded-lg">
                        💡 Key Takeaway: <MathText text={ex.key_takeaway} inline />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleStartTargetedPractice}
                  className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
                >
                  <span>{isSubmitting ? 'Preparing Practice...' : 'Step E: Practice Weak Areas'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* STEP E: TARGETED PRACTICE ON WEAK CONCEPTS                            */}
          {/* --------------------------------------------------------------------- */}
          {masterySession && masterySession.stage === 'targeted_practice' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 block">
                    Step E: Targeted Practice Session
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Remediation: <MathText text={masterySession.concept_name} inline />
                  </h3>
                </div>
                <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl">
                  {Object.keys(answers).length} of {activeQuestions.length} Answered
                </span>
              </div>

              <div className="space-y-6">
                {activeQuestions.map((q, idx) => (
                  <div key={q.id} className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">
                        Practice Question {idx + 1} of {activeQuestions.length}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 capitalize">
                        Targeting {q.concept_tested || 'Weak Area'}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-800">
                      <MathText text={q.question_text} />
                    </div>

                    <div className="space-y-2 pt-1">
                      {q.options.map((opt: string) => {
                        const isSelected = answers[q.id] === opt;
                        return (
                          <div
                            key={opt}
                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                            className={`p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50/20'
                            }`}
                          >
                            <MathText text={opt} inline />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={Object.keys(answers).length === 0 || isSubmitting}
                  onClick={handleSubmitTargetedPractice}
                  className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
                >
                  <span>{isSubmitting ? 'Evaluating Practice...' : 'Submit Targeted Practice'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* STEP F: STUDENT READINESS CONFIRMATION                                 */}
          {/* --------------------------------------------------------------------- */}
          {masterySession && masterySession.stage === 'readiness_check' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-6 animate-fade-in text-center">
              <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-sm">
                <HelpCircle className="w-8 h-8" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 block">
                  Step F: Readiness Confirmation
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Do you feel confident about this topic and want to take the final assessment?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Note: A student's confirmation of readiness is not proof of mastery. Actual mastery must be evaluated from the final assessment and sufficient evidence of understanding.
                </p>
              </div>

              {/* Review summary of targeted practice */}
              {masterySession.targeted_practice_score !== undefined && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                  <span>Targeted Practice Score:</span>
                  <strong className="text-brand-600 font-bold">
                    {masterySession.targeted_practice_score} of {masterySession.targeted_practice_total} Correct
                  </strong>
                </div>
              )}

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleConfirmReadiness(false)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Not yet — Review Notes & Practice Again
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleConfirmReadiness(true)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>{isSubmitting ? 'Loading Final Quiz...' : "Yes, I'm ready — Start Final Quiz"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* STEP G: SEPARATE FINAL ASSESSMENT                                     */}
          {/* --------------------------------------------------------------------- */}
          {masterySession && masterySession.stage === 'final_assessment' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    Step G: Separate Final Assessment (Mastery Verification)
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    <MathText text={masterySession.concept_name} inline />
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl">
                    Final Assessment (≥ {masterySession.mastery_threshold}% benchmark)
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {activeQuestions.map((q, idx) => (
                  <div key={q.id} className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">
                        Final Question {idx + 1} of {activeQuestions.length}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 capitalize">
                        {q.difficulty}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-800">
                      <MathText text={q.question_text} />
                    </div>

                    <div className="space-y-2 pt-1">
                      {q.options.map((opt: string) => {
                        const isSelected = answers[q.id] === opt;
                        return (
                          <div
                            key={opt}
                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                            className={`p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50/20'
                            }`}
                          >
                            <MathText text={opt} inline />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={Object.keys(answers).length === 0 || isSubmitting}
                  onClick={handleSubmitFinalAssessment}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
                >
                  <span>{isSubmitting ? 'Evaluating Final Mastery...' : 'Submit Final Assessment'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* STEP H: MASTERY DECISION & NEXT ACTION                                */}
          {/* --------------------------------------------------------------------- */}
          {masterySession && masterySession.stage === 'mastery_result' && (
            <div className="space-y-6 animate-fade-in">
              {/* Mastery Outcome Card */}
              <div
                className={`p-6 sm:p-8 rounded-3xl border text-center space-y-3 ${
                  masterySession.is_mastered
                    ? 'bg-gradient-to-br from-emerald-50 via-teal-50 to-white border-emerald-300'
                    : 'bg-gradient-to-br from-amber-50 via-orange-50 to-white border-amber-300'
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-sm ${
                    masterySession.is_mastered ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  {masterySession.is_mastered ? <Award className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Step H: Verified Mastery Evaluation
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">
                    {masterySession.is_mastered ? (
                      <span>Topic Mastered! 🌟 Verified ≥ {masterySession.mastery_threshold}% Benchmark</span>
                    ) : (
                      <span>Needs More Practice ({masterySession.final_percentage}% of {masterySession.mastery_threshold}% Needed)</span>
                    )}
                  </h3>
                </div>

                {/* Score Comparison Pill */}
                <div className="inline-flex items-center gap-6 px-6 py-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Diagnostic</span>
                    <span className="text-xl font-black text-slate-700">{masterySession.diagnostic_percentage}%</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Final Assessment</span>
                    <span
                      className={`text-xl font-black ${
                        masterySession.is_mastered ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {masterySession.final_percentage}%
                    </span>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Improvement</span>
                    <span className="text-xl font-black text-brand-600">
                      {masterySession.improvement_percentage !== undefined && masterySession.improvement_percentage >= 0
                        ? `+${masterySession.improvement_percentage}%`
                        : `${masterySession.improvement_percentage}%`}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                  {masterySession.is_mastered
                    ? `Outstanding work! You demonstrated consistent understanding and application across all core concepts of ${masterySession.concept_name}. Your learning map and dashboard metrics have been updated.`
                    : `You showed solid effort with a ${masterySession.final_percentage}% final score. Review the personalized notes and repeat targeted practice to clear remaining misconception traps.`}
                </p>

                {/* Next Recommended Concept Card (if mastered) */}
                {masterySession.is_mastered && masterySession.next_recommended_concept && (
                  <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200 text-left max-w-lg mx-auto flex items-center justify-between gap-3 mt-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 block">
                        Next Recommended Topic in Curriculum
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        <MathText text={masterySession.next_recommended_concept.concept_name} inline />
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {masterySession.next_recommended_concept.chapter}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleStartWorkflow(
                          masterySession.next_recommended_concept!.concept_id,
                          masterySession.subject
                        );
                      }}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 flex items-center gap-1.5"
                    >
                      <span>Master Next</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Retry Option (if not mastered) */}
                {!masterySession.is_mastered && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMasterySession(prev => prev ? { ...prev, stage: 'notes' } : null);
                      }}
                      className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                    >
                      Review Notes & Retake Targeted Practice
                    </button>
                  </div>
                )}
              </div>

              {/* Final Assessment Question-by-Question Breakdown */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Final Assessment Question Breakdown
                </h4>
                <div className="space-y-3">
                  {masterySession.final_review?.map((q, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border text-xs space-y-2 ${
                        q.is_correct ? 'bg-slate-50 border-slate-200' : 'bg-rose-50/40 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Question {idx + 1}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            q.is_correct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {q.is_correct ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                      <div className="font-medium text-slate-900">
                        <MathText text={q.question_text} />
                      </div>
                      <div className="space-y-1 pt-1 border-t border-slate-200/60 text-[11px]">
                        <p className="text-slate-600">
                          <strong>Your Answer:</strong> <MathText text={q.selected_answer} inline />
                        </p>
                        {!q.is_correct && (
                          <p className="text-emerald-700 font-semibold">
                            <strong>Correct Answer:</strong> <MathText text={q.correct_answer} inline />
                          </p>
                        )}
                        <div className="text-slate-500 pt-1 leading-relaxed">
                          <strong>Explanation:</strong> <MathText text={q.explanation} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMasterySession(null);
                    setAnswers({});
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  Choose Another Topic
                </button>

                <div className="flex items-center gap-2">
                  <Link
                    to="/mistakes"
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                  >
                    Review All Mistakes
                  </Link>

                  <Link
                    to="/syllabus"
                    className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-colors"
                  >
                    Explore Syllabus Tree
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUICK DRILL PRACTICE MODE (Preserves Flexible Custom Sessions)      */}
      {/* ========================================================================= */}
      {activeTab === 'drill' && (
        <div className="space-y-6">
          {/* Recommended Targeted Practice Cards (if weak topics exist) */}
          {weakTopics.length > 0 && (
            <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-brand-50 rounded-3xl p-6 border border-rose-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span>Recommended Targeted Practice Based on Evidence</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our diagnostics flagged these topics with low accuracy. We recommend solving a focused 5-question session:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {weakTopics.slice(0, 2).map(wt => (
                  <div
                    key={wt.topic_id}
                    className="bg-white/90 p-3.5 rounded-2xl border border-rose-200/80 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                        {wt.subject}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 mt-1 line-clamp-1">
                        <MathText text={wt.topic_name} inline />
                      </h4>
                      <p className="text-[10px] text-rose-600 font-semibold">{wt.accuracy}% accuracy ({wt.total_attempts} attempts)</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedSubject(wt.subject);
                        setDrillTopicId(wt.topic_id);
                        setDrillCount(5);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Form */}
          <form onSubmit={handleStartDrillSession} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-brand-600" />
              <span>Configure Quick Drill Session</span>
            </h3>

            {/* Subject & Topic Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Subject *
                </label>
                <select
                  value={selectedSubject}
                  onChange={e => {
                    setSelectedSubject(e.target.value);
                    setDrillTopicId('');
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  {(educationProfile?.subjects || ['Mathematics', 'Science']).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Topic
                </label>
                <select
                  value={drillTopicId}
                  onChange={e => setDrillTopicId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="">All Topics in {selectedSubject}</option>
                  {legacyTopics.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.chapter ? `${t.chapter}: ` : ''}{t.topic}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Number of Questions */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Number of Questions
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[3, 5, 10].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setDrillCount(cnt)}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                      drillCount === cnt
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cnt} Questions
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Level */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { level: 'easy', label: 'Easy', desc: 'Foundational recall' },
                  { level: 'medium', label: 'Medium', desc: 'Curriculum standard' },
                  { level: 'hard', label: 'Hard', desc: 'Advanced synthesis' },
                ].map(d => (
                  <button
                    key={d.level}
                    type="button"
                    onClick={() => setDrillDifficulty(d.level as any)}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      drillDifficulty === d.level
                        ? 'bg-brand-50 border-brand-500 text-brand-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-bold text-xs block capitalize">{d.label}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isStartingDrill}
                className="w-full py-4 px-6 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-sm rounded-2xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isStartingDrill ? (
                  <span>Preparing Practice Drill...</span>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Launch Practice Drill ({drillCount} Questions)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
