import React from 'react';
import { RiskBand } from '../../types';
import { ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';

export interface RiskBadgeProps {
  band: RiskBand | string;
  score?: number; // 0 - 1000
  pd?: number; // 0 - 1
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  band,
  score,
  pd,
  size = 'md',
}) => {
  const isLow = band === 'LOW_RISK' || (score && score >= 800);
  const isMed = band === 'MEDIUM_RISK' || (score && score >= 650 && score < 800);

  const config = isLow
    ? {
        label: 'Low Default Risk',
        bg: 'bg-[var(--fin-green-bg)]',
        text: 'text-[var(--fin-green)]',
        border: 'border-[var(--fin-green)]/40',
        icon: <ShieldCheck className="w-3.5 h-3.5" />,
      }
    : isMed
    ? {
        label: 'Moderate Risk',
        bg: 'bg-[var(--fin-amber-bg)]',
        text: 'text-[var(--fin-amber)]',
        border: 'border-[var(--fin-amber)]/40',
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
      }
    : {
        label: 'High Default Risk',
        bg: 'bg-[var(--fin-coral-bg)]',
        text: 'text-[var(--fin-coral)]',
        border: 'border-[var(--fin-coral)]/40',
        icon: <AlertCircle className="w-3.5 h-3.5" />,
      };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-3 py-1 text-xs gap-1.5',
    lg: 'px-4 py-1.5 text-sm gap-2',
  };

  return (
    <div
      className={`inline-flex items-center font-bold rounded-lg border uppercase tracking-tight shadow-xs ${sizeClasses[size]} ${config.bg} ${config.text} ${config.border}`}
    >
      {config.icon}
      <span>{config.label}</span>
      {score !== undefined && (
        <span className="font-mono font-black ml-0.5">({score}/1000)</span>
      )}
      {pd !== undefined && (
        <span className="font-mono text-[10px] ml-0.5 opacity-80">PD: {(pd * 100).toFixed(1)}%</span>
      )}
    </div>
  );
};
