import React from 'react';
import { NextBestAction } from '../../types';
import { Compass, ShieldCheck, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

export interface NextActionCardProps {
  action: NextBestAction;
  onExecute?: () => void;
  className?: string;
}

export const NextActionCard: React.FC<NextActionCardProps> = ({
  action,
  onExecute,
  className = '',
}) => {
  const isSafe = action.safe_guardrail_status === 'SAFE';

  return (
    <div
      className={`p-5 rounded-2xl bg-white border-2 border-[var(--brand-950)] shadow-[3px_3px_0px_#0A1F20] ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)] flex items-center gap-1">
              <Compass className="w-3 h-3 text-[var(--brand-600)]" /> Safe Action Agent
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isSafe
                  ? 'bg-[var(--fin-green-bg)] text-[var(--fin-green)] border-[var(--fin-green)]/30'
                  : 'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border-[var(--fin-amber)]/30'
              }`}
            >
              Guardrail Verified ({(action.safety_confidence * 100).toFixed(0)}%)
            </span>
          </div>

          <h4 className="text-base font-black text-[var(--brand-950)] tracking-tight">
            {action.title}
          </h4>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {action.description}
          </p>
        </div>

        {onExecute && (
          <Button
            variant="brutal"
            size="sm"
            onClick={onExecute}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            className="shrink-0"
          >
            {action.cta_label}
          </Button>
        )}
      </div>
    </div>
  );
};
