import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, GraduationCap, Languages, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';

const BOARDS = [
  'CBSE',
  'CISCE (ICSE/ISC)',
  'Karnataka State Board',
  'Other State/UT Board',
  'NIOS',
  'Other',
];

const LANGUAGES = [
  'English',
  'Kannada',
  'Hindi',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Other',
];

const AVAILABLE_SUBJECTS: Record<number, string[]> = {
  10: ['Mathematics', 'Science', 'Social Science', 'English', 'Computer Applications'],
  11: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science', 'English Core'],
  12: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science', 'English Core'],
};

export const SetupProfilePage: React.FC = () => {
  const { user, saveEducationProfile } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [board, setBoard] = useState('CBSE');
  const [classLevel, setClassLevel] = useState<10 | 11 | 12>(10);
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Mathematics', 'Science']);
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClassChange = (newClass: 10 | 11 | 12) => {
    setClassLevel(newClass);
    // Reset selected subjects to default for that class
    if (newClass === 10) {
      setSelectedSubjects(['Mathematics', 'Science']);
    } else {
      setSelectedSubjects(['Physics', 'Chemistry', 'Mathematics']);
    }
  };

  const toggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length === 1) {
        error('Subject Required', 'Please select at least one subject.');
        return;
      }
      setSelectedSubjects(prev => prev.filter(s => s !== sub));
    } else {
      setSelectedSubjects(prev => [...prev, sub]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubjects.length === 0) {
      error('Subject Required', 'Please select at least one subject to study.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveEducationProfile({
        board,
        class_level: classLevel,
        academic_year: academicYear,
        preferred_language: preferredLanguage,
        subjects: selectedSubjects,
        syllabus_file_path: syllabusFile ? syllabusFile.name : null,
      });

      success('Profile Configured! 🚀', 'Your personalized curriculum is active.');
      navigate('/home', { replace: true });
    } catch (err: any) {
      error('Setup Failed', err.message || 'Could not save education profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/30 to-indigo-50/20 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-500/20 mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Configure Your Education Profile
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Welcome, <span className="font-semibold text-slate-800">{user?.full_name}</span>! Tell us your board and class so ConceptTrace AI calibrates explanations and practice questions to your exact syllabus.
          </p>
        </div>

        {/* Card Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200 p-6 md:p-8 space-y-6">
          {/* Step 1: Board & Class */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Education Board
              </label>
              <select
                value={board}
                onChange={e => setBoard(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              >
                {BOARDS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Class / Grade
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[10, 11, 12].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleClassChange(c as 10 | 11 | 12)}
                    className={`py-2 px-3 rounded-xl text-sm font-bold border transition-all ${
                      classLevel === c
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Class {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Academic Year & Preferred Language */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Academic Year
              </label>
              <input
                type="text"
                required
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                placeholder="2026-27"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Preferred Explanation Language
              </label>
              <select
                value={preferredLanguage}
                onChange={e => setPreferredLanguage(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 2: Subject Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Subjects for Class {classLevel}
              </label>
              <span className="text-xs text-brand-600 font-semibold">
                {selectedSubjects.length} selected
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(AVAILABLE_SUBJECTS[classLevel] || []).map(subject => {
                const isSelected = selectedSubjects.includes(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleSubject(subject)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-brand-50 border-brand-300 text-brand-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>{subject}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Optional Syllabus Document Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Optional Syllabus Document (PDF)
            </label>
            <div className="p-4 border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-2xl bg-slate-50/60 text-center transition-all">
              <input
                type="file"
                id="syllabus-file"
                accept=".pdf"
                onChange={e => setSyllabusFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="syllabus-file" className="cursor-pointer block">
                <FileText className="w-8 h-8 text-brand-500 mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-700 block">
                  {syllabusFile ? syllabusFile.name : 'Click to attach your school or board syllabus PDF'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Helps prioritize specific school curriculum units (Max 10MB)
                </span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Saving Education Profile...</span>
              ) : (
                <>
                  <span>Complete Setup & Enter Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
