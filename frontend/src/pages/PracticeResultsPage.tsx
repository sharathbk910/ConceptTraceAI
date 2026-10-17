import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  XCircle,
  RotateCw,
  TrendingDown,
  LayoutDashboard,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../lib/api.js';
import { PracticeSession, PracticeQuestion } from '../types/index.js';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton.js';
import { MathText } from '../components/common/MathText.js';

export const PracticeResultsPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<PracticeSession | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await api.get(`/practice/sessions/${sessionId}`);
        setSession(res.session);
        setQuestions(res.questions || []);

        const correct = (res.questions || []).filter((q: PracticeQuestion) => q.attempt?.is_correct).length;
        const total = (res.questions || []).length;
        const percent = total > 0 ? (correct / total) * 100 : 0;

        if (percent >= 60) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      } catch (err) {
        console.warn('Error fetching results:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [sessionId]);

  const handleRetrySession = async () => {
    try {
      const res = await api.post(`/practice/sessions/${sessionId}/retry`);
      navigate(`/practice/${res.session.id}`);
    } catch {
      navigate('/practice');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <LoadingSkeleton rows={4} height="h-28" />
      </div>
    );
  }

  const correctCount = questions.filter(q => q.attempt?.is_correct).length;
  const totalCount = questions.length;
  const scorePercent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Score Celebration Card */}
      <div className="bg-gradient-to-br from-brand-700 via-indigo-600 to-purple-600 text-white rounded-3xl p-5 sm:p-8 text-center shadow-card relative overflow-hidden">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-inner">
          <Award className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
        </div>

        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">Practice Session Complete!</h1>
        <p className="text-xs sm:text-sm text-brand-100 mt-1 max-w-md mx-auto">
          {scorePercent >= 80
            ? 'Outstanding conceptual execution! Your topic diagnostic metrics have been updated.'
            : scorePercent >= 60
            ? 'Good work! Review the explanations below to correct small mistake patterns.'
            : 'Keep going! Target the identified prerequisite concepts and retry to build confidence.'}
        </p>

        {/* Score pill */}
        <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-4 sm:gap-6 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
          <div>
            <span className="text-[10px] uppercase font-bold text-brand-200 block">Score</span>
            <span className="text-xl sm:text-2xl font-black">{scorePercent}%</span>
          </div>
          <div className="w-px h-7 sm:h-8 bg-white/20 hidden sm:block" />
          <div>
            <span className="text-[10px] uppercase font-bold text-brand-200 block">Correct</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-300">{correctCount}/{totalCount}</span>
          </div>
          <div className="w-px h-7 sm:h-8 bg-white/20 hidden sm:block" />
          <div>
            <span className="text-[10px] uppercase font-bold text-brand-200 block">Subject</span>
            <span className="text-xs sm:text-sm font-bold truncate max-w-[120px] inline-block">{session?.subject}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={handleRetrySession}
          className="flex items-center justify-center gap-2 p-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-2xl shadow-sm transition-all"
        >
          <RotateCw className="w-4 h-4" />
          <span>Practice Similar Set</span>
        </button>

        <Link
          to="/weak-topics"
          className="flex items-center justify-center gap-2 p-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-2xl shadow-soft transition-all"
        >
          <TrendingDown className="w-4 h-4 text-brand-600" />
          <span>View Weak Topics</span>
        </Link>

        <Link
          to="/home"
          className="flex items-center justify-center gap-2 p-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-2xl shadow-soft transition-all"
        >
          <LayoutDashboard className="w-4 h-4 text-slate-600" />
          <span>Home Dashboard</span>
        </Link>
      </div>

      {/* Questions Detailed Review List */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-200/90 shadow-soft space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-600" />
          <span>Questions & Solutions Review</span>
        </h3>

        <div className="space-y-4">
          {questions.map((q, idx) => {
            const isCorrect = q.attempt?.is_correct;
            return (
              <div
                key={q.id}
                className={`p-3.5 sm:p-5 rounded-2xl border text-xs space-y-3 ${
                  isCorrect ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span><MathText text={q.question_text} /></span>
                  </div>
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold shrink-0">
                      <CheckCircle2 className="w-4 h-4" /> Correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-700 font-bold shrink-0">
                      <XCircle className="w-4 h-4" /> Incorrect
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400 font-medium">Your Submitted Answer: </span>
                    <span className="font-bold text-slate-800"><MathText text={q.attempt?.submitted_answer || 'None'} inline /></span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Correct Answer: </span>
                    <span className="font-bold text-emerald-800"><MathText text={q.correct_answer} inline /></span>
                  </div>
                </div>

                {q.explanation && (
                  <div className="p-3 bg-white/80 rounded-xl border border-slate-200/60 text-slate-700 leading-relaxed text-[11px]">
                    <strong>Explanation: </strong>
                    <MathText text={q.explanation} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
