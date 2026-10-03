import React from 'react';

export type StatusType = 'online' | 'busy' | 'warning' | 'danger' | 'offline';

export interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  sublabel?: string;
  pulse?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  sublabel,
  pulse = false,
}) => {
  const colorMap: Record<StatusType, { dot: string; pulseBg: string }> = {
    online: { dot: 'bg-[var(--fin-green)]', pulseBg: 'bg-[var(--fin-green)]/40' },
    busy: { dot: 'bg-[var(--fin-blue)]', pulseBg: 'bg-[var(--fin-blue)]/40' },
    warning: { dot: 'bg-[var(--fin-amber)]', pulseBg: 'bg-[var(--fin-amber)]/40' },
    danger: { dot: 'bg-[var(--fin-coral)]', pulseBg: 'bg-[var(--fin-coral)]/40' },
    offline: { dot: 'bg-[var(--text-muted)]', pulseBg: 'bg-[var(--text-muted)]/40' },
  };

  const { dot, pulseBg } = colorMap[status];

  return (
    <div className="inline-flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        {pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseBg}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dot}`} />
      </span>
      {label && (
        <span className="text-xs font-semibold text-[var(--text-primary)]">
          {label}
        </span>
      )}
      {sublabel && (
        <span className="text-[11px] text-[var(--text-muted)]">
          {sublabel}
        </span>
      )}
    </div>
  );
};
