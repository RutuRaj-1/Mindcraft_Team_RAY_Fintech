import React from 'react';
import { Database, UserCheck, ShieldCheck, CheckCircle2, Hash } from 'lucide-react';

export interface AuditEvent {
  audit_id: string;
  timestamp: string;
  actor_id: string;
  actor_role: string;
  action: string;
  details: Record<string, any>;
  sha256_hash?: string;
}

export interface AuditTimelineProps {
  events: AuditEvent[];
  className?: string;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({
  events,
  className = '',
}) => {
  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-white border border-[var(--border)] rounded-xl">
        No cryptographic audit events recorded yet for this journey.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {events.map((evt, idx) => (
        <div
          key={evt.audit_id || idx}
          className="p-3.5 rounded-xl bg-white border border-[var(--border)] shadow-xs hover:border-[var(--brand-300)] transition-all"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]">
                {evt.action}
              </span>
              <span className="text-xs font-bold text-[var(--brand-950)]">
                {evt.actor_role} ({evt.actor_id})
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">
              {new Date(evt.timestamp).toLocaleString()}
            </span>
          </div>

          <div className="p-2 rounded bg-[var(--surface-subtle)] text-[11px] font-mono text-[var(--text-secondary)] overflow-x-auto">
            {JSON.stringify(evt.details)}
          </div>

          {evt.sha256_hash && (
            <div className="mt-2 flex items-center gap-1 text-[9px] font-mono text-[var(--text-muted)]">
              <Hash className="w-3 h-3 text-[var(--brand-600)]" />
              <span>Immutable Hash: {evt.sha256_hash}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
