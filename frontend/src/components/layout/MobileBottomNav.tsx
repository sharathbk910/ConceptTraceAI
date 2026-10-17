import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  HelpCircle,
  BookOpenCheck,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const { user } = useAuth();

  const navItemClass = (path: string) => {
    const isActive = location.pathname.startsWith(path);
    return `flex flex-col items-center justify-center flex-1 py-1.5 px-1 text-[10px] font-bold transition-all duration-150 ${
      isActive
        ? 'text-brand-600 scale-105'
        : 'text-slate-500 hover:text-slate-800'
    }`;
  };

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 pt-1 pb-[calc(0.35rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around select-none"
    >
      {/* Home */}
      <NavLink to="/home" className={() => navItemClass('/home')}>
        <LayoutDashboard className="w-5 h-5 mb-0.5" />
        <span className="truncate">Home</span>
      </NavLink>

      {/* Official Syllabus */}
      <NavLink to="/syllabus" className={() => navItemClass('/syllabus')}>
        <GraduationCap className="w-5 h-5 mb-0.5" />
        <span className="truncate">Syllabus</span>
      </NavLink>

      {/* Prominent Ask Doubt CTA */}
      <NavLink
        to="/ask"
        className="flex flex-col items-center justify-center flex-1 -mt-4 group"
      >
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/30 flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95 border-2 border-white">
          <HelpCircle className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-extrabold text-brand-700 mt-0.5 truncate">
          Ask Doubt
        </span>
      </NavLink>

      {/* Practice */}
      <NavLink to="/practice" className={() => navItemClass('/practice')}>
        <BookOpenCheck className="w-5 h-5 mb-0.5" />
        <span className="truncate">Practice</span>
      </NavLink>

      {/* Menu / Drawer Toggle */}
      <button
        type="button"
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center flex-1 py-1.5 px-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <div className="relative">
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-500" />
        </div>
        <span className="truncate">More</span>
      </button>
    </nav>
  );
};
