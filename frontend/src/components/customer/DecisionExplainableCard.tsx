import React from 'react';
import { DecisionRecord, RiskAssessment } from '../../types';
import confetti from 'canvas-confetti';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, BookOpen, Award, ArrowRight, Percent, Clock, DollarSign, Sparkles } from 'lucide-react';

interface DecisionProps {
  decision?: DecisionRecord;
  riskAssessment?: RiskAssessment;
  onAcceptOffer?: () => void;
}

export const DecisionExplainableCard: React.FC<DecisionProps> = ({
  decision,
  riskAssessment,
  onAcceptOffer
}) => {
  if (!decision) {
    return (
      <div className="card p-8 text-center text-[var(--neutral-500)]">
        <Sparkles className="w-8 h-8 text-[var(--brand-400)] mx-auto mb-2 animate-bounce" />
        <p className="font-semibold text-sm text-[var(--neutral-700)]">No decision generated yet</p>
        <p className="text-xs text-[var(--neutral-500)] mt-1">Complete document extraction and run underwriting to generate an explainable sanction record.</p>
      </div>
    );
  }

  const triggerConfetti = () => {
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 }
    });
    if (onAcceptOffer) onAcceptOffer();
  };

  const isApproved = decision.outcome === 'APPROVED';
  const isConditional = decision.outcome === 'CONDITIONAL_APPROVAL';
  const isReview = decision.outcome === 'NEEDS_REVIEW' || decision.outcome === 'HUMAN_REVIEW';

  const badgeClass = isApproved
    ? 'badge-success'
    : isConditional
    ? 'badge-warning'
    : 'badge-danger';

  return (
    <div className="card p-6 relative overflow-hidden">
      {/* Decorative top border accent */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${
        isApproved ? 'bg-[var(--fin-green)]' : isConditional ? 'bg-[var(--fin-amber)]' : 'bg-[var(--fin-coral)]'
      }`} />

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`badge ${badgeClass} text-xs font-bold px-3 py-1 shadow-xs`}>
              {decision.outcome.replace('_', ' ')}
            </span>
            <span className="text-xs text-[var(--neutral-500)]">
              Decided by: <strong className="text-[var(--neutral-900)] font-semibold">{decision.decided_by}</strong>
            </span>
            <span className="badge badge-primary text-[10px]">Deterministic + ML</span>
          </div>
          <h2 className="text-xl font-extrabold text-[var(--neutral-900)] tracking-tight">
            SME Working Capital Facility Sanction
          </h2>
        </div>

        {/* FinFlow Trust Score Gauge */}
        {riskAssessment && (
          <div className="flex items-center gap-3 bg-[var(--brand-50)] px-4 py-2.5 rounded-xl border border-[var(--brand-200)] shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-[var(--brand-700)] flex items-center justify-center text-white">
              <Award className="w-5 h-5 text-[var(--brand-300)]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[var(--neutral-600)]">FinFlow Trust Score</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[var(--neutral-900)]">{riskAssessment.risk_score}</span>
                <span className="text-xs text-[var(--neutral-500)]">/1000</span>
                <span className="text-xs font-bold text-[var(--fin-green)] ml-1">
                  ({riskAssessment.risk_band.replace('_', ' ')})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Financial Terms Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 p-4 bg-[var(--neutral-50)] rounded-xl border border-[var(--border-subtle)] mb-5">
        <div className="space-y-0.5">
          <p className="text-[11px] font-medium text-[var(--neutral-500)] flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-[var(--brand-600)]" /> Sanctioned Limit
          </p>
          <p className="text-2xl font-extrabold text-[var(--neutral-900)] tracking-tight">
            {decision.approved_amount > 0 ? `₹${decision.approved_amount.toLocaleString('en-IN')}` : '₹0'}
          </p>
          <p className="text-[10px] text-[var(--fin-green)] font-medium">Revolving credit line</p>
        </div>

        <div className="space-y-0.5">
          <p className="text-[11px] font-medium text-[var(--neutral-500)] flex items-center gap-1">
            <Percent className="w-3 h-3 text-[var(--brand-600)]" /> Interest Rate
          </p>
          <p className="text-2xl font-extrabold text-[var(--brand-700)] tracking-tight">
            {decision.interest_rate > 0 ? `${decision.interest_rate}%` : 'N/A'}
          </p>
          <p className="text-[10px] text-[var(--neutral-500)] font-medium">p.a. monthly reducing</p>
        </div>

        <div className="space-y-0.5">
          <p className="text-[11px] font-medium text-[var(--neutral-500)] flex items-center gap-1">
            <Clock className="w-3 h-3 text-[var(--brand-600)]" /> Facility Tenor
          </p>
          <p className="text-2xl font-extrabold text-[var(--neutral-900)] tracking-tight">
            {decision.tenor_months > 0 ? `${decision.tenor_months}M` : 'N/A'}
          </p>
          <p className="text-[10px] text-[var(--neutral-500)] font-medium">Annual review renewal</p>
        </div>

        <div className="space-y-0.5">
          <p className="text-[11px] font-medium text-[var(--neutral-500)] flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-[var(--fin-green)]" /> Confidence
          </p>
          <p className="text-2xl font-extrabold text-[var(--fin-green)] tracking-tight">
            {(decision.confidence_score * 100).toFixed(0)}%
          </p>
          <p className="text-[10px] text-[var(--neutral-500)] font-medium">Zero hallucination gate</p>
        </div>
      </div>

      {/* Plain Language Reasoning */}
      <div className="mb-5">
        <h4 className="text-xs font-bold text-[var(--neutral-600)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--brand-500)]" /> Plain-Language Underwriting Synthesis (RAG Grounded)
        </h4>
        <div className="p-4 bg-white rounded-xl border border-[var(--border-subtle)] text-xs leading-relaxed text-[var(--neutral-800)] shadow-xs">
          {decision.reasoning}
        </div>
      </div>

      {/* Policy Citations & Hard Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Policy Citations */}
        <div className="bg-[var(--neutral-50)] p-4 rounded-xl border border-[var(--border-subtle)]">
          <h4 className="text-xs font-bold text-[var(--neutral-900)] flex items-center gap-1.5 mb-3">
            <BookOpen className="w-3.5 h-3.5 text-[var(--brand-700)]" /> Policy Citations Grounding
          </h4>
          <div className="space-y-2">
            {decision.policy_citations.map((c, i) => (
              <div key={i} className="text-xs bg-white p-3 rounded-lg border border-[var(--border-subtle)] shadow-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-[var(--brand-700)] text-[11px]">{c.clause_id}</span>
                  <span className="badge badge-primary text-[10px]">{(c.relevance_score * 100).toFixed(0)}% Match</span>
                </div>
                <p className="font-semibold text-[var(--neutral-900)] text-xs">{c.title}</p>
                <p className="text-[var(--neutral-500)] text-[11px] mt-1 italic">"{c.excerpt}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* Hard Rules Gates */}
        {riskAssessment && (
          <div className="bg-[var(--neutral-50)] p-4 rounded-xl border border-[var(--border-subtle)]">
            <h4 className="text-xs font-bold text-[var(--neutral-900)] flex items-center gap-1.5 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--fin-green)]" /> Deterministic Eligibility Gates
            </h4>
            <div className="space-y-2">
              {riskAssessment.hard_rules.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-[var(--border-subtle)] shadow-xs">
                  <div className="flex items-center gap-2">
                    {r.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-[var(--fin-green)] shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[var(--fin-coral)] shrink-0" />
                    )}
                    <span className="font-medium text-[var(--neutral-900)]">{r.rule_name}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    r.passed ? 'bg-[var(--fin-green-soft)] text-[var(--fin-green)]' : 'bg-[var(--fin-coral-soft)] text-[var(--fin-coral)]'
                  }`}>
                    {r.actual_value} ({r.threshold_value})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action CTA */}
      {(isApproved || isConditional) && (
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)] flex-wrap gap-3">
          <span className="text-xs text-[var(--neutral-500)]">
            Legally binding conditional facility letter generated instantaneously upon acceptance.
          </span>
          <button
            onClick={triggerConfetti}
            className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-2 shadow-md hover:scale-[1.02] transition-transform"
          >
            <span>Accept Sanction & Generate Letter</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
