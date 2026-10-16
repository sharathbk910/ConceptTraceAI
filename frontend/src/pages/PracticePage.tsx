import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpenCheck,
  Target,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Layers,
  Award,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { SyllabusTopic, TopicMetric } from '../types/index.js';

export const PracticePage: React.FC = () => {
  const { educationProfile } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const stateSubject = (location.state as any)?.subject;
  const stateTopicId = (location.state as any)?.topicId;

  const [subject, setSubject] = useState(stateSubject || educationProfile?.subjects[0] || 'Mathematics');
  const [topicId, setTopicId] = useState(stateTopicId || '');
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isStarting, setIsStarting] = useState(false);
  const [weakTopics, setWeakTopics] = useState<TopicMetric[]>([]);

  // Load syllabus topics and weak topics
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [topicsData, weakData] = await Promise.all([
          api.get('/syllabus-topics', {
            subject,
            class_level: educationProfile?.class_level || 10,
            board: educationProfile?.board || 'CBSE',
          }),
          api.get('/analytics/weak-topics'),
        ]);
        setTopics(topicsData || []);
        setWeakTopics((weakData || []).filter((w: TopicMetric) => w.status === 'Needs Practice'));
      } catch {}
    };

    fetchData();
  }, [subject, educationProfile?.class_level, educationProfile?.board]);

  const handleStartSession = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsStarting(true);
    try {
      const res = await api.post('/practice/sessions', {
        subject,
        topic_id: topicId || null,
        question_count: questionCount,
        difficulty,
      });

      navigate(`/practice/${res.session.id}`);
    } catch (err: any) {
      error('Could Not Start Practice', err.message || 'Please check your connection and try again.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpenCheck className="w-6 h-6 text-brand-600" />
            Practice Questions Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Personalized practice calibrated to your class level, syllabus board, and mistake evidence.
          </p>
        </div>
      </div>

      {/* Recommended Targeted Practice Cards (if weak topics exist) */}
      {weakTopics.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-brand-50 rounded-3xl p-6 border border-rose-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
            <TrendingDown className="w-4 h-4 text-rose-600" />
            <span>Recommended Targeted Practice Based on Evidence</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Our diagnostics flagged these topics with low accuracy. We recommend solving a focused 5-question session:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {weakTopics.slice(0, 2).map(wt => (
              <div
                key={wt.topic_id}
                className="bg-white/90 p-3.5 rounded-2xl border border-rose-200/80 flex items-center justify-between gap-3 shadow-xs"
              >
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                    {wt.subject}
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 mt-1 line-clamp-1">{wt.topic_name}</h4>
                  <p className="text-[10px] text-rose-600 font-semibold">{wt.accuracy}% accuracy ({wt.total_attempts} attempts)</p>
                </div>
                <button
                  onClick={() => {
                    setSubject(wt.subject);
                    setTopicId(wt.topic_id);
                    setQuestionCount(5);
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <form onSubmit={handleStartSession} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-brand-600" />
          <span>Configure Practice Session</span>
        </h3>

        {/* Subject & Topic Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Subject *
            </label>
            <select
              value={subject}
              onChange={e => {
                setSubject(e.target.value);
                setTopicId('');
              }}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              {(educationProfile?.subjects || ['Mathematics', 'Science']).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Topic
            </label>
            <select
              value={topicId}
              onChange={e => setTopicId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">All Topics in {subject}</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>
                  {t.chapter ? `${t.chapter}: ` : ''}{t.topic}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Number of Questions */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Number of Questions
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[3, 5, 10].map(cnt => (
              <button
                key={cnt}
                type="button"
                onClick={() => setQuestionCount(cnt)}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                  questionCount === cnt
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cnt} Questions
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Level */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Difficulty Level
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { level: 'easy', label: 'Easy', desc: 'Foundational recall' },
              { level: 'medium', label: 'Medium', desc: 'Curriculum standard' },
              { level: 'hard', label: 'Hard', desc: 'Advanced synthesis' },
            ].map(d => (
              <button
                key={d.level}
                type="button"
                onClick={() => setDifficulty(d.level as any)}
                className={`p-3 rounded-xl text-left border transition-all ${
                  difficulty === d.level
                    ? 'bg-brand-50 border-brand-500 text-brand-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="font-bold text-xs block capitalize">{d.label}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{d.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isStarting}
            className="w-full py-4 px-6 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-sm rounded-2xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isStarting ? (
              <span>Preparing Practice Session...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Start Practice Session ({questionCount} Questions)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
