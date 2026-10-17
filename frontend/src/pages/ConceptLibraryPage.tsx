import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Library,
  GraduationCap,
  BookOpen,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileText,
  Sparkles,
  ChevronRight,
  ArrowRight,
  RotateCcw,
  Clock,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  Filter,
  Zap,
  RefreshCw,
  Eye,
  BookMarked,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { MathText } from '../components/common/MathText.js';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton.js';
import {
  MasteryCurriculumHierarchy,
  TopicMasteryWorkflowSession,
  ConceptRevisionNote,
  ConceptFlashcard,
} from '../types/index.js';

const AVAILABLE_BOARDS = [
  { id: 'CBSE', name: 'Central Board of Secondary Education (CBSE)', short: 'CBSE' },
  { id: 'CISCE', name: 'Council for the Indian School Certificate Examinations (ICSE / ISC)', short: 'CISCE (ICSE / ISC)' },
  { id: 'Maharashtra State Board', name: 'Maharashtra State Board (MSBSHSE)', short: 'Maharashtra State Board' },
  { id: 'Karnataka State Board', name: 'Karnataka School Examination and Assessment Board (KSEAB/PUE)', short: 'Karnataka State Board' },
  { id: 'Tamil Nadu State Board', name: 'Tamil Nadu Directorate of Government Examinations (TNDGE)', short: 'Tamil Nadu Board' },
  { id: 'UP Board', name: 'Uttar Pradesh Madhyamik Shiksha Parishad (UPMSP)', short: 'UP Board' },
  { id: 'Bihar School Examination Board', name: 'Bihar School Examination Board (BSEB)', short: 'Bihar Board' },
  { id: 'NIOS', name: 'National Institute of Open Schooling (NIOS)', short: 'NIOS' },
  { id: 'International Baccalaureate', name: 'International Baccalaureate (IB MYP / DP)', short: 'IB (MYP / DP)' },
  { id: 'Cambridge International', name: 'Cambridge Assessment International Education (CAIE)', short: 'Cambridge (CAIE)' },
];

const AVAILABLE_CLASSES = [10, 11, 12] as const;

const AVAILABLE_ACADEMIC_YEARS = ['2025-2026', '2024-2025'] as const;

const AVAILABLE_STREAMS = [
  'Science (PCM)',
  'Science (PCB)',
  'Commerce',
  'Arts / Humanities',
] as const;

export const ConceptLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { educationProfile } = useAuth();

  // Selected curriculum parameters
  const [selectedBoard, setSelectedBoard] = useState<string>(
    educationProfile?.board || 'CBSE'
  );
  const [selectedClass, setSelectedClass] = useState<number>(
    educationProfile?.class_level || 10
  );
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(
    educationProfile?.academic_year || '2025-2026'
  );
  const [selectedStream, setSelectedStream] = useState<string>(
    educationProfile?.stream || 'Science (PCM)'
  );

  // Curriculum Explorer Drawer Toggle
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);

  // Data states
  const [curriculum, setCurriculum] = useState<MasteryCurriculumHierarchy | null>(null);
  const [activeSessions, setActiveSessions] = useState<TopicMasteryWorkflowSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Navigation hierarchy state
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'mastered' | 'needs_practice' | 'in_progress' | 'unattempted'>('all');

  // Notes Modal state
  const [activeNotesConcept, setActiveNotesConcept] = useState<{ id: string; name: string } | null>(null);
  const [notesData, setNotesData] = useState<ConceptRevisionNote | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);

  // Flashcards Modal state
  const [activeFlashcardConcept, setActiveFlashcardConcept] = useState<{ id: string; name: string } | null>(null);
  const [flashcardData, setFlashcardData] = useState<ConceptFlashcard | null>(null);
  const [flashcardLoading, setFlashcardLoading] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Fetch official curriculum & active sessions
  const fetchLibraryData = useCallback(async (
    board: string,
    classLevel: number,
    academicYear: string,
    stream: string
  ) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const streamParam = (classLevel === 11 || classLevel === 12) ? stream : undefined;
      const [hierarchyRes, sessionsRes] = await Promise.all([
        api.get<MasteryCurriculumHierarchy>('/learning/mastery/topics', {
          board,
          class_level: classLevel,
          academic_year: academicYear,
          stream: streamParam,
        }),
        api.get<TopicMasteryWorkflowSession[]>('/learning/mastery-sessions'),
      ]);

      setCurriculum(hierarchyRes);
      setActiveSessions(sessionsRes || []);

      // If previously selected subject exists in new curriculum, keep it; otherwise pick first subject
      if (hierarchyRes.subjects && hierarchyRes.subjects.length > 0) {
        const stillExists = hierarchyRes.subjects.find(
          s => s.subject_name.toLowerCase() === selectedSubjectName.toLowerCase()
        );
        if (stillExists) {
          setSelectedSubjectName(stillExists.subject_name);
        } else {
          setSelectedSubjectName(hierarchyRes.subjects[0].subject_name);
        }
      } else {
        setSelectedSubjectName('');
      }
      setSelectedChapterId(null);
    } catch (err: any) {
      console.error('Failed to load Concept Library data:', err);
      setErrorMsg(err?.message || 'Unable to load curriculum. Please verify network or try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubjectName]);

  // Initial load
  useEffect(() => {
    fetchLibraryData(selectedBoard, selectedClass, selectedAcademicYear, selectedStream);
  }, [selectedBoard, selectedClass, selectedAcademicYear, selectedStream, fetchLibraryData]);

  // Reset to user's saved profile
  const handleResetToProfile = () => {
    const profBoard = educationProfile?.board || 'CBSE';
    const profClass = educationProfile?.class_level || 10;
    const profYear = educationProfile?.academic_year || '2025-2026';
    const profStream = educationProfile?.stream || 'Science (PCM)';

    setSelectedBoard(profBoard);
    setSelectedClass(profClass);
    setSelectedAcademicYear(profYear);
    setSelectedStream(profStream);
    setSelectedChapterId(null);
    setSearchQuery('');
    setStatusFilter('all');
    setIsExplorerOpen(false);
  };

  // Current Subject object
  const currentSubject = useMemo(() => {
    if (!curriculum || !curriculum.subjects) return null;
    return (
      curriculum.subjects.find(
        s => s.subject_name.toLowerCase() === selectedSubjectName.toLowerCase()
      ) || curriculum.subjects[0] || null
    );
  }, [curriculum, selectedSubjectName]);

  // Aggregate stats across current subject
  const subjectStats = useMemo(() => {
    if (!currentSubject) return { total: 0, mastered: 0, needsPractice: 0, unattempted: 0, inProgress: 0 };
    const allConcepts = currentSubject.units.flatMap(u => u.chapters.flatMap(c => c.concepts));
    const activeConceptIds = new Set(
      activeSessions.filter(s => s.stage !== 'mastery_result').map(s => s.concept_id)
    );

    let mastered = 0;
    let needsPractice = 0;
    let unattempted = 0;
    let inProgress = 0;

    allConcepts.forEach(c => {
      if (activeConceptIds.has(c.id)) {
        inProgress++;
      }
      if (c.mastery_status === 'mastered') mastered++;
      else if (c.mastery_status === 'needs_practice') needsPractice++;
      else unattempted++;
    });

    return {
      total: allConcepts.length,
      mastered,
      needsPractice,
      unattempted,
      inProgress,
    };
  }, [currentSubject, activeSessions]);

  // Filtered concepts according to search and status
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  // All chapters in current subject for the chapter filter bar
  const allChaptersInSubject = useMemo(() => {
    if (!currentSubject) return [];
    return currentSubject.units.flatMap(u => u.chapters);
  }, [currentSubject]);

  // Notes Modal Handler
  const handleOpenNotes = async (conceptId: string, conceptName: string) => {
    setActiveNotesConcept({ id: conceptId, name: conceptName });
    setNotesLoading(true);
    try {
      const res = await api.get<ConceptRevisionNote>(`/learning/concepts/${conceptId}/notes`, {
        subject: selectedSubjectName,
      });
      setNotesData(res);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setNotesLoading(false);
    }
  };

  // Flashcards Modal Handler
  const handleOpenFlashcards = async (conceptId: string, conceptName: string) => {
    setActiveFlashcardConcept({ id: conceptId, name: conceptName });
    setFlashcardLoading(true);
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
    setShowHint(false);
    try {
      const res = await api.get<ConceptFlashcard>(`/learning/concepts/${conceptId}/flashcards`, {
        subject: selectedSubjectName,
      });
      setFlashcardData(res);
    } catch (err) {
      console.error('Failed to load flashcards:', err);
    } finally {
      setFlashcardLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* 1. Header Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-indigo-950 text-white p-4 sm:p-6 md:p-8 shadow-xl border border-brand-700/50">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md border border-white/20 text-brand-100">
              <Library className="w-3.5 h-3.5 text-brand-300" />
              Official Curriculum Library
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {curriculum?.verified ? 'Officially Verified' : 'Standard Curriculum'}
            </span>

            {curriculum?.is_complete && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                100% Comprehensive Syllabus
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <span>Concept Library & Syllabus Navigator</span>
          </h1>

          <p className="text-sm text-brand-100/90 leading-relaxed">
            Browse official board curriculum chapters, units, and concepts. Launch diagnostic quizzes, review structured LaTeX revision notes, practice interactive flashcards, or ask doubts to verify genuine concept mastery.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-brand-200">
            <div className="flex items-center gap-1.5 font-medium">
              <GraduationCap className="w-4 h-4 text-brand-300" />
              <span>
                <strong>{selectedBoard}</strong> • Class {selectedClass}
                {(selectedClass === 11 || selectedClass === 12) && ` (${selectedStream})`}
              </span>
            </div>

            <span>•</span>

            <div>
              Academic Session: <strong>{selectedAcademicYear}</strong>
            </div>

            <span>•</span>

            {curriculum?.official_source_url && (
              <a
                href={curriculum.official_source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand-300 hover:text-white underline decoration-brand-400 transition-colors"
                title="View Official Curriculum Source"
              >
                <span>Official Source Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Toggle Explorer Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsExplorerOpen(!isExplorerOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all backdrop-blur-sm shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-brand-300" />
              <span>{isExplorerOpen ? 'Hide Curriculum Switcher' : 'Switch Board, Class, or Stream'}</span>
              {isExplorerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      </div>

      {/* 2. Collapsible Curriculum Explorer Drawer */}
      {isExplorerOpen && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-brand-200/80 shadow-md space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-bold text-slate-800">
                Explore Syllabuses by Board, Class, and Stream
              </h3>
            </div>
            <button
              onClick={handleResetToProfile}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to My Profile
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Board Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Education Board</label>
              <select
                value={selectedBoard}
                onChange={e => {
                  setSelectedBoard(e.target.value);
                  setSelectedChapterId(null);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {AVAILABLE_BOARDS.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.short}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Class / Grade</label>
              <select
                value={selectedClass}
                onChange={e => {
                  setSelectedClass(Number(e.target.value));
                  setSelectedChapterId(null);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {AVAILABLE_CLASSES.map(cls => (
                  <option key={cls} value={cls}>
                    Class {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Stream Selector (Class 11 & 12 only) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Stream {selectedClass === 10 && <span className="text-[10px] text-slate-400 font-normal">(N/A for Class 10)</span>}
              </label>
              <select
                value={selectedStream}
                disabled={selectedClass === 10}
                onChange={e => {
                  setSelectedStream(e.target.value);
                  setSelectedChapterId(null);
                }}
                className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 ${
                  selectedClass === 10 ? 'text-slate-400 opacity-60 cursor-not-allowed' : 'text-slate-800'
                }`}
              >
                {AVAILABLE_STREAMS.map(str => (
                  <option key={str} value={str}>
                    {str}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Session */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Academic Session</label>
              <select
                value={selectedAcademicYear}
                onChange={e => {
                  setSelectedAcademicYear(e.target.value);
                  setSelectedChapterId(null);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {AVAILABLE_ACADEMIC_YEARS.map(yr => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 3. Stat Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-soft">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Syllabus Concepts</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{subjectStats.total}</span>
            <span className="text-xs text-slate-500 font-medium">in {selectedSubjectName || 'Curriculum'}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100 shadow-soft bg-gradient-to-br from-emerald-50/30 to-white">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" />
            Mastered (≥ 80%)
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{subjectStats.mastered}</span>
            <span className="text-xs text-emerald-600 font-semibold">
              {subjectStats.total > 0 ? Math.round((subjectStats.mastered / subjectStats.total) * 100) : 0}% Complete
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-100 shadow-soft bg-gradient-to-br from-amber-50/30 to-white">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Needs Practice (&lt; 80%)
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">{subjectStats.needsPractice}</span>
            <span className="text-xs text-amber-600 font-semibold">Gaps Identified</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-soft">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unattempted Topics</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-600">{subjectStats.unattempted}</span>
            <span className="text-xs text-slate-400 font-medium">ready to learn</span>
          </div>
        </div>
      </div>

      {/* 4. Subject Selection Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-brand-600" />
            <span>Applicable Subjects ({curriculum?.subjects?.length || 0})</span>
          </label>
          <span className="text-[11px] text-slate-400">Click to switch subject curriculum</span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {curriculum?.subjects?.map(s => {
            const isSelected = s.subject_name.toLowerCase() === selectedSubjectName.toLowerCase();
            const totalChapters = s.units.reduce((acc, u) => acc + u.chapters.length, 0);
            const totalConcepts = s.units.reduce(
              (acc, u) => acc + u.chapters.reduce((cAcc, c) => cAcc + c.concepts.length, 0),
              0
            );

            return (
              <button
                key={s.subject_name}
                type="button"
                onClick={() => {
                  setSelectedSubjectName(s.subject_name);
                  setSelectedChapterId(null);
                  setSearchQuery('');
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border shadow-2xs ${
                  isSelected
                    ? 'bg-brand-600 text-white border-brand-700 shadow-brand-500/20'
                    : 'bg-white text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{s.subject_name}</span>
                {s.code && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {s.code}
                  </span>
                )}
                <span className={`text-[10px] font-normal ${
                  isSelected ? 'text-brand-100' : 'text-slate-400'
                }`}>
                  • {totalChapters} Ch ({totalConcepts} Topics)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Chapter Filter & Navigation Bar */}
      {allChaptersInSubject.length > 0 && (
        <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-brand-600" />
              Chapter Navigator ({allChaptersInSubject.length} Chapters)
            </span>
            {selectedChapterId && (
              <button
                type="button"
                onClick={() => setSelectedChapterId(null)}
                className="text-[11px] text-brand-600 hover:underline font-bold"
              >
                Show All Chapters
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedChapterId(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedChapterId === null
                  ? 'bg-slate-800 text-white font-bold shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80'
              }`}
            >
              All Chapters ({allChaptersInSubject.length})
            </button>

            {allChaptersInSubject.map((ch, idx) => {
              const isChSelected = selectedChapterId === ch.chapter_id;
              return (
                <button
                  key={ch.chapter_id}
                  type="button"
                  onClick={() => setSelectedChapterId(ch.chapter_id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    isChSelected
                      ? 'bg-brand-600 text-white font-bold shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  <span>Ch {ch.chapter_number || idx + 1}: {ch.chapter_name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isChSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {ch.concepts.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-soft">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Search all topics or subtopics in ${selectedSubjectName}...`}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'All Topics' },
              { id: 'mastered', label: 'Mastered' },
              { id: 'needs_practice', label: 'Needs Practice' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'unattempted', label: 'Unattempted' },
            ] as const
          ).map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                statusFilter === f.id
                  ? 'bg-brand-50 text-brand-700 border border-brand-200 font-bold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 7. Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 px-1">
        <span className="font-semibold text-brand-600">{selectedBoard}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-700">Class {selectedClass}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-slate-800">{selectedSubjectName}</span>
        {selectedChapterId && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-900">
              {allChaptersInSubject.find(c => c.chapter_id === selectedChapterId)?.chapter_name}
            </span>
            <button
              onClick={() => setSelectedChapterId(null)}
              className="ml-1 text-[11px] text-brand-600 hover:underline font-semibold"
            >
              (Show All)
            </button>
          </>
        )}
      </div>

      {/* 8. Error Alert (if any) */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => fetchLibraryData(selectedBoard, selectedClass, selectedAcademicYear, selectedStream)}
            className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* 9. Loading State */}
      {isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : !currentSubject || currentSubject.units.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Syllabus Topics Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No official syllabus is currently indexed for {selectedBoard} Class {selectedClass} under {selectedSubjectName}.
          </p>
          <button
            onClick={handleResetToProfile}
            className="px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-brand-700"
          >
            Return to My Profile Syllabus
          </button>
        </div>
      ) : (
        /* 10. Units & Chapters Hierarchy */
        <div className="space-y-6">
          {currentSubject.units.map((unit, uIdx) => {
            const chaptersToDisplay = selectedChapterId
              ? unit.chapters.filter(c => c.chapter_id === selectedChapterId)
              : unit.chapters;

            if (chaptersToDisplay.length === 0) return null;

            return (
              <div key={unit.unit_id} className="space-y-4">
                {/* Unit Title Banner */}
                <div className="flex items-center gap-3 px-1">
                  <span className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
                    {unit.unit_number || uIdx + 1}
                  </span>
                  <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                    Unit {unit.unit_number || uIdx + 1}: {unit.unit_name}
                  </h2>
                </div>

                {/* Chapters in this Unit */}
                <div className="space-y-4">
                  {chaptersToDisplay.map((chapter, cIdx) => {
                    const filteredConcepts = chapter.concepts.filter(concept => {
                      const matchesText =
                        matchesSearch(concept.concept_name) ||
                        concept.subtopics.some(st => matchesSearch(st)) ||
                        matchesSearch(chapter.chapter_name);

                      if (!matchesText) return false;

                      const isInProgress = activeSessions.some(
                        s => s.concept_id === concept.id && s.stage !== 'mastery_result'
                      );

                      if (statusFilter === 'all') return true;
                      if (statusFilter === 'in_progress') return isInProgress;
                      if (statusFilter === 'mastered') return concept.mastery_status === 'mastered';
                      if (statusFilter === 'needs_practice') return concept.mastery_status === 'needs_practice';
                      if (statusFilter === 'unattempted') return !concept.mastery_status || concept.mastery_status === 'unattempted';

                      return true;
                    });

                    if (filteredConcepts.length === 0 && searchQuery.trim()) return null;

                    return (
                      <div
                        key={chapter.chapter_id}
                        className="bg-white rounded-3xl border border-slate-200/80 shadow-soft p-5 sm:p-6 space-y-4"
                      >
                        {/* Chapter Heading */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-brand-600" />
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                              Chapter {chapter.chapter_number || cIdx + 1}: {chapter.chapter_name}
                            </h3>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {filteredConcepts.length} of {chapter.concepts.length} Topics
                          </span>
                        </div>

                        {/* Concepts Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                          {filteredConcepts.map(concept => {
                            const isMastered = concept.mastery_status === 'mastered';
                            const needsPractice = concept.mastery_status === 'needs_practice';
                            const inProgressSession = activeSessions.find(
                              s => s.concept_id === concept.id && s.stage !== 'mastery_result'
                            );

                            return (
                              <div
                                key={concept.id}
                                className={`rounded-2xl p-4 sm:p-5 border transition-all duration-200 flex flex-col justify-between ${
                                  isMastered
                                    ? 'bg-emerald-50/20 border-emerald-200/80 shadow-2xs'
                                    : needsPractice
                                    ? 'bg-amber-50/20 border-amber-200/80 shadow-2xs'
                                    : inProgressSession
                                    ? 'bg-brand-50/20 border-brand-200/80 shadow-2xs'
                                    : 'bg-white border-slate-200/80 shadow-2xs hover:border-brand-200'
                                }`}
                              >
                                <div>
                                  {/* Status & Exam Yield Row */}
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <h4 className="text-sm font-bold text-slate-800 leading-snug">
                                      <MathText text={concept.concept_name} inline />
                                    </h4>

                                    {/* Status Badge */}
                                    {isMastered && (
                                      <span className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1 border border-emerald-300">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Mastered ({concept.score_percentage}%)
                                      </span>
                                    )}

                                    {needsPractice && (
                                      <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1 border border-amber-300">
                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                        Needs Practice ({concept.score_percentage}%)
                                      </span>
                                    )}

                                    {!isMastered && !needsPractice && inProgressSession && (
                                      <span className="shrink-0 px-2.5 py-1 rounded-full bg-brand-100 text-brand-800 text-[10px] font-bold flex items-center gap-1 border border-brand-300">
                                        <Clock className="w-3 h-3 text-brand-600" />
                                        In Progress
                                      </span>
                                    )}

                                    {!isMastered && !needsPractice && !inProgressSession && (
                                      <span className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                        Not Started
                                      </span>
                                    )}
                                  </div>

                                  {/* Badges: Difficulty & Exam Importance */}
                                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                    {concept.difficulty && (
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                        concept.difficulty === 'hard'
                                          ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                          : concept.difficulty === 'medium'
                                          ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                      }`}>
                                        {concept.difficulty.toUpperCase()}
                                      </span>
                                    )}

                                    {concept.exam_importance === 'high_yield' && (
                                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200/60 flex items-center gap-1">
                                        <Zap className="w-3 h-3 text-purple-600" />
                                        High Yield
                                      </span>
                                    )}

                                    {concept.exam_importance === 'core' && (
                                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/60">
                                        Core Concept
                                      </span>
                                    )}
                                  </div>

                                  {/* Subtopics preview chips: ALL subtopics rendered without slicing */}
                                  <div className="flex flex-wrap gap-1.5 my-3">
                                    {concept.subtopics.map(st => (
                                      <span
                                        key={st}
                                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                                      >
                                        <MathText text={st} inline />
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Action Buttons Row: 4 Essential Learning Integrations */}
                                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 mt-2">
                                  {/* 1. Learn & Practice Action */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate('/practice', {
                                        state: {
                                          subject: selectedSubjectName,
                                          conceptId: concept.id,
                                        },
                                      })
                                    }
                                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                                      isMastered
                                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        : needsPractice
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                                        : 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs'
                                    }`}
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>
                                      {isMastered
                                        ? 'Review Mastery'
                                        : needsPractice
                                        ? 'Practice Weak Areas'
                                        : inProgressSession
                                        ? 'Resume Practice'
                                        : 'Learn & Practice'}
                                    </span>
                                  </button>

                                  <div className="flex items-center gap-1">
                                    {/* 2. Quick Revision Notes */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenNotes(concept.id, concept.concept_name)}
                                      className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1"
                                      title="Quick Revision Notes"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>Notes</span>
                                    </button>

                                    {/* 3. Flashcards */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenFlashcards(concept.id, concept.concept_name)}
                                      className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1"
                                      title="Active Recall Flashcards"
                                    >
                                      <Zap className="w-3.5 h-3.5" />
                                      <span>Cards</span>
                                    </button>

                                    {/* 4. Ask Doubt Resolution */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        navigate('/ask', {
                                          state: {
                                            concept: concept.concept_name,
                                            subject: selectedSubjectName,
                                            chapter: chapter.chapter_name,
                                          },
                                        })
                                      }
                                      className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1"
                                      title="Ask AI Doubt on this concept"
                                    >
                                      <HelpCircle className="w-3.5 h-3.5" />
                                      <span>Ask</span>
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
              </div>
            );
          })}
        </div>
      )}

      {/* --- QUICK REVISION NOTES MODAL --- */}
      {activeNotesConcept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                  Curriculum Revision Notes
                </span>
                <h3 className="text-base font-extrabold text-slate-800">
                  <MathText text={activeNotesConcept.name} inline />
                </h3>
              </div>
              <button
                onClick={() => {
                  setActiveNotesConcept(null);
                  setNotesData(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            {notesLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading structured revision notes...</div>
            ) : notesData ? (
              <div className="space-y-4 text-xs">
                {/* Quick Summary */}
                <div className="p-3.5 bg-brand-50/70 rounded-2xl border border-brand-100 text-brand-900 leading-relaxed">
                  <p className="font-bold text-[11px] text-brand-700 uppercase tracking-wider mb-1">Concept Summary</p>
                  <MathText text={notesData.quick_summary} />
                </div>

                {/* Key Definitions */}
                {notesData.definitions && notesData.definitions.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Core Definitions</h5>
                    <div className="space-y-2">
                      {notesData.definitions.map((def, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                          <p className="font-bold text-slate-900"><MathText text={def.term} inline /></p>
                          <p className="text-slate-600"><MathText text={def.explanation} /></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formulas & Principles */}
                {(notesData.formulas_and_laws || (notesData as any).formulas_and_principles) &&
                  (notesData.formulas_and_laws || (notesData as any).formulas_and_principles).length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Formulas & Principles</h5>
                    <div className="space-y-2">
                      {(notesData.formulas_and_laws || (notesData as any).formulas_and_principles).map((f: any, idx: number) => (
                        <div key={idx} className="p-3 bg-purple-50/40 rounded-xl border border-purple-100 space-y-1">
                          <p className="font-bold text-purple-900"><MathText text={f.title} inline /></p>
                          <div className="p-2 bg-white rounded-lg border border-purple-200/60 overflow-x-auto text-center font-bold text-slate-800">
                            <MathText text={f.latex} block />
                          </div>
                          <p className="text-[11px] text-slate-600"><MathText text={f.explanation} /></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Common Pitfalls */}
                {notesData.common_pitfalls && notesData.common_pitfalls.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-bold text-amber-800 uppercase tracking-wider text-[11px]">Exam Pitfalls & Traps</h5>
                    <div className="space-y-2">
                      {notesData.common_pitfalls.map((pitfall, idx) => (
                        <div key={idx} className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 space-y-1">
                          <p className="font-bold text-amber-900">⚠️ {pitfall.mistake}</p>
                          <p className="text-slate-700"><strong>Correction:</strong> {pitfall.correction}</p>
                          <p className="text-slate-500 text-[11px]">{pitfall.why}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action button inside modal */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      const id = activeNotesConcept.id;
                      setActiveNotesConcept(null);
                      navigate('/practice', {
                        state: {
                          subject: selectedSubjectName,
                          conceptId: id,
                        },
                      });
                    }}
                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Launch 8-Step Topic Mastery</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No notes found for this concept.</p>
            )}
          </div>
        </div>
      )}

      {/* --- INTERACTIVE FLASHCARDS MODAL --- */}
      {activeFlashcardConcept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Active Recall Flashcards
                </span>
                <h3 className="text-sm font-extrabold text-slate-800">
                  <MathText text={activeFlashcardConcept.name} inline />
                </h3>
              </div>
              <button
                onClick={() => {
                  setActiveFlashcardConcept(null);
                  setFlashcardData(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            {flashcardLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading active-recall flashcards...</div>
            ) : flashcardData && flashcardData.cards && flashcardData.cards.length > 0 ? (
              <div className="space-y-4">
                {/* Progress Indicator */}
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Card {currentCardIndex + 1} of {flashcardData.cards.length}</span>
                  <span className="capitalize px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold">
                    {flashcardData.cards[currentCardIndex].category || 'Core Question'}
                  </span>
                </div>

                {/* Flip Card Container */}
                <div
                  onClick={() => setIsCardFlipped(!isCardFlipped)}
                  className={`min-h-[200px] p-6 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    isCardFlipped
                      ? 'bg-gradient-to-br from-indigo-50 to-purple-50/50 border-indigo-200 shadow-soft'
                      : 'bg-white border-slate-200/90 hover:border-purple-300 shadow-soft'
                  }`}
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isCardFlipped ? 'Answer / Explanation' : 'Question / Prompt'}
                    </span>
                    <div className="text-sm font-semibold text-slate-800 leading-relaxed">
                      {isCardFlipped ? (
                        <MathText text={flashcardData.cards[currentCardIndex].back} />
                      ) : (
                        <MathText text={flashcardData.cards[currentCardIndex].front} />
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-slate-100 text-[11px] text-slate-400">
                    <span>Click card to {isCardFlipped ? 'view question' : 'reveal answer'}</span>
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                {/* Hint Toggle */}
                {flashcardData.cards[currentCardIndex].hint && (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setShowHint(!showHint)}
                      className="text-[11px] text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                    </button>
                    {showHint && (
                      <p className="text-[11px] text-slate-600 bg-purple-50/50 p-2.5 rounded-xl border border-purple-100">
                        💡 {flashcardData.cards[currentCardIndex].hint}
                      </p>
                    )}
                  </div>
                )}

                {/* Card Controls */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={currentCardIndex === 0}
                    onClick={() => {
                      setCurrentCardIndex(prev => Math.max(0, prev - 1));
                      setIsCardFlipped(false);
                      setShowHint(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      currentCardIndex === 0
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const id = activeFlashcardConcept.id;
                      setActiveFlashcardConcept(null);
                      navigate('/practice', {
                        state: {
                          subject: selectedSubjectName,
                          conceptId: id,
                        },
                      });
                    }}
                    className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Practice Topic</span>
                  </button>

                  <button
                    type="button"
                    disabled={currentCardIndex === flashcardData.cards.length - 1}
                    onClick={() => {
                      setCurrentCardIndex(prev => Math.min(flashcardData.cards.length - 1, prev + 1));
                      setIsCardFlipped(false);
                      setShowHint(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      currentCardIndex === flashcardData.cards.length - 1
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">No flashcards available for this topic.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
