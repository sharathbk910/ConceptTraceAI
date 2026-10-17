import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  LayoutDashboard,
  User,
  HelpCircle,
  History,
  TrendingDown,
  BookOpenCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  GraduationCap,
  AlertTriangle,
  Library,
  LineChart,
  PieChart,
  CalendarDays,
  Target,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSidebarDrawer: React.FC<MobileSidebarDrawerProps> = ({ isOpen, onClose }) => {
  const { user, educationProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [progressOpen, setProgressOpen] = useState(
    location.pathname.startsWith('/progress')
  );

  if (!isOpen) return null;

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-brand-600 text-white shadow-sm'
        : 'text-slate-700 hover:bg-slate-100'
    }`;

  const subClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
      isActive ? 'text-brand-600 font-bold bg-brand-50' : 'text-slate-500 hover:text-slate-900'
    }`;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-80 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col p-4 z-10 animate-slide-in overflow-hidden">
        {/* Header (shrink-0) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">ConceptTrace AI</h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Class {educationProfile?.class_level || 10} • {educationProfile?.board || 'CBSE'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Links Container */}
        <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-1">
          <NavLink to="/home" onClick={onClose} className={itemClass}>
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Home Dashboard</span>
          </NavLink>

          <NavLink to="/syllabus" onClick={onClose} className={itemClass}>
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span>Official Syllabus</span>
          </NavLink>

          <NavLink to="/library" onClick={onClose} className={itemClass}>
            <Library className="w-4 h-4 shrink-0" />
            <span>Concept Library</span>
          </NavLink>

          <NavLink to="/mistakes" onClick={onClose} className={itemClass}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Review Mistakes</span>
          </NavLink>

          <NavLink to="/ask" onClick={onClose} className={itemClass}>
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>Ask a Doubt</span>
          </NavLink>

          <NavLink to="/practice" onClick={onClose} className={itemClass}>
            <BookOpenCheck className="w-4 h-4 shrink-0" />
            <span>Topic Practice & Mastery</span>
          </NavLink>

          <NavLink to="/weak-topics" onClick={onClose} className={itemClass}>
            <TrendingDown className="w-4 h-4 shrink-0" />
            <span>Weak Topics</span>
          </NavLink>

          <NavLink to="/history" onClick={onClose} className={itemClass}>
            <History className="w-4 h-4 shrink-0" />
            <span>Learning History</span>
          </NavLink>

          {/* Progress Submenu */}
          <div>
            <button
              onClick={() => setProgressOpen(!progressOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Progress Reports</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${progressOpen ? 'rotate-180' : ''}`} />
            </button>
            {progressOpen && (
              <div className="ml-7 pl-2.5 space-y-1 my-1 border-l-2 border-brand-100">
                <NavLink to="/progress" end onClick={onClose} className={subClass}>
                  <span>Overview</span>
                </NavLink>
                <NavLink to="/progress/graphs" onClick={onClose} className={subClass}>
                  <LineChart className="w-3.5 h-3.5" />
                  <span>Learning Graphs</span>
                </NavLink>
                <NavLink to="/progress/subjects" onClick={onClose} className={subClass}>
                  <PieChart className="w-3.5 h-3.5" />
                  <span>Subject Accuracy</span>
                </NavLink>
                <NavLink to="/progress/weak-topics" onClick={onClose} className={subClass}>
                  <Target className="w-3.5 h-3.5" />
                  <span>Weak Topics</span>
                </NavLink>
                <NavLink to="/progress/activity" onClick={onClose} className={subClass}>
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Study Activity</span>
                </NavLink>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 mt-2 space-y-1">
            <NavLink to="/profile" onClick={onClose} className={itemClass}>
              <User className="w-4 h-4 shrink-0" />
              <span>My Profile</span>
            </NavLink>

            <NavLink to="/settings" onClick={onClose} className={itemClass}>
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </NavLink>
          </div>
        </div>

        {/* Footer User Info & Logout (shrink-0) */}
        <div className="pt-3 border-t border-slate-100 shrink-0 space-y-2">
          <div className="px-2 py-1 flex items-center justify-between">
            <div className="overflow-hidden pr-2">
              <p className="text-xs font-bold text-slate-800 truncate">{user?.full_name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
