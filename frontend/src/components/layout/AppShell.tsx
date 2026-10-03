import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { NotificationDrawer } from './NotificationDrawer';
import { Zap } from 'lucide-react';

export const AppShell: React.FC = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)] text-[var(--text-primary)]">
      {/* Top App Bar */}
      <TopNavbar
        onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
        onToggleMobileNav={() => setIsMobileNavOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Desktop Sidebar */}
        <Sidebar isCollapsed={isSidebarCollapsed} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-12 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Drawer Navigation & Bottom Navigation */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Global Notification Drawer */}
      <NotificationDrawer />

      {/* Enterprise Sub-Footer */}
      <footer className="hidden lg:flex items-center justify-between px-6 py-2.5 bg-white border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[var(--brand-950)] flex items-center justify-center text-white">
            <Zap className="w-2.5 h-2.5 text-[var(--brand-300)]" />
          </div>
          <span className="font-bold text-[var(--brand-950)]">FinFlow AI Orchestrator</span>
          <span className="text-[var(--border-strong)]">•</span>
          <span>Zero-Hallucination Policy Engine & SHAP Explainability</span>
        </div>
        <div className="flex items-center gap-3">
          <span>MindCraft Hackathon 2026</span>
          <span className="text-[var(--border-strong)]">•</span>
          <span className="font-semibold text-[var(--brand-700)]">Team RAY</span>
        </div>
      </footer>
    </div>
  );
};
