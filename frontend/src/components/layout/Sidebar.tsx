import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRoleNavigation } from '../../config/navigation';
import {
  Compass, FilePlus, GitCommit, FileText, Award,
  Users, ShieldAlert, Cpu, Sparkles, Home, ChevronRight, CheckCircle2, RotateCcw,
  Building2, Scale, ClipboardCheck, TrendingUp, LayoutDashboard, Clock, AlertTriangle,
  ShieldCheck, MessageSquare, Send, FileSpreadsheet, Activity, ArrowRightLeft,
  PhoneCall, Layers, ListFilter, AlertOctagon, Network, FileCheck, Share2,
  BookOpen, History, FileCheck2, Gavel, FolderCheck, Shield, Server, Lock,
  Settings, Terminal
} from 'lucide-react';

interface SidebarProps {
  isCollapsed?: boolean;
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
  LayoutDashboard: <LayoutDashboard className="w-4 h-4" />,
  Clock: <Clock className="w-4 h-4" />,
  AlertTriangle: <AlertTriangle className="w-4 h-4" />,
  ShieldCheck: <ShieldCheck className="w-4 h-4" />,
  MessageSquare: <MessageSquare className="w-4 h-4" />,
  Send: <Send className="w-4 h-4" />,
  FileSpreadsheet: <FileSpreadsheet className="w-4 h-4" />,
  Activity: <Activity className="w-4 h-4" />,
  ArrowRightLeft: <ArrowRightLeft className="w-4 h-4" />,
  PhoneCall: <PhoneCall className="w-4 h-4" />,
  Layers: <Layers className="w-4 h-4" />,
  ListFilter: <ListFilter className="w-4 h-4" />,
  AlertOctagon: <AlertOctagon className="w-4 h-4" />,
  Network: <Network className="w-4 h-4" />,
  FileCheck: <FileCheck className="w-4 h-4" />,
  Share2: <Share2 className="w-4 h-4" />,
  BookOpen: <BookOpen className="w-4 h-4" />,
  History: <History className="w-4 h-4" />,
  FileCheck2: <FileCheck2 className="w-4 h-4" />,
  Gavel: <Gavel className="w-4 h-4" />,
  FolderCheck: <FolderCheck className="w-4 h-4" />,
  Shield: <Shield className="w-4 h-4" />,
  Server: <Server className="w-4 h-4" />,
  Lock: <Lock className="w-4 h-4" />,
  Settings: <Settings className="w-4 h-4" />,
  Terminal: <Terminal className="w-4 h-4" />,
};

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false }) => {
  const { activeJourneyId, role } = useAuth();

  // Role-aware navigation dynamically derived from enterprise RBAC model
  const visibleSections = getRoleNavigation(role, activeJourneyId);

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
                <span className="shrink-0 text-[var(--brand-700)]">
                  {iconMap[item.iconName] || <Home className="w-4 h-4" />}
                </span>
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
