import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Globe2,
  BookOpen,
  Languages,
  CheckCircle2,
  ArrowRight,
  School,
  Sparkles,
  Info,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
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
} from '../../lib/educationBoards.js';

export const SetupProfilePage: React.FC = () => {
  const { user, educationProfile, saveEducationProfile } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  // 1. Country & System
  const [country, setCountry] = useState<CountryType>(
    (educationProfile?.country as CountryType) || 'India'
  );
  const [educationSystem, setEducationSystem] = useState<string>(
    educationProfile?.education_system || 'Indian National Boards'
  );

  // 2. State or UT (if applicable)
  const [selectedRegion, setSelectedRegion] = useState<string>(
    educationProfile?.state_or_ut || 'Karnataka'
  );

  // 3. Board
  const [board, setBoard] = useState<string>(
    educationProfile?.board || 'Central Board of Secondary Education (CBSE)'
  );

  // 4. Class / Grade
  const [classLevel, setClassLevel] = useState<10 | 11 | 12>(
    (educationProfile?.class_level as 10 | 11 | 12) || 10
  );

  // 5. Stream (for Class 11 and 12)
  const [stream, setStream] = useState<string>(
    educationProfile?.stream || 'Science (PCM - Physics, Chemistry, Mathematics)'
  );

  // 6. Academic Year & Language
  const [academicYear, setAcademicYear] = useState(educationProfile?.academic_year || '2026-27');
  const [preferredLanguage, setPreferredLanguage] = useState(
    educationProfile?.preferred_language || 'English'
  );

  // 7. Subjects
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    educationProfile?.subjects?.length
      ? educationProfile.subjects
      : ['Mathematics', 'Science']
  );

  const [useFallbackCatalogue, setUseFallbackCatalogue] = useState(false);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If student already completed onboarding, redirect to dashboard
  useEffect(() => {
    if (educationProfile?.onboarding_completed) {
      navigate('/home', { replace: true });
    }
  }, [educationProfile, navigate]);

  // Compute available boards based on selections
  const availableBoards = useMemo<BoardOption[]>(() => {
    if (country === 'India') {
      if (educationSystem === 'Indian National Boards') {
        return NATIONAL_BOARDS;
      }
      if (educationSystem === 'State Education Boards') {
        const stateMatch = INDIAN_STATES.find(s => s.name === selectedRegion);
        return stateMatch?.boards || [];
      }
      if (educationSystem === 'Union Territory Boards') {
        const utMatch = INDIAN_UTS.find(u => u.name === selectedRegion);
        return utMatch?.boards || [];
      }
      return NATIONAL_BOARDS;
    } else {
      return INTL_CURRICULA[educationSystem] || [];
    }
  }, [country, educationSystem, selectedRegion]);

  // Handle Class Change
  const handleClassChange = (newClass: 10 | 11 | 12) => {
    setClassLevel(newClass);
    if (newClass === 10) {
      setSelectedSubjects(CLASS_10_DEFAULT_SUBJECTS.slice(0, 4));
    } else {
      const defaultStreamSubjects = STREAM_SUBJECTS[stream] || [];
      setSelectedSubjects(defaultStreamSubjects.slice(0, 4));
    }
  };

  // Handle Board Change and enforce applicable classes
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

  // Handle Country Change
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

  // Handle System Change
  const handleSystemChange = (newSystem: string) => {
    setEducationSystem(newSystem);
    if (newSystem === 'State Education Boards') {
      const defaultState = INDIAN_STATES[10]; // Karnataka
      setSelectedRegion(defaultState.name);
      handleBoardChange(defaultState.boards[0].name, defaultState.boards);
    } else if (newSystem === 'Union Territory Boards') {
      const defaultUT = INDIAN_UTS[3]; // Delhi
      setSelectedRegion(defaultUT.name);
      handleBoardChange(defaultUT.boards[0].name, defaultUT.boards);
    } else if (newSystem === 'Indian National Boards') {
      handleBoardChange(NATIONAL_BOARDS[0].name, NATIONAL_BOARDS);
    } else {
      const boards = INTL_CURRICULA[newSystem] || [];
      if (boards.length > 0) handleBoardChange(boards[0].name, boards);
    }
  };

  // Handle Region Change
  const handleRegionChange = (newRegion: string) => {
    setSelectedRegion(newRegion);
    let boards: BoardOption[] = [];
    if (educationSystem === 'State Education Boards') {
      boards = INDIAN_STATES.find(s => s.name === newRegion)?.boards || [];
    } else {
      boards = INDIAN_UTS.find(u => u.name === newRegion)?.boards || [];
    }
    if (boards.length > 0) {
      handleBoardChange(boards[0].name, boards);
    }
  };

  // Handle Stream Change
  const handleStreamChange = (newStream: string) => {
    setStream(newStream);
    const recommended = STREAM_SUBJECTS[newStream] || [];
    setSelectedSubjects(recommended.slice(0, 4));
  };

  // Subject toggling
  const toggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length === 1) {
        error('Subject Required', 'Please select at least one subject to study.');
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
    if (useFallbackCatalogue) {
      return FALLBACK_GENERAL_SUBJECTS;
    }
    if (classLevel === 10) {
      return CLASS_10_DEFAULT_SUBJECTS;
    }
    return STREAM_SUBJECTS[stream] || FALLBACK_GENERAL_SUBJECTS;
  }, [classLevel, stream, useFallbackCatalogue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubjects.length === 0) {
      error('Subject Required', 'Please select at least one subject to study.');
      return;
    }

    setIsSubmitting(true);
    try {
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

      success('Profile Configured! 🚀', 'Your personalized education settings have been saved.');
      navigate('/home', { replace: true });
    } catch (err: any) {
      error('Setup Failed', err.message || 'Could not save education profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/30 to-indigo-50/20 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-500/20 mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Configure Your Education Profile
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">
            Welcome, <span className="font-semibold text-slate-800">{user?.full_name}</span>! Select your education board, grade, and subjects so ConceptTrace AI calibrates explanations to your exact syllabus.
          </p>
        </div>

        {/* Card Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200 p-6 md:p-8 space-y-7">
          {/* Section 1: Country & Curriculum System */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Globe2 className="w-4 h-4 text-brand-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Region & Educational System
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Education System
                </label>
                <select
                  value={educationSystem}
                  onChange={e => handleSystemChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                >
                  {country === 'India'
                    ? EDUCATION_SYSTEMS_INDIA.map(s => <option key={s} value={s}>{s}</option>)
                    : EDUCATION_SYSTEMS_INTL.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* State or UT selection if applicable */}
            {(educationSystem === 'State Education Boards' || educationSystem === 'Union Territory Boards') && (
              <div className="p-3.5 bg-brand-50/50 rounded-2xl border border-brand-100 space-y-1.5 animate-fade-in">
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

          {/* Section 2: Board or Examination Authority */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <School className="w-4 h-4 text-brand-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Board or Examination Authority
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Official Examination Board
              </label>
              <select
                value={board}
                onChange={e => handleBoardChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              >
                {availableBoards.map(b => (
                  <option key={b.id || b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
              {board.includes('CISCE') && (
                <p className="text-xs text-brand-600 mt-1.5 font-medium flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Note: ICSE is the CISCE Class 10 pathway; ISC is the CISCE Class 11-12 pathway.
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Class & Stream */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <GraduationCap className="w-4 h-4 text-brand-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Grade & Academic Stream
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Class / Grade Level
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
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Course / Stream (Class 11 & 12)
                  </label>
                  <select
                    value={stream}
                    onChange={e => handleStreamChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  >
                    {STREAMS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Academic Year & Preferred Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Preferred Explanation Language
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

          {/* Section 5: Dynamic Subjects */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  4. Selected Subjects ({selectedSubjects.length})
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

            <p className="text-xs text-slate-500">
              Select the subjects you are studying. Explanations, doubt verification, and practice sessions will align with these topics.
            </p>

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

            {/* Custom Subject Addition */}
            <div className="pt-2 flex gap-2">
              <input
                type="text"
                value={customSubjectInput}
                onChange={e => setCustomSubjectInput(e.target.value)}
                placeholder="Add other subject or elective..."
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

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Configuring Curriculum...</span>
              ) : (
                <>
                  <span>Save Profile & Enter Dashboard</span>
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
