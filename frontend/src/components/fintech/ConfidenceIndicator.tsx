import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export interface ConfidenceIndicatorProps {
  confidence: number; // 0 to 1 or 0 to 100
  label?: string;
  showBar?: boolean;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  label = 'AI Confidence',
  showBar = true,
}) => {
  // Normalize to 0-100
  const normalized = confidence <= 1 ? confidence * 100 : confidence;
  const isHigh = normalized >= 90;
  const isMed = normalized >= 70 && normalized < 90;

  const color = isHigh
    ? 'text-[var(--fin-green)]'
    : isMed
    ? 'text-[var(--fin-amber)]'
    : 'text-[var(--fin-coral)]';

  const barBg = isHigh
    ? 'bg-[var(--fin-green)]'
    : isMed
    ? 'bg-[var(--fin-amber)]'
    : 'bg-[var(--fin-coral)]';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[var(--text-muted)] text-[11px] flex items-center gap-1">
          {isHigh ? (
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--fin-green)]" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-[var(--fin-amber)]" />
          )}
          {label}
        </span>
        <span className={`font-mono font-bold ${color}`}>
          {normalized.toFixed(0)}%
        </span>
      </div>

      {showBar && (
        <div className="w-full bg-[var(--surface-subtle)] border border-[var(--border)] rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barBg}`}
            style={{ width: `${Math.min(100, Math.max(0, normalized))}%` }}
          />
        </div>
      )}
    </div>
  );
};
