import React from 'react';
import { JourneyStage } from '../../types';
import { Check, Clock, AlertTriangle, ShieldCheck, FileText, CheckCircle2, Award, Zap } from 'lucide-react';

export interface JourneyStepperProps {
  currentStage: JourneyStage;
  className?: string;
  onSelectStage?: (stage: JourneyStage) => void;
}

const STAGES: { id: JourneyStage; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'INTENT_CAPTURE', label: 'Intent', desc: 'Borrower Need', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'EVIDENCE_COLLECTION', label: 'Evidence', desc: 'Bank & GST Ingestion', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'VERIFICATION', label: 'Verification', desc: 'OCR & Provenance', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { id: 'RISK_ASSESSMENT', label: 'Risk Scoring', desc: 'ML & Hard Rules', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { id: 'EXPLAINABLE_DECISION', label: 'Decision', desc: 'RAG Grounded Sanction', icon: <Award className="w-3.5 h-3.5" /> },
  { id: 'NEXT_BEST_ACTION', label: 'Next Action', desc: 'Guardrail Agent', icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'SANCTIONED', label: 'Sanction', desc: 'Resolution / Disbursed', icon: <Check className="w-3.5 h-3.5" /> },
];

export const JourneyStepper: React.FC<JourneyStepperProps> = ({
  currentStage,
  className = '',
  onSelectStage,
}) => {
  const stageOrder: JourneyStage[] = [
    'INTENT_CAPTURE',
    'EVIDENCE_COLLECTION',
    'VERIFICATION',
    'RISK_ASSESSMENT',
    'EXPLAINABLE_DECISION',
    'NEXT_BEST_ACTION',
    'SANCTIONED',
  ];

  const normalizedCurrent = currentStage === 'HUMAN_REVIEW' ? 'RISK_ASSESSMENT' : currentStage === 'REJECTED' ? 'EXPLAINABLE_DECISION' : currentStage;
  const currentIndex = stageOrder.indexOf(normalizedCurrent);

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Canonical 7-Stage Journey State Machine
          </h4>
          <p className="text-sm font-extrabold text-[var(--brand-950)] mt-0.5">
            Active: <span className="text-[var(--brand-700)]">{currentStage.replace(/_/g, ' ')}</span>
          </p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]">
          Stage {Math.max(1, currentIndex + 1)} of 7
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative">
        <div className="hidden sm:block absolute top-4 left-6 right-6 h-1 bg-[var(--border)] z-0 rounded-full" />
        <div
          className="hidden sm:block absolute top-4 left-6 h-1 bg-[var(--brand-700)] z-0 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, (currentIndex / (stageOrder.length - 1)) * 92))}%` }}
        />

        <div className="grid grid-cols-2 sm:grid-cols-7 gap-3 sm:gap-2 relative z-10">
          {STAGES.map((s, index) => {
            const isCompleted = index < currentIndex || currentStage === 'SANCTIONED';
            const isCurrent = s.id === normalizedCurrent;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectStage?.(s.id)}
                className={`flex sm:flex-col items-center sm:text-center gap-2.5 p-2 rounded-xl border transition-all text-left sm:text-center ${
                  isCurrent
                    ? 'bg-[var(--brand-50)] border-2 border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20]'
                    : isCompleted
                    ? 'bg-white border-[var(--brand-200)] text-[var(--text-primary)]'
                    : 'bg-[var(--surface-subtle)]/60 border-[var(--border)] text-[var(--text-muted)] opacity-60'
                }`}
              >
                {/* Step Circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-[var(--brand-950)] text-white shadow-xs'
                      : isCompleted
                      ? 'bg-[var(--fin-green)] text-white'
                      : 'bg-white border border-[var(--border-strong)] text-[var(--text-muted)]'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : s.icon}
                </div>

                <div className="min-w-0">
                  <p className={`text-[11px] font-bold leading-tight truncate ${isCurrent ? 'text-[var(--brand-950)]' : ''}`}>
                    {s.label}
                  </p>
                  <p className="text-[9px] text-[var(--text-muted)] truncate hidden sm:block">
                    {s.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
