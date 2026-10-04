import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { UserProfileMenu } from './UserProfileMenu';
import { FinFlowLogo } from '../ui/FinFlowLogo';
import {
  Bell, Building2, Menu, RotateCcw, Briefcase,
  ShieldCheck, Scale, Award, ClipboardCheck, Home,
  FileSpreadsheet, Users, ChevronDown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { journeysApi } from '../../api/journeys';
import { UserRole } from '../../types';

export const BENCHMARK_CASES = [
  { id: 'jrn_skillbridge_001', label: 'SkillBridge Enterprises', tier: 'Prime Tier (Sanctioned)', badgeColor: 'var(--fin-green)' },
  { id: 'jrn_lifeline_002', label: 'Lifeline AI Healthcare', tier: 'Module 4 (Explainable Decision)', badgeColor: 'var(--fin-blue)' },
  { id: 'jrn_safeera_003', label: 'SafeEra Industrial', tier: 'Underwriting Review (Borderline)', badgeColor: 'var(--fin-amber)' },
];

interface TopNavbarProps {
  onToggleSidebar?: () => void;
  onToggleMobileNav?: () => void;
}

// Per Part 46: Role-specific context pill configuration
const ROLE_CONTEXT_CONFIG: Record<UserRole, {
  label: string;
  icon: React.ReactNode;
  showCasePicker: boolean;
  showDecisionReplay: boolean;
  pickerLabel: string;
}> = {
  CUSTOMER: {
    label: 'Active Application',
    icon: <Home className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
    showCasePicker: true,
    showDecisionReplay: false,
    pickerLabel: 'My Application',
  },
  RM: {
    label: 'Active / Assigned Case',
    icon: <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
    showCasePicker: true,
    showDecisionReplay: true,
    pickerLabel: 'Assigned Case',
  },
  RM_SUPERVISOR: {
    label: 'Selected Team Case',
    icon: <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />,
    showCasePicker: true,
    showDecisionReplay: true,
    pickerLabel: 'Team Case',
  },
  RISK_OFFICER: {
    label: 'Selected Review Case',
    icon: <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
    showCasePicker: true,
    showDecisionReplay: true,
    pickerLabel: 'Review Case',
  },
  RISK_MANAGER: {
    label: 'Risk Governance Context',
    icon: <Scale className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
    showCasePicker: true,
    showDecisionReplay: true,
    pickerLabel: 'Supervised Case',
  },
  CREDIT_APPROVER: {
    label: 'Decision Package',
    icon: <Award className="w-3.5 h-3.5 text-red-800 shrink-0" />,
    showCasePicker: true,
    showDecisionReplay: true,
    pickerLabel: 'Decision Package',
  },
  AUDIT_OFFICER: {
    label: 'Selected Audit Case',
    icon: <ClipboardCheck className="w-3.5 h-3.5 text-violet-600 shrink-0" />,
    showCasePicker: true,
    showDecisionReplay: true,
    pickerLabel: 'Audit Case',
  },
  SYS_ADMIN: {
    label: 'System Context',
    icon: <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600 shrink-0" />,
    showCasePicker: false,
    showDecisionReplay: false,
    pickerLabel: 'System',
  },
  ADMIN: {
    label: 'System Context',
    icon: <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600 shrink-0" />,
    showCasePicker: false,
    showDecisionReplay: false,
    pickerLabel: 'System',
  },
};

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onToggleSidebar,
  onToggleMobileNav,
}) => {
  const { activeJourneyId, setActiveJourneyId, role, persona, msmeProfile } = useAuth();
  const { unreadCount, openDrawer } = useNotifications();

  const [cases, setCases] = React.useState<{ id: string; label: string; tier: string }[]>([]);
  const [showPicker, setShowPicker] = React.useState(false);
  const pickerRef = React.useRef<HTMLDivElement>(null);

  const ctx = ROLE_CONTEXT_CONFIG[role] || ROLE_CONTEXT_CONFIG.CUSTOMER;
  const customerEnterprise = msmeProfile?.business_name || (role === 'CUSTOMER' ? persona?.organization : '') || 'SkillBridge Enterprises';

  React.useEffect(() => {
    let isMounted = true;
    journeysApi.listJourneys()
      .then((res: any[]) => {
        if (!isMounted) return;
        if (res && res.length > 0) {
          // For CUSTOMER: filter strictly to their own journey, NEVER show bank benchmark cases
          const customerOwned = role === 'CUSTOMER'
            ? res.filter((j) => {
                const name = (j.intent?.business_name || j.business_name || '').toLowerCase();
                const isBankBenchmark = [
                  'sharma textiles',
                  'kavita electronics',
                  'apex logistics',
                  'swifttrans',
                  'zenith cargo',
                  'omkar'
                ].some(b => name.includes(b));
                return !isBankBenchmark;
              })
            : res;

          const mapped = customerOwned.map((j) => {
            const rawLabel = j.intent?.business_name || j.business_name || j.journey_id;
            const isTestName = rawLabel.includes('GreenTech') || rawLabel.toLowerCase().includes('sample');
            const label = (role === 'CUSTOMER' && (isTestName || customerEnterprise))
              ? (!isTestName && rawLabel ? rawLabel : customerEnterprise)
              : rawLabel;
            return {
              id: j.journey_id,
              label,
              tier: j.current_stage
                ? j.current_stage.replace(/_/g, ' ')
                : (j.status || 'ACTIVE'),
            };
          });

          // If role is CUSTOMER and no customer journeys exist yet, provide their profile's active application
          if (role === 'CUSTOMER' && mapped.length === 0 && customerEnterprise) {
            setCases([{
              id: activeJourneyId || 'app_skillbridge_active',
              label: customerEnterprise,
              tier: 'ACTIVE PROFILE',
            }]);
          } else {
            setCases(mapped);
          }
        } else if (role !== 'CUSTOMER') {
          // For internal/demo roles, fall back to benchmark cases when no real data
          setCases(BENCHMARK_CASES);
        } else {
          setCases(customerEnterprise ? [{
            id: activeJourneyId || 'app_skillbridge_active',
            label: customerEnterprise,
            tier: 'ACTIVE PROFILE',
          }] : []);
        }
      })
      .catch(() => {
        if (role !== 'CUSTOMER') setCases(BENCHMARK_CASES);
        else setCases(customerEnterprise ? [{
          id: activeJourneyId || 'app_skillbridge_active',
          label: customerEnterprise,
          tier: 'ACTIVE PROFILE',
        }] : []);
      });
    return () => { isMounted = false; };
  }, [role, customerEnterprise, activeJourneyId]);

  // Close picker on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeCase = React.useMemo(() => {
    if (role === 'CUSTOMER') {
      const match = cases.find((c) => c.id === activeJourneyId) || cases[0];
      if (match) {
        const isTestName = match.label.includes('GreenTech') || match.label.toLowerCase().includes('sample');
        return {
          ...match,
          label: isTestName ? customerEnterprise : match.label || customerEnterprise,
        };
      }
      return { id: activeJourneyId || 'active_case', label: customerEnterprise, tier: 'Active Application' };
    }
    return cases.find((c) => c.id === activeJourneyId) || cases[0];
  }, [cases, activeJourneyId, role, customerEnterprise]);

  return (
    <header className="sticky top-0 z-30 bg-white border-b-2 border-[var(--brand-950)] px-4 sm:px-6 h-14 flex items-center justify-between gap-4 shadow-sm">
      {/* Left: Hamburger + Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleMobileNav || onToggleSidebar}
          className="lg:hidden p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-subtle)] text-[var(--brand-950)] transition-colors"
          aria-label="Toggle navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity group">
          <FinFlowLogo size="sm" className="h-8 sm:h-9" />
          <span className="hidden md:inline text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]">
            v2.1 Enterprise
          </span>
        </Link>
      </div>

      {/* Center: Role-Aware Context Picker — Part 45/46 */}
      {ctx.showCasePicker && (
        <div className="hidden md:block relative flex-1 max-w-xs" ref={pickerRef}>
          <button
            onClick={() => setShowPicker((p) => !p)}
            className="w-full flex items-center gap-2 bg-[var(--surface-subtle)] hover:bg-white px-3 py-1.5 rounded-xl border border-[var(--border-strong)] transition-all text-left"
          >
            {ctx.icon}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-[var(--text-muted)] leading-none mb-0.5">{ctx.label}</p>
              <p className="text-xs font-bold text-[var(--brand-950)] truncate leading-none">
                {activeCase?.label || (role === 'CUSTOMER' ? 'No active application' : ctx.pickerLabel)}
              </p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${showPicker ? 'rotate-180' : ''}`} />
          </button>

          {showPicker && (
            <div className="absolute top-full left-0 mt-1.5 w-72 bg-white border-2 border-[var(--brand-950)] rounded-2xl shadow-[4px_4px_0px_#0A1F20] p-2 z-50">
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-2 py-1.5">
                {role === 'CUSTOMER' ? 'My Applications' : 'Available Cases'}
              </p>
              {cases.length === 0 && role === 'CUSTOMER' && (
                <p className="text-xs text-[var(--text-muted)] px-2 py-3 text-center">No applications yet. Start a new application to begin.</p>
              )}
              {cases.map((c) => {
                const displayLabel = role === 'CUSTOMER' && (c.label.includes('GreenTech') || !c.label)
                  ? customerEnterprise
                  : c.label;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveJourneyId(c.id);
                      setShowPicker(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      c.id === activeJourneyId
                        ? 'bg-[var(--brand-50)] text-[var(--brand-900)] border border-[var(--brand-200)]'
                        : 'hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-transparent'
                    }`}
                  >
                    <span className="font-bold">{displayLabel}</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono truncate max-w-[100px]">{c.tier}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Live Engine indicator — only for internal roles */}
        {role !== 'CUSTOMER' && (
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-[var(--fin-green-bg)] border border-[var(--fin-green)]/30 rounded-lg">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--fin-green)] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--fin-green)]" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--fin-green)]">
              Live
            </span>
          </div>
        )}

        {/* Decision Replay shortcut — not shown to CUSTOMER or ADMIN */}
        {ctx.showDecisionReplay && (
          <Link
            to={`/risk/replay/${activeJourneyId}`}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[var(--brand-950)] text-[var(--brand-950)] rounded-lg text-[10px] font-black shadow-[2px_2px_0px_#0A1F20] hover:bg-[var(--brand-50)] transition-all active:translate-y-px"
            title="Launch Decision Replay for Active Case"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Replay</span>
          </Link>
        )}

        {/* Notifications */}
        <button
          onClick={openDrawer}
          className="relative p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-subtle)] text-[var(--brand-950)] cursor-pointer transition-colors"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--fin-coral)] text-white text-[9px] font-black flex items-center justify-center border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Profile */}
        <UserProfileMenu />
      </div>
    </header>
  );
};
