import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  benchmark?: string;
  delta?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  icon?: React.ReactNode;
  status?: 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  benchmark,
  delta,
  icon,
  status,
  className = '',
}) => {
  const statusBorder = status === 'success'
    ? 'border-t-4 border-t-[var(--fin-green)]'
    : status === 'warning'
    ? 'border-t-4 border-t-[var(--fin-amber)]'
    : status === 'danger'
    ? 'border-t-4 border-t-[var(--fin-coral)]'
    : status === 'info'
    ? 'border-t-4 border-t-[var(--fin-blue)]'
    : '';

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs hover:border-[var(--brand-300)] transition-all ${statusBorder} ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-[var(--text-muted)] tracking-tight">
          {label}
        </span>
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-[var(--surface-subtle)] text-[var(--brand-700)] flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {value}
        </span>
      </div>

      {(benchmark || delta) && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]/60 text-[11px]">
          {benchmark && (
            <span className="text-[var(--text-muted)] font-medium">
              {benchmark}
            </span>
          )}
          {delta && (
            <span
              className={`font-bold flex items-center gap-0.5 ml-auto ${
                delta.isPositive === undefined
                  ? 'text-[var(--text-muted)]'
                  : delta.isPositive
                  ? 'text-[var(--fin-green)]'
                  : 'text-[var(--fin-coral)]'
              }`}
            >
              {delta.isPositive === true && <TrendingUp className="w-3 h-3" />}
              {delta.isPositive === false && <TrendingDown className="w-3 h-3" />}
              {delta.isPositive === undefined && <Minus className="w-3 h-3" />}
              {delta.value} {delta.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
