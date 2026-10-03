import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Drawer } from '../ui/Drawer';
import { getRoleNavigation } from '../../config/navigation';
import {
  Home, FilePlus, GitCommit, Users, Sparkles, Building2, ShieldAlert,
  FileText, TrendingUp, Award, CheckCircle2, RotateCcw, Scale, ClipboardCheck,
  Cpu, Compass
} from 'lucide-react';
import { BENCHMARK_CASES } from './TopNavbar';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Home: <Home className="w-4 h-4" />,
  FilePlus: <FilePlus className="w-4 h-4" />,
  GitCommit: <GitCommit className="w-4 h-4" />,
  FileText: <FileText className="w-4 h-4" />,
  TrendingUp: <TrendingUp className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
  Award: <Award className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  CheckCircle2: <CheckCircle2 className="w-4 h-4" />,
  RotateCcw: <RotateCcw className="w-4 h-4" />,
  Building2: <Building2 className="w-4 h-4" />,
  ShieldAlert: <ShieldAlert className="w-4 h-4" />,
  Scale: <Scale className="w-4 h-4" />,
  ClipboardCheck: <ClipboardCheck className="w-4 h-4" />,
  Cpu: <Cpu className="w-4 h-4" />,
  Compass: <Compass className="w-4 h-4" />,
};

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { activeJourneyId, setActiveJourneyId, role } = useAuth();

  const roleSections = getRoleNavigation(role, activeJourneyId);

  return (
    <>
      {/* Slide-out Navigation Drawer */}
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="FinFlow AI Navigation"
        subtitle={`Active Role: ${role}`}
        width="sm"
      >
        <div className="space-y-4">
          {/* Benchmark Case Picker in Mobile Drawer */}
          <div className="p-3 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[var(--brand-700)]" /> Active Demo Case
            </p>
            <div className="space-y-1.5">
              {BENCHMARK_CASES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveJourneyId(c.id)}
                  className={`w-full text-left p-2 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all ${
                    activeJourneyId === c.id
                      ? 'bg-white border-[var(--brand-950)] text-[var(--brand-950)] font-bold shadow-xs'
                      : 'bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-white/50'
                  }`}
                >
                  <span>{c.label}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{c.id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Role-Authorized Navigation Links */}
          <div className="space-y-4">
            {roleSections.map((sec) => (
              <div key={sec.title} className="space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] px-3 mb-1">
                  {sec.title}
                </p>
                {sec.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-[var(--brand-50)] text-[var(--brand-950)] border-1.5 border-[var(--brand-950)] font-bold shadow-xs'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
                      }`
                    }
                  >
                    <span className="text-[var(--brand-700)]">
                      {iconMap[item.iconName] || <Home className="w-4 h-4" />}
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Drawer>

      {/* Role-Specific Quick Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-[var(--brand-950)] px-3 py-2 flex items-center justify-around shadow-lg">
        {role === 'CUSTOMER' ? (
          <>
            <NavLink
              to="/customer"
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  isActive ? 'text-[var(--brand-700)]' : 'text-[var(--text-muted)]'
                }`
              }
            >
              <Home className="w-4 h-4" />
              <span>Portal</span>
            </NavLink>
            <NavLink
              to="/customer/apply"
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  isActive ? 'text-[var(--brand-700)]' : 'text-[var(--text-muted)]'
                }`
              }
            >
              <FilePlus className="w-4 h-4" />
              <span>Apply</span>
            </NavLink>
            <NavLink
              to={`/customer/journey/${activeJourneyId}`}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  isActive ? 'text-[var(--brand-700)]' : 'text-[var(--text-muted)]'
                }`
              }
            >
              <GitCommit className="w-4 h-4" />
              <span>Journey</span>
            </NavLink>
            <NavLink
              to={`/customer/decision/${activeJourneyId}`}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  isActive ? 'text-[var(--brand-700)]' : 'text-[var(--text-muted)]'
                }`
              }
            >
              <Award className="w-4 h-4" />
              <span>Decision</span>
            </NavLink>
          </>
        ) : (
          <>
            <NavLink
              to={roleSections[0]?.items[0]?.path || '/app'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  isActive ? 'text-[var(--brand-700)]' : 'text-[var(--text-muted)]'
                }`
              }
            >
              <Home className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to={`/risk/replay/${activeJourneyId}`}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                  isActive ? 'text-[var(--brand-700)]' : 'text-[var(--text-muted)]'
                }`
              }
            >
              <RotateCcw className="w-4 h-4" />
              <span>Replay</span>
            </NavLink>
          </>
        )}
      </nav>
    </>
  );
};
