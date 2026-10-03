import React, { useState, useEffect } from 'react';
import { UserRole } from '../../types';
import { FinFlowLogo } from '../ui/FinFlowLogo';
import { ShieldCheck, UserCheck, AlertTriangle, Settings, RefreshCw, Zap, Building2, Activity, ChevronDown } from 'lucide-react';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeJourneyId: string;
  onSelectCase: (journeyId: string) => void;
  onResetSeed: () => void;
  isSeeding: boolean;
}

const CASES = [
  { id: 'jrn_priya_001', label: 'Sharma Textiles', desc: 'High Trust', badge: 'green' },
  { id: 'jrn_kavita_002', label: 'Kavita Electronics', desc: 'Conditional', badge: 'amber' },
  { id: 'jrn_apex_003', label: 'Apex Trading', desc: '⚠ Fraud', badge: 'coral' },
];

const ROLE_CONFIG: Record<UserRole, { icon: React.ReactNode; label: string; description: string; color: string }> = {
  CUSTOMER: { icon: <UserCheck className="w-3.5 h-3.5" />, label: 'Customer', description: 'Priya Sharma (SME Applicant)', color: '#3DA5A6' },
  RM: { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: 'RM', description: 'Rohan Mehta (Loan Officer)', color: '#6A49C6' },
  RISK_OFFICER: { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Risk Officer', description: 'Ananya Iyer (Risk Officer)', color: '#C98A10' },
  ADMIN: { icon: <Settings className="w-3.5 h-3.5" />, label: 'Admin', description: 'System Administrator', color: '#2460DC' },
};

export const Navbar: React.FC<NavbarProps> = ({
  currentRole, onRoleChange, activeJourneyId, onSelectCase, onResetSeed, isSeeding
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [showCasePicker, setShowCasePicker] = useState(false);
  const activeCase = CASES.find(c => c.id === activeJourneyId);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl border-b border-[var(--border)] shadow-sm'
          : 'bg-white border-b border-[var(--border)]'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[60px] gap-4">

          {/* ── Brand Identity ── */}
          <div className="flex items-center gap-3 shrink-0">
            <FinFlowLogo size="sm" className="h-9 sm:h-10" />
            <span className="hidden sm:inline bg-[var(--brand-50)] text-[var(--brand-700)] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[var(--brand-200)]">
              MVP v2.1
            </span>
          </div>

          {/* ── Case Picker (Desktop) ── */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[var(--surface-subtle)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
            <Building2 className="w-3.5 h-3.5 text-[var(--brand-600)] shrink-0" />
            <span className="text-[11px] font-semibold text-[var(--text-muted)] mr-1">Case:</span>
            {CASES.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectCase(c.id)}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  activeJourneyId === c.id
                    ? c.badge === 'coral'
                      ? 'bg-[var(--fin-coral-bg)] text-[var(--fin-coral)] border border-[var(--fin-coral)]/25 shadow-xs'
                      : c.badge === 'amber'
                      ? 'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border border-[var(--fin-amber)]/25 shadow-xs'
                      : 'bg-white text-[var(--brand-800)] border border-[var(--border)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/70'
                }`}
              >
                {c.id === activeJourneyId && <span className="mr-1">●</span>}
                {c.label}
              </button>
            ))}
          </div>

          {/* ── Mobile Case Picker ── */}
          <div className="flex lg:hidden relative">
            <button
              onClick={() => setShowCasePicker(s => !s)}
              className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-subtle)] px-3 py-1.5 rounded-lg border border-[var(--border)]"
            >
              <Building2 className="w-3 h-3" />
              {activeCase?.label || 'Case'}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showCasePicker && (
              <div className="absolute top-full mt-2 left-0 bg-white border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-50 w-52">
                {CASES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { onSelectCase(c.id); setShowCasePicker(false); }}
                    className={`w-full text-left flex items-center gap-2 px-4 py-2.5 text-xs transition-colors ${
                      c.id === activeJourneyId ? 'bg-[var(--brand-50)] text-[var(--brand-800)] font-bold' : 'hover:bg-[var(--surface-subtle)] text-[var(--text-primary)]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      c.badge === 'coral' ? 'bg-[var(--fin-coral)]' : c.badge === 'amber' ? 'bg-[var(--fin-amber)]' : 'bg-[var(--fin-green)]'
                    }`} />
                    <span className="font-semibold">{c.label}</span>
                    <span className="text-[var(--text-muted)] ml-auto">{c.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right Controls ── */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Role Switcher */}
            <div className="flex items-center bg-[var(--surface-subtle)] p-1 rounded-xl border border-[var(--border)]">
              {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([role, cfg]) => (
                <button
                  key={role}
                  onClick={() => onRoleChange(role)}
                  title={cfg.description}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    currentRole === role
                      ? 'bg-white text-[var(--brand-800)] shadow-xs border border-[var(--border)] font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/50'
                  }`}
                  style={currentRole === role ? { color: cfg.color } : {}}
                >
                  {cfg.icon}
                  <span className={role === 'ADMIN' ? 'hidden sm:inline' : ''}>{cfg.label}</span>
                </button>
              ))}
            </div>

            {/* System Status Pulse */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--fin-green-bg)] border border-[var(--fin-green)]/20 rounded-lg">
              <Activity className="w-3 h-3 text-[var(--fin-green)]" />
              <span className="text-[10px] font-bold text-[var(--fin-green)]">Live</span>
            </div>

            {/* Re-seed */}
            <button
              onClick={onResetSeed}
              disabled={isSeeding}
              title="Reset & Re-seed Benchmark Demo Data"
              className={`p-2 rounded-lg transition-all border border-[var(--border)] ${
                isSeeding
                  ? 'text-[var(--brand-500)] bg-[var(--brand-50)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--brand-700)] hover:bg-[var(--brand-50)] hover:border-[var(--brand-200)]'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
