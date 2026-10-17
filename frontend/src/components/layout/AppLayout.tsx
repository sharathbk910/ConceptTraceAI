import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavbar } from './TopNavbar.js';
import { Sidebar } from './Sidebar.js';
import { MobileSidebarDrawer } from './MobileSidebarDrawer.js';
import { MobileBottomNav } from './MobileBottomNav.js';
import { useStudyTracker } from '../../hooks/useStudyTracker.js';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Activate continuous verified study time tracking
  useStudyTracker();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col antialiased">
      <TopNavbar onMobileMenuToggle={() => setMobileMenuOpen(true)} />

      <div className="flex flex-1">
        <Sidebar />
        <MobileSidebarDrawer
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl w-full mx-auto overflow-x-hidden pb-20 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <MobileBottomNav onMenuClick={() => setMobileMenuOpen(true)} />
    </div>
  );
};
