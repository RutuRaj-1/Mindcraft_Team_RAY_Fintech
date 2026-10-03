import React from 'react';
import { JourneyStage } from '../../types';
import {
  Lightbulb, FolderSearch, ScanLine, BrainCircuit,
  Sparkles, Compass, Award, ShieldAlert
} from 'lucide-react';

interface StepperProps {
  currentStage: JourneyStage;
  onSelectStage?: (stage: JourneyStage) => void;
}

const STAGES: {
  key: JourneyStage;
  label: string;
  short: string;
  desc: string;
  Icon: React.ElementType;
}[] = [
  { key: 'INTENT_CAPTURE',     label: 'Intent',      short: '1',  desc: 'Need & Profile',    Icon: Lightbulb     },
  { key: 'EVIDENCE_COLLECTION',label: 'Evidence',    short: '2',  desc: 'Document Upload',   Icon: FolderSearch  },
  { key: 'VERIFICATION',       label: 'Verify',      short: '3',  desc: 'OCR & Provenance',  Icon: ScanLine      },
  { key: 'RISK_ASSESSMENT',    label: 'Risk & Rules',short: '4',  desc: 'Hard Gates + ML',   Icon: BrainCircuit  },
  { key: 'EXPLAINABLE_DECISION',label: 'Decision',   short: '5',  desc: 'RAG + SHAP',        Icon: Sparkles      },
  { key: 'NEXT_BEST_ACTION',   label: 'Next Action', short: '6',  desc: 'Safe Action Agent', Icon: Compass       },
  { key: 'SANCTIONED',         label: 'Sanctioned',  short: '7',  desc: 'Offer & Disburse',  Icon: Award         },
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
  REJECTED: 6,
};

export const JourneyStepper: React.FC<StepperProps> = ({ currentStage, onSelectStage }) => {
  const currentIndex = STAGE_ORDER[currentStage] ?? 0;
  const isRejected = currentStage === 'REJECTED';
  const isHumanReview = currentStage === 'HUMAN_REVIEW';

  return (
    <div className="card px-4 py-4 sm:px-6 sm:py-5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Journey Orchestration
          </span>
          {isHumanReview && (
            <span className="badge badge-amber flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Human Review
            </span>
          )}
          {isRejected && (
            <span className="badge badge-coral">Rejected</span>
          )}
        </div>
        <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--surface-subtle)] px-2 py-1 rounded-full border border-[var(--border)]">
          Step {Math.min(currentIndex + 1, 7)} of 7
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative">
        {/* Background connector line */}
        <div
          className="absolute top-[18px] left-[18px] right-[18px] h-[2px] bg-[var(--border)]"
          style={{ zIndex: 0 }}
        />
        {/* Filled connector line */}
        <div
          className="absolute top-[18px] left-[18px] h-[2px] transition-all duration-700 ease-out"
          style={{
            zIndex: 1,
            width: currentIndex === 0 ? '0%' : `${Math.min((currentIndex / (STAGES.length - 1)) * 100, 100)}%`,
            background: isRejected
              ? 'var(--fin-coral)'
              : 'linear-gradient(90deg, var(--brand-700), var(--brand-400))',
          }}
        />

        {/* Steps */}
        <div className="relative flex items-start justify-between overflow-x-auto gap-1 pb-1" style={{ zIndex: 2 }}>
          {STAGES.map((s, idx) => {
            const isCompleted = idx < currentIndex || (currentStage === 'SANCTIONED' && idx < 7);
            const isCurrent = idx === currentIndex && !isRejected;
            const isUpcoming = idx > currentIndex;

            let iconBg: string;
            let iconText: string;
            let ringColor = 'transparent';
            let labelColor: string;

            if (isRejected && idx === currentIndex) {
              iconBg = 'var(--fin-coral)'; iconText = 'white'; labelColor = 'var(--fin-coral)'; ringColor = 'rgba(204,75,62,0.2)';
            } else if (isHumanReview && idx === 5) {
              iconBg = 'var(--fin-amber)'; iconText = 'white'; labelColor = 'var(--fin-amber)'; ringColor = 'rgba(201,138,16,0.2)';
            } else if (isCompleted) {
              iconBg = 'var(--fin-green)'; iconText = 'white'; labelColor = 'var(--fin-green)';
            } else if (isCurrent) {
              iconBg = 'var(--brand-700)'; iconText = 'white'; labelColor = 'var(--brand-800)'; ringColor = 'rgba(61,165,166,0.25)';
            } else {
              iconBg = 'var(--surface-subtle)'; iconText = 'var(--text-muted)'; labelColor = 'var(--text-muted)';
            }

            return (
              <button
                key={s.key}
                onClick={() => onSelectStage?.(s.key)}
                className="flex flex-col items-center gap-1.5 flex-1 min-w-[64px] group cursor-pointer"
                style={{ background: 'none', border: 'none', padding: '0 2px' }}
              >
                {/* Icon Circle */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                  style={{
                    background: iconBg,
                    color: iconText,
                    boxShadow: isCurrent
                      ? `0 0 0 5px ${ringColor}, 0 2px 8px rgba(35,114,119,0.3)`
                      : isCompleted
                      ? '0 2px 6px rgba(14,155,109,0.3)'
                      : 'none',
                    border: isUpcoming ? '1.5px dashed var(--border-strong)' : 'none',
                  }}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l3.5 3.5L13 4.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <s.Icon
                      className={`w-3.5 h-3.5 ${isCurrent ? 'animate-pulse' : ''}`}
                      strokeWidth={isCurrent ? 2.5 : 2}
                    />
                  )}
                </div>

                {/* Label */}
                <div className="text-center">
                  <p
                    className="text-[10px] font-bold leading-tight whitespace-nowrap transition-colors"
                    style={{ color: labelColor, fontFamily: 'Inter, sans-serif' }}
                  >
                    {s.label}
                  </p>
                  <p className="text-[9px] text-[var(--text-muted)] leading-tight hidden sm:block whitespace-nowrap">
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
