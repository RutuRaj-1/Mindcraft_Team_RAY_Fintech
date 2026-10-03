import React from 'react';
import { Cpu, ShieldCheck, Scale, ClipboardCheck } from 'lucide-react';

export type GovernanceTier = 'MODEL_OUTPUT' | 'INDEPENDENT_REVIEW' | 'AUTHORIZED_DECISION' | 'INDEPENDENT_AUDIT';

export interface GovernanceBadgeProps {
  tier: GovernanceTier;
  actor?: string;
  className?: string;
  size?: 'sm' | 'md';
}

const TIER_CONFIG: Record<GovernanceTier, {
  label: string;
  badge: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: React.ReactNode;
}> = {
  MODEL_OUTPUT: {
    label: 'Model Output',
    badge: 'Automated AI Output',
    bgColor: 'bg-[var(--brand-50)]',
    textColor: 'text-[var(--brand-800)]',
    borderColor: 'border-[var(--brand-200)]',
    icon: <Cpu className="w-3.5 h-3.5 shrink-0" />,
  },
  INDEPENDENT_REVIEW: {
    label: 'Independent Review',
    badge: 'Second-Line Risk Review',
    bgColor: 'bg-[var(--fin-amber-bg)]',
    textColor: 'text-[var(--fin-amber)]',
    borderColor: 'border-[var(--fin-amber)]/30',
    icon: <ShieldCheck className="w-3.5 h-3.5 shrink-0" />,
  },
  AUTHORIZED_DECISION: {
    label: 'Authorized Decision',
    badge: 'Final Sanction Authority',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-300',
    icon: <Scale className="w-3.5 h-3.5 shrink-0" />,
  },
  INDEPENDENT_AUDIT: {
    label: 'Independent Audit',
    badge: 'Third-Line Assurance',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-300',
    icon: <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />,
  },
};

/**
 * Part 61 — FinTech Governance Tier Indicator
 * Visibly distinguishes:
 * - Model Output (Automated AI)
 * - Independent Review (Risk Officer)
 * - Authorized Decision (Credit Approver)
 * - Independent Audit (Audit Officer)
 */
export const GovernanceBadge: React.FC<GovernanceBadgeProps> = ({
  tier,
  actor,
  className = '',
  size = 'md',
}) => {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.MODEL_OUTPUT;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor} text-xs font-bold shadow-2xs ${className}`}
      title={`${cfg.label}: ${cfg.badge}${actor ? ` (${actor})` : ''}`}
    >
      {cfg.icon}
      <span className="font-extrabold tracking-tight uppercase text-[10px]">
        {cfg.label}
      </span>
      {actor && (
        <>
          <span className="opacity-40">•</span>
          <span className="font-medium text-[11px] opacity-90 truncate max-w-[120px]">{actor}</span>
        </>
      )}
    </div>
  );
};
