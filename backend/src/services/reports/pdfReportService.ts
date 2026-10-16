import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AnalyticsService } from '../analytics/analyticsService.js';
import { db } from '../db/database.js';

export class PdfReportService {
  /**
   * Generates a formal, professional PDF progress report for the student
   */
  public static async generateReport(userId: string): Promise<Buffer> {
    const summary = AnalyticsService.getDashboardSummary(userId);
    const topicMetrics = AnalyticsService.getTopicMetrics(userId);
    const studyActivity = AnalyticsService.getStudyActivityData(userId);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [124, 58, 237]; // Purple / Indigo
    const darkSlate = [30, 41, 59];

    // Header Banner
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('ConceptTrace AI — Student Progress Report', 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Learn • Improve • Succeed  |  Evidence-Based Learning Analytics', 14, 24);

    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.text(`Generated: ${generatedDate}`, 150, 24);

    let yPos = 42;

    // Student & Education Profile Card
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('1. Student Profile & Curriculum Context', 14, yPos);
    yPos += 4;

    autoTable(doc, {
      startY: yPos,
      theme: 'grid',
      headStyles: { fillColor: [243, 232, 255], textColor: [109, 40, 217], fontStyle: 'bold' },
      body: [
        [
          `Student: ${summary.profile.full_name}`,
          `Class: Class ${summary.profile.class_level}`,
          `Board: ${summary.profile.board}`,
        ],
        [
          `Email: ${summary.profile.email}`,
          `Academic Year: ${summary.profile.academic_year}`,
          `Language: ${summary.profile.preferred_language}`,
        ],
        [
          `Selected Subjects: ${summary.profile.subjects.join(', ') || 'None selected'}`,
          `Time Tracked Metric: Verified Platform Study Activity`,
          `Status: Enrolled & Active`,
        ],
      ],
      styles: { fontSize: 9, cellPadding: 3 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // 2. Learning Performance Overview (KPIs)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('2. Academic Performance & Activity Overview', 14, yPos);
    yPos += 4;

    autoTable(doc, {
      startY: yPos,
      theme: 'striped',
      headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255] },
      head: [['Metric', 'Value', 'Qualifying Criteria / Explanation']],
      body: [
        ['Overall Accuracy', `${summary.metrics.overall_accuracy}%`, 'Eligible checked practice questions solved correctly'],
        ['Questions Analyzed', `${summary.metrics.total_questions_analyzed}`, 'Doubts submitted, OCR extracted, and verified with steps'],
        ['Practice Attempts', `${summary.metrics.total_practice_attempts}`, 'Validated server-scored practice question attempts'],
        ['Topics Practiced', `${summary.metrics.topics_practiced_count}`, 'Unique syllabus curriculum topics engaged in practice'],
        ['Active Study Days', `${summary.metrics.active_days} days`, 'Days with >= 5 mins qualifying verified active study time'],
        ['Time Tracked on ConceptTrace', summary.metrics.tracked_time_display, 'Verified active learning time on ConceptTrace AI'],
        ['Current Streak', `${summary.metrics.current_streak} days`, 'Consecutive active study days maintaining target activity'],
        ['Longest Streak', `${summary.metrics.longest_streak} days`, 'Historical peak consecutive study streak'],
      ],
      styles: { fontSize: 8.5, cellPadding: 2.5 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // 3. Subject-wise Accuracy Breakdown
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('3. Subject-Wise Performance Breakdown', 14, yPos);
    yPos += 4;

    const subjectRows = summary.subject_accuracy.map(s => [
      s.subject,
      `${s.total_attempts} attempts`,
      `${s.correct_attempts} correct`,
      `${s.total_attempts - s.correct_attempts} incorrect`,
      `${s.accuracy}%`,
    ]);

    if (subjectRows.length === 0) {
      subjectRows.push(['All Subjects', '0 attempts', '0 correct', '0 incorrect', 'No data yet']);
    }

    autoTable(doc, {
      startY: yPos,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      head: [['Subject', 'Total Practice', 'Correct', 'Incorrect', 'Accuracy']],
      body: subjectRows,
      styles: { fontSize: 8.5, cellPadding: 2.5 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Page Break for Weak Topics & Recommendations if needed
    if (yPos > 210) {
      doc.addPage();
      yPos = 20;
    }

    // 4. Weak Topics & Diagnostic Analysis
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('4. Evidence-Based Topic Diagnostic (Weak Topics)', 14, yPos);
    yPos += 4;

    const topicRows = topicMetrics.slice(0, 8).map(t => [
      t.topic_name,
      t.subject,
      t.status,
      `${t.accuracy}% (${t.total_attempts}/${t.min_samples_required} samples)`,
      t.recommendation,
    ]);

    autoTable(doc, {
      startY: yPos,
      theme: 'striped',
      headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255] },
      head: [['Topic Name', 'Subject', 'Diagnostic Status', 'Accuracy (Sample Count)', 'Prescribed Action']],
      body: topicRows,
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        4: { cellWidth: 70 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // 5. AI Learning Guidance Summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('5. Personalized AI Learning Guidance', 14, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.text(`"${summary.learning_guidance.summary}"`, 14, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const rec of summary.learning_guidance.recommendations) {
      doc.text(`• ${rec}`, 18, yPos);
      yPos += 5;
    }

    // Footer note
    yPos = Math.max(yPos + 8, 275);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'ConceptTrace AI uses evidence-based statistical metrics. Accuracy and weak-topic statuses require minimum sample sizes to prevent single-mistake bias. Study time measures verified on-platform session duration.',
      14,
      yPos
    );

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return pdfBuffer;
  }
}
