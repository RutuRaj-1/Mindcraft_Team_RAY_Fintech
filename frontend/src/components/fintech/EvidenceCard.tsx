import React from 'react';
import { EvidenceItem } from '../../types';
import { ShieldCheck, Hash, Eye, Sparkles } from 'lucide-react';
import { ConfidenceIndicator } from './ConfidenceIndicator';

export interface EvidenceCardProps {
  evidence: EvidenceItem;
  onInspect?: () => void;
  className?: string;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidence,
  onInspect,
  className = '',
}) => {
  return (
    <div
      className={`p-4 rounded-xl bg-white border border-[var(--border)] hover:border-[var(--brand-400)] transition-all shadow-xs ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Verified Field
          </span>
          <h4 className="text-xs font-black text-[var(--brand-950)] mt-0.5">
            {evidence.field_name}
          </h4>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--fin-green-bg)] text-[var(--fin-green)] border border-[var(--fin-green)]/30 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Anchored
        </span>
      </div>

      {/* Extracted Value */}
      <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] mb-3">
        <span className="text-sm font-extrabold text-[var(--brand-900)]">
          {typeof evidence.field_value === 'number' && evidence.field_value > 1000
            ? `₹${evidence.field_value.toLocaleString('en-IN')}`
            : String(evidence.field_value)}
        </span>
      </div>

      {/* Confidence */}
      <div className="mb-3">
        <ConfidenceIndicator confidence={evidence.confidence} label="Extraction Accuracy" />
      </div>

      {/* Metadata strip */}
      <div className="pt-2.5 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <div className="flex items-center gap-1 font-mono">
          <Hash className="w-3 h-3 text-[var(--brand-600)]" />
          <span>SHA-256: {evidence.sha256_source_hash.substring(0, 10)}...</span>
        </div>

        <span>Page {evidence.page_number}</span>
      </div>
    </div>
  );
};
