import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpenCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Check,
  Award,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../hooks/useToast.js';
import { PracticeSession, PracticeQuestion } from '../types/index.js';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton.js';
import { ErrorState } from '../components/common/ErrorState.js';
import { MathText } from '../components/common/MathText.js';

export const PracticeSessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { success, error, warning } = useToast();

  const [session, setSession] = useState<PracticeSession | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [shortAnswer, setShortAnswer] = useState<string>('');
  const [showHint, setShowHint] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await api.get(`/practice/sessions/${sessionId}`);
      setSession(res.session);
      setQuestions(res.questions || []);

      // If all questions are attempted or session is completed, navigate to results
      if (res.session.status === 'completed') {
        navigate(`/practice/${sessionId}/results`, { replace: true });
        return;
      }

      // Find first unattempted question
      const firstUnattempted = (res.questions || []).findIndex((q: PracticeQuestion) => !q.attempt);
      if (firstUnattempted !== -1) {
        setCurrentIndex(firstUnattempted);
      }
    } catch (err: any) {
      error('Session Error', err.message || 'Could not load practice session.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const currentQuestion = questions[currentIndex];
  const isCurrentAttempted = Boolean(currentQuestion?.attempt);

  const handleSubmitAnswer = async () => {
    if (!currentQuestion) return;

    const answerToSubmit =
      currentQuestion.question_type === 'mcq' ? selectedOption : shortAnswer.trim();

    if (!answerToSubmit) {
      warning('Answer Required', 'Please select or type an answer before submitting.');
      return;
    }

    setIsSubmittingAnswer(true);
    try {
      const res = await api.post(`/practice/sessions/${sessionId}/submit`, {
        question_id: currentQuestion.id,
        submitted_answer: answerToSubmit,
      });

      // Update question in local state with attempt result and explanation
      setQuestions(prev =>
        prev.map((q, idx) => {
          if (idx === currentIndex) {
            return {
              ...q,
              correct_answer: res.correct_answer,
              explanation: res.explanation,
              attempt: {
                submitted_answer: answerToSubmit,
                is_correct: res.is_correct,
                feedback: res.feedback,
                attempted_at: new Date().toISOString(),
              },
            };
          }
          return q;
        })
      );

      if (res.is_correct) {
        success('Correct! 🌟', 'Well done on applying the concept.');
      } else {
        warning('Incorrect', 'Review the explanation below to understand where the mistake happened.');
      }
    } catch (err: any) {
      error('Submission Error', err.message || 'Failed to submit answer.');
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleNextOrFinish = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption('');
      setShortAnswer('');
      setShowHint(false);
    } else {
      // Finalize session
      try {
        await api.post(`/practice/sessions/${sessionId}/complete`);
        navigate(`/practice/${sessionId}/results`, { replace: true });
      } catch (err: any) {
        error('Completion Error', err.message || 'Could not complete session.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <LoadingSkeleton rows={4} height="h-28" />
      </div>
    );
  }

  if (!session || questions.length === 0) {
    return (
      <ErrorState
        title="Session Unavailable"
        message="Could not load practice questions for this session."
        onRetry={fetchSession}
      />
    );
  }

  const answeredCount = questions.filter(q => q.attempt).length;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Header & Progress */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-soft space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-100 text-brand-800">
              {session.subject}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Question {currentIndex + 1} of {questions.length}
            </span>
          </div>

          <span className="text-xs font-bold text-brand-700">
            {answeredCount}/{questions.length} Answered
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Active Question Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-200/90 shadow-soft space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>{currentQuestion.topic_id ? 'Topic Practice' : 'Curriculum Question'}</span>
            {currentQuestion.difficulty && (
              <span className="capitalize text-slate-500">{currentQuestion.difficulty} Difficulty</span>
            )}
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
            <MathText text={currentQuestion.question_text} />
          </div>
        </div>

        {/* Answer Input: MCQ Options or Short Answer */}
        {currentQuestion.question_type === 'mcq' && currentQuestion.options ? (
          <div className="space-y-2.5">
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = isCurrentAttempted
                ? currentQuestion.attempt?.submitted_answer === opt
                : selectedOption === opt;

              let optionStyle = 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100';

              if (isCurrentAttempted) {
                const isCorrectOption =
                  currentQuestion.correct_answer === opt ||
                  opt.startsWith(currentQuestion.correct_answer);

                if (isCorrectOption) {
                  optionStyle = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold';
                } else if (isSelected && !currentQuestion.attempt?.is_correct) {
                  optionStyle = 'bg-rose-50 border-rose-300 text-rose-900 font-bold';
                }
              } else if (isSelected) {
                optionStyle = 'bg-brand-50 border-brand-500 text-brand-900 font-bold shadow-xs';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isCurrentAttempted}
                  onClick={() => setSelectedOption(opt)}
                  className={`w-full text-left p-4 rounded-2xl border text-xs sm:text-sm transition-all flex items-center justify-between ${optionStyle}`}
                >
                  <span><MathText text={opt} inline /></span>
                  {isCurrentAttempted && currentQuestion.correct_answer === opt && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  {isCurrentAttempted &&
                    isSelected &&
                    !currentQuestion.attempt?.is_correct && (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Type Your Answer</label>
            <input
              type="text"
              disabled={isCurrentAttempted}
              value={isCurrentAttempted ? currentQuestion.attempt?.submitted_answer : shortAnswer}
              onChange={e => setShortAnswer(e.target.value)}
              placeholder="Enter numerical or algebraic answer..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
        )}

        {/* Hint Panel */}
        {!isCurrentAttempted && (
          <div>
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1.5"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{showHint ? 'Hide Hint' : 'Need a Hint?'}</span>
            </button>
            {showHint && (
              <p className="mt-2 text-xs text-slate-600 bg-brand-50/50 p-3 rounded-xl border border-brand-100">
                Hint: Recall the foundational relation or formula for {session.subject}. Check inverse operations and units carefully.
              </p>
            )}
          </div>
        )}

        {/* Post-submission Feedback & Full Explanation */}
        {isCurrentAttempted && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-2 ${
              currentQuestion.attempt?.is_correct
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-rose-50/70 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {currentQuestion.attempt?.is_correct ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Correct Answer!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Incorrect. Correct Answer: <MathText text={currentQuestion.correct_answer} inline /></span>
                </>
              )}
            </div>

            {currentQuestion.explanation && (
              <div className="text-[11px] leading-relaxed text-slate-700 pt-1 border-t border-slate-200/60">
                <strong>Explanation: </strong>
                <MathText text={currentQuestion.explanation} />
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => {
              setCurrentIndex(prev => prev - 1);
              setSelectedOption('');
              setShortAnswer('');
              setShowHint(false);
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {!isCurrentAttempted ? (
            <button
              type="button"
              disabled={isSubmittingAnswer}
              onClick={handleSubmitAnswer}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              {isSubmittingAnswer ? 'Checking...' : 'Submit Answer'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextOrFinish}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Session'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
