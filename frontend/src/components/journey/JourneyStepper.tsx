import React from 'react';
import { JourneyStage } from '../../types';
import { Check, CircleDot, Clock, ShieldAlert, Award } from 'lucide-react';

interface StepperProps {
  currentStage: JourneyStage;
  onSelectStage?: (stage: JourneyStage) => void;
}

const STAGES: { key: JourneyStage; label: string; desc: string }[] = [
  { key: 'INTENT_CAPTURE', label: '1. Intent', desc: 'Need & Profile' },
  { key: 'EVIDENCE_COLLECTION', label: '2. Evidence', desc: 'Document Upload' },
  { key: 'VERIFICATION', label: '3. Verification', desc: 'OCR & Provenance' },
  { key: 'RISK_ASSESSMENT', label: '4. Risk & Rules', desc: 'Deterministic + ML' },
  { key: 'EXPLAINABLE_DECISION', label: '5. Decision', desc: 'RAG & SHAP' },
  { key: 'NEXT_BEST_ACTION', label: '6. Next Action', desc: 'Safe Action Agent' },
  { key: 'SANCTIONED', label: '7. Sanction', desc: 'Offer & Disbursement' }
];

const STAGE_ORDER: Record<JourneyStage, number> = {
  INTENT_CAPTURE: 0,
  EVIDENCE_COLLECTION: 1,
  VERIFICATION: 2,
  RISK_ASSESSMENT: 3,
  EXPLAINABLE_DECISION: 4,
  NEXT_BEST_ACTION: 5,
  HUMAN_REVIEW: 5,
  SANCTIONED: 6,
  REJECTED: 6
};

export const JourneyStepper: React.FC<StepperProps> = ({ currentStage, onSelectStage }) => {
  const currentIndex = STAGE_ORDER[currentStage] ?? 0;

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3ECE9] shadow-xs mb-6">
      <div className="flex items-center justify-between overflow-x-auto pb-2 scrollbar-none gap-2">
        {STAGES.map((s, idx) => {
          const isCompleted = idx < currentIndex || currentStage === 'SANCTIONED';
          const isCurrent = idx === currentIndex && currentStage !== 'SANCTIONED';
          const isReview = currentStage === 'HUMAN_REVIEW' && idx === 5;

          return (
            <div
              key={s.key}
              onClick={() => onSelectStage && onSelectStage(s.key)}
              className={`flex-1 min-w-[130px] flex items-center gap-2 cursor-pointer transition-all p-2 rounded-xl ${
                isCurrent
                  ? 'bg-[#EEF8F7] border border-[#CBD9D5]'
                  : isReview
                  ? 'bg-[#FFF6DF] border border-[#D89B22]'
                  : 'hover:bg-[#F7FAF9]'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                  isCompleted
                    ? 'bg-[#169C73] text-white shadow-xs'
                    : isCurrent
                    ? 'bg-[#237277] text-white ring-4 ring-[#D9F0EE]'
                    : isReview
                    ? 'bg-[#D89B22] text-white ring-4 ring-[#FFF6DF]'
                    : 'bg-[#EFF5F3] text-[#687A75] border border-[#CBD9D5]'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : isCurrent ? (
                  <CircleDot className="w-3.5 h-3.5 animate-pulse" />
                ) : isReview ? (
                  <ShieldAlert className="w-3.5 h-3.5" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <div className="truncate">
                <p className={`text-xs font-semibold leading-tight truncate ${
                  isCurrent ? 'text-[#123E40]' : isCompleted ? 'text-[#169C73]' : 'text-[#40524E]'
                }`}>
                  {s.label}
                </p>
                <p className="text-[10px] text-[#687A75] leading-tight truncate">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
