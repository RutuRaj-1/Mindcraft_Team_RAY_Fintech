import React from 'react';
import { JourneyStage } from '../../types';
import { Check, Clock, AlertTriangle, ShieldCheck, FileText, CheckCircle2, Award, Zap } from 'lucide-react';

export type StageSemanticStatus = 'completed' | 'active' | 'blocked' | 'requires review' | 'pending';

export interface JourneyStepperProps {
  currentStage: string;
  status?: string;
  className?: string;
  onSelectStage?: (stage: JourneyStage) => void;
  stageStatuses?: Partial<Record<string, StageSemanticStatus>>;
}

const CANONICAL_STAGES = [
  { id: 'INTENT_CAPTURE', canonical: 'INTENT', label: 'Intent', desc: 'Borrower Need', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'EVIDENCE_COLLECTION', canonical: 'EVIDENCE', label: 'Evidence', desc: 'Bank & GST Ingestion', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'VERIFICATION', canonical: 'VERIFICATION', label: 'Verification', desc: 'OCR & Provenance', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { id: 'RISK_ASSESSMENT', canonical: 'RISK', label: 'Risk', desc: 'ML & Hard Rules', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { id: 'EXPLAINABLE_DECISION', canonical: 'DECISION', label: 'Decision', desc: 'RAG Grounded Sanction', icon: <Award className="w-3.5 h-3.5" /> },
  { id: 'NEXT_BEST_ACTION', canonical: 'NEXT ACTION', label: 'Next Action', desc: 'Guardrail Agent', icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'SANCTIONED', canonical: 'RESOLUTION', label: 'Resolution', desc: 'Disbursal & Seal', icon: <Check className="w-3.5 h-3.5" /> },
];

export const JourneyStepper: React.FC<JourneyStepperProps> = ({
  currentStage,
  status = 'ACTIVE',
  className = '',
  onSelectStage,
  stageStatuses,
}) => {
  const stageKeys = CANONICAL_STAGES.map((s) => s.id);

  // Normalize human review or rejected to appropriate pipeline phase
  const normalizedCurrent =
    currentStage === 'HUMAN_REVIEW'
      ? 'RISK_ASSESSMENT'
      : currentStage === 'REJECTED'
      ? 'EXPLAINABLE_DECISION'
      : currentStage === 'COMPLETED' || currentStage === 'SANCTION_AND_DISBURSAL'
      ? 'SANCTIONED'
      : currentStage;

  const currentIndex = stageKeys.indexOf(normalizedCurrent);

  const getSemanticStatus = (stageId: string, index: number): StageSemanticStatus => {
    if (stageStatuses?.[stageId]) return stageStatuses[stageId]!;

    if (currentStage === 'COMPLETED' || currentStage === 'SANCTIONED') {
      return 'completed';
    }

    if (index < currentIndex) {
      return 'completed';
    }

    if (index === currentIndex) {
      if (status === 'FLAGGED' || status === 'BLOCKED') return 'blocked';
      if (status === 'NEEDS_REVIEW' || currentStage === 'HUMAN_REVIEW') return 'requires review';
      return 'active';
    }

    return 'pending';
  };

  const getStatusBadge = (semStatus: StageSemanticStatus) => {
    switch (semStatus) {
      case 'completed':
        return <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--fin-green-bg)] text-[var(--fin-green)] border border-[var(--fin-green)]/30">Completed</span>;
      case 'active':
        return <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-300)] animate-pulse">Active</span>;
      case 'blocked':
        return <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--fin-coral-bg)] text-[var(--fin-coral)] border border-[var(--fin-coral)]/30">Blocked</span>;
      case 'requires review':
        return <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border border-[var(--fin-amber)]/30">Requires Review</span>;
      case 'pending':
      default:
        return <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200">Pending</span>;
    }
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">
              Backend-Driven Canonical Journey State Machine
            </span>
            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-[var(--surface-subtle)] text-[var(--brand-950)] border border-[var(--border)]">
              Live Stage: {currentStage.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Stage {Math.max(1, currentIndex + 1)} of 7 · System Status: <strong className="text-[var(--brand-950)]">{status}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(getSemanticStatus(normalizedCurrent, currentIndex))}
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative">
        <div className="hidden sm:block absolute top-4 left-6 right-6 h-1 bg-[var(--border)] z-0 rounded-full" />
        <div
          className="hidden sm:block absolute top-4 left-6 h-1 bg-[var(--brand-700)] z-0 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, (currentIndex / (stageKeys.length - 1)) * 92))}%` }}
        />

        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 sm:gap-2 relative z-10">
          {CANONICAL_STAGES.map((s, index) => {
            const semStatus = getSemanticStatus(s.id, index);
            const isCurrent = s.id === normalizedCurrent;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectStage?.(s.id as JourneyStage)}
                className={`flex flex-col items-center text-center gap-1.5 p-2 rounded-xl border transition-all text-center ${
                  isCurrent
                    ? 'bg-[var(--brand-50)] border-2 border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20]'
                    : semStatus === 'completed'
                    ? 'bg-white border-[var(--brand-200)] text-[var(--text-primary)]'
                    : semStatus === 'blocked'
                    ? 'bg-[var(--fin-coral-bg)]/40 border-[var(--fin-coral)] text-[var(--fin-coral)]'
                    : semStatus === 'requires review'
                    ? 'bg-[var(--fin-amber-bg)]/40 border-[var(--fin-amber)] text-[var(--fin-amber)]'
                    : 'bg-[var(--surface-subtle)]/60 border-[var(--border)] text-[var(--text-muted)] opacity-60'
                }`}
              >
                {/* Step Circle */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-[var(--brand-950)] text-white shadow-xs ring-2 ring-[var(--brand-700)]/40'
                      : semStatus === 'completed'
                      ? 'bg-[var(--fin-green)] text-white'
                      : semStatus === 'blocked'
                      ? 'bg-[var(--fin-coral)] text-white'
                      : semStatus === 'requires review'
                      ? 'bg-[var(--fin-amber)] text-white'
                      : 'bg-white border border-[var(--border-strong)] text-[var(--text-muted)]'
                  }`}
                >
                  {semStatus === 'completed' ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : semStatus === 'blocked' ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : (
                    s.icon
                  )}
                </div>

                <div className="w-full">
                  <p className="text-[11px] font-black leading-tight truncate text-[var(--brand-950)]">
                    {s.canonical}
                  </p>
                  <p className="text-[9px] text-[var(--text-muted)] truncate hidden sm:block">
                    {s.label}
                  </p>
                  <div className="mt-1 flex justify-center">
                    {getStatusBadge(semStatus)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
