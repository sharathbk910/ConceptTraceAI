import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  HelpCircle,
  Upload,
  Image as ImageIcon,
  FileText,
  X,
  Sparkles,
  ArrowRight,
  BookOpen,
  Languages,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  GraduationCap,
  Settings,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { useToast } from '../hooks/useToast.js';
import { SyllabusTopic } from '../types/index.js';

export const AskDoubtPage: React.FC = () => {
  const { user, educationProfile, saveEducationProfile } = useAuth();
  const { success, error, warning } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const standardSubjects = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'Science',
    'Computer Science',
  ];
  const combinedSubjects = Array.from(
    new Set([...(educationProfile?.subjects || []), ...standardSubjects])
  );

  const [questionText, setQuestionText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(
    educationProfile?.subjects?.[0] || 'Mathematics'
  );
  const [selectedClass, setSelectedClass] = useState<number>(
    educationProfile?.class_level || 10
  );
  const [selectedBoard, setSelectedBoard] = useState(
    educationProfile?.board || 'CBSE'
  );
  const [selectedLanguage, setSelectedLanguage] = useState(
    educationProfile?.preferred_language || 'English'
  );
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Derive active context from saved education profile or fallback state
  const activeClass = educationProfile?.class_level || selectedClass || 10;
  const activeBoard = educationProfile?.board || selectedBoard || 'CBSE';
  const activeLanguage = educationProfile?.preferred_language || selectedLanguage || 'English';

  const isClassMissing = !educationProfile?.class_level;
  const isBoardMissing = !educationProfile?.board;
  const isLanguageMissing = !educationProfile?.preferred_language;
  const hasMissingAcademicDetails = isClassMissing || isBoardMissing || isLanguageMissing;

  // Sync initial profile values once loaded
  useEffect(() => {
    if (educationProfile) {
      if (educationProfile.subjects?.[0] && !selectedSubject) {
        setSelectedSubject(educationProfile.subjects[0]);
      }
      if (educationProfile.class_level) {
        setSelectedClass(educationProfile.class_level);
      }
      if (educationProfile.board) {
        setSelectedBoard(educationProfile.board);
      }
      if (educationProfile.preferred_language) {
        setSelectedLanguage(educationProfile.preferred_language);
      }
    }
  }, [educationProfile]);

  // Handle location state passed from Concept Library or practice
  useEffect(() => {
    if (location.state) {
      const state = location.state as { concept?: string; subject?: string; chapter?: string };
      if (state.subject) {
        setSelectedSubject(state.subject);
      }
      if (state.concept) {
        setQuestionText(prev => prev || `I have a doubt regarding "${state.concept}"${state.chapter ? ` in ${state.chapter}` : ''}. Can you explain this concept and give a clear example?`);
      }
    }
  }, [location.state]);

  // Load syllabus topics for selected subject & class
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const data = await api.get('/syllabus-topics', {
          subject: selectedSubject,
          class_level: activeClass,
          board: activeBoard,
        });
        setTopics(data || []);
      } catch {
        setTopics([]);
      }
    };

    fetchTopics();
  }, [selectedSubject, activeClass, activeBoard]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(selected.type)) {
      error('Invalid File Type', 'Please upload a JPG, PNG, WEBP image or a PDF document.');
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      error('File Too Large', 'Maximum file size is 10MB.');
      return;
    }

    setFile(selected);
    if (selected.type.startsWith('image/')) {
      const url = URL.createObjectURL(selected);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFile(null);
    setFilePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() && !file) {
      warning('Input Required', 'Please enter a typed question or upload a question image/document.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(25);

    try {
      // If any academic details were missing and provided here, save them back to the user's profile
      if (hasMissingAcademicDetails) {
        try {
          await saveEducationProfile({
            board: activeBoard,
            class_level: activeClass,
            academic_year: educationProfile?.academic_year || '2026-27',
            preferred_language: activeLanguage,
            subjects: educationProfile?.subjects?.length ? educationProfile.subjects : [selectedSubject],
          });
        } catch (saveErr) {
          console.warn('Could not auto-persist profile update:', saveErr);
        }
      }

      const formData = new FormData();
      if (questionText.trim()) formData.append('question_text', questionText.trim());
      formData.append('subject', selectedSubject);
      formData.append('class_level', String(activeClass));
      formData.append('board', activeBoard);
      formData.append('language', activeLanguage);
      if (selectedTopicId) formData.append('topic_id', selectedTopicId);
      if (file) formData.append('file', file);

      setUploadProgress(50);
      const res = await api.post('/questions', formData);
      setUploadProgress(100);

      success('Doubt Analyzed! 🎯', 'Step-by-step verified solution generated.');
      navigate(`/questions/${res.question_id}`);
    } catch (err: any) {
      error('Analysis Failed', err.message || 'Could not analyze question. Please retry.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Page Title & Profile Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <HelpCircle className="w-6 h-6 text-brand-600" />
            Ask a Doubt
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Step-by-step solution, mathematical verification, concept gaps, and targeted practice.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold px-3 py-1.5 bg-brand-50 text-brand-700 rounded-xl border border-brand-200">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Class {activeClass} • {activeBoard}</span>
          <span className="text-slate-300">|</span>
          <Languages className="w-3.5 h-3.5" />
          <span>{activeLanguage}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-200/90 shadow-soft space-y-6">
        {/* Saved Academic Profile Context Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-brand-50/80 via-indigo-50/40 to-slate-50 rounded-2xl border border-brand-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-900">
                  Class {activeClass} • {activeBoard}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Academic Profile Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Explanations and steps calibrated for your curriculum in <span className="font-semibold text-slate-700">{activeLanguage}</span>.
              </p>
            </div>
          </div>
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline self-start sm:self-center shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Change in Profile</span>
          </Link>
        </div>

        {/* Missing Academic Details Alert (Only renders if any field was genuinely not saved) */}
        {hasMissingAcademicDetails && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Missing Academic Information</span>
            </div>
            <p className="text-xs text-amber-700">
              Please provide the missing details below once. We will automatically save them to your profile for all future sessions.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {isClassMissing && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Class Level *
                  </label>
                  <select
                    value={selectedClass}
                    onChange={e => setSelectedClass(Number(e.target.value))}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value={10}>Class 10</option>
                    <option value={11}>Class 11</option>
                    <option value={12}>Class 12</option>
                  </select>
                </div>
              )}
              {isBoardMissing && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Board *
                  </label>
                  <select
                    value={selectedBoard}
                    onChange={e => setSelectedBoard(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">CISCE (ICSE/ISC)</option>
                    <option value="Karnataka State Board">Karnataka State Board</option>
                    <option value="Other State/UT Board">Other State/UT Board</option>
                    <option value="NIOS">NIOS</option>
                  </select>
                </div>
              )}
              {isLanguageMissing && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Explanation Language *
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={e => setSelectedLanguage(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Kannada">Kannada</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Malayalam">Malayalam</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Question Subject Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Question Subject *
            </label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            >
              {combinedSubjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

        {/* Syllabus Topic Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Specific Syllabus Topic (Optional)
          </label>
          <select
            value={selectedTopicId}
            onChange={e => setSelectedTopicId(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          >
            <option value="">Auto-Detect Concept from Question Content</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>
                {t.chapter ? `${t.chapter}: ` : ''}{t.topic}
              </option>
            ))}
          </select>
        </div>
      </div>

        {/* Typed Question Box */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Question Text & Mathematical Expressions
            </label>
            <span className="text-[11px] text-slate-400">Supports equations, syntax, and word problems</span>
          </div>
          <textarea
            rows={4}
            value={questionText}
            onChange={e => setQuestionText(e.target.value)}
            disabled={isSubmitting}
            placeholder="Type your question here (e.g. 'Solve 2x + 5 = 15' or 'Explain Newton\'s second law with a numerical example')..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-sans"
          />
        </div>

        {/* File Upload & Preview */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Upload Question Image or PDF (Optional)
          </label>

          {!file ? (
            <div className="p-6 border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-2xl bg-slate-50/50 hover:bg-slate-50 text-center transition-all">
              <input
                type="file"
                id="file-upload"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-slate-800 block">
                  Click to upload or drag & drop question photo / PDF
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  JPG, PNG, WEBP, or PDF up to 10MB
                </span>
              </label>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden">
                {filePreview ? (
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <FileCheck className="w-7 h-7" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="file-upload-replace"
                  className="px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 rounded-xl cursor-pointer transition-colors"
                >
                  Replace
                  <input
                    type="file"
                    id="file-upload-replace"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={removeFile}
                  disabled={isSubmitting}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar when Submitting */}
        {isSubmitting && (
          <div className="space-y-1.5 p-4 bg-brand-50/70 rounded-2xl border border-brand-100">
            <div className="flex items-center justify-between text-xs font-bold text-brand-900">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600 animate-spin" />
                Analyzing academic question & generating step-by-step solution...
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-brand-200/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-sm rounded-2xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Analyzing Question & Generating Solution...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Get Step-by-Step Verified Solution</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
