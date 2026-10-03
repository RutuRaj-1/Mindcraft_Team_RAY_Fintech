import React from 'react';
import { DecisionRecord, RiskAssessment } from '../../types';
import confetti from 'canvas-confetti';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, BookOpen, Award, ArrowRight } from 'lucide-react';

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
      <div className="bg-white rounded-2xl p-6 border border-[#E3ECE9] text-center text-[#687A75]">
        <p>No decision generated yet. Complete evidence extraction and run risk assessment.</p>
      </div>
    );
  }

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    if (onAcceptOffer) onAcceptOffer();
  };

  const isApproved = decision.outcome === 'APPROVED';
  const isConditional = decision.outcome === 'CONDITIONAL_APPROVAL';
  const isReview = decision.outcome === 'NEEDS_REVIEW';

  const badgeBg = isApproved
    ? 'bg-[#E8F7F1] text-[#169C73] border-[#169C73]/30'
    : isConditional
    ? 'bg-[#FFF6DF] text-[#D89B22] border-[#D89B22]/30'
    : 'bg-[#FDECEA] text-[#D96559] border-[#D96559]/30';

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#E3ECE9] shadow-sm relative overflow-hidden">
      {/* Decorative top border accent */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${
        isApproved ? 'bg-[#169C73]' : isConditional ? 'bg-[#D89B22]' : 'bg-[#D96559]'
      }`} />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${badgeBg}`}>
              {decision.outcome.replace('_', ' ')}
            </span>
            <span className="text-xs text-[#687A75]">
              Decided by: <strong className="text-[#123E40]">{decision.decided_by}</strong>
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-[#123E40]">
            SME Working Capital Facility Sanction
          </h2>
        </div>

        {/* FinFlow Trust Score Gauge */}
        {riskAssessment && (
          <div className="flex items-center gap-3 bg-[#EEF8F7] px-4 py-2.5 rounded-xl border border-[#D9F0EE]">
            <Award className="w-6 h-6 text-[#237277]" />
            <div>
              <p className="text-[11px] font-semibold text-[#687A75]">FinFlow Trust Score</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-[#123E40]">{riskAssessment.risk_score}</span>
                <span className="text-xs text-[#687A75]">/1000</span>
                <span className="text-xs font-bold text-[#169C73] ml-1">
                  ({riskAssessment.risk_band.replace('_', ' ')})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Financial Terms Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#F7FAF9] rounded-xl border border-[#E3ECE9] mb-5">
        <div>
          <p className="text-[11px] font-medium text-[#687A75]">Sanctioned Amount</p>
          <p className="text-xl font-black text-[#123E40] mt-0.5">
            {decision.approved_amount > 0 ? `₹${decision.approved_amount.toLocaleString('en-IN')}` : '₹0'}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#687A75]">Interest Rate</p>
          <p className="text-xl font-black text-[#237277] mt-0.5">
            {decision.interest_rate > 0 ? `${decision.interest_rate}% p.a.` : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#687A75]">Tenor</p>
          <p className="text-xl font-black text-[#123E40] mt-0.5">
            {decision.tenor_months > 0 ? `${decision.tenor_months} Months` : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#687A75]">Decision Confidence</p>
          <p className="text-xl font-black text-[#169C73] mt-0.5">
            {(decision.confidence_score * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Plain Language Reasoning */}
      <div className="mb-5">
        <h4 className="text-xs font-bold text-[#40524E] uppercase tracking-wider mb-2">
          Plain-Language Decision Reasoning (RAG Grounded)
        </h4>
        <div className="p-4 bg-white rounded-xl border border-[#CBD9D5] text-xs leading-relaxed text-[#172825]">
          {decision.reasoning}
        </div>
      </div>

      {/* Policy Citations & Hard Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Policy Citations */}
        <div className="bg-[#F7FAF9] p-4 rounded-xl border border-[#E3ECE9]">
          <h4 className="text-xs font-bold text-[#123E40] flex items-center gap-1.5 mb-2.5">
            <BookOpen className="w-3.5 h-3.5 text-[#237277]" /> Institutional Underwriting Policy Citations
          </h4>
          <div className="space-y-2">
            {decision.policy_citations.map((c, i) => (
              <div key={i} className="text-xs bg-white p-2.5 rounded-lg border border-[#E3ECE9]">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-[#237277]">{c.clause_id}</span>
                  <span className="text-[10px] text-[#687A75] font-semibold">{(c.relevance_score * 100).toFixed(0)}% Match</span>
                </div>
                <p className="font-semibold text-[#172825]">{c.title}</p>
                <p className="text-[#687A75] text-[11px] mt-0.5 italic">"{c.excerpt}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* Hard Rules Gates */}
        {riskAssessment && (
          <div className="bg-[#F7FAF9] p-4 rounded-xl border border-[#E3ECE9]">
            <h4 className="text-xs font-bold text-[#123E40] flex items-center gap-1.5 mb-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#169C73]" /> Deterministic Eligibility Gates
            </h4>
            <div className="space-y-1.5">
              {riskAssessment.hard_rules.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-[#E3ECE9]">
                  <div className="flex items-center gap-2">
                    {r.passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#169C73]" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-[#D96559]" />
                    )}
                    <span className="font-medium text-[#172825]">{r.rule_name}</span>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                    r.passed ? 'bg-[#E8F7F1] text-[#169C73]' : 'bg-[#FDECEA] text-[#D96559]'
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
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E3ECE9]">
          <button
            onClick={triggerConfetti}
            className="py-3 px-6 bg-[#237277] hover:bg-[#18575A] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <span>Accept Sanction & Generate Letter</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
