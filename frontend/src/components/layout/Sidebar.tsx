import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  HelpCircle,
  History,
  TrendingDown,
  BookOpenCheck,
  BarChart3,
  ChevronDown,
  Settings,
  LogOut,
  LineChart,
  PieChart,
  CalendarDays,
  Target,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { ConfirmDialog } from '../common/ConfirmDialog.js';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, educationProfile, logout } = useAuth();

  const [progressOpen, setProgressOpen] = useState(
    location.pathname.startsWith('/progress')
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
      isActive
        ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  const subItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
      isActive
        ? 'text-brand-600 font-semibold bg-brand-50'
        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
    }`;

  return (
    <aside className="hidden lg:flex flex-col w-64 h-[calc(100vh-4rem)] bg-white border-r border-slate-200/80 p-4 sticky top-16 select-none justify-between">
      {/* Primary Navigation Links */}
      <div className="space-y-1">
        <NavLink to="/home" className={navItemClass}>
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>Home Dashboard</span>
        </NavLink>

        <NavLink to="/ask" className={navItemClass}>
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Ask a Doubt</span>
        </NavLink>

        <NavLink to="/practice" className={navItemClass}>
          <BookOpenCheck className="w-4 h-4 shrink-0" />
          <span>Practice Questions</span>
        </NavLink>

        <NavLink to="/weak-topics" className={navItemClass}>
          <TrendingDown className="w-4 h-4 shrink-0" />
          <span>Weak Topics Analysis</span>
        </NavLink>

        <NavLink to="/history" className={navItemClass}>
          <History className="w-4 h-4 shrink-0" />
          <span>Learning History</span>
        </NavLink>

        {/* Expandable Progress Report Submenu */}
        <div className="pt-1">
          <button
            onClick={() => setProgressOpen(!progressOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
              location.pathname.startsWith('/progress')
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Progress Reports</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                progressOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {progressOpen && (
            <div className="ml-7 pl-3 my-1 space-y-1 border-l-2 border-brand-100">
              <NavLink to="/progress" end className={subItemClass}>
                <span>Overview</span>
              </NavLink>
              <NavLink to="/progress/graphs" className={subItemClass}>
                <LineChart className="w-3.5 h-3.5" />
                <span>Learning Graphs</span>
              </NavLink>
              <NavLink to="/progress/subjects" className={subItemClass}>
                <PieChart className="w-3.5 h-3.5" />
                <span>Subject Accuracy</span>
              </NavLink>
              <NavLink to="/progress/weak-topics" className={subItemClass}>
                <Target className="w-3.5 h-3.5" />
                <span>Weak Topics</span>
              </NavLink>
              <NavLink to="/progress/activity" className={subItemClass}>
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Study Activity</span>
              </NavLink>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 mt-2">
          <NavLink to="/profile" className={navItemClass}>
            <User className="w-4 h-4 shrink-0" />
            <span>My Profile</span>
          </NavLink>

          <NavLink to="/settings" className={navItemClass}>
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </NavLink>
        </div>
      </div>

      {/* Bottom Profile Badge & Logout */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-800 truncate">{user?.full_name}</p>
            <p className="text-[10px] text-slate-500 font-medium truncate">
              Class {educationProfile?.class_level || 10} • {educationProfile?.board || 'CBSE'}
            </p>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Log Out"
        message="Are you sure you want to end your learning session?"
        confirmText="Log Out"
        isDestructive={true}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
          navigate('/login');
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </aside>
  );
};
