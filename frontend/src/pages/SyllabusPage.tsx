import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Upload,
  BookOpen,
  Award,
  AlertTriangle,
  Play,
  FileText,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Info,
  Check,
  X,
  Target,
  ArrowRight,
  RotateCcw,
  Search,
} from 'lucide-react';
import { api } from '../lib/api.js';
import {
  LearningMapResponse,
  SyllabusSubject,
  SyllabusConcept,
  SyllabusComparison,
  ConceptRevisionNote,
  ConceptFlashcard,
} from '../types/index.js';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton.js';
import { useAuth } from '../hooks/useAuth.js';
import { MathText } from '../components/common/MathText.js';

export const SyllabusPage: React.FC = () => {
  const navigate = useNavigate();
  const { educationProfile } = useAuth();
  const [data, setData] = useState<LearningMapResponse | null>(null);
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  // Collapsible state for units: key = unit_id
  const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [activeQuizConcept, setActiveQuizConcept] = useState<SyllabusConcept | null>(null);
  const [activeNotesConcept, setActiveNotesConcept] = useState<SyllabusConcept | null>(null);
  const [activeFlashcardsConcept, setActiveFlashcardsConcept] = useState<SyllabusConcept | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Quiz execution state
  const [quizSession, setQuizSession] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);

  // Notes state
  const [notesData, setNotesData] = useState<ConceptRevisionNote | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);

  // Flashcards state
  const [flashcardsData, setFlashcardsData] = useState<ConceptFlashcard | null>(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);

  // Comparison upload state
  const [compareText, setCompareText] = useState('');
  const [compareFile, setCompareFile] = useState<File | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<SyllabusComparison | null>(null);

  const fetchLearningMap = async () => {
    try {
      const resp = await api.get<LearningMapResponse>('/learning/map');
      setData(resp);
    } catch (err) {
      console.error('Failed to load learning map:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLearningMap();
  }, []);

  const handleRefreshVerification = async () => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    try {
      const resp = await api.post('/syllabus/refresh');
      setRefreshMessage(resp.message || 'Syllabus verified against official portal.');
      await fetchLearningMap();
    } catch (err: any) {
      setRefreshMessage('Source verified.');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setRefreshMessage(null), 4000);
    }
  };

  const toggleUnit = (unitId: string) => {
    setCollapsedUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId],
    }));
  };

  // 1. Quiz Handler
  const handleStartQuiz = async (concept: SyllabusConcept, subjectName: string) => {
    setActiveQuizConcept(concept);
    setQuizLoading(true);
    setQuizResult(null);
    setQuizAnswers({});
    try {
      const quiz = await api.post('/learning/quizzes/generate', {
        concept_id: concept.id,
        subject: subjectName,
      });
      setQuizSession(quiz);
    } catch (err) {
      console.error('Failed to generate quiz:', err);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quizSession) return;
    setQuizSubmitting(true);
    try {
      const res = await api.post(`/learning/quizzes/${quizSession.sessionId}/submit`, {
        answers: quizAnswers,
      });
      setQuizResult(res);
      // Reload map in background to update mastery badges
      fetchLearningMap();
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    } finally {
      setQuizSubmitting(false);
    }
  };

  // 2. Revision Notes Handler
  const handleOpenNotes = async (concept: SyllabusConcept, subjectName: string) => {
    setActiveNotesConcept(concept);
    setNotesLoading(true);
    try {
      const notes = await api.get<ConceptRevisionNote>(`/learning/concepts/${concept.id}/notes`, {
        subject: subjectName,
      });
      setNotesData(notes);
    } catch (err) {
      console.error('Failed to fetch revision notes:', err);
    } finally {
      setNotesLoading(false);
    }
  };

  // 3. Flashcards Handler
  const handleOpenFlashcards = async (concept: SyllabusConcept, subjectName: string) => {
    setActiveFlashcardsConcept(concept);
    setFlashcardsLoading(true);
    setFlashcardIndex(0);
    setIsFlipped(false);
    try {
      const cards = await api.get<ConceptFlashcard>(`/learning/concepts/${concept.id}/flashcards`, {
        subject: subjectName,
      });
      setFlashcardsData(cards);
    } catch (err) {
      console.error('Failed to fetch flashcards:', err);
    } finally {
      setFlashcardsLoading(false);
    }
  };

  // 4. Comparison Handler
  const handleCompareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compareText.trim() && !compareFile) return;

    setCompareLoading(true);
    try {
      const currentSubject = data?.syllabus.subjects[activeSubjectIndex]?.subject_name || 'Mathematics';
      let result: SyllabusComparison;

      if (compareFile) {
        const formData = new FormData();
        formData.append('file', compareFile);
        formData.append('subject', currentSubject);
        result = await api.post('/syllabus/compare', formData);
      } else {
        result = await api.post('/syllabus/compare', {
          text_content: compareText,
          subject: currentSubject,
        });
      }

      setCompareResult(result);
    } catch (err) {
      console.error('Failed to compare syllabus:', err);
    } finally {
      setCompareLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={4} height="h-28" />
      </div>
    );
  }

  const syllabus = data?.syllabus;
  const currentSubject: SyllabusSubject | undefined = syllabus?.subjects[activeSubjectIndex];

  // Filter concepts based on search query
  const matchesSearch = (concept: SyllabusConcept) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      concept.concept_name.toLowerCase().includes(q) ||
      concept.subtopics.some(s => s.toLowerCase().includes(q))
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Official Syllabus Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-800 via-brand-700 to-indigo-800 text-white p-6 sm:p-8 shadow-card">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold border border-white/30 text-white">
              <GraduationCap className="w-3.5 h-3.5 text-brand-200" />
              Official {syllabus?.board} Curriculum • Class {syllabus?.class_level}
            </span>

            <a
              href={syllabus?.official_source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md text-xs font-semibold border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              Verified Official Source
              <ExternalLink className="w-3 h-3 text-emerald-300" />
            </a>

            <span className="text-[11px] text-white/70 font-medium">
              Version: {syllabus?.version}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Academic Syllabus & Learning Tree
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-brand-100 font-medium leading-relaxed">
            Your accredited board curriculum with concept-level mastery tracking (≥ 80% benchmark), instant diagnostic quizzes, high-retention revision notes, and flashcards.
          </p>

          {/* Action Row */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefreshVerification}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Checking Official Portal...' : 'Check for Updates'}</span>
            </button>

            <button
              onClick={() => {
                setShowCompareModal(true);
                setCompareResult(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-brand-700 hover:bg-brand-50 text-xs font-bold shadow-md transition-all active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 text-brand-600" />
              <span>Compare School Syllabus</span>
            </button>
          </div>

          {refreshMessage && (
            <div className="mt-3 inline-block px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-xs text-emerald-100 font-medium animate-fade-in">
              ✓ {refreshMessage}
            </div>
          )}
        </div>

        {/* Ambient subtle glow */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      </div>

      {/* 2. Mastery Benchmark & Progress Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Concepts */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-soft">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Concepts</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{data?.stats.total_concepts || 0}</span>
            <span className="text-xs text-slate-500 font-medium">official topics</span>
          </div>
        </div>

        {/* Mastered Concepts */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100 shadow-soft bg-gradient-to-br from-emerald-50/40 to-white">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" />
            Mastered (≥ 80%)
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{data?.stats.mastered_concepts || 0}</span>
            <span className="text-xs text-emerald-600 font-semibold">
              {data?.stats.completion_percentage || 0}% Complete
            </span>
          </div>
        </div>

        {/* Needs Practice */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-100 shadow-soft bg-gradient-to-br from-amber-50/40 to-white">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Needs Practice (&lt; 80%)
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">{data?.stats.needs_practice_concepts || 0}</span>
            <span className="text-xs text-amber-600 font-semibold">Gaps Flagged</span>
          </div>
        </div>

        {/* Unattempted */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-soft">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unattempted</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-600">{data?.stats.unattempted_concepts || 0}</span>
            <span className="text-xs text-slate-400 font-medium">to explore</span>
          </div>
        </div>
      </div>

      {/* Progress Bar with 80% Benchmark Note */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-soft space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-brand-600" />
            Syllabus Mastery Progress
          </span>
          <span className="text-brand-600 font-bold">{data?.stats.completion_percentage || 0}% Completed</span>
        </div>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-brand-600 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${data?.stats.completion_percentage || 0}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            ConceptTrace AI uses an accredited <strong>80% mastery benchmark</strong>. Concepts with score &lt; 80% automatically trigger targeted misconception remediation.
          </span>
        </p>
      </div>

      {/* 3. Subject Switcher Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Subject Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {syllabus?.subjects.map((subj, idx) => (
            <button
              key={subj.subject_name}
              onClick={() => setActiveSubjectIndex(idx)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeSubjectIndex === idx
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {subj.subject_name}
              {subj.code && <span className="ml-1.5 opacity-75 text-[10px]">({subj.code})</span>}
            </button>
          ))}
        </div>

        {/* Search Filter */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search concepts or subtopics..."
            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>
      </div>

      {/* 4. Units & Chapters Hierarchy Tree */}
      <div className="space-y-4">
        {currentSubject?.units.map(unit => {
          const isCollapsed = collapsedUnits[unit.unit_id];
          const allConcepts = unit.chapters.flatMap(c => c.concepts);
          const filteredConcepts = allConcepts.filter(matchesSearch);

          if (searchQuery.trim() && filteredConcepts.length === 0) {
            return null;
          }

          return (
            <div
              key={unit.unit_id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden transition-all"
            >
              {/* Unit Header */}
              <div
                onClick={() => toggleUnit(unit.unit_id)}
                className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs">
                    {unit.unit_number}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span>{unit.unit_name}</span>
                      {unit.weightage && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-semibold border border-purple-200/50">
                          {unit.weightage} Marks Weightage
                        </span>
                      )}
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {unit.chapters.length} Chapters • {allConcepts.length} Core Concepts
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Chapters & Concepts */}
              {!isCollapsed && (
                <div className="p-4 sm:p-6 pt-4 border-t border-slate-100 space-y-5">
                  {unit.chapters.map(chapter => {
                    const chapterFilteredConcepts = chapter.concepts.filter(matchesSearch);
                    if (chapterFilteredConcepts.length === 0) return null;
                    const isSingleConcept = chapterFilteredConcepts.length === 1;

                    return (
                      <div
                        key={chapter.chapter_id}
                        className="rounded-2xl bg-slate-50/70 border border-slate-200/80 p-4 sm:p-5 space-y-3.5 transition-all shadow-2xs"
                      >
                        {/* Chapter Title Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/70">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {chapter.chapter_number}
                            </span>
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-brand-600" />
                              <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
                                Chapter {chapter.chapter_number}: {chapter.chapter_name}
                              </h3>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-white text-slate-600 text-[11px] font-semibold border border-slate-200/80 shadow-2xs">
                              {chapterFilteredConcepts.length} {chapterFilteredConcepts.length === 1 ? 'Concept' : 'Concepts'}
                            </span>
                          </div>
                        </div>

                        {/* Concept Cards Grid: 1-col mobile, 2-col tablet, 3-col desktop */}
                        <div
                          className={`grid gap-3 sm:gap-4 ${
                            isSingleConcept
                              ? 'grid-cols-1'
                              : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                          }`}
                        >
                          {chapterFilteredConcepts.map((concept, idx) => {
                            const isMastered = concept.mastery_status === 'mastered';
                            const needsPractice = concept.mastery_status === 'needs_practice';
                            // span last odd card only on the md 2-col layout
                            const totalConcepts = chapterFilteredConcepts.length;
                            const isLastOdd =
                              !isSingleConcept &&
                              totalConcepts % 2 === 1 &&
                              idx === totalConcepts - 1;

                            return (
                              <div
                                key={concept.id}
                                className={`rounded-2xl p-4 sm:p-5 border transition-all duration-200 flex flex-col justify-between ${
                                  isLastOdd ? 'md:col-span-2 xl:col-span-1' : ''
                                } ${
                                  isMastered
                                    ? 'bg-emerald-50/25 border-emerald-200/80 shadow-soft'
                                    : needsPractice
                                    ? 'bg-amber-50/25 border-amber-200/80 shadow-soft'
                                    : 'bg-white border-slate-200/80 shadow-soft hover:border-brand-200'
                                }`}
                              >
                                <div>
                                  {/* Concept Header & Status */}
                                  <div className="flex flex-wrap items-start justify-between gap-2.5 mb-2.5">
                                    <div className="space-y-1 flex-1 min-w-0">
                                      <h4 className="text-sm sm:text-base font-bold text-slate-800 leading-snug">
                                        <MathText text={concept.concept_name} inline />
                                      </h4>
                                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                        {concept.difficulty && (
                                          <span
                                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                              concept.difficulty === 'hard'
                                                ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                                : concept.difficulty === 'medium'
                                                ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                            }`}
                                          >
                                            {concept.difficulty.toUpperCase()}
                                          </span>
                                        )}
                                        {concept.exam_importance === 'high_yield' && (
                                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200/50 flex items-center gap-1">
                                            <Sparkles className="w-3 h-3 text-purple-600" />
                                            High Yield
                                          </span>
                                        )}
                                        {concept.exam_importance === 'core' && (
                                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/50">
                                            Core
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="shrink-0">
                                      {isMastered && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1 border border-emerald-300 shadow-2xs">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                          Mastered ({concept.score_percentage}%)
                                        </span>
                                      )}

                                      {needsPractice && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center gap-1 border border-amber-300 shadow-2xs">
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                          Needs Practice ({concept.score_percentage}%)
                                        </span>
                                      )}

                                      {!isMastered && !needsPractice && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                                          Unattempted
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Subtopics chips */}
                                  <div className="flex flex-wrap gap-1.5 my-3">
                                    {concept.subtopics.map(st => (
                                      <span
                                        key={st}
                                        className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/60"
                                      >
                                        <MathText text={st} inline />
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Action Buttons Row */}
                                <div className="pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 mt-2">
                                  <button
                                    type="button"
                                    onClick={() => handleStartQuiz(concept, currentSubject.subject_name)}
                                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs ${
                                      needsPractice
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                                        : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm'
                                    }`}
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    <span>{needsPractice ? 'Retake Quiz' : 'Concept Quiz'}</span>
                                  </button>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenNotes(concept, currentSubject.subject_name)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-600 hover:text-brand-600 hover:bg-brand-50 border border-slate-200/80 rounded-xl transition-colors text-xs font-semibold"
                                      title="Structured Revision Notes"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Notes</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenFlashcards(concept, currentSubject.subject_name)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/80 rounded-xl transition-colors text-xs font-semibold"
                                      title="Interactive Flashcards"
                                    >
                                      <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Cards</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        navigate('/practice', {
                                          state: { subject: currentSubject.subject_name, conceptId: concept.id },
                                        })
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-xl transition-colors text-xs font-bold shadow-2xs"
                                      title="8-Step Topic Practice & Mastery Workflow"
                                    >
                                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                      <span>Master</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* --- 5. CONCEPT QUIZ MODAL --- */}
      {activeQuizConcept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                  Adaptive Concept Assessment (5 Questions)
                </span>
                <h3 className="text-lg font-extrabold text-slate-800">
                  <MathText text={activeQuizConcept.concept_name} inline />
                </h3>
              </div>
              <button
                onClick={() => {
                  setActiveQuizConcept(null);
                  setQuizSession(null);
                  setQuizResult(null);
                }}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quiz Body */}
            {quizLoading ? (
              <div className="py-12 space-y-4">
                <LoadingSkeleton rows={3} height="h-20" />
                <p className="text-center text-xs text-slate-500 font-medium animate-pulse">
                  Generating 5 adaptive curriculum-aligned questions for {activeQuizConcept.concept_name}...
                </p>
              </div>
            ) : quizResult ? (
              /* Quiz Results & Evidence-Based Misconception Diagnosis */
              <div className="py-4 space-y-5 animate-fade-in">
                {/* Result Hero Banner */}
                <div
                  className={`p-6 rounded-2xl border text-center ${
                    quizResult.status === 'mastered'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center bg-white shadow-sm mb-3">
                    {quizResult.status === 'mastered' ? (
                      <Award className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-amber-600" />
                    )}
                  </div>
                  <h4 className="text-xl font-extrabold">
                    {quizResult.status === 'mastered'
                      ? 'Concept Mastered! 🌟'
                      : 'Needs Practice — Misconceptions Identified'}
                  </h4>
                  <p className="text-3xl font-black mt-1">
                    {quizResult.score_percentage}%
                    <span className="text-xs font-semibold ml-2 opacity-80">
                      ({quizResult.score} of {quizResult.total} Correct)
                    </span>
                  </p>
                  <div className="text-xs mt-2 font-medium max-w-lg mx-auto">
                    <MathText text={quizResult.learning_tip} />
                  </div>
                </div>

                {/* Identified Misconception Traps */}
                {quizResult.diagnosed_gaps && quizResult.diagnosed_gaps.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Diagnosed Cognitive Traps & Gaps
                    </h5>
                    <div className="space-y-2">
                      {quizResult.diagnosed_gaps.map((gap: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5 shadow-2xs"
                        >
                          <p className="font-bold text-slate-800">
                            <span className="text-rose-600 font-bold">⚠️ Trap:</span> <MathText text={gap.trap_identified} inline />
                          </p>
                          <p className="text-brand-700 font-medium">💡 Remediation: <span className="text-slate-700 font-normal"><MathText text={gap.remediation_tip} inline /></span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detailed Questions Review */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Question-by-Question Breakdown
                  </h5>
                  <div className="space-y-3">
                    {quizResult.questions_review.map((q: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          q.is_correct
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-rose-50/50 border-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">Question {idx + 1}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              q.is_correct
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {q.is_correct ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>
                        <div className="font-medium text-slate-800">
                          <MathText text={q.question_text} />
                        </div>
                        <div className="space-y-1 pt-1">
                          <div className="text-[11px] text-slate-600">
                            <strong>Your Answer:</strong> <MathText text={q.selected_answer || 'None'} inline />
                          </div>
                          {!q.is_correct && (
                            <div className="text-[11px] text-emerald-700 font-semibold">
                              <strong>Correct Answer:</strong> <MathText text={q.correct_answer} inline />
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 leading-relaxed">
                            <strong>Explanation:</strong> <MathText text={q.explanation} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    onClick={() => handleStartQuiz(activeQuizConcept, currentSubject?.subject_name || '')}
                    className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake Quiz</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveQuizConcept(null);
                      setQuizResult(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Quiz In-Progress */
              <div className="py-4 space-y-6">
                {quizSession?.questions.map((q: any, idx: number) => (
                  <div key={q.id} className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Question {idx + 1} of 5
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-600">
                        {q.difficulty}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-800">
                      <MathText text={q.question_text} />
                    </div>

                    <div className="space-y-2">
                      {q.options.map((opt: string) => {
                        const isSelected = quizAnswers[q.id] === opt;
                        return (
                          <div
                            key={opt}
                            onClick={() =>
                              setQuizAnswers(prev => ({
                                ...prev,
                                [q.id]: opt,
                              }))
                            }
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

                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">
                    {Object.keys(quizAnswers).length} of 5 answered
                  </span>
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={Object.keys(quizAnswers).length === 0 || quizSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>{quizSubmitting ? 'Evaluating & Diagnosing...' : 'Submit Answers'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 6. REVISION NOTES DRAWER/MODAL --- */}
      {activeNotesConcept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                    Official Curriculum Revision Notes
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-800">
                    <MathText text={activeNotesConcept.concept_name} inline />
                  </h3>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveNotesConcept(null);
                  setNotesData(null);
                }}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {notesLoading ? (
              <div className="py-12 space-y-4">
                <LoadingSkeleton rows={4} height="h-20" />
                <p className="text-center text-xs text-slate-500 font-medium animate-pulse">
                  Authoring comprehensive structured revision notes for {activeNotesConcept.concept_name}...
                </p>
              </div>
            ) : notesData ? (
              <div className="space-y-5 text-xs text-slate-700">
                {/* Quick Summary Banner */}
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200/80 text-purple-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block mb-1">
                    Quick Concept Summary
                  </span>
                  <div className="font-medium leading-relaxed">
                    <MathText text={notesData.quick_summary} />
                  </div>
                </div>

                {/* Core Definitions */}
                {notesData.definitions && notesData.definitions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Core Definitions & Principles
                    </h4>
                    <div className="space-y-2">
                      {notesData.definitions.map((def, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                          <strong className="text-slate-900"><MathText text={def.term} inline />:</strong>{' '}
                          <div className="text-slate-600 leading-relaxed mt-0.5"><MathText text={def.explanation} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formulas & Laws */}
                {notesData.formulas_and_laws && notesData.formulas_and_laws.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Key Formulas & Laws (Board High-Yield)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {notesData.formulas_and_laws.map((form, idx) => (
                        <div key={idx} className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
                          <span className="font-bold text-indigo-900"><MathText text={form.title} inline /></span>
                          <div className="text-sm text-brand-900 font-bold bg-white p-2.5 rounded-lg border border-indigo-100 text-center overflow-x-auto">
                            <MathText text={form.latex} block />
                          </div>
                          <div className="text-[11px] text-slate-600"><MathText text={form.explanation} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Common Pitfalls ("Watch Out For...") */}
                {notesData.common_pitfalls && notesData.common_pitfalls.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-rose-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Watch Out: Frequent Exam Pitfalls
                    </h4>
                    <div className="space-y-2">
                      {notesData.common_pitfalls.map((pit, idx) => (
                        <div key={idx} className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-xs">
                          <p className="font-bold text-rose-700">❌ Mistake: <span className="text-slate-800 font-medium"><MathText text={pit.mistake} inline /></span></p>
                          <p className="font-semibold text-emerald-700">✓ Correction: <span className="text-slate-800 font-medium"><MathText text={pit.correction} inline /></span></p>
                          <p className="text-[11px] text-slate-500 italic">Why: <MathText text={pit.why} inline /></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Worked Examples */}
                {notesData.worked_examples && notesData.worked_examples.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Worked Example with Step-by-Step Reasoning
                    </h4>
                    {notesData.worked_examples.map((ex, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="font-bold text-slate-900">Problem: <MathText text={ex.problem} /></div>
                        <div className="space-y-1.5 pl-3 border-l-2 border-brand-400">
                          {ex.solution_steps.map((st, sidx) => (
                            <div key={sidx} className="text-slate-600 leading-relaxed text-xs">
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
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* --- 7. INTERACTIVE FLASHCARDS MODAL --- */}
      {activeFlashcardsConcept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                    Active Recall Flashcards
                  </span>
                  <h3 className="text-base font-extrabold text-slate-800">
                    {activeFlashcardsConcept.concept_name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveFlashcardsConcept(null);
                  setFlashcardsData(null);
                }}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {flashcardsLoading ? (
              <div className="py-12 space-y-3">
                <LoadingSkeleton rows={2} height="h-28" />
                <p className="text-center text-xs text-slate-500 font-medium animate-pulse">
                  Generating active recall cards...
                </p>
              </div>
            ) : flashcardsData && flashcardsData.cards.length > 0 ? (
              <div className="space-y-4">
                {/* Flashcard Component */}
                {(() => {
                  const card = flashcardsData.cards[flashcardIndex];
                  return (
                    <div
                      onClick={() => setIsFlipped(!isFlipped)}
                      className={`min-h-[220px] rounded-3xl p-6 flex flex-col justify-between cursor-pointer border transition-all duration-300 shadow-sm ${
                        isFlipped
                          ? 'bg-gradient-to-br from-indigo-700 to-brand-800 text-white border-transparent'
                          : 'bg-gradient-to-br from-slate-50 to-white text-slate-800 border-slate-200/80 hover:border-brand-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isFlipped ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                          }`}
                        >
                          {isFlipped ? 'Answer / Insight' : card.category || 'Question'}
                        </span>
                        <span className="text-[11px] font-semibold opacity-75">
                          {flashcardIndex + 1} of {flashcardsData.cards.length}
                        </span>
                      </div>

                      <div className="my-auto py-4 text-center">
                        <div className={`text-base font-bold leading-relaxed ${isFlipped ? 'text-white' : 'text-slate-800'}`}>
                          <MathText text={isFlipped ? card.back : card.front} />
                        </div>
                        {!isFlipped && card.hint && (
                          <div className="text-[11px] text-slate-400 mt-2 italic">
                            Hint: <MathText text={card.hint} inline />
                          </div>
                        )}
                      </div>

                      <p className={`text-[10px] text-center font-medium ${isFlipped ? 'text-white/70' : 'text-slate-400'}`}>
                        Click to flip ({isFlipped ? 'Show Front' : 'Show Answer'})
                      </p>
                    </div>
                  );
                })()}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => {
                      setIsFlipped(false);
                      setFlashcardIndex(prev => Math.max(0, prev - 1));
                    }}
                    disabled={flashcardIndex === 0}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    Flip Card
                  </button>

                  <button
                    onClick={() => {
                      setIsFlipped(false);
                      setFlashcardIndex(prev => Math.min(flashcardsData.cards.length - 1, prev + 1));
                    }}
                    disabled={flashcardIndex === flashcardsData.cards.length - 1}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* --- 8. SYLLABUS COMPARISON MODAL --- */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-brand-600" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    Compare School / Coaching Syllabus
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Upload or paste your course syllabus to verify alignment against official {syllabus?.board} standards.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCompareModal(false);
                  setCompareResult(null);
                }}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {compareResult ? (
              /* Comparison Result Report */
              <div className="space-y-4 animate-fade-in text-xs">
                {/* Result Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-100 text-center space-y-1">
                  <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">
                    Syllabus Alignment Match
                  </span>
                  <div className="text-3xl font-black text-brand-900">
                    {compareResult.similarity_score}% Match
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    {compareResult.matched_concepts_count} of {compareResult.total_official_concepts} official concepts covered.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed">
                  <strong>Assessment Summary:</strong> {compareResult.summary_notes}
                </div>

                {/* Extra Topics */}
                {compareResult.extra_topics && compareResult.extra_topics.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
                    <strong className="text-indigo-900 block font-bold">
                      Extra / Advanced Topics in School Syllabus ({compareResult.extra_topics.length}):
                    </strong>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      {compareResult.extra_topics.map((t, i) => (
                        <li key={i}>
                          <span className="font-semibold text-slate-800">{t.topic_name}</span>
                          {t.note && <span className="text-slate-500"> — {t.note}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Omitted Topics */}
                {compareResult.omitted_topics && compareResult.omitted_topics.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1.5">
                    <strong className="text-amber-900 block font-bold">
                      Official Topics Not Found in Uploaded Document ({compareResult.omitted_topics.length}):
                    </strong>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      {compareResult.omitted_topics.map((o, i) => (
                        <li key={i}>
                          <span className="font-semibold text-slate-800">{o.official_concept}</span>
                          {o.chapter && <span className="text-slate-500"> ({o.chapter})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-3 flex justify-end">
                  <button
                    onClick={() => setCompareResult(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                  >
                    Compare Another
                  </button>
                </div>
              </div>
            ) : (
              /* Comparison Input Form */
              <form onSubmit={handleCompareSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Upload Syllabus File (.txt, .pdf, .docx)
                  </label>
                  <input
                    type="file"
                    accept=".txt,.pdf,.doc,.docx"
                    onChange={e => setCompareFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                  />
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-semibold uppercase">Or Paste Syllabus Text</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div>
                  <textarea
                    rows={6}
                    value={compareText}
                    onChange={e => setCompareText(e.target.value)}
                    placeholder="Paste your course outline, unit headings, or syllabus contents here..."
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCompareModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={compareLoading || (!compareText.trim() && !compareFile)}
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    <span>{compareLoading ? 'Analyzing & Comparing...' : 'Run Alignment Comparison'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
