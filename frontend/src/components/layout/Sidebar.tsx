import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Compass, FilePlus, GitCommit, FileText, Award,
  Users, ShieldAlert, Cpu, Sparkles, Home, ChevronRight, CheckCircle2, RotateCcw
} from 'lucide-react';


interface SidebarProps {
  isCollapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false }) => {
  const { activeJourneyId, role } = useAuth();

  const navSections = [
    {
      title: 'SME Journey',
      roles: ['CUSTOMER', 'RM', 'RISK_OFFICER', 'ADMIN'],
      items: [
        { label: 'Customer Portal', path: '/customer', icon: <Home className="w-4 h-4" /> },
        { label: 'Apply for Working Capital', path: '/customer/apply', icon: <FilePlus className="w-4 h-4" /> },
        { label: 'Live Journey State', path: `/customer/journey/${activeJourneyId}`, icon: <GitCommit className="w-4 h-4" /> },
        { label: 'Evidence & OCR Ledger', path: `/customer/documents/${activeJourneyId}`, icon: <FileText className="w-4 h-4" /> },
        { label: 'Decision & Counterfactual', path: `/customer/decision/${activeJourneyId}`, icon: <Award className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Loan Officer (RM)',
      roles: ['RM', 'ADMIN', 'RISK_OFFICER'],
      items: [
        { label: 'Underwriting Queue', path: '/rm', icon: <Users className="w-4 h-4" /> },
        { label: 'Case Reconciliation', path: `/rm/cases/${activeJourneyId}`, icon: <CheckCircle2 className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Risk & Compliance',
      roles: ['RISK_OFFICER', 'ADMIN', 'RM', 'CUSTOMER'],
      items: [
        { label: 'Risk & Trust Console', path: '/risk', icon: <ShieldAlert className="w-4 h-4" /> },
        { label: 'Decision Replay', path: `/risk/replay/${activeJourneyId}`, icon: <RotateCcw className="w-4 h-4" /> },
        { label: 'Case Audit & Override', path: `/risk/cases/${activeJourneyId}`, icon: <Compass className="w-4 h-4" /> },
      ],
    },

    {
      title: 'System & Demo',
      roles: ['ADMIN', 'RISK_OFFICER', 'RM', 'CUSTOMER'],
      items: [
        { label: 'System Observability', path: '/admin', icon: <Cpu className="w-4 h-4" /> },
        { label: 'Hackathon Benchmarks', path: '/demo', icon: <Sparkles className="w-4 h-4" /> },
      ],
    },
  ];

  return (
    <aside
      className={`hidden lg:flex flex-col bg-white border-r-2 border-[var(--brand-950)] shrink-0 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] px-3 mb-2">
                {section.title}
              </p>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all select-none ${
                    isActive
                      ? 'bg-[var(--brand-50)] text-[var(--brand-950)] border-1.5 border-[var(--brand-950)] font-bold shadow-[2px_2px_0px_#0A1F20]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--brand-950)] border border-transparent'
                  }`
                }
                title={item.label}
              >
                <span className="shrink-0 text-[var(--brand-700)]">{item.icon}</span>
                {!isCollapsed && (
                  <span className="truncate flex-1">{item.label}</span>
                )}
                {!isCollapsed && (
                  <ChevronRight className="w-3 h-3 text-[var(--border-strong)] shrink-0" />
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* Footer Pill */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-subtle)]">
          <div className="p-2.5 rounded-xl bg-white border border-[var(--border)] text-[10px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)] font-medium">Session Case:</span>
              <span className="font-mono font-bold text-[var(--brand-900)] truncate max-w-[100px]">
                {activeJourneyId}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)] font-medium">Role Access:</span>
              <span className="font-bold text-[var(--fin-green)]">{role}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
