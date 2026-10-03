import React from 'react';

export interface ProgressProps {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  sublabel?: string;
  variant?: 'teal' | 'green' | 'amber' | 'coral';
  size?: 'sm' | 'md' | 'lg';
  showPercent?: boolean;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  label,
  sublabel,
  variant = 'teal',
  size = 'md',
  showPercent = false,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const heightStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  const variantStyles = {
    teal: 'bg-[var(--brand-600)]',
    green: 'bg-[var(--fin-green)]',
    amber: 'bg-[var(--fin-amber)]',
    coral: 'bg-[var(--fin-coral)]',
  };

  return (
    <div className="w-full space-y-1.5">
      {(label || showPercent) && (
        <div className="flex justify-between items-center text-xs">
          {label && <span className="font-semibold text-[var(--text-primary)]">{label}</span>}
          {showPercent && (
            <span className="font-bold text-[var(--text-muted)] text-[11px]">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-[var(--surface-subtle)] border border-[var(--border)] rounded-full overflow-hidden ${heightStyles[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${variantStyles[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {sublabel && (
        <p className="text-[10px] text-[var(--text-muted)]">{sublabel}</p>
      )}
    </div>
  );
};
