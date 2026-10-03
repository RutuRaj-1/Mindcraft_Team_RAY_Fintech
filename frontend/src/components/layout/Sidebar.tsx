import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Compass, FilePlus, GitCommit, FileText, Award,
  Users, ShieldAlert, Cpu, Sparkles, Home, ChevronRight, CheckCircle2, RotateCcw,
  Building2, Scale, ClipboardCheck, Activity
} from 'lucide-react';


interface SidebarProps {
  isCollapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false }) => {
  const { activeJourneyId, role } = useAuth();

  const navSections = [
    {
      title: 'MSME Customer Journey',
      roles: ['CUSTOMER'],
      items: [
        { label: 'Customer Portal', path: '/customer', icon: <Home className="w-4 h-4" /> },
        { label: 'Apply for Working Capital', path: '/customer/apply', icon: <FilePlus className="w-4 h-4" /> },
        { label: 'Live Journey State', path: `/customer/journey/${activeJourneyId}`, icon: <GitCommit className="w-4 h-4" /> },
        { label: 'Evidence & OCR Ledger', path: `/customer/documents/${activeJourneyId}`, icon: <FileText className="w-4 h-4" /> },
        { label: 'Decision & Counterfactual', path: `/customer/decision/${activeJourneyId}`, icon: <Award className="w-4 h-4" /> },
      ],
    },
    {
      title: 'First-Line RM Desk',
      roles: ['RM'],
      items: [
        { label: 'RM Pipeline Queue', path: '/rm', icon: <Users className="w-4 h-4" /> },
        { label: 'Case Intake & Assist', path: `/rm/cases/${activeJourneyId}`, icon: <CheckCircle2 className="w-4 h-4" /> },
        { label: 'Audit Timeline', path: `/risk/replay/${activeJourneyId}`, icon: <RotateCcw className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Operations Management',
      roles: ['RM_SUPERVISOR'],
      items: [
        { label: 'Operations Command', path: '/operations', icon: <Building2 className="w-4 h-4" /> },
        { label: 'RM Underwriting Queue', path: '/rm', icon: <Users className="w-4 h-4" /> },
        { label: 'Case SLA & Escalation', path: `/rm/cases/${activeJourneyId}`, icon: <CheckCircle2 className="w-4 h-4" /> },
        { label: 'Decision Replay', path: `/risk/replay/${activeJourneyId}`, icon: <RotateCcw className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Second-Line Risk Desk',
      roles: ['RISK_OFFICER'],
      items: [
        { label: 'Risk & Fraud Intelligence', path: '/risk', icon: <ShieldAlert className="w-4 h-4" /> },
        { label: 'Case Review & Challenge', path: `/risk/cases/${activeJourneyId}`, icon: <Compass className="w-4 h-4" /> },
        { label: 'Decision Replay Console', path: `/risk/replay/${activeJourneyId}`, icon: <RotateCcw className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Supervisory Risk Desk',
      roles: ['RISK_MANAGER'],
      items: [
        { label: 'Senior Risk Desk (≤₹1Cr)', path: '/risk-manager', icon: <Scale className="w-4 h-4" /> },
        { label: 'Risk & Fraud Intelligence', path: '/risk', icon: <ShieldAlert className="w-4 h-4" /> },
        { label: 'Supervisory Review', path: `/risk/cases/${activeJourneyId}`, icon: <Compass className="w-4 h-4" /> },
        { label: 'Decision Replay Console', path: `/risk/replay/${activeJourneyId}`, icon: <RotateCcw className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Credit Sanction Committee',
      roles: ['CREDIT_APPROVER'],
      items: [
        { label: 'Credit Sanction Chamber', path: '/approvals', icon: <Award className="w-4 h-4" /> },
        { label: 'Executive Case Review', path: `/risk/cases/${activeJourneyId}`, icon: <Compass className="w-4 h-4" /> },
        { label: 'Decision Replay', path: `/risk/replay/${activeJourneyId}`, icon: <RotateCcw className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Third-Line Audit & Governance',
      roles: ['AUDIT_OFFICER'],
      items: [
        { label: 'Audit & Governance Console', path: '/audit', icon: <ClipboardCheck className="w-4 h-4" /> },
        { label: 'Cross-Portfolio Replay', path: `/risk/replay/${activeJourneyId}`, icon: <RotateCcw className="w-4 h-4" /> },
        { label: 'Independent Case Review', path: `/risk/cases/${activeJourneyId}`, icon: <Compass className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Technical Administration',
      roles: ['SYS_ADMIN', 'ADMIN'],
      items: [
        { label: 'System Observability', path: '/admin', icon: <Cpu className="w-4 h-4" /> },
        { label: 'Hackathon Benchmarks', path: '/demo', icon: <Sparkles className="w-4 h-4" /> },
      ],
    },
  ];

  // Filter strictly by the active user's assigned role (or allow ADMIN to view technical admin)
  const visibleSections = navSections.filter((section) =>
    section.roles.includes(role) || (role === 'SYS_ADMIN' && section.roles.includes('ADMIN'))
  );

  return (
    <aside
      className={`hidden lg:flex flex-col bg-white border-r-2 border-[var(--brand-950)] shrink-0 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        {visibleSections.map((section) => (
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
