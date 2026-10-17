import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  ArrowRight,
  BookOpen,
  Target,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { TopicMetric } from '../types/index.js';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton.js';
import { EmptyState } from '../components/common/EmptyState.js';
import { MathText } from '../components/common/MathText.js';

export const WeakTopicsPage: React.FC = () => {
  const { educationProfile } = useAuth();
  const navigate = useNavigate();

  const [topics, setTopics] = useState<TopicMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');

  useEffect(() => {
    const fetchWeakTopics = async () => {
      try {
        const data = await api.get('/analytics/weak-topics');
        setTopics(data || []);
      } catch (err) {
        console.warn('Failed to fetch topic metrics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeakTopics();
  }, []);

  const filteredTopics = topics.filter(t => {
    if (selectedCategory !== 'All' && t.status !== selectedCategory) return false;
    if (selectedSubject !== 'All' && t.subject !== selectedSubject) return false;
    return true;
  });

  const getStatusBadge = (status: TopicMetric['status']) => {
    switch (status) {
      case 'Needs Practice':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Needs Practice
          </span>
        );
      case 'Improving':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <TrendingUp className="w-3 h-3 text-amber-600" />
            Improving
          </span>
        );
      case 'Doing Well':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Doing Well
          </span>
        );
      case 'Needs More Evidence':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <HelpCircle className="w-3 h-3 text-slate-500" />
            Needs More Evidence
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingDown className="w-6 h-6 text-brand-600" />
            Weak Topics & Learning Diagnostics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evidence-based evaluation. Requires a minimum threshold of 5 attempts before classifying a topic to avoid single-error bias.
          </p>
        </div>

        <button
          onClick={() => navigate('/practice')}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all self-start sm:self-auto"
        >
          Launch Targeted Practice
        </button>
      </div>

      {/* Metric Criteria Banner */}
      <div className="p-4 bg-brand-50/60 border border-brand-100 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-brand-900">
        <div className="flex items-center gap-2 font-semibold">
          <Target className="w-4 h-4 text-brand-600 shrink-0" />
          <span>Evaluation Formula: Accuracy = (Eligible Correct / Total Checked Attempts) × 100</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-medium text-brand-700">
          <span>• Threshold: 5 attempts</span>
          <span>• &lt;60%: Needs Practice</span>
          <span>• 60-80%: Improving</span>
          <span>• &ge;80%: Doing Well</span>
        </div>
      </div>

      {/* Filter Tabs & Subject Filter */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-soft flex flex-wrap items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          {['All', 'Needs Practice', 'Improving', 'Doing Well', 'Needs More Evidence'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Subject Filter */}
        <select
          value={selectedSubject}
          onChange={e => setSelectedSubject(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="All">All Subjects</option>
          {(educationProfile?.subjects || ['Mathematics', 'Science']).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Topics Grid */}
      {isLoading ? (
        <LoadingSkeleton rows={4} height="h-28" />
      ) : filteredTopics.length === 0 ? (
        <EmptyState
          icon={TrendingDown}
          title="No Topics in this Category"
          description="Try switching the category filter or solve more practice questions to build your evidence base."
          actionText="Solve Practice Questions"
          onAction={() => navigate('/practice')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTopics.map(topic => (
            <div
              key={topic.topic_id}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-soft card-hover flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                      {topic.subject}
                    </span>
                    {topic.chapter && (
                      <span className="text-[10px] text-slate-400 font-medium ml-2">
                        {topic.chapter}
                      </span>
                    )}
                  </div>
                  {getStatusBadge(topic.status)}
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    <MathText text={topic.topic_name} inline />
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                    <span>
                      Accuracy: <strong className="text-slate-800">{topic.accuracy}%</strong>
                    </span>
                    <span>•</span>
                    <span>
                      {topic.total_attempts} attempts{' '}
                      {!topic.sample_count_sufficient && (
                        <span className="text-amber-600 font-semibold text-[10px]">
                          ({topic.total_attempts}/{topic.min_samples_required} needed)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                  <span className="font-bold text-slate-800">Prescription: </span>
                  <MathText text={topic.recommendation} />
                </div>

                {/* Prerequisite concepts if available */}
                {topic.prerequisites.length > 0 && (
                  <div className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-600">Prerequisites: </span>
                    <span>{topic.prerequisites.map(p => p.topic).join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to={`/weak-topics/${topic.topic_id}`}
                  className="text-xs font-bold text-brand-600 hover:underline"
                >
                  View Deep Diagnosis
                </Link>

                <button
                  onClick={() => navigate('/practice', { state: { subject: topic.subject, topicId: topic.topic_id } })}
                  className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <span>Practice Topic</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
