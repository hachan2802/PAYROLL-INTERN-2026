/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Navbar } from '../components/layouts/Navbar';
import { LeftSidebar } from '../components/layouts/LeftSidebar';
import { UiSettingsModal } from '../components/UiSettingsModal';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';

// ── Root không dùng framer-motion để tránh layout thrashing trên shell layout ──
export function Root() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div 
      className="flex h-screen overflow-hidden font-sans text-foreground bg-background striped-pattern-sage"
    >
      {/* Mobile Sidebar Overlay — CSS transition thay vì framer-motion */}
      <div
        onClick={() => setIsMobileMenuOpen(false)}
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] lg:hidden transition-opacity duration-200
          ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Left Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-[70] lg:relative lg:z-50 transition-all duration-300 transform w-[80px] shrink-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          my-4 ml-4 rounded-3xl border border-border/20 bg-white/[0.03] backdrop-blur-[2px] flex flex-col`}
      >
        <LeftSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 flex flex-col overflow-hidden min-w-0 relative bg-transparent"
      >
        <div className="bg-transparent overflow-hidden mx-4 mt-4">
        <Navbar onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        </div>

        <main className="flex-1 flex flex-col min-h-0 relative">
          <ErrorBoundary>
            <div className="flex-1 flex flex-col min-h-0">
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>

        <UiSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        {/* Version / Update Indicator */}
        <div className="fixed bottom-6 right-8 z-[100] pointer-events-none">
          <div className="flex flex-col items-end opacity-20 hover:opacity-100 transition-opacity duration-500">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 font-mono">
              Build v1.2.4
            </span>
            <span className="text-[9px] font-bold text-foreground/30 font-mono mt-0.5">
              Updated: 2026-04-22 18:05
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
