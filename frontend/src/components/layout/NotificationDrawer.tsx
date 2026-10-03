import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import {
  Bell, CheckCheck, Info, CheckCircle2, AlertTriangle,
  AlertCircle, RefreshCw, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ROLE_DRAWER_TITLES: Record<string, string> = {
  CUSTOMER: 'Your Application Updates',
  RM: 'Workflow Notifications',
  RM_SUPERVISOR: 'Operations Alerts',
  RISK_OFFICER: 'Risk & Compliance Alerts',
  RISK_MANAGER: 'Governance Notifications',
  CREDIT_APPROVER: 'Approval Queue Alerts',
  AUDIT_OFFICER: 'Audit & Governance Events',
  SYS_ADMIN: 'System Telemetry',
  ADMIN: 'System Telemetry',
};

const ROLE_DRAWER_SUBTITLES: Record<string, string> = {
  CUSTOMER: 'Decision updates, document requests, and next steps for your application',
  RM: 'New assignments, evidence gaps, SLA warnings, and review requests',
  RM_SUPERVISOR: 'SLA breaches, RM escalations, and team workload alerts',
  RISK_OFFICER: 'High-risk signals, inconsistencies, fraud flags, and review requests',
  RISK_MANAGER: 'Escalations, exceptions, override ratification, and governance events',
  CREDIT_APPROVER: 'Credit packages ready for final sanction and committee review',
  AUDIT_OFFICER: 'Audit findings, override patterns, and governance review triggers',
  SYS_ADMIN: 'Real-time system health, API status, and authentication events',
  ADMIN: 'Real-time system health, API status, and authentication events',
};

export const NotificationDrawer: React.FC = () => {
  const {
    notifications,
    isDrawerOpen,
    closeDrawer,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();
  const { role } = useAuth();

  const iconMap = {
    INFO: <Info className="w-4 h-4 text-[var(--fin-blue)]" />,
    SUCCESS: <CheckCircle2 className="w-4 h-4 text-[var(--fin-green)]" />,
    WARNING: <AlertTriangle className="w-4 h-4 text-[var(--fin-amber)]" />,
    ALERT: <AlertCircle className="w-4 h-4 text-[var(--fin-coral)]" />,
  };

  const bgMap = {
    INFO: 'bg-blue-50',
    SUCCESS: 'bg-[var(--fin-green-bg)]',
    WARNING: 'bg-amber-50',
    ALERT: 'bg-[var(--fin-coral-bg)]',
  };

  const borderMap = {
    INFO: 'border-blue-200',
    SUCCESS: 'border-[var(--fin-green)]/30',
    WARNING: 'border-amber-200',
    ALERT: 'border-[var(--fin-coral)]/30',
  };

  const title = ROLE_DRAWER_TITLES[role] || 'Notifications';
  const subtitle = ROLE_DRAWER_SUBTITLES[role] || 'Live system events and alerts';
  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  return (
    <Drawer
      isOpen={isDrawerOpen}
      onClose={closeDrawer}
      title={title}
      subtitle={subtitle}
      width="md"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={markAllAsRead}
            leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
            disabled={unread.length === 0}
          >
            Mark all read
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="xs"
              onClick={refreshNotifications}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
            <Button variant="secondary" size="xs" onClick={closeDrawer}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] flex items-center justify-center">
              <Bell className="w-6 h-6 text-[var(--text-muted)] opacity-50" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--brand-950)]">All clear</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 max-w-[200px]">
                No new notifications for your role. The system will alert you when action is required.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Unread first */}
            {unread.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">
                  Unread ({unread.length})
                </p>
                {unread.map((item) => (
                  <NotificationCard
                    key={item.id}
                    item={item}
                    onRead={() => markAsRead(item.id)}
                    iconMap={iconMap}
                    bgMap={bgMap}
                    borderMap={borderMap}
                  />
                ))}
              </div>
            )}

            {/* Read notifications */}
            {read.length > 0 && (
              <div className="space-y-2">
                {unread.length > 0 && (
                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1 pt-2 border-t border-[var(--border)]">
                    Earlier
                  </p>
                )}
                {read.map((item) => (
                  <NotificationCard
                    key={item.id}
                    item={item}
                    onRead={() => markAsRead(item.id)}
                    iconMap={iconMap}
                    bgMap={bgMap}
                    borderMap={borderMap}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
};

interface NotificationCardProps {
  item: any;
  onRead: () => void;
  iconMap: Record<string, React.ReactNode>;
  bgMap: Record<string, string>;
  borderMap: Record<string, string>;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  item, onRead, iconMap, bgMap, borderMap
}) => {
  return (
    <div
      onClick={onRead}
      className={`group p-3.5 rounded-xl border transition-all cursor-pointer ${
        item.read
          ? 'bg-white border-[var(--border)] opacity-60 hover:opacity-80'
          : `bg-[var(--surface-subtle)] border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20] hover:shadow-[3px_3px_0px_#0A1F20]`
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bgMap[item.type]} border ${borderMap[item.type]}`}>
          {iconMap[item.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`text-xs font-bold text-[var(--brand-950)] leading-tight ${!item.read ? '' : 'font-semibold'}`}>
              {item.title}
            </h4>
            <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap font-mono shrink-0">
              {item.timestamp}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {item.message}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            {item.category && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white border border-[var(--border)] text-[var(--text-muted)]">
                {item.category}
              </span>
            )}
            {item.journeyId && (
              <span className="font-mono text-[9px] bg-white border border-[var(--border)] px-1.5 py-0.5 rounded text-[var(--brand-700)]">
                {item.journeyId}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
