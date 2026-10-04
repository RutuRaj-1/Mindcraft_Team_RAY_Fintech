import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TopNavbar } from './TopNavbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { NotificationDrawer } from './NotificationDrawer';
import { Zap, ShieldCheck, ArrowLeft, ExternalLink } from 'lucide-react';

export const AppShell: React.FC = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { adminEmulatedRole, persona, exitAdminEmulation } = useAuth();
  const navigate = useNavigate();

  const handleReturnToAdmin = () => {
    exitAdminEmulation();
    navigate('/admin');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)] text-[var(--text-primary)]">
      {/* Master Admin Explainer Mode Sticky Banner */}
      {adminEmulatedRole && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-700 text-white px-4 py-2 shadow-lg flex items-center justify-between border-b-2 border-black/30 animate-fadeInDown">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/40 text-[10px] font-black uppercase tracking-wider border border-white/20 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              Master Admin Explainer Mode
            </span>
            <span className="text-xs font-medium truncate">
              Currently presenting as{' '}
              <strong className="font-extrabold text-white">{persona.name}</strong> ({persona.title} ·{' '}
              <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded text-[11px] font-bold">
                {adminEmulatedRole}
              </span>
              )
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleReturnToAdmin}
              className="flex items-center gap-1.5 px-3 py-1 bg-white text-zinc-950 hover:bg-amber-50 active:scale-95 font-black text-xs rounded-xl shadow-[2px_2px_0px_#000] border-2 border-black transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Admin Hub</span>
            </button>
          </div>
        </div>
      )}

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
