import React from 'react';
import { DecisionRecord, RiskAssessment } from '../../types';
import { ShieldCheck, Award, ArrowRight, Percent, Clock, DollarSign, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { GovernanceBadge, GovernanceTier } from './GovernanceBadge';

export interface DecisionCardProps {
  decision: DecisionRecord;
  riskAssessment?: RiskAssessment;
  onAcceptOffer?: () => void;
  className?: string;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  decision,
  riskAssessment,
  onAcceptOffer,
  className = '',
}) => {
  const isApproved = decision.outcome === 'APPROVED';
  const isConditional = decision.outcome === 'CONDITIONAL_APPROVAL';

  const outcomeBorder = isApproved
    ? 'border-t-4 border-t-[var(--fin-green)]'
    : isConditional
    ? 'border-t-4 border-t-[var(--fin-amber)]'
    : 'border-t-4 border-t-[var(--fin-coral)]';

  const badgeColor = isApproved
    ? 'bg-[var(--fin-green-bg)] text-[var(--fin-green)] border-[var(--fin-green)]/30'
    : isConditional
    ? 'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border-[var(--fin-amber)]/30'
    : 'bg-[var(--fin-coral-bg)] text-[var(--fin-coral)] border-[var(--fin-coral)]/30';

  // Part 61: Determine authoritative governance tier
  const decLower = (decision.decided_by || '').toLowerCase();
  const governanceTier: GovernanceTier =
    decLower.includes('committee') || decLower.includes('approver') || decLower.includes('chair') || decLower.includes('sanction')
      ? 'AUTHORIZED_DECISION'
      : decLower.includes('risk') || decLower.includes('officer') || decLower.includes('rm') || decLower.includes('supervisor')
      ? 'INDEPENDENT_REVIEW'
      : decLower.includes('audit')
      ? 'INDEPENDENT_AUDIT'
      : 'MODEL_OUTPUT';

  return (
    <div className={`p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs ${outcomeBorder} ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${badgeColor}`}>
              {decision.outcome.replace('_', ' ')}
            </span>
            <GovernanceBadge tier={governanceTier} actor={decision.decided_by} />
          </div>
          <h3 className="text-xl font-black text-[var(--brand-950)] tracking-tight">
            SME Credit Facility Sanction
          </h3>
        </div>

        {riskAssessment && (
          <div className="flex items-center gap-3 bg-[var(--surface-subtle)] px-3.5 py-2 rounded-xl border border-[var(--border)] self-start sm:self-auto">
            <Award className="w-5 h-5 text-[var(--brand-700)]" />
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)]">FinFlow Trust Score</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-[var(--brand-950)]">{riskAssessment.risk_score}</span>
                <span className="text-[10px] text-[var(--text-muted)]">/1000</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Terms Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] mb-5">
        <div>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Sanctioned Limit</p>
          <p className="text-xl font-black text-[var(--brand-950)] mt-0.5">
            {decision.approved_amount > 0 ? `₹${decision.approved_amount.toLocaleString('en-IN')}` : '₹0'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Interest Rate</p>
          <p className="text-xl font-black text-[var(--brand-700)] mt-0.5">
            {decision.interest_rate > 0 ? `${decision.interest_rate}%` : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Facility Tenor</p>
          <p className="text-xl font-black text-[var(--brand-950)] mt-0.5">
            {decision.tenor_months > 0 ? `${decision.tenor_months}M` : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Model Confidence</p>
          <p className="text-xl font-black text-[var(--fin-green)] mt-0.5">
            {(decision.confidence_score * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Synthesis Reasoning */}
      <div className="mb-5">
        <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--brand-600)]" /> Plain-Language Underwriting Synthesis
        </h4>
        <div className="p-3.5 rounded-xl bg-white border border-[var(--border)] text-xs text-[var(--text-primary)] leading-relaxed shadow-xs">
          {decision.reasoning}
        </div>
      </div>

      {/* Policy Citations */}
      {decision.policy_citations && decision.policy_citations.length > 0 && (
        <div className="mb-5 space-y-2">
          <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
            RAG Underwriting Citations
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {decision.policy_citations.map((c, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] text-[11px]">
                <div className="flex justify-between font-bold text-[var(--brand-700)] mb-0.5">
                  <span>{c.clause_id}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{(c.relevance_score * 100).toFixed(0)}% Match</span>
                </div>
                <p className="font-semibold text-[var(--text-primary)]">{c.title}</p>
                <p className="text-[10px] text-[var(--text-muted)] italic mt-0.5">"{c.excerpt}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acceptance Action */}
      {(isApproved || isConditional) && onAcceptOffer && (
        <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-[var(--text-muted)]">
            Offer valid for 30 calendar days upon electronic acceptance.
          </span>
          <Button variant="primary" size="sm" onClick={onAcceptOffer} rightIcon={<ArrowRight className="w-4 h-4" />}>
            Accept Sanction & Generate Letter
          </Button>
        </div>
      )}
    </div>
  );
};
