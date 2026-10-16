import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Target,
  CalendarDays,
  Download,
  Flame,
  Clock,
  BookOpen,
  Award,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileDown,
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
import { api } from '../lib/api.js';
import { useToast } from '../hooks/useToast.js';
import { DashboardSummary, TopicMetric } from '../types/index.js';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton.js';
import { EmptyState } from '../components/common/EmptyState.js';

export const ProgressPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'graphs' | 'subjects' | 'weak-topics' | 'activity'>('overview');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [graphs, setGraphs] = useState<any>(null);
  const [graphPeriod, setGraphPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [topicMetrics, setTopicMetrics] = useState<TopicMetric[]>([]);
  const [activityData, setActivityData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/graphs')) setActiveTab('graphs');
    else if (path.includes('/subjects')) setActiveTab('subjects');
    else if (path.includes('/weak-topics')) setActiveTab('weak-topics');
    else if (path.includes('/activity')) setActiveTab('activity');
    else setActiveTab('overview');
  }, [location.pathname]);

  const loadData = async () => {
    try {
      const [sumRes, graphRes, topicsRes, actRes] = await Promise.all([
        api.get<DashboardSummary>('/dashboard'),
        api.get('/analytics/graphs', { period: graphPeriod }),
        api.get('/analytics/weak-topics'),
        api.get('/analytics/activity'),
      ]);
      setSummary(sumRes);
      setGraphs(graphRes);
      setTopicMetrics(topicsRes || []);
      setActivityData(actRes);
    } catch (err: any) {
      error('Analytics Error', err.message || 'Could not load progress reports.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [graphPeriod]);

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const blob = await api.downloadPdf('/reports/pdf');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ConceptTrace_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      success('PDF Exported! 📄', 'Comprehensive progress report downloaded successfully.');
    } catch (err: any) {
      error('Export Error', err.message || 'Could not generate PDF report.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={4} height="h-28" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', path: '/progress', icon: BarChart3 },
    { id: 'graphs', label: 'Learning Graphs', path: '/progress/graphs', icon: LineChartIcon },
    { id: 'subjects', label: 'Subject Accuracy', path: '/progress/subjects', icon: PieChartIcon },
    { id: 'weak-topics', label: 'Weak Topics', path: '/progress/weak-topics', icon: Target },
    { id: 'activity', label: 'Study Activity', path: '/progress/activity', icon: CalendarDays },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Export PDF */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            Comprehensive Progress Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real authorized metrics, accuracy trends, and curriculum learning logs.
          </p>
        </div>

        <button
          onClick={handleDownloadPdf}
          disabled={isDownloadingPdf}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto"
        >
          <FileDown className="w-4 h-4" />
          <span>{isDownloadingPdf ? 'Generating PDF...' : 'Export PDF Progress Report'}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Key Metric Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-soft">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Questions Analyzed</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{summary?.metrics.total_questions_analyzed || 0}</p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Doubts with verified steps</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-soft">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Practice Attempts</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{summary?.metrics.total_practice_attempts || 0}</p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Checked questions scored</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-soft">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overall Accuracy</span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {(summary?.metrics.total_practice_attempts || 0) > 0 ? `${summary?.metrics.overall_accuracy}%` : '--'}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Eligible checked percentage</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-soft">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tracked Study Time</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{summary?.metrics.tracked_time_display || '0m'}</p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">On ConceptTrace AI platform</span>
            </div>
          </div>

          {/* AI Guidance Highlight */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-soft space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Summary of Performance Changes</h3>
            <p className="text-xs text-slate-700 bg-brand-50/50 p-4 rounded-xl border border-brand-100 font-medium leading-relaxed">
              {summary?.learning_guidance.summary}
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: LEARNING GRAPHS */}
      {activeTab === 'graphs' && (
        <div className="space-y-6 animate-fade-in">
          {/* Period Filter Buttons */}
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
            <span className="text-xs font-bold text-slate-700">Filter Reporting Period</span>
            <div className="flex gap-1.5">
              {(['7d', '30d', '90d'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setGraphPeriod(p)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    graphPeriod === p
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p === '7d' ? 'Last 7 Days' : p === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
                </button>
              ))}
            </div>
          </div>

          {/* Volume Graph */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-soft">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Practice Volume Over Time</h3>
            <p className="text-xs text-slate-400 mb-4">Number of questions practiced per day</p>

            <div className="h-64 w-full">
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
                      name="Questions Practiced"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={LineChartIcon}
                  title="No Volume History Yet"
                  description="Complete practice questions to see daily volume charts."
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBJECT ACCURACY */}
      {activeTab === 'subjects' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-soft">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Subject Accuracy Distribution</h3>
            <p className="text-xs text-slate-400 mb-4">Eligible attempt accuracy across curriculum subjects</p>

            <div className="h-64 w-full">
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
                  icon={PieChartIcon}
                  title="No Subject Data Yet"
                  description="Solve questions across your subjects to generate accuracy breakdown."
                />
              )}
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-soft">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Subject Statistics Table</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Attempts</th>
                    <th className="py-2.5 px-3">Correct</th>
                    <th className="py-2.5 px-3">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary?.subject_accuracy.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-bold text-slate-800">{s.subject}</td>
                      <td className="py-3 px-3 text-slate-600">{s.total_attempts}</td>
                      <td className="py-3 px-3 text-emerald-600 font-semibold">{s.correct_attempts}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{s.accuracy}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WEAK TOPICS */}
      {activeTab === 'weak-topics' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 bg-brand-50/60 border border-brand-100 rounded-2xl text-xs text-brand-900 font-medium">
            Topics requiring attention, ranked by accuracy with minimum sample thresholds.
          </div>

          <div className="space-y-3">
            {topicMetrics.map(topic => (
              <div
                key={topic.topic_id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                      {topic.subject}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        topic.status === 'Needs Practice'
                          ? 'bg-rose-100 text-rose-700'
                          : topic.status === 'Improving'
                          ? 'bg-amber-100 text-amber-700'
                          : topic.status === 'Doing Well'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {topic.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{topic.topic_name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{topic.recommendation}</p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                  <div className="text-right">
                    <span className="text-base font-black text-slate-900">{topic.accuracy}%</span>
                    <span className="text-[10px] text-slate-400 block">{topic.total_attempts} attempts</span>
                  </div>
                  <Link
                    to={`/weak-topics/${topic.topic_id}`}
                    className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    Diagnose
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: STUDY ACTIVITY & HEATMAP */}
      {activeTab === 'activity' && (
        <div className="space-y-6 animate-fade-in">
          {/* Streak & Active Days Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Days</span>
              <p className="text-xl font-black text-slate-900 mt-1">{activityData?.activeDays || 0}</p>
              <span className="text-[10px] text-slate-400">&gt;= 5 mins threshold</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Streak</span>
              <p className="text-xl font-black text-slate-900 mt-1">{activityData?.currentStreak || 0} days</p>
              <span className="text-[10px] text-slate-400">Consecutive days</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Longest Streak</span>
              <p className="text-xl font-black text-slate-900 mt-1">{activityData?.longestStreak || 0} days</p>
              <span className="text-[10px] text-slate-400">Peak study streak</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Daily Time</span>
              <p className="text-xl font-black text-slate-900 mt-1">{activityData?.avgMinutesPerActiveDay || 0} mins</p>
              <span className="text-[10px] text-slate-400">Per active day</span>
            </div>
          </div>

          {/* 30-Day Activity Heatmap */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-soft space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">30-Day Active Study Heatmap</h3>
              <p className="text-xs text-slate-400">Color indicates tracked verified learning time</p>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2 pt-2">
              {activityData?.heatmap?.map((cell: any, i: number) => {
                const mins = cell.minutes;
                let bg = 'bg-slate-100 text-slate-400';
                if (mins >= 30) bg = 'bg-brand-600 text-white font-bold';
                else if (mins >= 15) bg = 'bg-brand-400 text-white';
                else if (mins >= 5) bg = 'bg-brand-200 text-brand-900';
                else if (mins > 0) bg = 'bg-brand-100 text-brand-800';

                return (
                  <div
                    key={i}
                    title={`${cell.date}: ${mins} minutes tracked`}
                    className={`h-12 rounded-xl flex flex-col items-center justify-center p-1 border border-slate-200/50 text-[10px] transition-transform hover:scale-105 cursor-default ${bg}`}
                  >
                    <span>{cell.date.slice(5)}</span>
                    <span className="text-[9px] opacity-80">{mins}m</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
