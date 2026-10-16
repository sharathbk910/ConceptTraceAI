import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavbar } from './TopNavbar.js';
import { Sidebar } from './Sidebar.js';
import { MobileSidebarDrawer } from './MobileSidebarDrawer.js';
import { useStudyTracker } from '../../hooks/useStudyTracker.js';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Activate continuous verified study time tracking
  useStudyTracker();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <TopNavbar onMobileMenuToggle={() => setMobileMenuOpen(true)} />

      <div className="flex flex-1">
        <Sidebar />
        <MobileSidebarDrawer
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
