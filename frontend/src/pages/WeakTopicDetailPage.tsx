import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  TrendingDown,
  ChevronRight,
  BookOpen,
  Target,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { TopicMetric } from '../types/index.js';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton.js';
import { ErrorState } from '../components/common/ErrorState.js';
import { MathText } from '../components/common/MathText.js';

export const WeakTopicDetailPage: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();

  const [topic, setTopic] = useState<TopicMetric | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        const list = await api.get('/analytics/weak-topics');
        const match = (list || []).find((t: TopicMetric) => t.topic_id === topicId);
        setTopic(match || null);
      } catch (err) {
        console.warn('Failed to load topic details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopic();
  }, [topicId]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <LoadingSkeleton rows={4} height="h-28" />
      </div>
    );
  }

  if (!topic) {
    return (
      <ErrorState
        title="Topic Not Found"
        message="The requested syllabus topic could not be found."
        onRetry={() => navigate('/weak-topics')}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 pb-2 border-b border-slate-200">
        <Link to="/home" className="hover:text-slate-800">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/weak-topics" className="hover:text-slate-800">Weak Topics</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-slate-800"><MathText text={topic.topic_name} inline /></span>
      </div>

      {/* Main Topic Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-brand-100 text-brand-800">
              {topic.subject}
            </span>
            {topic.chapter && (
              <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-100 text-slate-600">
                {topic.chapter}
              </span>
            )}
          </div>

          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              topic.status === 'Needs Practice'
                ? 'bg-rose-100 text-rose-700'
                : topic.status === 'Improving'
                ? 'bg-amber-100 text-amber-700'
                : topic.status === 'Doing Well'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {topic.status}
          </span>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            <MathText text={topic.topic_name} inline />
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
            Diagnostic performance profile evaluated against student attempts.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Accuracy</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">{topic.accuracy}%</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Checked Attempts</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">{topic.total_attempts}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Correct</span>
            <span className="text-lg font-black text-emerald-600 mt-0.5 block">{topic.correct_attempts}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Incorrect</span>
            <span className="text-lg font-black text-rose-600 mt-0.5 block">{topic.incorrect_attempts}</span>
          </div>
        </div>
      </div>

      {/* Recommended Revision Steps */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Target className="w-4 h-4 text-brand-600" />
          <span>Diagnostic Prescription & Recommended Action</span>
        </h3>
        <div className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-brand-50/50 p-4 rounded-2xl border border-brand-100 font-medium">
          <MathText text={topic.recommendation} />
        </div>
      </div>

      {/* Prerequisite Concepts */}
      {topic.prerequisites.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-indigo-600" />
            <span>Connected Prerequisite Topics to Review</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topic.prerequisites.map(p => (
              <div key={p.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-slate-800"><MathText text={p.topic} inline /></h5>
                  <p className="text-[10px] text-slate-400">{p.chapter || 'Prerequisite'}</p>
                </div>
                <Link
                  to={`/weak-topics/${p.id}`}
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  Inspect
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action CTA */}
      <div className="p-6 bg-gradient-to-r from-brand-700 via-indigo-600 to-purple-600 rounded-3xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-card">
        <div>
          <h4 className="text-base font-bold">Ready to improve your mastery in this topic?</h4>
          <p className="text-xs text-brand-100 mt-0.5">
            Start a targeted 5-question practice session scored specifically against this topic.
          </p>
        </div>
        <button
          onClick={() => navigate('/practice', { state: { subject: topic.subject, topicId: topic.topic_id } })}
          className="px-5 py-3 bg-white hover:bg-brand-50 text-brand-800 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <span>Start Targeted Practice</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
