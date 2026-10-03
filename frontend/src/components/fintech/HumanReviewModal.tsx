import React, { useState } from 'react';
import { api } from '../../api/client';
import { Button } from '../ui/Button';
import {
  CheckCircle2, XCircle, HelpCircle, AlertTriangle, ArrowUpRight,
  ShieldAlert, RefreshCw, MessageSquare, Scale, UserCheck, X
} from 'lucide-react';

export type HumanReviewAction =
  | 'APPROVE'
  | 'DECLINE'
  | 'REQUEST_MORE_INFORMATION'
  | 'OVERRIDE'
  | 'ESCALATE';

export interface HumanReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  journeyId: string;
  applicationId?: string;
  initialAction?: HumanReviewAction;
  onSuccess?: (refreshed: {
    decision: any;
    journey: any;
    nextAction: any;
    reviewState: any;
    auditTimeline: any;
  }) => void;
}

export const HumanReviewModal: React.FC<HumanReviewModalProps> = ({
  isOpen,
  onClose,
  journeyId,
  applicationId,
  initialAction = 'APPROVE',
  onSuccess,
}) => {
  const [selectedAction, setSelectedAction] = useState<HumanReviewAction>(initialAction);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [supportingNote, setSupportingNote] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newInterestRate, setNewInterestRate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const actionsConfig: {
    action: HumanReviewAction;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    badgeBg: string;
  }[] = [
    {
      action: 'APPROVE',
      title: 'APPROVE',
      description: 'Concur with AI recommendation and grant credit sanction.',
      icon: CheckCircle2,
      accentColor: 'var(--fin-green)',
      badgeBg: 'var(--fin-green-bg)',
    },
    {
      action: 'DECLINE',
      title: 'DECLINE',
      description: 'Reject application due to policy violation or risk thresholds.',
      icon: XCircle,
      accentColor: 'var(--fin-coral)',
      badgeBg: 'var(--fin-coral-bg)',
    },
    {
      action: 'REQUEST_MORE_INFORMATION',
      title: 'REQUEST MORE INFORMATION',
      description: 'Return application to borrower / RM for clarification or documents.',
      icon: HelpCircle,
      accentColor: '#d97706',
      badgeBg: '#fef3c7',
    },
    {
      action: 'OVERRIDE',
      title: 'OVERRIDE',
      description: 'Exercise institutional discretion to override model outcome.',
      icon: AlertTriangle,
      accentColor: '#dc2626',
      badgeBg: '#fee2e2',
    },
    {
      action: 'ESCALATE',
      title: 'ESCALATE',
      description: 'Forward case to Senior Risk Manager or Credit Committee.',
      icon: ArrowUpRight,
      accentColor: '#7c3aed',
      badgeBg: '#ede9fe',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation for OVERRIDE
    if (selectedAction === 'OVERRIDE') {
      if (!overrideReason.trim()) {
        setError('A Reason is strictly mandatory when executing an OVERRIDE.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 1. First ensure active review session exists or start one
      let reviewId = `rev_${Date.now()}`;
      try {
        const activeReviews = await api.getJourneyReviews(journeyId);
        const openRev = activeReviews.find(r => r.status === 'OPEN');
        if (openRev) {
          reviewId = openRev.reviewId;
        } else {
          const started = await api.startReview(journeyId, supportingNote || overrideReason);
          if (started && started.reviewId) {
            reviewId = started.reviewId;
          }
        }
      } catch (err) {
        console.warn('Could not query reviews, proceeding with direct submission:', err);
      }

      // 2. Submit to backend
      const payload: any = {
        human_outcome: selectedAction,
        reason_code: selectedAction === 'OVERRIDE' ? overrideReason.trim() : `${selectedAction}_GOVERNED_ACTION`,
        rationale_notes: supportingNote.trim() || overrideReason.trim() || `Human review action: ${selectedAction}`,
        new_approved_amount: newAmount ? parseFloat(newAmount) : undefined,
        new_interest_rate: newInterestRate ? parseFloat(newInterestRate) : undefined,
      };

      await api.submitReview(journeyId, reviewId, payload);

      // 3. Systematically refresh all 5 required backend states:
      // - decision
      // - journey
      // - next action
      // - review state
      // - audit timeline
      const [refreshedDecision, refreshedJourney, refreshedNextAction, refreshedReviews, refreshedReplay] =
        await Promise.all([
          api.getDecision(journeyId).catch(() => null),
          api.getJourney(journeyId).catch(() => null),
          api.getNextBestActions(journeyId).catch(() => null),
          api.getJourneyReviews(journeyId).catch(() => []),
          api.replayDecision(journeyId).catch(() => null),
        ]);

      if (onSuccess) {
        onSuccess({
          decision: refreshedDecision,
          journey: refreshedJourney,
          nextAction: refreshedNextAction,
          reviewState: refreshedReviews,
          auditTimeline: refreshedReplay,
        });
      }

      onClose();
    } catch (err: any) {
      console.error('Human review submission failed:', err);
      setError(err.message || 'Failed to submit review action to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white border-2 border-[var(--brand-950)] shadow-[6px_6px_0px_#0A1F20] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-gradient-to-r from-white to-[var(--surface-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-50)] text-[var(--brand-900)] flex items-center justify-center border border-[var(--brand-200)]">
              <UserCheck className="w-5 h-5 text-[var(--brand-800)]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--brand-700)]">
                Separation of Duties & Governance (Part 39)
              </span>
              <h2 className="text-lg font-black text-[var(--brand-950)] tracking-tight">
                Institutional Human Review
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--brand-950)] hover:bg-[var(--surface-subtle)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-[var(--fin-coral-bg)] border border-[var(--fin-coral)]/40 text-xs text-[var(--fin-coral)] flex items-start gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Selector Grid */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-[var(--brand-950)] block">
              Select Human Review Action <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {actionsConfig.map(cfg => {
                const isSelected = selectedAction === cfg.action;
                const Icon = cfg.icon;
                return (
                  <div
                    key={cfg.action}
                    onClick={() => setSelectedAction(cfg.action)}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-[var(--brand-950)] bg-white shadow-[3px_3px_0px_#0A1F20] ring-1 ring-[var(--brand-950)]'
                        : 'border-[var(--border)] bg-white hover:border-[var(--brand-400)] hover:bg-[var(--surface-subtle)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: cfg.badgeBg, color: cfg.accentColor }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-black tracking-tight text-[var(--brand-950)]">
                        {cfg.title}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] font-medium leading-relaxed pl-7">
                      {cfg.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mandatory Reason for OVERRIDE */}
          {selectedAction === 'OVERRIDE' && (
            <div className="p-4 rounded-xl bg-[#fff1f2] border-2 border-[#f43f5e]/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-[#9f1239]">
                <AlertTriangle className="w-4 h-4 text-[#e11d48]" />
                <span>OVERRIDE GOVERNANCE REQUIREMENTS</span>
              </div>
              <p className="text-[11px] text-[#881337] leading-relaxed">
                Institutional credit policy strictly requires a formalized reason for modifying AI model determinations.
              </p>

              <div>
                <label className="text-[11px] font-bold text-[var(--brand-950)] block mb-1">
                  Reason <span className="text-red-600 font-black">* (Strictly Required)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. COMMERCIAL_COLLATERAL_PLEDGED or TIER_1_CORPORATE_GUARANTEE"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:border-[#e11d48] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-[var(--brand-950)] block mb-1">
                    Override Approved Amount (₹ optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 2500000"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--brand-800)] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--brand-950)] block mb-1">
                    Override Interest Rate (% optional)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    placeholder="e.g. 10.5"
                    value={newInterestRate}
                    onChange={(e) => setNewInterestRate(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--brand-800)] font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Optional Supporting Note */}
          <div>
            <label className="text-xs font-bold text-[var(--brand-950)] block mb-1">
              Supporting Note <span className="text-[10px] text-[var(--text-muted)] font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Provide background rationale, mitigating evidence citations, or operational context..."
              value={supportingNote}
              onChange={(e) => setSupportingNote(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] focus:bg-white focus:outline-none focus:border-[var(--brand-700)] leading-relaxed"
            />
          </div>

          {/* Governance Notice */}
          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-[var(--brand-700)]" />
              Direct Backend Mutation · Audit Event Logged · Zero Frontend Faking
            </span>
            <span className="font-mono font-bold text-[var(--brand-900)]">
              {journeyId}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              leftIcon={isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : undefined}
            >
              {isSubmitting ? 'Recording Audit Event...' : `Execute ${selectedAction}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
