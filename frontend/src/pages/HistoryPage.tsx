import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  History as HistoryIcon,
  Search,
  Filter,
  Trash2,
  ArrowRight,
  RotateCw,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../hooks/useToast.js';
import { useAuth } from '../hooks/useAuth.js';
import { QueryItem } from '../types/index.js';
import { VerificationBadge } from '../components/common/VerificationBadge.js';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton.js';
import { EmptyState } from '../components/common/EmptyState.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.js';
import { MathText } from '../components/common/MathText.js';

export const HistoryPage: React.FC = () => {
  const { educationProfile } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<QueryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/questions', {
        search: search.trim() || undefined,
        subject: selectedSubject || undefined,
        status: selectedStatus || undefined,
      });
      setQuestions(res.items || []);
    } catch (err: any) {
      error('History Error', err.message || 'Could not load learning history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedSubject, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await api.delete(`/questions/${deleteTargetId}`);
      success('Deleted', 'Question removed from learning history.');
      setQuestions(prev => prev.filter(q => q.id !== deleteTargetId));
      setDeleteTargetId(null);
    } catch (err: any) {
      error('Delete Error', err.message || 'Could not delete question.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <HistoryIcon className="w-6 h-6 text-brand-600" />
            Learning History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review past academic questions, verified solutions, concepts covered, and retry questions.
          </p>
        </div>

        <button
          onClick={() => navigate('/ask')}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all self-start sm:self-auto"
        >
          Ask a New Doubt
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-soft flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search questions by text or keyword..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">All Subjects</option>
            {(educationProfile?.subjects || ['Mathematics', 'Science']).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="needs_review">Needs Review</option>
          </select>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingSkeleton rows={4} height="h-24" />
      ) : questions.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No Questions in Learning History"
          description={
            search || selectedSubject
              ? 'No questions matched your current search or filters.'
              : 'You have not asked any doubts yet. Ask your first academic question to build your learning log.'
          }
          actionText={search || selectedSubject ? 'Clear Filters' : 'Ask a Doubt'}
          onAction={() => {
            if (search || selectedSubject) {
              setSearch('');
              setSelectedSubject('');
              setSelectedStatus('');
            } else {
              navigate('/ask');
            }
          }}
        />
      ) : (
        <div className="space-y-3">
          {questions.map(q => (
            <div
              key={q.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-soft card-hover flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-brand-100 text-brand-800">
                    {q.subject || 'General'}
                  </span>
                  {q.chapter && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {q.chapter}
                    </span>
                  )}
                  {q.solution_summary && (
                    <VerificationBadge status={q.solution_summary.verification_status} />
                  )}
                  <span className="text-[11px] text-slate-400">
                    {new Date(q.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                  <MathText text={q.extracted_text || q.question_text} inline />
                </h3>

                {q.solution_summary && (
                  <p className="text-xs text-slate-500 font-medium line-clamp-1">
                    Final Answer: <span className="font-bold text-slate-700"><MathText text={q.solution_summary.final_answer || 'Derived in steps'} inline /></span> • {q.solution_summary.steps_count} steps
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <Link
                  to={`/questions/${q.id}`}
                  className="px-3.5 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <span>Open Solution</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => setDeleteTargetId(q.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Delete from history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Delete Question Record"
        message="Are you sure you want to permanently delete this question and its solution from your learning history?"
        confirmText="Delete Record"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
