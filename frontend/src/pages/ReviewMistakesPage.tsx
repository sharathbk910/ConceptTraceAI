import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  Filter,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { MistakeItem } from '../types/index.js';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton.js';
import { useNavigate } from 'react-router-dom';
import { MathText } from '../components/common/MathText.js';

export const ReviewMistakesPage: React.FC = () => {
  const navigate = useNavigate();
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  const fetchMistakes = async () => {
    try {
      const resp = await api.get<{ mistakes: MistakeItem[]; total: number }>('/learning/mistakes');
      setMistakes(resp.mistakes || []);
    } catch (err) {
      console.error('Failed to load mistakes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMistakes();
  }, []);

  const subjects = Array.from(new Set(mistakes.map(m => m.subject).filter(Boolean)));
  const filtered = selectedSubject === 'all'
    ? mistakes
    : mistakes.filter(m => m.subject.toLowerCase() === selectedSubject.toLowerCase());

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={4} height="h-28" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-700 via-amber-700 to-indigo-800 text-white p-4 sm:p-6 md:p-8 shadow-card">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-3 border border-white/20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-200" />
            <span>Targeted Gap Remediation</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
            Review Mistakes & Cognitive Traps
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-amber-100 font-medium leading-relaxed">
            Every mistake holds the key to mastery. Inspect diagnosed misconception traps, review the remediation tips, and retake concept quizzes to achieve the ≥ 80% mastery threshold.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-60 h-60 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Filter and Count Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedSubject('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedSubject === 'all'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            All Subjects ({mistakes.length})
          </button>
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSubject(s)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedSubject === s
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate('/syllabus')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5 text-brand-600" />
          <span>Go to Syllabus Tree</span>
        </button>
      </div>

      {/* Mistakes List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-soft space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">No Identified Concept Mistakes!</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You currently have no persistent gaps flagged. Continue practicing concept quizzes from your syllabus tree.
          </p>
          <button
            onClick={() => navigate('/syllabus')}
            className="mt-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-colors inline-flex items-center gap-2"
          >
            <span>Explore Official Syllabus</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(item => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-soft hover:border-brand-200 transition-all space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                    {item.subject} • {item.chapter}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    <MathText text={item.concept_name} inline />
                  </span>
                </div>

                <button
                  onClick={() => navigate('/syllabus')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Concept Quiz</span>
                </button>
              </div>

              {/* Question Snippet */}
              <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium leading-relaxed">
                "<MathText text={item.snippet} inline />..."
              </div>

              {/* Cognitive Trap & Learning Tip */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs space-y-1">
                  <strong className="text-rose-700 block font-bold">
                    ⚠️ Diagnosed Cognitive Trap:
                  </strong>
                  <div className="text-slate-800 font-medium"><MathText text={item.trap} /></div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs space-y-1">
                  <strong className="text-emerald-800 block font-bold">
                    💡 Actionable Learning Tip:
                  </strong>
                  <div className="text-emerald-950 font-medium"><MathText text={item.remediation} /></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
