import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  HelpCircle,
  BookOpenCheck,
  BarChart3,
  User,
  Clock,
  Flame,
  Award,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookMarked,
  Lightbulb,
  GraduationCap,
  CheckCircle2,
  ExternalLink,
  Target,
  Play,
  RotateCcw,
  Library,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { DashboardSummary, LearningMapResponse, MistakeItem } from '../types/index.js';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton.js';
import { EmptyState } from '../components/common/EmptyState.js';
import { MathText } from '../components/common/MathText.js';

export const HomePage: React.FC = () => {
  const { user, educationProfile } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(() => ({
    profile: {
      full_name: user?.full_name || 'Student',
      email: user?.email || '',
      class_level: (educationProfile?.class_level as any) || 10,
      board: educationProfile?.board || 'Central Board of Secondary Education (CBSE)',
      academic_year: educationProfile?.academic_year || '2026-27',
      preferred_language: educationProfile?.preferred_language || 'English',
      subjects: educationProfile?.subjects || ['Mathematics', 'Science'],
    },
    metrics: {
      active_days: 1,
      tracked_seconds: 300,
      tracked_time_display: '5m',
      current_streak: 1,
      longest_streak: 1,
      overall_accuracy: 0,
      total_questions_analyzed: 0,
      total_practice_attempts: 0,
      topics_practiced_count: 0,
    },
    motivational_quote: {
      text: 'Every question you investigate and verify builds genuine mastery.',
      author: 'ConceptTrace AI',
    },
    learning_guidance: {
      summary: 'Welcome to ConceptTrace AI! Select your syllabus topics or ask questions to calibrate your mastery profile.',
      recommendations: [
        'Explore your official syllabus concept tree',
        'Ask doubts for step-by-step verified explanations',
        'Solve 5 targeted practice questions to baseline your accuracy',
      ],
      has_sufficient_evidence: false,
    },
    subject_accuracy: [],
    recent_activities: [],
    weak_topics: [],
  }));
  const [graphs, setGraphs] = useState<any>(null);
  const [learningMap, setLearningMap] = useState<LearningMapResponse | null>(null);
  const [recentMistakes, setRecentMistakes] = useState<MistakeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashData, graphData, mapData, mistakeData] = await Promise.all([
          api.get<DashboardSummary>('/dashboard').catch(() => null),
          api.get('/analytics/graphs', { period: '30d' }).catch(() => null),
          api.get<LearningMapResponse>('/learning/map').catch(() => null),
          api.get<{ mistakes: MistakeItem[] }>('/learning/mistakes').catch(() => ({ mistakes: [] })),
        ]);
        if (dashData) setSummary(dashData);
        if (graphData) setGraphs(graphData);
        if (mapData) setLearningMap(mapData);
        if (mistakeData?.mistakes) setRecentMistakes(mistakeData.mistakes);
      } catch (err) {
        console.warn('Dashboard fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={4} height="h-24" />
      </div>
    );
  }

  const hasPracticeData = (summary?.metrics?.total_practice_attempts || 0) > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Welcome Banner & Profile Summary */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-indigo-600 to-purple-600 text-white p-6 sm:p-8 shadow-card">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-brand-200" />
            <span>Class {summary?.profile?.class_level || educationProfile?.class_level || 10} • {summary?.profile?.board || educationProfile?.board || 'CBSE'} Curriculum</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {summary?.profile?.full_name || user?.full_name || 'Student'}! 👋
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-brand-100 font-medium leading-relaxed">
            "{summary?.motivational_quote?.text || 'Consistent learning transforms curiosity into mastery.'}"
            <span className="block mt-0.5 text-[11px] text-brand-200 opacity-90">— {summary?.motivational_quote?.author || 'ConceptTrace AI'}</span>
          </p>
        </div>

        {/* Ambient subtle decorative circle */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Active Days */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-soft card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Days</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookMarked className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{summary?.metrics?.active_days || 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Days with &gt;= 5 mins study</p>
        </div>

        {/* Tracked Study Time */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-soft card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tracked Time</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{summary?.metrics?.tracked_time_display || '0m'}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Time tracked on ConceptTrace AI</p>
        </div>

        {/* Current Streak */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-soft card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Streak</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{summary?.metrics?.current_streak || 0} <span className="text-sm font-semibold text-slate-500">days</span></p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Best: {summary?.metrics?.longest_streak || 0} days</p>
        </div>

        {/* Overall Accuracy */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-soft card-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Accuracy</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">
            {hasPracticeData ? `${summary?.metrics?.overall_accuracy}%` : '--'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
            {hasPracticeData ? `${summary?.metrics?.total_practice_attempts} eligible checked` : 'Awaiting practice attempts'}
          </p>
        </div>
      </div>

      {/* 3. Official Syllabus & Adaptive Learning Master Card */}
      {learningMap && (
        <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50/50 rounded-3xl p-6 border border-purple-200/80 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Official {learningMap.syllabus.board} Class {learningMap.syllabus.class_level} Syllabus
                  </h3>
                  <a
                    href={learningMap.syllabus.official_source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 hover:bg-emerald-200 transition-colors"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified Official Source
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Academic Year {learningMap.syllabus.academic_year} • {learningMap.stats.total_concepts} Total Curriculum Concepts
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/syllabus')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <span>Explore Full Syllabus Tree</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mastery Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-brand-600" />
                Concept Mastery: {learningMap.stats.mastered_concepts} of {learningMap.stats.total_concepts} Concepts Mastered (≥ 80% Benchmark)
              </span>
              <span className="text-brand-600 font-bold">{learningMap.stats.completion_percentage}%</span>
            </div>
            <div className="w-full bg-purple-100/70 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-brand-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${learningMap.stats.completion_percentage}%` }}
              />
            </div>
          </div>

          {/* Next Recommended Concept Banner */}
          {learningMap.next_recommended && (
            <div className="p-4 rounded-2xl bg-white border border-brand-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Next Recommended Concept
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {learningMap.next_recommended.subject} • {learningMap.next_recommended.chapter}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  <MathText text={learningMap.next_recommended.concept_name} inline />
                </h4>
                <div className="text-[11px] text-slate-500 font-medium">
                  <MathText text={learningMap.next_recommended.reason} />
                </div>
              </div>

              <button
                onClick={() => navigate('/syllabus')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm shrink-0 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start 5-Min Concept Quiz</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Recent Misconception Traps Warning (if student has recent mistakes) */}
      {recentMistakes.length > 0 && (
        <div className="bg-rose-50/70 rounded-3xl p-5 border border-rose-200/80 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">
                <span className="text-rose-700 font-bold">{recentMistakes.length} Diagnosed Misconception Traps</span> Ready for Review
              </h4>
              <p className="text-[11px] text-slate-600 font-medium">
                Latest: "<MathText text={recentMistakes[0].trap} inline />" in <span className="font-semibold text-slate-800"><MathText text={recentMistakes[0].concept_name} inline /></span>
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/mistakes')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Review Mistakes & Retake</span>
          </button>
        </div>
      )}

      {/* 5. Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Link
          to="/library"
          className="flex items-center gap-3 p-3.5 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/70 rounded-2xl text-indigo-900 transition-all card-hover"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Library className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold truncate">Concept Library</h4>
            <p className="text-[10px] text-indigo-700 truncate">Browse & Practice</p>
          </div>
        </Link>

        <Link
          to="/syllabus"
          className="flex items-center gap-3 p-3.5 bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200/70 rounded-2xl text-purple-900 transition-all card-hover"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold truncate">Official Syllabus</h4>
            <p className="text-[10px] text-purple-700 truncate">Concept Trees & Quizzes</p>
          </div>
        </Link>

        <Link
          to="/ask"
          className="flex items-center gap-3 p-3.5 bg-brand-50/70 hover:bg-brand-100/70 border border-brand-200/70 rounded-2xl text-brand-900 transition-all card-hover"
        >
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold truncate">Ask a Doubt</h4>
            <p className="text-[10px] text-brand-700 truncate">OCR & Verified Steps</p>
          </div>
        </Link>

        <Link
          to="/practice"
          className="flex items-center gap-3 p-3.5 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/70 rounded-2xl text-emerald-900 transition-all card-hover"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <BookOpenCheck className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold truncate">Practice Questions</h4>
            <p className="text-[10px] text-emerald-700 truncate">Targeted Sessions</p>
          </div>
        </Link>

        <Link
          to="/mistakes"
          className="flex items-center gap-3 p-3.5 bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200/70 rounded-2xl text-rose-900 transition-all card-hover"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold truncate">Review Mistakes</h4>
            <p className="text-[10px] text-rose-700 truncate">Gaps & Tips</p>
          </div>
        </Link>
      </div>

      {/* 6. AI Learning Guidance Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center">
            <Lightbulb className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Personalized AI Learning Guidance</h3>
          {!summary?.learning_guidance?.has_sufficient_evidence && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              Initial Baseline
            </span>
          )}
        </div>

        <p className="text-xs text-slate-700 font-medium leading-relaxed bg-brand-50/40 p-3.5 rounded-xl border border-brand-100/60">
          {summary?.learning_guidance?.summary || 'Welcome to ConceptTrace AI! Select your syllabus topics or ask questions to calibrate your mastery profile.'}
        </p>

        <div className="mt-3 space-y-1.5">
          {(summary?.learning_guidance?.recommendations || []).map((rec, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
              <span className="text-brand-500 font-bold">•</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Practice Volume & Improvement Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Learning Practice Volume (30 Days)</h3>
              <p className="text-[11px] text-slate-400">Questions attempted per day</p>
            </div>
            <Link to="/progress/graphs" className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
              View Trends <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-60 w-full">
            {graphs?.series && graphs.series.some((s: any) => s.practiceVolume > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphs.series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="practiceVolume"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    dot={{ fill: '#7c3aed', r: 3 }}
                    name="Questions Attempted"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="No Practice Records Yet"
                description="Start your first practice session to generate learning improvement graphs."
                actionText="Start Practice"
                onAction={() => navigate('/practice')}
              />
            )}
          </div>
        </div>

        {/* Subject-Wise Accuracy Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Subject Accuracy Breakdown</h3>
              <p className="text-[11px] text-slate-400">Eligible attempt accuracy by subject</p>
            </div>
            <Link to="/progress/subjects" className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
              Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-60 w-full">
            {summary?.subject_accuracy && summary.subject_accuracy.some(s => s.total_attempts > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.subject_accuracy}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" />
                  <Tooltip />
                  <Bar dataKey="accuracy" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Accuracy %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="No Subject Attempts Yet"
                description="Practice questions in your selected subjects to evaluate accuracy."
                actionText="Solve Practice Questions"
                onAction={() => navigate('/practice')}
              />
            )}
          </div>
        </div>
      </div>

      {/* 6. Weak Topics Highlights */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Weak Topics Attention List</h3>
            <p className="text-[11px] text-slate-400">Classified using minimum 5 sample attempts threshold</p>
          </div>
          <Link to="/weak-topics" className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
            All Topics <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {summary?.weak_topics && summary.weak_topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.weak_topics.map(topic => (
              <div
                key={topic.topic_id}
                className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-brand-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-700">
                      {topic.subject}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        topic.status === 'Needs Practice'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {topic.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{topic.topic_name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Accuracy: <span className="font-bold text-slate-700">{topic.accuracy}%</span> ({topic.total_attempts} attempts)
                  </p>
                </div>

                <Link
                  to={`/weak-topics/${topic.topic_id}`}
                  className="mt-3 text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1"
                >
                  Review Diagnosis <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-4 text-center">
            No weak topics identified yet. Keep practicing questions to build your evidence profile.
          </p>
        )}
      </div>
    </div>
  );
};
