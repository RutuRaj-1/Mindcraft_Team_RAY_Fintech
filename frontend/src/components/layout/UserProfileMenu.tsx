import React, { useState, useRef, useEffect } from 'react';
import { useAuth, PERSONAS } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { UserCheck, ShieldCheck, AlertTriangle, Settings, ChevronDown, Check, LogOut, ArrowRightLeft } from 'lucide-react';

export const UserProfileMenu: React.FC = () => {
  const { role, persona, switchRole, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleIcons: Record<UserRole, React.ReactNode> = {
    CUSTOMER: <UserCheck className="w-3.5 h-3.5 text-[var(--fin-green)]" />,
    RM: <ShieldCheck className="w-3.5 h-3.5 text-[var(--fin-blue)]" />,
    RISK_OFFICER: <AlertTriangle className="w-3.5 h-3.5 text-[var(--fin-amber)]" />,
    ADMIN: <Settings className="w-3.5 h-3.5 text-[var(--fin-violet)]" />,
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[var(--surface-subtle)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs"
          style={{ backgroundColor: persona.badgeColor }}
        >
          {persona.avatarInitials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-bold text-[var(--brand-950)] leading-tight">
            {persona.name}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] font-medium truncate max-w-[120px]">
            {persona.role.replace('_', ' ')}
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] hidden sm:block" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border-2 border-[var(--brand-950)] rounded-2xl shadow-[4px_4px_0px_#0A1F20] overflow-hidden z-50 animate-fadeInUp">
          {/* User info card */}
          <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-subtle)]">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white"
                style={{ backgroundColor: persona.badgeColor }}
              >
                {persona.avatarInitials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-[var(--brand-950)] truncate">
                  {persona.name}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">
                  {persona.organization}
                </p>
                <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-[var(--border)] text-[var(--brand-800)]">
                  {persona.role}
                </span>
              </div>
            </div>
          </div>

          {/* Persona Switcher Section */}
          <div className="p-2 border-b border-[var(--border)]">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
              <ArrowRightLeft className="w-3 h-3" /> Switch Persona (Demo Mode)
            </p>
            <div className="space-y-1 mt-1">
              {(Object.keys(PERSONAS) as UserRole[]).map((r) => {
                const p = PERSONAS[r];
                const isSelected = r === role;
                return (
                  <button
                    key={r}
                    onClick={() => {
                      switchRole(r);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--brand-50)] text-[var(--brand-900)] font-bold'
                        : 'hover:bg-[var(--surface-subtle)] text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {roleIcons[r]}
                      <div className="text-left">
                        <p className="text-xs font-semibold leading-tight">{p.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{p.role}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[var(--brand-700)]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick logout / reset */}
          <div className="p-2">
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-[var(--fin-coral)] hover:bg-[var(--fin-coral-bg)] rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Reset to Default SME Customer</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
