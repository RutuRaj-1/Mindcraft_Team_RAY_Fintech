import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, PERSONAS } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { 
  UserCheck, 
  ShieldCheck, 
  AlertTriangle, 
  Settings, 
  ChevronDown, 
  Check, 
  LogOut, 
  ArrowRightLeft,
  Users,
  ShieldAlert,
  Award,
  FileSearch,
  Building2,
  FolderArchive
} from 'lucide-react';

export const UserProfileMenu: React.FC = () => {
  const {
    role,
    persona,
    logout,
    firebaseUser,
    msmeProfile,
    isMasterAdmin,
    adminEmulatedRole,
    exitAdminEmulation,
  } = useAuth();
  const navigate = useNavigate();
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
    RM_SUPERVISOR: <Users className="w-3.5 h-3.5 text-[var(--brand-700)]" />,
    RISK_OFFICER: <AlertTriangle className="w-3.5 h-3.5 text-[var(--fin-amber)]" />,
    RISK_MANAGER: <ShieldAlert className="w-3.5 h-3.5 text-[var(--fin-coral)]" />,
    CREDIT_APPROVER: <Award className="w-3.5 h-3.5 text-[#dc2626]" />,
    AUDIT_OFFICER: <FileSearch className="w-3.5 h-3.5 text-[var(--fin-violet)]" />,
    SYS_ADMIN: <Settings className="w-3.5 h-3.5 text-[#64748b]" />,
    ADMIN: <Settings className="w-3.5 h-3.5 text-[#64748b]" />,
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[var(--surface-subtle)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer"
        aria-label="User profile menu"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs"
          style={{ backgroundColor: persona.badgeColor }}
        >
          {persona.avatarInitials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-bold text-[var(--brand-950)] leading-tight truncate max-w-[130px]">
            {persona.name}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] font-medium truncate max-w-[130px]">
            {msmeProfile?.business_name || persona.organization}
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] hidden sm:block" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border-2 border-[var(--brand-950)] rounded-2xl shadow-[4px_4px_0px_#0A1F20] overflow-hidden z-50 animate-fadeInUp">
          {/* User info card */}
          <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-subtle)]">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-xs shrink-0"
                style={{ backgroundColor: persona.badgeColor }}
              >
                {persona.avatarInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-[var(--brand-950)] truncate">
                  {persona.name}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                  {persona.email}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-[var(--border)] text-[var(--brand-800)]">
                    {persona.role}
                  </span>
                  {msmeProfile?.business_name && (
                    <span className="text-[9px] font-medium text-[var(--text-muted)] truncate max-w-[130px]">
                      {msmeProfile.business_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Profile & Vault Links */}
          {role === 'CUSTOMER' && (
            <div className="p-2 border-b border-[var(--border)] space-y-1">
              <Link
                to="/customer/profile?tab=profile"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[var(--brand-950)] hover:bg-[var(--surface-subtle)] rounded-xl transition-colors cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-[var(--brand-700)] shrink-0" />
                <div>
                  <p className="leading-tight">MSME Business Profile</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-normal">PAN, GSTIN, promoter details</p>
                </div>
              </Link>
              <Link
                to="/customer/profile?tab=vault"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[var(--brand-950)] hover:bg-[var(--surface-subtle)] rounded-xl transition-colors cursor-pointer"
              >
                <FolderArchive className="w-4 h-4 text-[var(--fin-green)] shrink-0" />
                <div>
                  <p className="leading-tight">Reusable Document Vault</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-normal">Store once, use again & again</p>
                </div>
              </Link>
            </div>
          )}

          {/* Admin Emulation / Hub Navigation */}
          {adminEmulatedRole ? (
            <div className="p-2 border-b border-[var(--border)] bg-amber-50/50">
              <button
                onClick={() => {
                  exitAdminEmulation();
                  setIsOpen(false);
                  navigate('/admin');
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors cursor-pointer border border-amber-300"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="leading-tight">Exit Emulation & Return to Admin Hub</span>
                </div>
              </button>
            </div>
          ) : isMasterAdmin ? (
            <div className="p-2 border-b border-[var(--border)] bg-slate-50">
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-700 shrink-0" />
                <div>
                  <p className="leading-tight">System Admin Console</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-normal">7-Role Emulation Hub & System Controls</p>
                </div>
              </Link>
            </div>
          ) : null}

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
              <span>{firebaseUser ? `Sign Out (${firebaseUser.email})` : 'Reset to Default SME Customer'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
