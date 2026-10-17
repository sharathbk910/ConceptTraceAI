import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  GraduationCap,
  Languages,
  BookOpen,
  Save,
  CheckCircle2,
  Globe2,
  School,
  Info,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { api } from '../lib/api.js';
import {
  COUNTRIES,
  CountryType,
  EDUCATION_SYSTEMS_INDIA,
  EDUCATION_SYSTEMS_INTL,
  NATIONAL_BOARDS,
  INTL_CURRICULA,
  INDIAN_STATES,
  INDIAN_UTS,
  STREAMS,
  LANGUAGES,
  STREAM_SUBJECTS,
  CLASS_10_DEFAULT_SUBJECTS,
  FALLBACK_GENERAL_SUBJECTS,
  BoardOption,
} from '../lib/educationBoards.js';

export const ProfilePage: React.FC = () => {
  const { user, educationProfile, saveEducationProfile, refreshProfile } = useAuth();
  const { success, error } = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');

  // 1. Country & System
  const [country, setCountry] = useState<CountryType>(
    (educationProfile?.country as CountryType) || 'India'
  );
  const [educationSystem, setEducationSystem] = useState<string>(
    educationProfile?.education_system || 'Indian National Boards'
  );

  // 2. Region / State / UT
  const [selectedRegion, setSelectedRegion] = useState<string>(
    educationProfile?.state_or_ut || 'Karnataka'
  );

  // 3. Board
  const [board, setBoard] = useState(
    educationProfile?.board || 'Central Board of Secondary Education (CBSE)'
  );

  // 4. Class & Stream
  const [classLevel, setClassLevel] = useState<10 | 11 | 12>(
    (educationProfile?.class_level as 10 | 11 | 12) || 10
  );
  const [stream, setStream] = useState<string>(
    educationProfile?.stream || 'Science (PCM - Physics, Chemistry, Mathematics)'
  );

  // 5. Academic Year & Language
  const [academicYear, setAcademicYear] = useState(educationProfile?.academic_year || '2026-27');
  const [preferredLanguage, setPreferredLanguage] = useState(
    educationProfile?.preferred_language || 'English'
  );

  // 6. Subjects
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    educationProfile?.subjects || ['Mathematics', 'Science']
  );

  const [useFallbackCatalogue, setUseFallbackCatalogue] = useState(false);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
    if (educationProfile) {
      if (educationProfile.country) setCountry(educationProfile.country as CountryType);
      if (educationProfile.education_system) setEducationSystem(educationProfile.education_system);
      if (educationProfile.state_or_ut) setSelectedRegion(educationProfile.state_or_ut);
      if (educationProfile.board) setBoard(educationProfile.board);
      if (educationProfile.class_level) setClassLevel(educationProfile.class_level as 10 | 11 | 12);
      if (educationProfile.stream) setStream(educationProfile.stream);
      if (educationProfile.academic_year) setAcademicYear(educationProfile.academic_year);
      if (educationProfile.preferred_language) setPreferredLanguage(educationProfile.preferred_language);
      if (educationProfile.subjects) setSelectedSubjects(educationProfile.subjects);
    }
  }, [user, educationProfile]);

  const availableBoards = useMemo<BoardOption[]>(() => {
    if (country === 'India') {
      if (educationSystem === 'Indian National Boards') {
        return NATIONAL_BOARDS;
      }
      if (educationSystem === 'State Education Boards') {
        return INDIAN_STATES.find(s => s.name === selectedRegion)?.boards || [];
      }
      if (educationSystem === 'Union Territory Boards') {
        return INDIAN_UTS.find(u => u.name === selectedRegion)?.boards || [];
      }
      return NATIONAL_BOARDS;
    } else {
      return INTL_CURRICULA[educationSystem] || [];
    }
  }, [country, educationSystem, selectedRegion]);

  const handleClassChange = (newClass: 10 | 11 | 12) => {
    setClassLevel(newClass);
    if (newClass === 10) {
      setSelectedSubjects(CLASS_10_DEFAULT_SUBJECTS.slice(0, 4));
    } else {
      const defaultStreamSubjects = STREAM_SUBJECTS[stream] || [];
      setSelectedSubjects(defaultStreamSubjects.slice(0, 4));
    }
  };

  const handleBoardChange = (newBoardName: string, boardList = availableBoards) => {
    setBoard(newBoardName);
    const selectedBoardObj = boardList.find(b => b.name === newBoardName);
    if (selectedBoardObj?.applicableClasses && selectedBoardObj.applicableClasses.length > 0) {
      if (!selectedBoardObj.applicableClasses.includes(classLevel)) {
        const fallbackClass = selectedBoardObj.applicableClasses[0];
        handleClassChange(fallbackClass);
      }
    }
  };

  const handleCountryChange = (newCountry: CountryType) => {
    setCountry(newCountry);
    if (newCountry === 'India') {
      setEducationSystem('Indian National Boards');
      handleBoardChange(NATIONAL_BOARDS[0].name, NATIONAL_BOARDS);
    } else {
      const intlSys = 'Cambridge International (CAIE)';
      setEducationSystem(intlSys);
      const boards = INTL_CURRICULA[intlSys] || [];
      handleBoardChange(boards[0]?.name || 'Cambridge International', boards);
    }
  };

  const handleSystemChange = (newSystem: string) => {
    setEducationSystem(newSystem);
    if (newSystem === 'State Education Boards') {
      const defaultState = INDIAN_STATES[10];
      setSelectedRegion(defaultState.name);
      handleBoardChange(defaultState.boards[0].name, defaultState.boards);
    } else if (newSystem === 'Union Territory Boards') {
      const defaultUT = INDIAN_UTS[3];
      setSelectedRegion(defaultUT.name);
      handleBoardChange(defaultUT.boards[0].name, defaultUT.boards);
    } else if (newSystem === 'Indian National Boards') {
      handleBoardChange(NATIONAL_BOARDS[0].name, NATIONAL_BOARDS);
    } else {
      const boards = INTL_CURRICULA[newSystem] || [];
      if (boards.length > 0) handleBoardChange(boards[0].name, boards);
    }
  };

  const handleRegionChange = (newRegion: string) => {
    setSelectedRegion(newRegion);
    let boards: BoardOption[] = [];
    if (educationSystem === 'State Education Boards') {
      boards = INDIAN_STATES.find(s => s.name === newRegion)?.boards || [];
    } else {
      boards = INDIAN_UTS.find(u => u.name === newRegion)?.boards || [];
    }
    if (boards.length > 0) handleBoardChange(boards[0].name, boards);
  };

  const handleStreamChange = (newStream: string) => {
    setStream(newStream);
    const recommended = STREAM_SUBJECTS[newStream] || [];
    setSelectedSubjects(recommended.slice(0, 4));
  };

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

  const handleAddCustomSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customSubjectInput.trim();
    if (!trimmed) return;
    if (selectedSubjects.includes(trimmed)) {
      error('Already Added', `${trimmed} is already in your selected subjects.`);
      return;
    }
    setSelectedSubjects(prev => [...prev, trimmed]);
    setCustomSubjectInput('');
  };

  const currentAvailableSubjects = useMemo(() => {
    if (useFallbackCatalogue) return FALLBACK_GENERAL_SUBJECTS;
    if (classLevel === 10) return CLASS_10_DEFAULT_SUBJECTS;
    return STREAM_SUBJECTS[stream] || FALLBACK_GENERAL_SUBJECTS;
  }, [classLevel, stream, useFallbackCatalogue]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubjects.length === 0) {
      error('Subject Required', 'Please select at least one subject to study.');
      return;
    }

    setIsSaving(true);
    try {
      if (fullName.trim() !== user?.full_name) {
        await api.patch('/profile', { full_name: fullName.trim() });
      }

      await saveEducationProfile({
        country,
        education_system: educationSystem,
        state_or_ut: (educationSystem === 'State Education Boards' || educationSystem === 'Union Territory Boards') ? selectedRegion : null,
        board,
        class_level: classLevel,
        stream: classLevel !== 10 ? stream : null,
        academic_year: academicYear,
        preferred_language: preferredLanguage,
        subjects: selectedSubjects,
      });

      await refreshProfile();
      success('Profile Updated! ✅', 'Your education settings have been saved.');
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

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-200/90 shadow-soft space-y-7">
        {/* Section 1: Personal Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Personal Information
          </h3>
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
                Registered Email (Verified)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Country & Education System */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Globe2 className="w-4 h-4 text-brand-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Educational System & Region
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Country
              </label>
              <div className="grid grid-cols-2 gap-2">
                {COUNTRIES.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCountryChange(c)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      country === c
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {c === 'India' ? '🇮🇳 India' : '🌐 International'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Education System
              </label>
              <select
                value={educationSystem}
                onChange={e => handleSystemChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {country === 'India'
                  ? EDUCATION_SYSTEMS_INDIA.map(s => <option key={s} value={s}>{s}</option>)
                  : EDUCATION_SYSTEMS_INTL.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {(educationSystem === 'State Education Boards' || educationSystem === 'Union Territory Boards') && (
            <div className="p-3 bg-brand-50/50 rounded-2xl border border-brand-100 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {educationSystem === 'State Education Boards' ? 'Select Indian State (28 States)' : 'Select Union Territory (8 UTs)'}
              </label>
              <select
                value={selectedRegion}
                onChange={e => handleRegionChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {educationSystem === 'State Education Boards'
                  ? INDIAN_STATES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)
                  : INDIAN_UTS.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Section 3: Board Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <School className="w-4 h-4 text-brand-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Examination Board
            </h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Official Examination Board
            </label>
            <select
              value={board}
              onChange={e => handleBoardChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              {availableBoards.map(b => (
                <option key={b.id || b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
            {board.includes('CISCE') && (
              <p className="text-xs text-brand-600 mt-1.5 font-medium flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Note: ICSE applies to Class 10; ISC applies to Class 11-12.
              </p>
            )}
          </div>
        </div>

        {/* Section 4: Class & Stream */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <GraduationCap className="w-4 h-4 text-brand-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Class & Stream
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Class / Grade
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[10, 11, 12].map(c => {
                  const selectedBoardObj = availableBoards.find(b => b.name === board);
                  const isApplicable =
                    !selectedBoardObj?.applicableClasses ||
                    selectedBoardObj.applicableClasses.includes(c as 10 | 11 | 12);
                  return (
                    <button
                      key={c}
                      type="button"
                      disabled={!isApplicable}
                      onClick={() => handleClassChange(c as 10 | 11 | 12)}
                      className={`py-2 px-3 rounded-xl text-sm font-bold border transition-all ${
                        !isApplicable
                          ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                          : classLevel === c
                          ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Class {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {classLevel !== 10 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Stream (Class 11/12)
                </label>
                <select
                  value={stream}
                  onChange={e => handleStreamChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  {STREAMS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Academic Year & Language */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Academic Year
            </label>
            <input
              type="text"
              required
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Preferred Language
            </label>
            <select
              value={preferredLanguage}
              onChange={e => setPreferredLanguage(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              {LANGUAGES.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 6: Subjects */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Enrolled Subjects ({selectedSubjects.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setUseFallbackCatalogue(!useFallbackCatalogue)}
              className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
            >
              {useFallbackCatalogue ? 'Show Syllabus Suggestions' : 'Show General Fallback Catalogue'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {currentAvailableSubjects.map(sub => {
              const isSelected = selectedSubjects.includes(sub);
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => toggleSubject(sub)}
                  className={`py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-brand-50 text-brand-700 border-2 border-brand-500 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" /> : null}
                  <span>{sub}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex gap-2">
            <input
              type="text"
              value={customSubjectInput}
              onChange={e => setCustomSubjectInput(e.target.value)}
              placeholder="Add other elective subject..."
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
            <button
              type="button"
              onClick={handleAddCustomSubject}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl"
            >
              + Add Subject
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="py-3 px-6 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Profile Changes...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
