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
  const [progressOpen, setProgressOpen] = useState(true);

  if (!isOpen) return null;

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-brand-600 text-white'
        : 'text-slate-700 hover:bg-slate-100'
    }`;

  const subClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2 text-xs rounded-lg font-medium transition-colors ${
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
      <div className="relative w-72 max-w-[80vw] h-full bg-white shadow-2xl flex flex-col justify-between p-4 z-10 animate-slide-in">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="font-bold text-slate-900">ConceptTrace AI</h3>
              <p className="text-[11px] text-slate-400">Class {educationProfile?.class_level || 10} • {educationProfile?.board || 'CBSE'}</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Links */}
          <div className="space-y-1">
            <NavLink to="/home" onClick={onClose} className={itemClass}>
              <LayoutDashboard className="w-4 h-4" />
              <span>Home Dashboard</span>
            </NavLink>

            <NavLink to="/ask" onClick={onClose} className={itemClass}>
              <HelpCircle className="w-4 h-4" />
              <span>Ask a Doubt</span>
            </NavLink>

            <NavLink to="/practice" onClick={onClose} className={itemClass}>
              <BookOpenCheck className="w-4 h-4" />
              <span>Practice Questions</span>
            </NavLink>

            <NavLink to="/weak-topics" onClick={onClose} className={itemClass}>
              <TrendingDown className="w-4 h-4" />
              <span>Weak Topics</span>
            </NavLink>

            <NavLink to="/history" onClick={onClose} className={itemClass}>
              <History className="w-4 h-4" />
              <span>Learning History</span>
            </NavLink>

            <div>
              <button
                onClick={() => setProgressOpen(!progressOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-4 h-4" />
                  <span>Progress Reports</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${progressOpen ? 'rotate-180' : ''}`} />
              </button>
              {progressOpen && (
                <div className="ml-8 pl-2 space-y-1 my-1 border-l-2 border-brand-100">
                  <NavLink to="/progress" end onClick={onClose} className={subClass}>Overview</NavLink>
                  <NavLink to="/progress/graphs" onClick={onClose} className={subClass}>Learning Graphs</NavLink>
                  <NavLink to="/progress/subjects" onClick={onClose} className={subClass}>Subject Accuracy</NavLink>
                  <NavLink to="/progress/weak-topics" onClick={onClose} className={subClass}>Weak Topics</NavLink>
                  <NavLink to="/progress/activity" onClick={onClose} className={subClass}>Study Activity</NavLink>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 mt-2">
              <NavLink to="/profile" onClick={onClose} className={itemClass}>
                <User className="w-4 h-4" />
                <span>My Profile</span>
              </NavLink>

              <NavLink to="/settings" onClick={onClose} className={itemClass}>
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </NavLink>
            </div>
          </div>
        </div>

        {/* Footer Logout */}
        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={() => {
              onClose();
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
