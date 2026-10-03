import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  JourneyRecord, ConsistencyReport, TrustGraph, DecisionRecord,
  RiskAssessment, DecisionOutcome
} from '../../types';
import {
  AlertTriangle, ShieldAlert, GitGraph, RotateCcw, Edit3,
  CheckCircle2, XCircle, FileWarning, Network, UserCheck, Check
} from 'lucide-react';

interface RiskConsoleProps {
  journeyId: string;
  onRefreshJourney: () => void;
}

export const RiskOfficerConsole: React.FC<RiskConsoleProps> = ({
  journeyId,
  onRefreshJourney
}) => {
  const [consistency, setConsistency] = useState<ConsistencyReport | null>(null);
  const [trustGraph, setTrustGraph] = useState<TrustGraph | null>(null);
  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [replayData, setReplayData] = useState<Record<string, any> | null>(null);
  const [learningStats, setLearningStats] = useState<Record<string, any> | null>(null);

  // Override Modal State
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [overrideOutcome, setOverrideOutcome] = useState<DecisionOutcome>('APPROVED');
  const [overrideAmount, setOverrideAmount] = useState<number>(1500000);
  const [overrideRate, setOverrideRate] = useState<number>(11.5);
  const [overrideReasonCode, setOverrideReasonCode] = useState<string>('COLLATERAL_BACKED');
  const [overrideNotes, setOverrideNotes] = useState<string>('');
  const [coSigner, setCoSigner] = useState<string>('Ananya Iyer (Chief Risk Officer)');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState<boolean>(false);

  const fetchRiskData = async () => {
    try {
      const [rep, grp, dec, rsk, repSnapshot, stats] = await Promise.all([
        api.getConsistencyReport(journeyId).catch(() => null),
        api.getTrustGraph(journeyId).catch(() => null),
        api.getDecision(journeyId).catch(() => null),
        api.getRiskAssessment(journeyId).catch(() => null),
        api.replayDecision(journeyId).catch(() => null),
        api.getLearningStats().catch(() => null)
      ]);
      setConsistency(rep);
      setTrustGraph(grp);
      setDecision(dec);
      setRiskAssessment(rsk);
      setReplayData(repSnapshot);
      setLearningStats(stats);

      if (dec) {
        setOverrideAmount(dec.approved_amount || 1500000);
        setOverrideRate(dec.interest_rate || 11.5);
      }
    } catch (err) {
      console.error('Error fetching risk console data:', err);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, [journeyId]);

  const handleExecuteOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideNotes.trim()) {
      alert('Mandatory justification rationale is required for credit override.');
      return;
    }

    setIsSubmittingOverride(true);
    try {
      await api.submitOverride(journeyId, {
        new_outcome: overrideOutcome,
        new_approved_amount: overrideAmount,
        new_interest_rate: overrideRate,
        reason_code: overrideReasonCode,
        rationale_notes: overrideNotes,
        co_signed_by: coSigner
      });
      setShowOverrideModal(false);
      setOverrideNotes('');
      await fetchRiskData();
      onRefreshJourney();
      alert('Override successfully committed to immutable audit ledger.');
    } catch (err: any) {
      alert(`Override failed: ${err.message}`);
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#FDECEA] text-[#D96559] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#D96559]/20 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Risk & Compliance Command Center
            </span>
            <span className="text-xs text-[#687A75]">Persona: Ananya Iyer (Credit Risk & Fraud Control)</span>
          </div>
          <h1 className="text-2xl font-black text-[#123E40] mt-1">Financial Trust & Consistency Intelligence</h1>
        </div>

        <button
          onClick={() => setShowOverrideModal(true)}
          className="py-2.5 px-4 bg-[#123E40] hover:bg-[#18575A] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2"
        >
          <Edit3 className="w-4 h-4 text-[#3DA5A6]" />
          <span>Execute Human Review / Override</span>
        </button>
      </div>

      {/* Cross-Document Consistency Matrix */}
      <div className="bg-white rounded-2xl p-6 border border-[#E3ECE9] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FDECEA] flex items-center justify-center text-[#D96559]">
              <FileWarning className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#123E40]">Cross-Document Consistency Engine</h3>
              <p className="text-xs text-[#687A75]">
                Cross-validates declared intent, bank statement totals, GSTR-3B filings, and ITR-V data.
              </p>
            </div>
          </div>
          {consistency && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
              consistency.is_consistent
                ? 'bg-[#E8F7F1] text-[#169C73] border-[#169C73]/20'
                : 'bg-[#FDECEA] text-[#D96559] border-[#D96559]/20'
            }`}>
              {consistency.is_consistent ? 'Data Fully Consistent' : `${consistency.flagged_count} Discrepancy Flagged`}
            </span>
          )}
        </div>

        {consistency && consistency.discrepancies.length > 0 ? (
          <div className="space-y-3">
            {consistency.discrepancies.map((d, i) => (
              <div key={i} className="p-4 bg-[#FDECEA]/30 border border-[#D96559]/30 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#D96559]">{d.field}</span>
                  <span className="bg-[#D96559] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {d.severity} SEVERITY ({d.variance_pct}% Variance)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs bg-white p-2.5 rounded-lg border border-[#E3ECE9] mt-2">
                  <div>
                    <span className="text-[#687A75] text-[11px]">{d.doc_a_name}:</span>
                    <p className="font-bold text-[#172825]">{String(d.doc_a_value)}</p>
                  </div>
                  <div>
                    <span className="text-[#687A75] text-[11px]">{d.doc_b_name}:</span>
                    <p className="font-bold text-[#172825]">{String(d.doc_b_value)}</p>
                  </div>
                </div>
                <p className="text-xs text-[#40524E] pt-1">{d.explanation}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-[#E8F7F1]/40 border border-[#169C73]/20 rounded-xl text-xs text-[#169C73] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Turnover, entity legal name, and tax filings cross-verified with zero variance exceeding tolerance limits.</span>
          </div>
        )}
      </div>

      {/* Financial Trust Graph & Fraud Network */}
      <div className="bg-white rounded-2xl p-6 border border-[#E3ECE9] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EEF8F7] flex items-center justify-center text-[#237277]">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#123E40]">Financial Trust Graph & Counterparty Network</h3>
              <p className="text-xs text-[#687A75]">
                Inter-entity relational mapping: Directors, GSTIN, Operating Bank Accounts, Suppliers, and Buyers.
              </p>
            </div>
          </div>
          {trustGraph && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
              trustGraph.circular_trading_detected
                ? 'bg-[#FDECEA] text-[#D96559] border-[#D96559]/30 animate-pulse'
                : 'bg-[#E8F7F1] text-[#169C73] border-[#169C73]/30'
            }`}>
              {trustGraph.circular_trading_detected ? '⚠️ Circular Trading Signal Flagged' : '✓ Clean Network Topology'}
            </span>
          )}
        </div>

        {/* Graph Visual Canvas / Nodes Display */}
        {trustGraph && (
          <div className="space-y-4">
            {/* Visual SVG Network Representation */}
            <div className="w-full bg-[#F7FAF9] rounded-xl border border-[#E3ECE9] p-4 flex flex-col items-center justify-center overflow-x-auto">
              <div className="flex flex-wrap items-center justify-center gap-4 py-4 max-w-4xl">
                {trustGraph.nodes.map((node) => {
                  const isHighRisk = node.risk_level === 'HIGH';
                  const isMediumRisk = node.risk_level === 'MEDIUM';

                  return (
                    <div
                      key={node.id}
                      className={`p-3 rounded-xl border transition-all shadow-2xs min-w-[170px] ${
                        isHighRisk
                          ? 'bg-[#FDECEA] border-[#D96559] text-[#96382F]'
                          : isMediumRisk
                          ? 'bg-[#FFF6DF] border-[#D89B22] text-[#825D0D]'
                          : 'bg-white border-[#CBD9D5] text-[#172825]'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold mb-1 opacity-80">
                        <span>{node.node_type}</span>
                        <span>{node.trust_score}/1000</span>
                      </div>
                      <p className="text-xs font-bold truncate">{node.label}</p>
                      {node.details?.annual_volume && (
                        <p className="text-[10px] text-[#687A75] mt-0.5">{node.details.annual_volume}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Edge connections summary */}
              <div className="w-full border-t border-[#E3ECE9] pt-3 mt-2">
                <p className="text-[11px] font-bold text-[#40524E] mb-2">Verified Relational Edges:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {trustGraph.edges.map((e, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border text-[11px] ${
                        e.flagged ? 'bg-[#FDECEA] border-[#D96559] text-[#96382F] font-bold' : 'bg-white border-[#E3ECE9] text-[#40524E]'
                      }`}
                    >
                      <span className="font-semibold">{e.relation}</span>
                      {e.flag_reason && <p className="text-[10px] text-[#D96559] font-normal mt-0.5">{e.flag_reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {trustGraph.cross_app_duplicate_signals.length > 0 && (
              <div className="p-3 bg-[#FFF6DF] border border-[#D89B22]/30 rounded-xl text-xs space-y-1">
                <p className="font-bold text-[#825D0D]">Cross-Application Graph Anomaly Warnings:</p>
                {trustGraph.cross_app_duplicate_signals.map((sig, i) => (
                  <p key={i} className="text-[#825D0D] text-[11px]">• {sig}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Decision Replay & Audit Snapshot */}
      {replayData && (
        <div className="bg-white rounded-2xl p-6 border border-[#E3ECE9] shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#F2EEFF] flex items-center justify-center text-[#7457C8]">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#123E40]">Decision Replay & Time-Travel Snapshot</h3>
              <p className="text-xs text-[#687A75]">
                Exact deterministic reconstruction of decision inputs, policy versions, and evidence at time of sanction.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F7FAF9] p-4 rounded-xl border border-[#E3ECE9] text-xs">
            <div>
              <span className="text-[#687A75] font-semibold">Snapshot Version:</span>
              <p className="font-bold text-[#123E40]">{replayData.snapshot_version}</p>
              <p className="text-[10px] text-[#687A75] mt-1">Audit Events: {replayData.audit_trail_events_count} recorded</p>
            </div>
            <div>
              <span className="text-[#687A75] font-semibold">Verified Evidence Fields:</span>
              <p className="font-bold text-[#123E40]">{replayData.evidence_snapshot?.total_verified_fields} Fields</p>
              <p className="text-[10px] text-[#169C73] mt-1">Consistency: {replayData.evidence_snapshot?.consistency_status ? 'Verified' : 'Flagged'}</p>
            </div>
            <div>
              <span className="text-[#687A75] font-semibold">Model Decision State:</span>
              <p className="font-bold text-[#123E40]">{replayData.decision_record?.outcome}</p>
              <p className="text-[10px] text-[#237277] mt-1">Score: {replayData.risk_snapshot?.finflow_trust_score}/1000</p>
            </div>
          </div>
        </div>
      )}

      {/* Human Review & Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#CBD9D5] space-y-4">
            <div className="flex justify-between items-center border-b border-[#E3ECE9] pb-3">
              <h3 className="text-base font-bold text-[#123E40] flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#237277]" /> Credit Decision Human Override
              </h3>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-[#687A75] hover:text-[#172825] font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteOverride} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#40524E] mb-1">Override Decision Outcome</label>
                <select
                  value={overrideOutcome}
                  onChange={(e) => setOverrideOutcome(e.target.value as DecisionOutcome)}
                  className="w-full rounded-xl border border-[#CBD9D5] p-2.5 bg-white text-[#172825]"
                >
                  <option value="APPROVED">APPROVED (Prime Facility)</option>
                  <option value="CONDITIONAL_APPROVAL">CONDITIONAL APPROVAL (Tranche Structured)</option>
                  <option value="NEEDS_REVIEW">NEEDS REVIEW (Exception Committee)</option>
                  <option value="REJECTED">REJECTED (Hard Gate Failed)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#40524E] mb-1">Approved Facility (INR)</label>
                  <input
                    type="number"
                    value={overrideAmount}
                    onChange={(e) => setOverrideAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#CBD9D5] p-2.5 bg-white text-[#172825]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#40524E] mb-1">Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={overrideRate}
                    onChange={(e) => setOverrideRate(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#CBD9D5] p-2.5 bg-white text-[#172825]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#40524E] mb-1">Institutional Reason Code</label>
                <select
                  value={overrideReasonCode}
                  onChange={(e) => setOverrideReasonCode(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD9D5] p-2.5 bg-white text-[#172825]"
                >
                  <option value="COLLATERAL_BACKED">COLLATERAL_BACKED (Commercial Property / FD Pledged)</option>
                  <option value="PROVEN_CASHFLOW">PROVEN_CASHFLOW (Strong Historical Seasonality Buffer)</option>
                  <option value="RELATIONSHIP_EXCEPTION">RELATIONSHIP_EXCEPTION (Tier-1 Anchor Corporate Guarantee)</option>
                  <option value="FIELD_VERIFIED">FIELD_VERIFIED (Physical Stock & Depot Inspection Passed)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#40524E] mb-1">
                  Mandatory Underwriting Justification Rationale
                </label>
                <textarea
                  rows={3}
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="State the factual basis for overriding AI recommendation..."
                  className="w-full rounded-xl border border-[#CBD9D5] p-2.5 bg-white text-[#172825]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#40524E] mb-1">Co-Signing Officer / Supervisor</label>
                <input
                  type="text"
                  value={coSigner}
                  onChange={(e) => setCoSigner(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD9D5] p-2.5 bg-white text-[#172825]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E3ECE9]">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="py-2.5 px-4 bg-[#EFF5F3] hover:bg-[#E3ECE9] text-[#40524E] rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOverride}
                  className="py-2.5 px-5 bg-[#237277] hover:bg-[#18575A] text-white rounded-xl font-bold shadow-xs disabled:opacity-50"
                >
                  {isSubmittingOverride ? 'Committing Override...' : 'Commit Override to Audit Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
