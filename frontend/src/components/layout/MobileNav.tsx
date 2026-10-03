import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Drawer } from '../ui/Drawer';
import { Home, FilePlus, GitCommit, Users, Sparkles, Building2, ShieldAlert } from 'lucide-react';
import { BENCHMARK_CASES } from './TopNavbar';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { activeJourneyId, setActiveJourneyId, role } = useAuth();

  const mobileNavLinks = [
    { label: 'Customer Portal', path: '/customer', icon: <Home className="w-4 h-4" /> },
    { label: 'Apply for Loan', path: '/customer/apply', icon: <FilePlus className="w-4 h-4" /> },
    { label: 'Live Journey State', path: `/customer/journey/${activeJourneyId}`, icon: <GitCommit className="w-4 h-4" /> },
    { label: 'Evidence & Documents', path: `/customer/documents/${activeJourneyId}`, icon: <GitCommit className="w-4 h-4" /> },
    { label: 'Sanction & Decision', path: `/customer/decision/${activeJourneyId}`, icon: <GitCommit className="w-4 h-4" /> },
    { label: 'RM Underwriting Queue', path: '/rm', icon: <Users className="w-4 h-4" /> },
    { label: 'Risk & Trust Console', path: '/risk', icon: <ShieldAlert className="w-4 h-4" /> },
    { label: 'System Admin', path: '/admin', icon: <Users className="w-4 h-4" /> },
    { label: 'Hackathon Benchmarks', path: '/demo', icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Slide-out Navigation Drawer */}
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="FinFlow Navigation"
        subtitle={`Active Persona: ${role}`}
        width="sm"
      >
        <div className="space-y-4">
          {/* Case Picker in Mobile Drawer */}
          <div className="p-3 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[var(--brand-700)]" /> Active Benchmark Case
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

          {/* Navigation Links */}
          <div className="space-y-1">
            {mobileNavLinks.map((item) => (
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
                <span className="text-[var(--brand-700)]">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </Drawer>

      {/* Fixed Bottom Quick-Bar for SME Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-[var(--brand-950)] px-3 py-2 flex items-center justify-around shadow-lg">
        <NavLink
          to="/customer"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive ? 'text-[var(--brand-700)]' : 'text-[var(--text-muted)]'
            }`
          }
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
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
          to="/rm"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive ? 'text-[var(--brand-700)]' : 'text-[var(--text-muted)]'
            }`
          }
        >
          <Users className="w-4 h-4" />
          <span>Queue</span>
        </NavLink>

        <NavLink
          to="/demo"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive ? 'text-[var(--brand-700)]' : 'text-[var(--text-muted)]'
            }`
          }
        >
          <Sparkles className="w-4 h-4" />
          <span>Demo</span>
        </NavLink>
      </nav>
    </>
  );
};
