import React from 'react';
import { UserRole } from '../../types';
import { ShieldCheck, UserCheck, AlertTriangle, Settings, RefreshCw, Zap, Building2 } from 'lucide-react';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeJourneyId: string;
  onSelectCase: (journeyId: string) => void;
  onResetSeed: () => void;
  isSeeding: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  activeJourneyId,
  onSelectCase,
  onResetSeed,
  isSeeding
}) => {
  return (
    <header className="bg-white border-b border-[#E3ECE9] sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#123E40] to-[#237277] flex items-center justify-center text-white shadow-sm">
              <Zap className="w-5 h-5 text-[#D9F0EE]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-[#123E40]">FinFlow <span className="text-[#237277]">AI</span></span>
                <span className="bg-[#EEF8F7] text-[#237277] text-xs font-semibold px-2 py-0.5 rounded-full border border-[#D9F0EE]">
                  MVP v2.1
                </span>
              </div>
              <p className="text-xs text-[#687A75] hidden sm:block">Intelligent & Explainable Financial Journey Orchestration</p>
            </div>
          </div>

          {/* Benchmark Scenario Selector */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#F7FAF9] p-1 rounded-lg border border-[#E3ECE9]">
            <span className="text-xs font-semibold text-[#687A75] px-2 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#237277]" /> Demo Case:
            </span>
            <button
              onClick={() => onSelectCase('jrn_priya_001')}
              className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-all ${
                activeJourneyId === 'jrn_priya_001'
                  ? 'bg-white text-[#123E40] shadow-xs border border-[#CBD9D5] font-semibold'
                  : 'text-[#687A75] hover:text-[#172825]'
              }`}
            >
              Case 1: Sharma Textiles
            </button>
            <button
              onClick={() => onSelectCase('jrn_kavita_002')}
              className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-all ${
                activeJourneyId === 'jrn_kavita_002'
                  ? 'bg-white text-[#123E40] shadow-xs border border-[#CBD9D5] font-semibold'
                  : 'text-[#687A75] hover:text-[#172825]'
              }`}
            >
              Case 2: Kavita Electronics
            </button>
            <button
              onClick={() => onSelectCase('jrn_apex_003')}
              className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-all ${
                activeJourneyId === 'jrn_apex_003'
                  ? 'bg-white text-[#D96559] shadow-xs border border-[#FDECEA] font-semibold'
                  : 'text-[#687A75] hover:text-[#D96559]'
              }`}
            >
              Case 3: Apex (Fraud Flag)
            </button>
          </div>

          {/* Persona Switcher & Re-Seed */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#EEF8F7] p-1 rounded-xl border border-[#D9F0EE]">
              <button
                onClick={() => onRoleChange('CUSTOMER')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentRole === 'CUSTOMER'
                    ? 'bg-[#237277] text-white shadow-xs font-semibold'
                    : 'text-[#18575A] hover:bg-white/60'
                }`}
                title="SME Customer (Priya Sharma)"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Customer</span>
              </button>
              <button
                onClick={() => onRoleChange('RM')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentRole === 'RM'
                    ? 'bg-[#237277] text-white shadow-xs font-semibold'
                    : 'text-[#18575A] hover:bg-white/60'
                }`}
                title="Relationship Manager (Rohan Mehta)"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>RM</span>
              </button>
              <button
                onClick={() => onRoleChange('RISK_OFFICER')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentRole === 'RISK_OFFICER'
                    ? 'bg-[#237277] text-white shadow-xs font-semibold'
                    : 'text-[#18575A] hover:bg-white/60'
                }`}
                title="Risk & Compliance Officer (Ananya Iyer)"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Risk Officer</span>
              </button>
              <button
                onClick={() => onRoleChange('ADMIN')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentRole === 'ADMIN'
                    ? 'bg-[#237277] text-white shadow-xs font-semibold'
                    : 'text-[#18575A] hover:bg-white/60'
                }`}
                title="System Administrator"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            </div>

            {/* Re-seed demo button */}
            <button
              onClick={onResetSeed}
              disabled={isSeeding}
              className="p-2 text-[#687A75] hover:text-[#237277] hover:bg-[#EEF8F7] rounded-lg transition-colors border border-[#E3ECE9]"
              title="Reset & Re-seed Benchmark Demo Data"
            >
              <RefreshCw className={`w-4 h-4 ${isSeeding ? 'animate-spin text-[#237277]' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
