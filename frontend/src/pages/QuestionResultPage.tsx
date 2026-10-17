import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  BookOpen,
  RotateCw,
  Trash2,
  MessageSquare,
  Send,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../hooks/useToast.js';
import { QueryItem, Solution } from '../types/index.js';
import { VerificationBadge } from '../components/common/VerificationBadge.js';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton.js';
import { ErrorState } from '../components/common/ErrorState.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.js';
import { MathText } from '../components/common/MathText.js';

export const QuestionResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [query, setQuery] = useState<QueryItem | null>(null);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Follow-up state
  const [followUpText, setFollowUpText] = useState('');
  const [followUpAnswers, setFollowUpAnswers] = useState<Array<{ q: string; a: string }>>([]);
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);

  // Editable extracted text
  const [isEditingExtracted, setIsEditingExtracted] = useState(false);
  const [editedText, setEditedText] = useState('');

  const fetchQuestionDetails = async () => {
    try {
      const res = await api.get(`/questions/${id}`);
      setQuery(res.query);
      setSolution(res.solution);
      setEditedText(res.query.extracted_text || res.query.question_text || '');
    } catch (err: any) {
      error('Not Found', err.message || 'Could not load question details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setQuery(null);
    setSolution(null);
    setIsLoading(true);
    setFollowUpAnswers([]);
    fetchQuestionDetails();
  }, [id]);

  const handleRetryAnalysis = async () => {
    setIsRetrying(true);
    try {
      const res = await api.post(`/questions/${id}/analyze`);
      setQuery(res.query);
      setSolution(res.solution);
      success('Re-Analyzed', 'Solution refreshed with updated verification.');
    } catch (err: any) {
      error('Retry Failed', err.message || 'Could not re-analyze doubt.');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/questions/${id}`);
      success('Deleted', 'Question removed from your learning history.');
      navigate('/history');
    } catch (err: any) {
      error('Delete Failed', err.message || 'Could not delete question.');
    }
  };

  const handleSendFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpText.trim()) return;

    setIsSubmittingFollowUp(true);
    const qText = followUpText.trim();
    setFollowUpText('');

    try {
      const res = await api.post(`/questions/${id}/follow-up`, {
        follow_up_text: qText,
      });
      setFollowUpAnswers(prev => [...prev, { q: qText, a: res.response }]);
      success('Follow-Up Answered', 'Educational clarification added below.');
    } catch (err: any) {
      error('Follow-Up Error', err.message || 'Could not answer follow-up.');
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <LoadingSkeleton rows={5} height="h-28" />
      </div>
    );
  }

  if (!query) {
    return (
      <ErrorState
        title="Question Not Found"
        message="The requested question could not be loaded or was removed."
        onRetry={fetchQuestionDetails}
      />
    );
  }

  if (query.status === 'failed' || !solution) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
        {/* Top Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 pb-3 border-b border-slate-200">
          <Link to="/home" className="hover:text-slate-800">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/history" className="hover:text-slate-800">Learning History</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-slate-800">Doubt Analysis</span>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-rose-200 shadow-soft text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Analysis Could Not Be Completed</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            {query.error_message || 'The AI service encountered an issue while analyzing this doubt. Your question has been safely preserved.'}
          </p>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left max-w-xl mx-auto">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Your Question ({query.subject}):
            </span>
            <div className="text-sm text-slate-800 font-medium whitespace-pre-wrap">
              <MathText text={query.question_text || query.extracted_text || 'Uploaded question document'} />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRetryAnalysis}
              disabled={isRetrying}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm disabled:opacity-60"
            >
              <RotateCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Retrying Analysis...' : 'Retry Analysis'}</span>
            </button>
            <Link
              to="/ask"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
            >
              Ask Another Doubt
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/home" className="hover:text-slate-800">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/history" className="hover:text-slate-800">Learning History</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-slate-800">Doubt Solution</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRetryAnalysis}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-60"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Re-analyzing...' : 'Retry Analysis'}</span>
          </button>
          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            title="Delete this question"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 1. Original Question & Metadata Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-soft space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-100 text-brand-800">
              {query.subject || 'Academic Doubt'}
            </span>
            {query.chapter && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                {query.chapter}
              </span>
            )}
          </div>
          <VerificationBadge
            status={solution.verification_status}
            method={solution.verification_method}
            details={solution.verification_details?.details}
            uncertaintyNotes={solution.uncertainty_notes}
          />
        </div>

        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Original Question
          </h2>
          <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
            <MathText text={query.extracted_text || query.question_text} />
          </div>
        </div>

        {query.file_path && (
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              <span>Question Attachment Attached</span>
            </span>
            <a
              href={`/${query.file_path.replace(/\\/g, '/')}`}
              target="_blank"
              rel="noreferrer"
              className="text-brand-600 font-semibold hover:underline inline-flex items-center gap-1"
            >
              View Upload <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* 2. Final Answer Card */}
      {solution.final_answer && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border-2 border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Final Answer</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight overflow-x-auto">
            <MathText text={solution.final_answer} inline />
          </div>
        </div>
      )}

      {/* 3. Step-by-Step Solution */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-600" />
          <span>Step-by-Step Solution Breakdown</span>
        </h3>

        <div className="space-y-4">
          {solution.structured_steps.map((step, idx) => (
            <div
              key={idx}
              className="relative pl-7 pb-4 border-l-2 border-brand-200 last:border-transparent last:pb-0"
            >
              {/* Step indicator circle */}
              <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center ring-4 ring-white shadow-xs">
                {step.step_number}
              </div>

              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                <h4 className="text-sm font-bold text-slate-900"><MathText text={step.title} inline /></h4>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans font-medium">
                  <MathText text={step.content} />
                </div>
                {step.reason && (
                  <div className="p-2.5 bg-brand-50/60 rounded-xl border border-brand-100 text-xs text-brand-900">
                    <span className="font-bold text-brand-700">Why this step is taken: </span>
                    <MathText text={step.reason} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Concepts, Mistake Analysis & Prerequisites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Concepts Identified */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <span>Target Concept Tags</span>
          </h3>
          <div className="space-y-2">
            {(solution.concept_analysis as any[])?.map((c, i) => (
              <div key={i} className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900"><MathText text={c.concept} inline /></span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                    {Math.round(c.confidence * 100)}% match
                  </span>
                </div>
                {c.evidence && <div className="text-[11px] text-purple-700 mt-1"><MathText text={c.evidence} /></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Possible Mistakes & Watch-Outs */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Possible Mistakes & Traps</span>
          </h3>
          <div className="space-y-2.5">
            {(solution.possible_mistakes as any[])?.length > 0 ? (
              (solution.possible_mistakes as any[]).map((m, i) => (
                <div key={i} className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-amber-900 block"><MathText text={m.mistake} inline /></span>
                  <div className="text-[11px] text-amber-800"><MathText text={m.evidence} /></div>
                  {m.suggested_correction && (
                    <div className="mt-1 pt-1 border-t border-amber-200 text-slate-700">
                      <span className="font-semibold text-emerald-700">Correction: </span>
                      <MathText text={m.suggested_correction} />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No common mistake traps noted for this query.</p>
            )}
          </div>
        </div>
      </div>

      {/* 5. Prerequisite Concepts */}
      {(solution.prerequisite_concepts as any[])?.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-indigo-600" />
            <span>Prerequisite Concepts to Strengthen</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(solution.prerequisite_concepts as any[]).map((p, i) => (
              <div key={i} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <h5 className="text-xs font-bold text-slate-800"><MathText text={p.concept} inline /></h5>
                <div className="text-[11px] text-slate-500 mt-1"><MathText text={p.reason} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Contextual Follow-Up Q&A Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-600" />
          <span>Ask a Follow-Up About This Solution</span>
        </h3>

        {followUpAnswers.length > 0 && (
          <div className="space-y-3 mb-4">
            {followUpAnswers.map((item, idx) => (
              <div key={idx} className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-brand-900 font-bold">
                  <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px]">Q</span>
                  <span><MathText text={item.q} inline /></span>
                </div>
                <div className="pl-7 text-slate-700 whitespace-pre-wrap leading-relaxed">
                  <MathText text={item.a} />
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSendFollowUp} className="flex gap-2">
          <input
            type="text"
            value={followUpText}
            onChange={e => setFollowUpText(e.target.value)}
            placeholder="Got stuck on Step 2? Type your follow-up doubt here..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={isSubmittingFollowUp || !followUpText.trim()}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* 7. Similar Practice Questions CTA */}
      <div className="p-6 bg-gradient-to-r from-purple-50 via-brand-50 to-indigo-50 border border-brand-200 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Reinforce this concept with targeted practice</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Solve 5 similar practice questions to test whether you've fully mastered this method.
          </p>
        </div>
        <button
          onClick={() => navigate('/practice')}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <span>Start Practice Session</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Delete Question"
        message="Are you sure you want to remove this question and solution from your learning history?"
        confirmText="Delete Question"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};
