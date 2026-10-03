import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { UserProfileMenu } from './UserProfileMenu';
import { FinFlowLogo } from '../ui/FinFlowLogo';
import { Bell, Building2, Menu, ShieldCheck, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';


export const BENCHMARK_CASES = [
  { id: 'jrn_priya_001', label: 'Sharma Textiles', tier: 'Prime Tier (Approved)', badgeColor: 'var(--fin-green)' },
  { id: 'jrn_kavita_002', label: 'Kavita Electronics', tier: 'Borderline (Conditional)', badgeColor: 'var(--fin-amber)' },
  { id: 'jrn_apex_003', label: 'Apex Logistics', tier: 'Adverse Fraud (Review)', badgeColor: 'var(--fin-coral)' },
];

interface TopNavbarProps {
  onToggleSidebar?: () => void;
  onToggleMobileNav?: () => void;
}

import { journeysApi } from '../../api/journeys';

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onToggleSidebar,
  onToggleMobileNav,
}) => {
  const { activeJourneyId, setActiveJourneyId, role } = useAuth();
  const { unreadCount, openDrawer } = useNotifications();
  const [cases, setCases] = React.useState<{ id: string; label: string; tier: string }[]>(BENCHMARK_CASES);

  React.useEffect(() => {
    let isMounted = true;
    journeysApi.listJourneys()
      .then((res: any[]) => {
        if (!isMounted || !res || res.length === 0) return;
        const mapped = res.map((j) => ({
          id: j.journey_id,
          label: j.intent?.business_name || j.business_name || j.journey_id,
          tier: j.current_stage ? `${j.current_stage.replace(/_/g, ' ')}` : (j.status || 'ACTIVE')
        }));
        setCases(mapped);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b-2 border-[var(--brand-950)] px-4 sm:px-6 h-16 flex items-center justify-between gap-4 shadow-xs">
      {/* Left: Mobile hamburger & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileNav || onToggleSidebar}
          className="lg:hidden p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-subtle)] text-[var(--brand-950)]"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/" className="flex items-center gap-2 group hover:opacity-90 transition-opacity">
          <FinFlowLogo size="sm" className="h-9 sm:h-10" />
          <span className="hidden md:inline text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]">
            v2.1 Enterprise
          </span>
        </Link>
      </div>

      {/* Center: Case Picker Pill */}
      <div className="hidden md:flex items-center gap-2 bg-[var(--surface-subtle)] px-3 py-1.5 rounded-xl border border-[var(--border-strong)]">
        <Building2 className="w-3.5 h-3.5 text-[var(--brand-700)] shrink-0" />
        <span className="text-[11px] font-bold text-[var(--text-muted)]">Active Case:</span>
        <select
          value={activeJourneyId}
          onChange={(e) => setActiveJourneyId(e.target.value)}
          className="bg-transparent text-xs font-bold text-[var(--brand-950)] focus:outline-none cursor-pointer max-w-[280px] truncate"
        >
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} — {c.tier}
            </option>
          ))}
        </select>

        {/* Quick Decision Replay Link */}
        <Link
          to={`/risk/replay/${activeJourneyId}`}
          className="ml-2 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[var(--brand-950)] text-[var(--brand-950)] rounded-lg text-[11px] font-black shadow-[2px_2px_0px_#0A1F20] hover:bg-[var(--brand-50)] transition-all active:translate-y-0.5"
          title="Launch Decision Replay for Active Case"
        >
          <RotateCcw className="w-3 h-3 text-[var(--brand-700)]" />
          <span>Decision Replay</span>
        </Link>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Live Engine Pulse */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[var(--fin-green-bg)] border border-[var(--fin-green)]/30 rounded-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--fin-green)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--fin-green)]" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--fin-green)]">
            Live Engine
          </span>
        </div>

        {/* Notifications button */}
        <button
          onClick={openDrawer}
          className="relative p-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-subtle)] text-[var(--brand-950)] cursor-pointer transition-colors"
          title="Audit Telemetry & Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--fin-coral)] text-white text-[9px] font-black flex items-center justify-center border-2 border-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile / Persona Menu */}
        <UserProfileMenu />
      </div>
    </header>
  );
};
