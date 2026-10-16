import React, { useState } from 'react';
import { User, GraduationCap, Languages, BookOpen, Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { api } from '../lib/api.js';

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

export const ProfilePage: React.FC = () => {
  const { user, educationProfile, saveEducationProfile, refreshProfile } = useAuth();
  const { success, error } = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [board, setBoard] = useState(educationProfile?.board || 'CBSE');
  const [classLevel, setClassLevel] = useState<10 | 11 | 12>(educationProfile?.class_level || 10);
  const [academicYear, setAcademicYear] = useState(educationProfile?.academic_year || '2026-27');
  const [preferredLanguage, setPreferredLanguage] = useState(educationProfile?.preferred_language || 'English');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    educationProfile?.subjects || ['Mathematics', 'Science']
  );
  const [isSaving, setIsSaving] = useState(false);

  const toggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length === 1) {
        error('Subject Required', 'At least one subject must be active.');
        return;
      }
      setSelectedSubjects(prev => prev.filter(s => s !== sub));
    } else {
      setSelectedSubjects(prev => [...prev, sub]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (fullName.trim() !== user?.full_name) {
        await api.patch('/profile', { full_name: fullName.trim() });
      }

      await saveEducationProfile({
        board,
        class_level: classLevel,
        academic_year: academicYear,
        preferred_language: preferredLanguage,
        subjects: selectedSubjects,
      });

      await refreshProfile();
      success('Profile Updated! ✅', 'Your education settings have been updated.');
    } catch (err: any) {
      error('Update Failed', err.message || 'Could not update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <User className="w-6 h-6 text-brand-600" />
          My Student Profile
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your personal details, education board, class level, and curriculum subjects.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-6">
        {/* Personal Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Registered Email
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Education Profile Details */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Curriculum & Education Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Board
              </label>
              <select
                value={board}
                onChange={e => setBoard(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {BOARDS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Class Level
              </label>
              <select
                value={classLevel}
                onChange={e => setClassLevel(parseInt(e.target.value, 10) as 10 | 11 | 12)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {[10, 11, 12].map(c => (
                  <option key={c} value={c}>Class {c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Language
              </label>
              <select
                value={preferredLanguage}
                onChange={e => setPreferredLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Selected Subjects */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Enrolled Subjects</h3>
            <span className="text-xs text-brand-600 font-semibold">{selectedSubjects.length} selected</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {(AVAILABLE_SUBJECTS[classLevel] || []).map(sub => {
              const isSelected = selectedSubjects.includes(sub);
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => toggleSubject(sub)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-brand-50 border-brand-300 text-brand-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{sub}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3.5 px-6 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
