import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Bell, CheckCheck, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export const NotificationDrawer: React.FC = () => {
  const {
    notifications,
    isDrawerOpen,
    closeDrawer,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const iconMap = {
    INFO: <Info className="w-4 h-4 text-[var(--fin-blue)]" />,
    SUCCESS: <CheckCircle2 className="w-4 h-4 text-[var(--fin-green)]" />,
    WARNING: <AlertTriangle className="w-4 h-4 text-[var(--fin-amber)]" />,
    ALERT: <AlertCircle className="w-4 h-4 text-[var(--fin-coral)]" />,
  };

  const bgMap = {
    INFO: 'bg-[var(--fin-blue-bg)]',
    SUCCESS: 'bg-[var(--fin-green-bg)]',
    WARNING: 'bg-[var(--fin-amber-bg)]',
    ALERT: 'bg-[var(--fin-coral-bg)]',
  };

  return (
    <Drawer
      isOpen={isDrawerOpen}
      onClose={closeDrawer}
      title="System Audit & Journey Telemetry"
      subtitle="Real-time OCR events, underwriting decisions, and fraud alerts"
      width="md"
      footer={
        <div className="w-full flex items-center justify-between">
          <Button
            variant="ghost"
            size="xs"
            onClick={markAllAsRead}
            leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
          >
            Mark all as read
          </Button>
          <Button variant="secondary" size="xs" onClick={closeDrawer}>
            Dismiss
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No new telemetry notifications.
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => markAsRead(item.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                item.read
                  ? 'bg-white border-[var(--border)] opacity-70'
                  : 'bg-[var(--surface-subtle)] border-1.5 border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bgMap[item.type]}`}>
                  {iconMap[item.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-xs font-bold text-[var(--brand-950)] truncate">
                      {item.title}
                    </h4>
                    <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {item.message}
                  </p>
                  {item.journeyId && (
                    <span className="inline-block mt-2 font-mono text-[9px] bg-white border border-[var(--border)] px-1.5 py-0.5 rounded text-[var(--brand-700)]">
                      {item.journeyId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Drawer>
  );
};
