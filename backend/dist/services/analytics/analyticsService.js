"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const database_js_1 = require("../db/database.js");
const env_js_1 = require("../../config/env.js");
class AnalyticsService {
    /**
     * Calculates overall student dashboard metrics
     */
    static getDashboardSummary(userId) {
        const profile = database_js_1.db.getProfileById(userId);
        const edProfile = database_js_1.db.getEducationProfile(userId);
        const subjects = database_js_1.db.getStudentSubjects(userId).map(s => s.subject_name);
        const queries = database_js_1.db.listUserQueries(userId);
        const attempts = database_js_1.db.getAllEligibleAttempts(userId);
        const studySessions = database_js_1.db.getUserStudySessions(userId);
        const recentActivities = database_js_1.db.getUserActivities(userId, 8);
        // Tracked Time
        const totalTrackedSeconds = studySessions.reduce((acc, s) => acc + (s.tracked_seconds || 0), 0);
        const hours = Math.floor(totalTrackedSeconds / 3600);
        const mins = Math.floor((totalTrackedSeconds % 3600) / 60);
        const trackedTimeDisplay = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        // Active Days & Streaks (threshold: MIN_ACTIVE_DAY_SECONDS = 300s)
        const { activeDays, currentStreak, longestStreak } = this.calculateActiveDaysAndStreak(studySessions);
        // Accuracy
        const totalAttempts = attempts.length;
        const correctAttempts = attempts.filter(a => a.is_correct).length;
        const overallAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
        // Distinct topics practiced
        const questionsForAttempts = attempts.map(a => database_js_1.db.getPracticeQuestionById(a.question_id)).filter(Boolean);
        const topicIds = new Set(questionsForAttempts.map(q => q?.topic_id).filter(Boolean));
        // Subject Breakdown
        const subjectMap = {};
        for (const sub of subjects) {
            subjectMap[sub] = { total: 0, correct: 0 };
        }
        for (const a of attempts) {
            const q = database_js_1.db.getPracticeQuestionById(a.question_id);
            if (!q)
                continue;
            const sess = database_js_1.db.getPracticeSession(a.session_id, userId);
            const sub = sess?.subject || 'Other';
            if (!subjectMap[sub]) {
                subjectMap[sub] = { total: 0, correct: 0 };
            }
            subjectMap[sub].total += 1;
            if (a.is_correct)
                subjectMap[sub].correct += 1;
        }
        const subjectAccuracy = Object.entries(subjectMap).map(([subject, data]) => ({
            subject,
            total_attempts: data.total,
            correct_attempts: data.correct,
            accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        }));
        // Weak Topics
        const allTopicMetrics = this.getTopicMetrics(userId);
        const weakTopics = allTopicMetrics
            .filter(t => t.status === 'Needs Practice' || t.status === 'Needs More Evidence')
            .slice(0, 5);
        // Learning Guidance
        const guidance = this.generateLearningGuidance(allTopicMetrics, totalAttempts, overallAccuracy);
        const quotes = [
            { text: "Consistency in learning transforms curiosity into genuine mastery.", author: "ConceptTrace AI Mentor" },
            { text: "Every error pinpointed is a concept strengthened.", author: "Carl Friedrich Gauss" },
            { text: "Success is the sum of small practice efforts, repeated day in and day out.", author: "Robert Collier" },
        ];
        const motivational_quote = quotes[Math.floor(Math.random() * quotes.length)];
        return {
            profile: {
                full_name: profile?.full_name || 'Student',
                email: profile?.email || '',
                board: edProfile?.board || 'CBSE',
                class_level: edProfile?.class_level || 10,
                academic_year: edProfile?.academic_year || '2026-27',
                preferred_language: edProfile?.preferred_language || 'English',
                subjects,
            },
            metrics: {
                active_days: activeDays,
                tracked_seconds: totalTrackedSeconds,
                tracked_time_display: trackedTimeDisplay,
                current_streak: currentStreak,
                longest_streak: longestStreak,
                overall_accuracy: overallAccuracy,
                total_questions_analyzed: queries.length,
                total_practice_attempts: totalAttempts,
                topics_practiced_count: topicIds.size,
            },
            learning_guidance: guidance,
            subject_accuracy: subjectAccuracy,
            recent_activities: recentActivities,
            weak_topics: weakTopics,
            motivational_quote,
        };
    }
    /**
     * Calculates Active Days & Streaks based on qualifying study time threshold
     */
    static calculateActiveDaysAndStreak(sessions) {
        const dailySeconds = {};
        for (const sess of sessions) {
            const dateKey = sess.started_at.split('T')[0];
            dailySeconds[dateKey] = (dailySeconds[dateKey] || 0) + (sess.tracked_seconds || 0);
        }
        const minSecs = env_js_1.env.MIN_ACTIVE_DAY_SECONDS;
        const qualifyingDates = Object.entries(dailySeconds)
            .filter(([_, secs]) => secs >= minSecs)
            .map(([date]) => date)
            .sort();
        const activeDays = qualifyingDates.length;
        if (activeDays === 0) {
            return { activeDays: 0, currentStreak: 0, longestStreak: 0 };
        }
        // Calculate streaks
        let longestStreak = 0;
        let tempStreak = 0;
        let prevDate = null;
        for (const dStr of qualifyingDates) {
            const curDate = new Date(dStr);
            if (prevDate) {
                const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
                if (diffDays === 1) {
                    tempStreak += 1;
                }
                else {
                    tempStreak = 1;
                }
            }
            else {
                tempStreak = 1;
            }
            if (tempStreak > longestStreak)
                longestStreak = tempStreak;
            prevDate = curDate;
        }
        // Current streak
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        let currentStreak = 0;
        if (qualifyingDates.includes(today) || qualifyingDates.includes(yesterday)) {
            let checkDate = qualifyingDates.includes(today) ? new Date(today) : new Date(yesterday);
            while (true) {
                const str = checkDate.toISOString().split('T')[0];
                if (qualifyingDates.includes(str)) {
                    currentStreak += 1;
                    checkDate = new Date(checkDate.getTime() - 86400000);
                }
                else {
                    break;
                }
            }
        }
        return { activeDays, currentStreak, longestStreak };
    }
    /**
     * Computes topic-level analytics and evidence-based weak topics
     */
    static getTopicMetrics(userId) {
        const attempts = database_js_1.db.getAllEligibleAttempts(userId);
        const minThreshold = env_js_1.env.WEAK_TOPIC_MIN_ATTEMPTS;
        // Group attempts by topic
        const topicStats = {};
        for (const a of attempts) {
            const q = database_js_1.db.getPracticeQuestionById(a.question_id);
            if (!q || !q.topic_id)
                continue;
            if (!topicStats[q.topic_id]) {
                topicStats[q.topic_id] = { topic_id: q.topic_id, attempts: [] };
            }
            topicStats[q.topic_id].attempts.push({
                is_correct: a.is_correct,
                attempted_at: a.attempted_at,
            });
        }
        const allSyllabusTopics = database_js_1.db.getSyllabusTopics();
        const metrics = [];
        for (const topic of allSyllabusTopics) {
            const stat = topicStats[topic.id];
            const topicAttempts = stat?.attempts || [];
            const total = topicAttempts.length;
            const correct = topicAttempts.filter(a => a.is_correct).length;
            const incorrect = total - correct;
            const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
            const sampleSufficient = total >= minThreshold;
            // Status classification based on rules:
            // Needs More Evidence: total < minThreshold
            // Needs Practice: total >= minThreshold && accuracy < 60%
            // Improving: total >= minThreshold && accuracy between 60% and 80%
            // Doing Well: total >= minThreshold && accuracy >= 80%
            let status = 'Needs More Evidence';
            if (sampleSufficient) {
                if (accuracy < 60)
                    status = 'Needs Practice';
                else if (accuracy < 80)
                    status = 'Improving';
                else
                    status = 'Doing Well';
            }
            // Trend: compare first half with second half of chronological attempts
            let recentTrend = 'stable';
            if (total >= 4) {
                const sorted = [...topicAttempts].sort((a, b) => new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime());
                const mid = Math.floor(sorted.length / 2);
                const firstHalf = sorted.slice(0, mid);
                const secondHalf = sorted.slice(mid);
                const acc1 = firstHalf.filter(a => a.is_correct).length / firstHalf.length;
                const acc2 = secondHalf.filter(a => a.is_correct).length / secondHalf.length;
                if (acc2 > acc1 + 0.1)
                    recentTrend = 'improving';
                else if (acc2 < acc1 - 0.1)
                    recentTrend = 'declining';
            }
            const prereqs = database_js_1.db.getTopicPrerequisites(topic.id);
            let recommendation = 'Review basic definitions and practice standard questions.';
            if (status === 'Needs Practice') {
                recommendation = `Target prerequisite concepts (${prereqs.map(p => p.topic).join(', ') || 'fundamental steps'}) and solve 5 guided questions.`;
            }
            else if (status === 'Improving') {
                recommendation = 'Maintain practice cadence with medium and hard challenge questions.';
            }
            else if (status === 'Doing Well') {
                recommendation = 'Strong mastery demonstrated! Move to advanced application problems or revision.';
            }
            const mistakePatterns = [
                'Algebraic sign inversion during simplification',
                'Formula misapplication under specific boundary conditions',
                'Calculation rushing in multi-step questions',
            ];
            metrics.push({
                topic_id: topic.id,
                topic_name: topic.topic,
                subject: topic.subject,
                chapter: topic.chapter,
                total_attempts: total,
                correct_attempts: correct,
                incorrect_attempts: incorrect,
                accuracy,
                status,
                recent_trend: recentTrend,
                sample_count_sufficient: sampleSufficient,
                min_samples_required: minThreshold,
                prerequisites: prereqs,
                mistake_patterns: status === 'Needs Practice' ? mistakePatterns.slice(0, 2) : [],
                recommendation,
            });
        }
        return metrics.sort((a, b) => {
            // Prioritize Needs Practice first, then Needs More Evidence with some attempts
            const rank = (m) => (m.status === 'Needs Practice' ? 1 : m.status === 'Improving' ? 2 : m.status === 'Needs More Evidence' ? 3 : 4);
            return rank(a) - rank(b);
        });
    }
    /**
     * Generates AI Learning Guidance strictly adhering to evidence rules
     */
    static generateLearningGuidance(topics, totalAttempts, overallAccuracy) {
        if (totalAttempts < env_js_1.env.WEAK_TOPIC_MIN_ATTEMPTS) {
            return {
                summary: 'Complete more questions to receive personalized guidance.',
                has_sufficient_evidence: false,
                recommendations: [
                    'Solve at least 5 practice questions to build initial concept baseline.',
                    'Ask your academic doubts in Ask a Doubt for step-by-step breakdown.',
                    'Start with a quick diagnostic session in your primary subject.',
                ],
            };
        }
        const needsPractice = topics.filter(t => t.status === 'Needs Practice');
        const improving = topics.filter(t => t.status === 'Improving');
        if (needsPractice.length > 0) {
            const topIssue = needsPractice[0];
            const prereqNames = topIssue.prerequisites.map(p => p.topic).join(', ');
            return {
                summary: `Performance evidence identifies ${topIssue.topic_name} (${topIssue.accuracy}% accuracy across ${topIssue.total_attempts} attempts) as requiring targeted reinforcement.`,
                has_sufficient_evidence: true,
                recommendations: [
                    `Review foundational prerequisites: ${prereqNames || 'foundational formulas'}.`,
                    `Attempt a targeted 5-question practice set on ${topIssue.topic_name}.`,
                    'Focus on explaining each step why it is taken rather than rushing to the final answer.',
                ],
            };
        }
        if (improving.length > 0) {
            return {
                summary: `Great progress! ${improving.length} topics are showing an improving trajectory.`,
                has_sufficient_evidence: true,
                recommendations: [
                    `Keep practicing medium-difficulty questions in ${improving[0].topic_name}.`,
                    'Review previous mistakes in Learning History before taking full tests.',
                ],
            };
        }
        return {
            summary: `High mastery demonstrated across evaluated topics (${overallAccuracy}% overall accuracy).`,
            has_sufficient_evidence: true,
            recommendations: [
                'Attempt hard difficulty challenge sets to test deeper synthesis.',
                'Explore related syllabus topics in other chosen subjects.',
            ],
        };
    }
    /**
     * Learning graph series for Accuracy and Volume over time
     */
    static getLearningGraphs(userId, period) {
        const attempts = database_js_1.db.getAllEligibleAttempts(userId);
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        const dateMap = {};
        const now = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 86400000);
            const key = d.toISOString().split('T')[0];
            dateMap[key] = { date: key, total: 0, correct: 0, accuracy: 0 };
        }
        for (const a of attempts) {
            const day = a.attempted_at.split('T')[0];
            if (dateMap[day]) {
                dateMap[day].total += 1;
                if (a.is_correct)
                    dateMap[day].correct += 1;
            }
        }
        const series = Object.values(dateMap).map(d => ({
            date: d.date.substring(5), // MM-DD
            fullDate: d.date,
            practiceVolume: d.total,
            accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : null,
        }));
        return {
            period,
            days,
            series,
        };
    }
    /**
     * Study Activity & Heatmap
     */
    static getStudyActivityData(userId) {
        const sessions = database_js_1.db.getUserStudySessions(userId);
        const { activeDays, currentStreak, longestStreak } = this.calculateActiveDaysAndStreak(sessions);
        const totalSeconds = sessions.reduce((acc, s) => acc + (s.tracked_seconds || 0), 0);
        const avgMinutesPerActiveDay = activeDays > 0 ? Math.round(totalSeconds / 60 / activeDays) : 0;
        // Daily activity map for heatmap (last 30 days)
        const dailyMap = {};
        for (const s of sessions) {
            const day = s.started_at.split('T')[0];
            dailyMap[day] = (dailyMap[day] || 0) + (s.tracked_seconds || 0);
        }
        const heatmap = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(Date.now() - i * 86400000);
            const key = d.toISOString().split('T')[0];
            const secs = dailyMap[key] || 0;
            heatmap.push({
                date: key,
                seconds: secs,
                minutes: Math.round(secs / 60),
                isActiveDay: secs >= env_js_1.env.MIN_ACTIVE_DAY_SECONDS,
            });
        }
        return {
            activeDays,
            currentStreak,
            longestStreak,
            totalTrackedSeconds: totalSeconds,
            avgMinutesPerActiveDay,
            heatmap,
        };
    }
}
exports.AnalyticsService = AnalyticsService;
