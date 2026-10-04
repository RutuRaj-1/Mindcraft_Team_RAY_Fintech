import React, { useState, useEffect, useRef } from 'react';
import { UserRole } from '../../types';
import { FinFlowLogo } from '../ui/FinFlowLogo';
import { 
  ShieldCheck, 
  UserCheck, 
  AlertTriangle, 
  Settings, 
  RefreshCw, 
  Zap, 
  Building2, 
  Activity, 
  ChevronDown, 
  Users, 
  ShieldAlert, 
  Award, 
  FileSearch,
  Check
} from 'lucide-react';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeJourneyId: string;
  onSelectCase: (journeyId: string) => void;
  onResetSeed: () => void;
  isSeeding: boolean;
}

const CASES = [
  { id: 'jrn_skillbridge_001', label: 'SkillBridge Enterprises', desc: 'Prime Tier', badge: 'green' },
  { id: 'jrn_lifeline_002', label: 'Lifeline AI Healthcare', desc: 'Module 4 AI', badge: 'blue' },
  { id: 'jrn_safeera_003', label: 'SafeEra Industrial', desc: 'Underwriting', badge: 'amber' },
];

export const ROLE_CONFIG: Record<string, { 
  role: UserRole;
  icon: React.ReactNode; 
  label: string; 
  officer: string; 
  category: string; 
  color: string;
  badgeBg: string;
}> = {
  CUSTOMER: { 
    role: 'CUSTOMER',
    icon: <UserCheck className="w-3.5 h-3.5" />, 
    label: '1. Customer', 
    officer: 'MSME Applicant (Customer Portal)', 
    category: 'Customer Boundary',
    color: '#059669',
    badgeBg: '#ECFDF5'
  },
  RM: { 
    role: 'RM',
    icon: <ShieldCheck className="w-3.5 h-3.5" />, 
    label: '2. RM', 
    officer: 'Rohan Mehta (Loan Officer)', 
    category: 'First-Line Ops',
    color: '#2563EB',
    badgeBg: '#EFF6FF'
  },
  RM_SUPERVISOR: { 
    role: 'RM_SUPERVISOR',
    icon: <Users className="w-3.5 h-3.5" />, 
    label: '3. RM Supervisor', 
    officer: 'Vikram Malhotra (Ops Manager)', 
    category: 'First-Line Ops',
    color: '#0F766E',
    badgeBg: '#F0FDFA'
  },
  RISK_OFFICER: { 
    role: 'RISK_OFFICER',
    icon: <AlertTriangle className="w-3.5 h-3.5" />, 
    label: '4. Risk Officer', 
    officer: 'Ananya Iyer (Credit Risk & Fraud)', 
    category: 'Second-Line Risk',
    color: '#D97706',
    badgeBg: '#FFFBEB'
  },
  RISK_MANAGER: { 
    role: 'RISK_MANAGER',
    icon: <ShieldAlert className="w-3.5 h-3.5" />, 
    label: '5. Risk Manager', 
    officer: 'Meera Krishnan (Senior Risk Oversight)', 
    category: 'Second-Line Risk',
    color: '#E11D48',
    badgeBg: '#FFF1F2'
  },
  CREDIT_APPROVER: { 
    role: 'CREDIT_APPROVER',
    icon: <Award className="w-3.5 h-3.5" />, 
    label: '6. Credit Approver', 
    officer: 'Rajesh Singhania (Sanction Chair)', 
    category: 'Sanction Authority',
    color: '#991B1B',
    badgeBg: '#FEF2F2'
  },
  AUDIT_OFFICER: { 
    role: 'AUDIT_OFFICER',
    icon: <FileSearch className="w-3.5 h-3.5" />, 
    label: '7. Audit & Gov', 
    officer: 'Sunita Rao (Independent Audit)', 
    category: 'Third-Line Assurance',
    color: '#7C3AED',
    badgeBg: '#F5F3FF'
  },
  SYS_ADMIN: { 
    role: 'SYS_ADMIN',
    icon: <Settings className="w-3.5 h-3.5" />, 
    label: '8. SysAdmin', 
    officer: 'Amit Verma (Technical Custodian)', 
    category: 'Technical Custodian',
    color: '#475569',
    badgeBg: '#F8FAFC'
  },
};

export const Navbar: React.FC<NavbarProps> = ({
  currentRole, onRoleChange, activeJourneyId, onSelectCase, onResetSeed, isSeeding
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [showCasePicker, setShowCasePicker] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const activeCase = CASES.find(c => c.id === activeJourneyId);

  // Normalize current role if legacy 'ADMIN'
  const normalizedRole = currentRole === 'ADMIN' ? 'SYS_ADMIN' : currentRole;
  const currentConfig = ROLE_CONFIG[normalizedRole] || ROLE_CONFIG.CUSTOMER;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setShowRolePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl border-b border-[var(--border)] shadow-sm'
          : 'bg-white border-b border-[var(--border)]'
      }`}
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[60px] gap-4">

          {/* ── Brand Identity ── */}
          <div className="flex items-center gap-3 shrink-0">
            <FinFlowLogo size="sm" className="h-9 sm:h-10" />
            <span className="hidden sm:inline bg-[var(--brand-50)] text-[var(--brand-700)] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[var(--brand-200)]">
              RBAC v3.0
            </span>
          </div>

          {/* ── Case Picker (Desktop) ── */}
          <div className="relative">
            <button
              onClick={() => setShowCasePicker(p => !p)}
              className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-white text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer shadow-2xs"
            >
              <Building2 className="w-3.5 h-3.5 text-[var(--brand-600)]" />
              <span className="max-w-[140px] truncate">{activeCase?.label ?? 'Select Benchmark Case'}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                activeCase?.badge === 'green' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                activeCase?.badge === 'amber' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {activeCase?.desc ?? 'Demo'}
              </span>
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
            </button>

            {showCasePicker && (
              <div className="absolute left-0 mt-2 w-64 bg-white border border-[var(--border)] rounded-xl shadow-lg p-1.5 z-50 animate-fadeInUp">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider px-2 py-1">
                  Synthetic Benchmark Applications
                </p>
                {CASES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCase(c.id);
                      setShowCasePicker(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      c.id === activeJourneyId
                        ? 'bg-[var(--brand-50)] text-[var(--brand-900)] font-bold'
                        : 'hover:bg-[var(--surface-subtle)] text-[var(--text-primary)]'
                    }`}
                  >
                    <span>{c.label}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{c.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right Controls ── */}
          <div className="flex items-center gap-2 shrink-0">

            {/* ── 7+1 Enterprise Role Selector Dropdown ── */}
            <div className="relative" ref={roleDropdownRef}>
              <button
                onClick={() => setShowRolePicker(p => !p)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-white hover:bg-[var(--surface-subtle)] transition-all shadow-xs cursor-pointer"
                style={{ borderColor: currentConfig.color }}
              >
                <div 
                  className="w-5 h-5 rounded-md flex items-center justify-center text-white"
                  style={{ backgroundColor: currentConfig.color }}
                >
                  {currentConfig.icon}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
                      {currentConfig.label}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider" style={{ backgroundColor: currentConfig.badgeBg, color: currentConfig.color }}>
                      {currentConfig.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] leading-tight hidden sm:block">
                    {currentConfig.officer}
                  </p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${showRolePicker ? 'rotate-180' : ''}`} />
              </button>

              {showRolePicker && (
                <div className="absolute right-0 mt-2 w-84 bg-white border-2 border-[var(--brand-950)] rounded-2xl shadow-[4px_4px_0px_#0A1F20] p-2 z-50 animate-fadeInUp">
                  <div className="px-3 py-1.5 border-b border-[var(--border)] flex items-center justify-between">
                    <p className="text-[11px] font-black uppercase tracking-wider text-[var(--brand-950)]">
                      Select Persona (7 Business Roles + SysAdmin)
                    </p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-700)]">
                      Four-Eyes SoD
                    </span>
                  </div>

                  <div className="space-y-1 mt-1 max-h-[360px] overflow-y-auto">
                    {Object.values(ROLE_CONFIG).map((cfg) => {
                      const isSelected = normalizedRole === cfg.role;
                      return (
                        <button
                          key={cfg.role}
                          onClick={() => {
                            onRoleChange(cfg.role);
                            setShowRolePicker(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--brand-50)] border border-[var(--brand-200)] shadow-2xs'
                              : 'hover:bg-[var(--surface-subtle)] border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div 
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                              style={{ backgroundColor: cfg.color }}
                            >
                              {cfg.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-[var(--text-primary)]">
                                  {cfg.label}
                                </span>
                                <span className="text-[9px] px-1 rounded font-semibold uppercase" style={{ backgroundColor: cfg.badgeBg, color: cfg.color }}>
                                  {cfg.category}
                                </span>
                              </div>
                              <p className="text-[10px] text-[var(--text-muted)] truncate">
                                {cfg.officer}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-[var(--brand-700)] shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* System Status Pulse */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--fin-green-bg)] border border-[var(--fin-green)]/20 rounded-lg">
              <Activity className="w-3 h-3 text-[var(--fin-green)]" />
              <span className="text-[10px] font-bold text-[var(--fin-green)]">Live</span>
            </div>

            {/* Re-seed */}
            <button
              onClick={onResetSeed}
              disabled={isSeeding}
              title="Reset & Re-seed Benchmark Demo Data"
              className={`p-2 rounded-lg transition-all border border-[var(--border)] cursor-pointer ${
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
