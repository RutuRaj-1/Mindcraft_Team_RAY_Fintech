import React from 'react';
import { DocumentRecord } from '../../types';
import { CheckCircle2, Clock, AlertTriangle, FileText, Hash } from 'lucide-react';

export interface DocumentStatusProps {
  document: DocumentRecord;
  onView?: () => void;
  className?: string;
}

export const DocumentStatus: React.FC<DocumentStatusProps> = ({
  document,
  onView,
  className = '',
}) => {
  const isVerified = document.status === 'VERIFIED';
  const isProcessing = document.status === 'PROCESSING';

  return (
    <div
      className={`p-3.5 rounded-xl bg-white border border-[var(--border)] hover:border-[var(--brand-300)] flex items-center justify-between gap-4 transition-all shadow-xs ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-[var(--brand-50)] text-[var(--brand-700)] flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-[var(--brand-950)] truncate">
            {document.file_name}
          </h4>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mt-0.5">
            <span className="font-semibold text-[var(--brand-700)]">{document.doc_type}</span>
            <span>•</span>
            <span>{document.page_count} pages</span>
            <span>•</span>
            <span>{document.extracted_fields_count} fields extracted</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
            isVerified
              ? 'bg-[var(--fin-green-bg)] text-[var(--fin-green)] border-[var(--fin-green)]/30'
              : isProcessing
              ? 'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border-[var(--fin-amber)]/30'
              : 'bg-[var(--surface-subtle)] text-[var(--text-muted)] border-[var(--border)]'
          }`}
        >
          {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {document.status}
        </span>

        {onView && (
          <button
            onClick={onView}
            className="text-[11px] font-bold text-[var(--brand-700)] hover:underline"
          >
            Inspect
          </button>
        )}
      </div>
    </div>
  );
};
