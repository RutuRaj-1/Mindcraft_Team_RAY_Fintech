import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  JourneyRecord, ConsistencyReport, TrustGraph, DecisionRecord,
  RiskAssessment, DecisionOutcome, DecisionReplayResponse
} from '../../types';
import {
  AlertTriangle, ShieldAlert, RotateCcw, Edit3,
  CheckCircle2, XCircle, FileWarning, UserCheck, GitBranch,
  ShieldCheck, BarChart2, Layers, Clock
} from 'lucide-react';
import { TrustGraphVisual } from './TrustGraphVisual';
import { DecisionReplayViewer } from '../replay/DecisionReplayViewer';
import { CrossAppRiskIntelligence } from './CrossAppRiskIntelligence';


interface RiskConsoleProps {
  journeyId: string;
  onRefreshJourney: () => void;
}

const REASON_CODES = [
  { value: 'COLLATERAL_BACKED',    label: 'COLLATERAL_BACKED — Commercial Property / FD Pledged' },
  { value: 'PROVEN_CASHFLOW',      label: 'PROVEN_CASHFLOW — Strong Historical Seasonality Buffer' },
  { value: 'RELATIONSHIP_EXCEPTION',label: 'RELATIONSHIP_EXCEPTION — Tier-1 Anchor Corporate Guarantee' },
  { value: 'FIELD_VERIFIED',       label: 'FIELD_VERIFIED — Physical Stock & Depot Inspection Passed' },
];

export const RiskOfficerConsole: React.FC<RiskConsoleProps> = ({ journeyId, onRefreshJourney }) => {
  const [consistency,     setConsistency]     = useState<ConsistencyReport | null>(null);
  const [trustGraph,      setTrustGraph]      = useState<TrustGraph | null>(null);
  const [decision,        setDecision]        = useState<DecisionRecord | null>(null);
  const [riskAssessment,  setRiskAssessment]  = useState<RiskAssessment | null>(null);
  const [replayData,      setReplayData]      = useState<DecisionReplayResponse | null>(null);

  const [learningStats,   setLearningStats]   = useState<Record<string, any> | null>(null);

  // Override state
  const [showOverrideModal,    setShowOverrideModal]    = useState<boolean>(false);
  const [overrideOutcome,      setOverrideOutcome]      = useState<DecisionOutcome>('APPROVED');
  const [overrideAmount,       setOverrideAmount]       = useState<number>(1500000);
  const [overrideRate,         setOverrideRate]         = useState<number>(11.5);
  const [overrideReasonCode,   setOverrideReasonCode]   = useState<string>('COLLATERAL_BACKED');
  const [overrideNotes,        setOverrideNotes]        = useState<string>('');
  const [coSigner,             setCoSigner]             = useState<string>('Ananya Iyer (Chief Risk Officer)');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState<boolean>(false);
  const [activeTab,            setActiveTab]            = useState<'consistency' | 'trust_graph' | 'fraud_signals' | 'replay'>('consistency');
  const [fraudSignalsCount,    setFraudSignalsCount]    = useState<number>(0);

  const fetchRiskData = async () => {
    try {
      const [rep, grp, dec, rsk, repSnapshot, stats, fraudSignalsRes] = await Promise.all([
        api.getConsistencyReport(journeyId).catch(() => null),
        api.getTrustGraph(journeyId).catch(() => null),
        api.getDecision(journeyId).catch(() => null),
        api.getRiskAssessment(journeyId).catch(() => null),
        api.replayDecision(journeyId).catch(() => null),
        api.getLearningStats().catch(() => null),
        api.getFraudSignals(journeyId).catch(() => null),
      ]);
      setConsistency(rep);
      setTrustGraph(grp);
      setDecision(dec);
      setRiskAssessment(rsk);
      setReplayData(repSnapshot);
      setLearningStats(stats);
      if (fraudSignalsRes?.signals) {
        setFraudSignalsCount(fraudSignalsRes.signals.length);
        // Automatically default to fraud_signals tab if active risk signals exist
        if (fraudSignalsRes.signals.length > 0 && activeTab === 'consistency') {
          setActiveTab('fraud_signals');
        }
      }

      if (dec) {
        setOverrideAmount(dec.approved_amount || 1500000);
        setOverrideRate(dec.interest_rate || 11.5);
      }
    } catch (err) {
      console.error('Error fetching risk console data:', err);
    }
  };

  useEffect(() => { fetchRiskData(); }, [journeyId]);

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
        co_signed_by: coSigner,
      });
      setShowOverrideModal(false);
      setOverrideNotes('');
      await fetchRiskData();
      onRefreshJourney();
    } catch (err: any) {
      alert(`Override failed: ${err.message}`);
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  return (
    <div className="page-container space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-fadeInUp">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-coral flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Risk & Compliance
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              Ananya Iyer · Credit Risk & Fraud Control
            </span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Financial Trust Intelligence Command
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Case: <span className="font-mono font-bold text-[var(--brand-700)]">{journeyId}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick decision badge */}
          {decision && (
            <div className={`px-3 py-2 rounded-xl border text-center ${
              decision.outcome === 'APPROVED' ? 'bg-[var(--fin-green-bg)] border-[var(--fin-green)]/25' :
              decision.outcome === 'CONDITIONAL_APPROVAL' ? 'bg-[var(--fin-amber-bg)] border-[var(--fin-amber)]/25' :
              'bg-[var(--fin-coral-bg)] border-[var(--fin-coral)]/25'
            }`}>
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">AI Decision</p>
              <p className={`text-[11px] font-black ${
                decision.outcome === 'APPROVED' ? 'text-[var(--fin-green)]' :
                decision.outcome === 'CONDITIONAL_APPROVAL' ? 'text-[var(--fin-amber)]' : 'text-[var(--fin-coral)]'
              }`}>
                {decision.outcome.replace(/_/g, ' ')}
              </p>
            </div>
          )}

          <button
            onClick={() => setShowOverrideModal(true)}
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #0F2220, #237277)' }}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Human Override</span>
          </button>
        </div>
      </div>

      {/* ── Risk KPI Strip ── */}
      {riskAssessment && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fadeInUp stagger-1">
          {[
            {
              label: 'Trust Score',
              value: String(riskAssessment.risk_score),
              sub: '/1000',
              color: riskAssessment.risk_score > 800 ? 'var(--fin-green)' : riskAssessment.risk_score > 600 ? 'var(--fin-amber)' : 'var(--fin-coral)',
              icon: ShieldCheck,
            },
            {
              label: 'Prob. of Default',
              value: `${(riskAssessment.probability_of_default * 100).toFixed(1)}%`,
              sub: 'ML-predicted',
              color: riskAssessment.probability_of_default < 0.1 ? 'var(--fin-green)' : riskAssessment.probability_of_default < 0.25 ? 'var(--fin-amber)' : 'var(--fin-coral)',
              icon: BarChart2,
            },
            {
              label: 'Risk Band',
              value: riskAssessment.risk_band.replace('_', ' '),
              sub: riskAssessment.model_version,
              color: riskAssessment.risk_band === 'LOW_RISK' ? 'var(--fin-green)' : riskAssessment.risk_band === 'MEDIUM_RISK' ? 'var(--fin-amber)' : 'var(--fin-coral)',
              icon: Layers,
            },
            {
              label: 'Eligibility Gates',
              value: riskAssessment.all_hard_rules_passed ? 'All Passed' : 'Gate Failed',
              sub: `${riskAssessment.hard_rules.filter(r => r.passed).length}/${riskAssessment.hard_rules.length} rules`,
              color: riskAssessment.all_hard_rules_passed ? 'var(--fin-green)' : 'var(--fin-coral)',
              icon: riskAssessment.all_hard_rules_passed ? CheckCircle2 : XCircle,
            },
          ].map((kpi, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="metric-label">{kpi.label}</p>
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <p className="metric-value text-2xl" style={{ color: kpi.color }}>{kpi.value}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="tab-bar animate-fadeInUp stagger-2">
        {[
          { id: 'consistency' as const, label: 'Consistency Engine', Icon: FileWarning, color: 'var(--fin-coral)', badge: consistency && !consistency.is_consistent ? consistency.flagged_count : null },
          { id: 'trust_graph' as const, label: 'Financial Trust Graph', Icon: GitBranch, color: 'var(--fin-violet)', badge: null },
          { id: 'fraud_signals' as const, label: 'Cross-App Risk Signals', Icon: ShieldAlert, color: 'var(--fin-amber)', badge: fraudSignalsCount > 0 ? fraudSignalsCount : null },
          { id: 'replay' as const, label: 'Decision Replay', Icon: RotateCcw, color: 'var(--brand-700)', badge: null },
        ].map(({ id, label, Icon, color, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`tab-item ${activeTab === id ? 'active' : ''} flex items-center gap-1.5`}
            style={activeTab === id ? { color } : {}}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
            {badge !== null && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                id === 'fraud_signals' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Panels ── */}
      <div className="animate-fadeInUp stagger-3">

        {/* Consistency Engine */}
        {activeTab === 'consistency' && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--fin-coral-bg)] flex items-center justify-center">
                  <FileWarning className="w-4 h-4 text-[var(--fin-coral)]" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--brand-900)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Cross-Document Consistency Engine
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Cross-validates intent, bank statements, GSTR-3B, and ITR-V data
                  </p>
                </div>
              </div>
              {consistency && (
                <span className={`badge ${consistency.is_consistent ? 'badge-green' : 'badge-coral'}`}>
                  {consistency.is_consistent ? '✓ Fully Consistent' : `${consistency.flagged_count} Discrepancy Flagged`}
                </span>
              )}
            </div>

            {consistency && consistency.discrepancies.length > 0 ? (
              <div className="space-y-3">
                {consistency.discrepancies.map((d, i) => (
                  <div key={i} className="alert-panel danger">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-[var(--fin-coral)]">{d.field}</span>
                      <span className="badge badge-coral">{d.severity} · {d.variance_pct}% Var</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-[var(--surface)] p-2.5 rounded-lg border border-[var(--border)] mt-2">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] font-semibold">{d.doc_a_name}:</span>
                        <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">{String(d.doc_a_value)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] font-semibold">{d.doc_b_name}:</span>
                        <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">{String(d.doc_b_value)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-2">{d.explanation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert-panel success flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[var(--fin-green)] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[var(--fin-green)]">All Data Sources Consistent</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Turnover, entity name, and tax filings cross-verified with zero variance exceeding tolerance limits.
                  </p>
                </div>
              </div>
            )}

            {/* Hard Rules breakdown */}
            {riskAssessment && riskAssessment.hard_rules.length > 0 && (
              <div className="mt-5">
                <h4 className="text-xs font-bold text-[var(--brand-900)] mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--brand-600)]" />
                  Deterministic Eligibility Gate Results
                </h4>
                <div className="space-y-2">
                  {riskAssessment.hard_rules.map((r, i) => (
                    <div key={i} className={`flex items-center justify-between text-xs p-3 rounded-xl border ${
                      r.passed
                        ? 'bg-[var(--fin-green-bg)] border-[var(--fin-green)]/20'
                        : 'bg-[var(--fin-coral-bg)] border-[var(--fin-coral)]/20'
                    }`}>
                      <div className="flex items-center gap-2">
                        {r.passed
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--fin-green)] shrink-0" />
                          : <XCircle className="w-3.5 h-3.5 text-[var(--fin-coral)] shrink-0" />
                        }
                        <div>
                          <span className="font-semibold text-[var(--text-primary)]">{r.rule_name}</span>
                          <p className="text-[10px] text-[var(--text-muted)] font-mono">{r.policy_citation}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-bold ${r.passed ? 'text-[var(--fin-green)]' : 'text-[var(--fin-coral)]'}`}>
                          {String(r.actual_value)}
                        </span>
                        <p className="text-[10px] text-[var(--text-muted)]">Threshold: {String(r.threshold_value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trust Graph */}
        {activeTab === 'trust_graph' && (
          trustGraph
            ? <TrustGraphVisual trustGraph={trustGraph} />
            : (
              <div className="card p-12 text-center">
                <GitBranch className="w-10 h-10 text-[var(--border-strong)] mx-auto mb-3" />
                <p className="text-sm font-semibold text-[var(--text-secondary)]">Trust Graph not yet generated</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Run the risk evaluation to build the entity relationship network
                </p>
              </div>
            )
        )}

        {/* Decision Replay */}
        {activeTab === 'replay' && (
          <div className="space-y-4">
            {replayData ? (
              <DecisionReplayViewer data={replayData} onRefresh={fetchRiskData} />
            ) : (
              <div className="card p-12 text-center">
                <RotateCcw className="w-10 h-10 text-[var(--border-strong)] mx-auto mb-3" />
                <p className="text-sm font-semibold text-[var(--text-secondary)]">No decision replay available yet</p>
              </div>
            )}


            {/* Active Learning Stats */}
            {learningStats && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-50)] flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-[var(--brand-700)]" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-[var(--brand-900)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Active Learning & Calibration Loop
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Officer override reasons feed back into credit rule calibration
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--surface-subtle)] p-4 rounded-xl border border-[var(--border)]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">Model Retraining Readiness:</span>
                    <span className="badge badge-green">
                      {learningStats.model_retraining_readiness || 'CALIBRATED_STABLE'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-primary)]">
                    <strong>Calibration:</strong>{' '}
                    {learningStats.calibration_signal || 'DSCR threshold for unhedged limit may relax from 1.25x to 1.20x for borrowers with >36m vintage.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cross-Application Risk Intelligence & Fraud Signals */}
        {activeTab === 'fraud_signals' && (
          <CrossAppRiskIntelligence
            journeyId={journeyId}
            onRefresh={() => {
              fetchRiskData();
              onRefreshJourney();
            }}
          />
        )}
      </div>

      {/* ── Human Override Modal ── */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-[var(--border)] overflow-hidden">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-[var(--brand-900)] to-[var(--brand-700)] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Edit3 className="w-4 h-4 text-[var(--brand-300)]" />
                <h3 className="text-sm font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Credit Decision Human Override
                </h3>
              </div>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-white/60 hover:text-white text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="alert-panel warning mx-4 mt-4 flex items-start gap-2 text-[11px]">
              <AlertTriangle className="w-4 h-4 text-[var(--fin-amber)] shrink-0 mt-0.5" />
              <span>Override will be recorded immutably in the audit ledger with full co-signing attribution.</span>
            </div>

            <form onSubmit={handleExecuteOverride} className="p-5 space-y-4">
              <div>
                <label className="fin-label">Override Decision Outcome</label>
                <select
                  value={overrideOutcome}
                  onChange={(e) => setOverrideOutcome(e.target.value as DecisionOutcome)}
                  className="fin-input text-xs"
                >
                  <option value="APPROVED">APPROVED — Prime Facility</option>
                  <option value="CONDITIONAL_APPROVAL">CONDITIONAL APPROVAL — Tranche Structured</option>
                  <option value="NEEDS_REVIEW">NEEDS REVIEW — Exception Committee</option>
                  <option value="REJECTED">REJECTED — Hard Gate Failed</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="fin-label">Approved Facility (INR)</label>
                  <input
                    type="number"
                    value={overrideAmount}
                    onChange={(e) => setOverrideAmount(Number(e.target.value))}
                    className="fin-input text-xs"
                  />
                </div>
                <div>
                  <label className="fin-label">Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={overrideRate}
                    onChange={(e) => setOverrideRate(Number(e.target.value))}
                    className="fin-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="fin-label">Institutional Reason Code</label>
                <select
                  value={overrideReasonCode}
                  onChange={(e) => setOverrideReasonCode(e.target.value)}
                  className="fin-input text-xs"
                >
                  {REASON_CODES.map(rc => (
                    <option key={rc.value} value={rc.value}>{rc.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="fin-label">
                  Mandatory Underwriting Justification Rationale <span className="text-[var(--fin-coral)]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="State the factual basis for overriding AI recommendation..."
                  className="fin-input text-xs resize-none"
                  required
                />
              </div>

              <div>
                <label className="fin-label">Co-Signing Officer / Supervisor</label>
                <input
                  type="text"
                  value={coSigner}
                  onChange={(e) => setCoSigner(e.target.value)}
                  className="fin-input text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOverride}
                  className="btn-primary text-xs"
                >
                  {isSubmittingOverride ? 'Committing...' : 'Commit Override to Audit Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
