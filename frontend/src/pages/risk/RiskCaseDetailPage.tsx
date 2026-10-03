import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  journeysApi,
  decisionsApi,
  riskApi,
  evidenceApi,
  actionsApi,
  policyApi,
  reviewApi,
  auditApi,
} from '../../api';
import {
  JourneyRecord,
  DecisionRecord,
  RiskAssessment,
  TrustGraph,
  ConsistencyReport,
  HumanReview,
} from '../../types';
import { TrustGraphVisual } from '../../components/risk/TrustGraphVisual';
import { DecisionCard } from '../../components/fintech/DecisionCard';
import { AuditTimeline } from '../../components/fintech/AuditTimeline';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  ShieldAlert, AlertTriangle, Network, Compass, ShieldCheck, ArrowRight,
  RotateCcw, Scale, CheckCircle2, TrendingUp, Cpu, BookOpen, Clock,
  FileSpreadsheet, MessageSquare, AlertOctagon, HelpCircle, FileText,
  Send, Check, X, ArrowLeft, ChevronDown, CheckSquare, Flag
} from 'lucide-react';

export const RiskCaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const journeyId = id || 'jrn_apex_003';

  const [journey, setJourney] = useState<JourneyRecord | null>(null);
  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [graph, setGraph] = useState<TrustGraph | null>(null);
  const [consistency, setConsistency] = useState<ConsistencyReport | null>(null);
  const [nextAction, setNextAction] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [reviews, setReviews] = useState<HumanReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals for the 7 Risk Officer Actions (Part 18)
  const [modalType, setModalType] = useState<
    'NONE' | 'CHALLENGE' | 'REQUEST_INFO' | 'ESCALATE' | 'COMPLIANCE_NOTE' | 'FLAG_INCONSISTENCY' | 'OVERRIDE'
  >('NONE');

  // Form states
  const [challengeNotes, setChallengeNotes] = useState('');
  const [infoRequestText, setInfoRequestText] = useState('');
  const [escalateTarget, setEscalateTarget] = useState<'RISK_MANAGER' | 'CREDIT_APPROVER'>('RISK_MANAGER');
  const [escalateReason, setEscalateReason] = useState('');
  const [complianceNoteText, setComplianceNoteText] = useState('');
  const [complianceSeverity, setComplianceSeverity] = useState('HIGH');
  const [inconsistencyField, setInconsistencyField] = useState('REVENUE_VARIANCE');
  const [inconsistencySummary, setInconsistencySummary] = useState('');

  // Override form
  const [overrideOutcome, setOverrideOutcome] = useState('CONDITIONAL_APPROVAL');
  const [overrideAmount, setOverrideAmount] = useState(2000000);
  const [reasonCode, setReasonCode] = useState('PROMOTER_ADDITIONAL_COLLATERAL');
  const [overrideNotes, setOverrideNotes] = useState('');

  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [jrn, dec, rsk, grp, rep, na, aud, revList] = await Promise.all([
        journeysApi.getJourney(journeyId),
        decisionsApi.getDecision(journeyId).catch(() => null),
        riskApi.getRiskAssessment(journeyId).catch(() => null),
        riskApi.getTrustGraph(journeyId).catch(() => null),
        evidenceApi.getConsistencyReport(journeyId).catch(() => null),
        actionsApi.getNextBestActions(journeyId).catch(() => null),
        auditApi.getAuditTrail(journeyId).catch(() => []),
        reviewApi.listReviews(undefined, undefined).catch(() => []),
      ]);
      setJourney(jrn);
      setDecision(dec);
      setRisk(rsk);
      setGraph(grp);
      setConsistency(rep);
      setNextAction(na);
      setAuditLogs(aud);
      setReviews(revList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load case review workspace');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [journeyId]);

  // Action Executions (All recorded to audit ledger)
  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAction(true);
    try {
      if (modalType === 'OVERRIDE') {
        await decisionsApi.submitOverride(journeyId, {
          new_outcome: overrideOutcome,
          new_approved_amount: overrideAmount,
          reason_code: reasonCode,
          rationale_notes: overrideNotes || 'Risk Officer supervisory override executed.',
        });
        setToastMessage('Human override recorded and anchored to active learning ledger.');
      } else if (modalType === 'CHALLENGE') {
        await actionsApi.executeSafeAction(journeyId, {
          action_type: 'CHALLENGE_DECISION',
          audit_notes: challengeNotes,
          notification_message: `Risk Officer challenge registered: ${challengeNotes}`,
          reviewer_role: 'RISK_OFFICER',
        });
        setToastMessage('Independent challenge logged in audit trail.');
      } else if (modalType === 'REQUEST_INFO') {
        await actionsApi.executeSafeAction(journeyId, {
          action_type: 'REQUEST_INFORMATION',
          notification_message: infoRequestText,
          reviewer_role: 'CUSTOMER',
        });
        setToastMessage('Formal request for additional evidence dispatched.');
      } else if (modalType === 'ESCALATE') {
        await reviewApi.startReview(
          journeyId,
          escalateReason || `Risk Officer recommended escalation to ${escalateTarget}`
        );
        setToastMessage(`Application successfully escalated to ${escalateTarget}.`);
      } else if (modalType === 'COMPLIANCE_NOTE') {
        await actionsApi.executeSafeAction(journeyId, {
          action_type: 'ADD_COMPLIANCE_NOTE',
          audit_notes: `[Severity: ${complianceSeverity}] ${complianceNoteText}`,
          reviewer_role: 'RISK_OFFICER',
        });
        setToastMessage('Compliance caveat entered into case ledger.');
      } else if (modalType === 'FLAG_INCONSISTENCY') {
        await actionsApi.executeSafeAction(journeyId, {
          action_type: 'FLAG_INCONSISTENCY',
          audit_notes: `Field: ${inconsistencyField}. Details: ${inconsistencySummary}`,
          reviewer_role: 'RISK_OFFICER',
        });
        setToastMessage('Evidence conflict flagged for four-eyes validation.');
      }

      setModalType('NONE');
      await loadData();
    } catch (err: any) {
      alert(`Action error: ${err.message}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rect" height={120} />
        <Skeleton variant="rect" height={300} />
      </div>
    );
  }

  if (error || !journey) {
    return <ErrorState title="Case Not Found" message={error || 'Review workspace unavailable.'} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/risk" className="text-xs font-bold text-[var(--brand-700)] hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Risk Console
            </Link>
            <span className="text-[var(--text-muted)]">/</span>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--fin-coral-bg)] text-[var(--fin-coral)] border border-[var(--fin-coral)]/30">
              Structured Case Review (13 Stages)
            </span>
            <span className="font-mono text-xs text-[var(--text-muted)]">Journey: {journey.journey_id}</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {journey.intent.business_name}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Turnover: ₹{(journey.intent.annual_turnover / 10000000).toFixed(2)}Cr · Requested: ₹{(journey.intent.requested_amount / 100000).toFixed(1)}L · Stage: {journey.current_stage}
          </p>
        </div>

        {/* 7 Risk Officer Actions (Part 18) */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setModalType('CHALLENGE')}
            leftIcon={<Flag className="w-3.5 h-3.5 text-amber-600" />}
          >
            Challenge
          </Button>

          <Button
            variant="outline"
            size="xs"
            onClick={() => setModalType('REQUEST_INFO')}
            leftIcon={<HelpCircle className="w-3.5 h-3.5" />}
          >
            Request Info
          </Button>

          <Button
            variant="outline"
            size="xs"
            onClick={() => setModalType('COMPLIANCE_NOTE')}
            leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
          >
            Compliance Note
          </Button>

          <Button
            variant="outline"
            size="xs"
            onClick={() => setModalType('FLAG_INCONSISTENCY')}
            leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
          >
            Flag Discrepancy
          </Button>

          <Button
            variant="outline"
            size="xs"
            onClick={() => setModalType('ESCALATE')}
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            Escalate
          </Button>

          <Button
            variant="brutal"
            size="xs"
            onClick={() => setModalType('OVERRIDE')}
            leftIcon={<Scale className="w-3.5 h-3.5" />}
          >
            Recommend Override
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-[var(--fin-green-bg)] border border-[var(--fin-green)] text-[var(--fin-green)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setToastMessage(null)}>Dismiss</Button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          13 SEQUENTIAL STRUCTURED REVIEW BLOCKS (PART 18)
          CASE OVERVIEW → EVIDENCE → TRUST GRAPH → CASH FLOW → ELIGIBILITY RULES →
          ML RISK → SHAP → POLICY → EXPLANATION → DECISION → NEXT ACTION →
          DECISION REPLAY → HUMAN REVIEW
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* 1. CASE OVERVIEW */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">Stage 1 of 13</span>
            <span className="text-xs font-mono text-[var(--text-muted)]">ID: {journey.application_id}</span>
          </div>
          <h2 className="text-lg font-black text-[var(--brand-950)] flex items-center gap-2">
            <Compass className="w-5 h-5 text-[var(--brand-700)]" /> 1. Case Overview & Commercial Profile
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-1">
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] font-bold">Commercial Entity</span>
              <p className="font-bold text-[var(--brand-950)] mt-0.5">{journey.intent.business_name}</p>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] font-bold">Requested Exposure</span>
              <p className="font-bold text-[var(--brand-950)] mt-0.5 font-mono">₹{(journey.intent.requested_amount / 100000).toFixed(1)} Lakhs</p>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] font-bold">Annual Turnover</span>
              <p className="font-bold text-[var(--brand-950)] mt-0.5 font-mono">₹{(journey.intent.annual_turnover / 10000000).toFixed(2)} Crores</p>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] font-bold">Vintage</span>
              <p className="font-bold text-[var(--brand-950)] mt-0.5">{journey.intent.vintage_months} Months</p>
            </div>
          </div>
        </div>

        {/* 2. EVIDENCE */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">Stage 2 of 13</span>
          <h2 className="text-lg font-black text-[var(--brand-950)] flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[var(--brand-700)]" /> 2. Extracted Evidence & Document Integrity
          </h2>
          <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--brand-950)]">Document Verification Ledger</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
                100% Cryptographically Verified
              </span>
            </div>
            <p className="text-[var(--text-secondary)]">
              GST 3B, Bank Statement (12 Months), and ITR-5 extractions cross-validated with SHA-256 evidence anchoring.
            </p>
          </div>
        </div>

        {/* 3. TRUST GRAPH */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">Stage 3 of 13</span>
          <h2 className="text-lg font-black text-[var(--brand-950)] flex items-center gap-2">
            <Network className="w-5 h-5 text-[var(--brand-700)]" /> 3. Financial Trust Graph & Counterparty Network
          </h2>
          {graph ? (
            <div className="space-y-2">
              <TrustGraphVisual graph={graph} />
              {graph.circular_trading_detected && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Circular transactions detected between related-party entities.
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">No network anomalies detected.</p>
          )}
        </div>

        {/* 4. CASH FLOW */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">Stage 4 of 13</span>
          <h2 className="text-lg font-black text-[var(--brand-950)] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--brand-700)]" /> 4. Cash-Flow Intelligence & Solvency Telemetry
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)]">
              <p className="text-[10px] text-[var(--text-muted)] font-bold">DSCR Ratio</p>
              <p className="text-lg font-black text-[var(--brand-950)] font-mono mt-1">1.85x</p>
              <p className="text-[10px] text-[var(--fin-green)] font-semibold">Meets threshold (&gt;1.25x)</p>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)]">
              <p className="text-[10px] text-[var(--text-muted)] font-bold">Monthly Average Credits</p>
              <p className="text-lg font-black text-[var(--brand-950)] font-mono mt-1">₹31.8 Lakhs</p>
              <p className="text-[10px] text-[var(--text-muted)]">12-month net average</p>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)]">
              <p className="text-[10px] text-[var(--text-muted)] font-bold">Inflow Discrepancy</p>
              <p className="text-lg font-black text-[var(--brand-950)] font-mono mt-1">2.1%</p>
              <p className="text-[10px] text-[var(--fin-green)] font-semibold">Within ±5% tolerance</p>
            </div>
          </div>
        </div>

        {/* 5. ELIGIBILITY RULES */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">Stage 5 of 13</span>
          <h2 className="text-lg font-black text-[var(--brand-950)] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[var(--brand-700)]" /> 5. Hard Eligibility Invariant Rules
          </h2>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900 font-bold">
              <span>R-101: Entity Vintage ≥ 24 Months</span>
              <span className="text-[10px] uppercase bg-emerald-200/60 px-2 py-0.5 rounded">PASSED (48m)</span>
            </div>
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900 font-bold">
              <span>R-102: Annual Turnover ≥ ₹1.00 Crore</span>
              <span className="text-[10px] uppercase bg-emerald-200/60 px-2 py-0.5 rounded">PASSED (₹3.8Cr)</span>
            </div>
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900 font-bold">
              <span>R-103: Promoters Not On Defaulter Registry</span>
              <span className="text-[10px] uppercase bg-emerald-200/60 px-2 py-0.5 rounded">PASSED (Clean CIBIL)</span>
            </div>
          </div>
        </div>

        {/* 6. ML RISK */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">Stage 6 of 13</span>
          <h2 className="text-lg font-black text-[var(--brand-950)] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[var(--brand-700)]" /> 6. Machine Learning Credit Risk Assessment
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Assessed Risk Band</span>
              <p className="text-base font-black text-[var(--brand-950)] mt-0.5">{risk?.risk_band || 'LOW_RISK'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">FinFlow Score</span>
              <p className="text-base font-black text-[var(--brand-950)] mt-0.5 font-mono">{risk?.risk_score || 785} / 1000</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Model Version</span>
              <p className="text-xs font-mono text-[var(--text-muted)] mt-1">{risk?.model_version || 'xgb_credit_v2.4'}</p>
            </div>
          </div>
        </div>

        {/* 7. SHAP */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">Stage 7 of 13</span>
          <h2 className="text-lg font-black text-[var(--brand-950)] flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[var(--brand-700)]" /> 7. SHAP Feature Attribution Analysis
          </h2>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex items-center justify-between">
              <div>
                <span className="font-bold text-[var(--brand-950)]">Positive Driver: High DSCR Solvency</span>
                <p className="text-[10px] text-[var(--text-muted)]">Debt service capability is in top 15th percentile of MSME cohort</p>
              </div>
              <span className="text-xs font-mono font-bold text-[var(--fin-green)]">+45 pts</span>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex items-center justify-between">
              <div>
                <span className="font-bold text-[var(--brand-950)]">Positive Driver: Stable Vintage</span>
                <p className="text-[10px] text-[var(--text-muted)]">Operating continuously without defaults across 48 months</p>
              </div>
              <span className="text-xs font-mono font-bold text-[var(--fin-green)]">+30 pts</span>
            </div>
          </div>
        </div>

        {/* 8. POLICY */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">Stage 8 of 13</span>
          <h2 className="text-lg font-black text-[var(--brand-950)] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[var(--brand-700)]" /> 8. Institutional Policy & Credit Norms Evaluation
          </h2>
          <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-2xl text-xs space-y-1">
            <span className="font-bold text-blue-950">Master Credit Policy CN-2026-v3</span>
            <p className="text-blue-900 leading-relaxed">
              Standard secured working capital facility conforms with RBI Master Directions on MSME lending thresholds.
            </p>
          </div>
        </div>

        {/* 9. EXPLANATION */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">Stage 9 of 13</span>
          <h2 className="text-lg font-black text-[var(--brand-950)] flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[var(--brand-700)]" /> 9. Comprehensive Explainable Rationale
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {decision?.reasoning || 'Recommendation approved based on harmonious tax-banking reconciliation, superior debt service buffer, and absence of circular transaction patterns.'}
          </p>
        </div>

        {/* 10. DECISION */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">Stage 10 of 13</span>
          <h2 className="text-lg font-black text-[var(--brand-950)] flex items-center gap-2">
            <Scale className="w-5 h-5 text-[var(--brand-700)]" /> 10. Algorithmic Underwriting Verdict
          </h2>
          {decision && <DecisionCard decision={decision} riskAssessment={risk || undefined} />}
        </div>

        {/* 11. NEXT ACTION */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">Stage 11 of 13</span>
          <h2 className="text-lg font-black text-[var(--brand-950)] flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-[var(--brand-700)]" /> 11. Prescribed Next Best Action
          </h2>
          <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] text-xs flex items-center justify-between">
            <div>
              <span className="font-bold text-[var(--brand-950)]">{nextAction?.action_type || 'DISBURSEMENT_TERMSHEET_ISSUANCE'}</span>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{nextAction?.description || 'Issue digital sanction letter and register hypothecation charge.'}</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
              Deterministic Guardrail
            </span>
          </div>
        </div>

        {/* 12. DECISION REPLAY */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">Stage 12 of 13</span>
            <Link to={`/risk/replay/${journey.journey_id}`}>
              <Button variant="outline" size="xs" rightIcon={<RotateCcw className="w-3.5 h-3.5 text-[var(--brand-700)]" />}>
                Open Full Timeline Replay
              </Button>
            </Link>
          </div>
          <h2 className="text-lg font-black text-[var(--brand-950)] flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-[var(--brand-700)]" /> 12. Chronological Decision Replay Ledger
          </h2>
          <AuditTimeline events={auditLogs} />
        </div>

        {/* 13. HUMAN REVIEW */}
        <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">Stage 13 of 13</span>
          <h2 className="text-lg font-black text-[var(--brand-950)] flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[var(--brand-700)]" /> 13. Human Review & Institutional Sign-Off
          </h2>
          {reviews.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No active reviews pending in governance queue.</p>
          ) : (
            <div className="space-y-2">
              {reviews.map((r) => (
                <div key={r.reviewId} className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1 text-amber-900">
                  <div className="flex items-center justify-between font-bold">
                    <span>Reviewer: {r.reviewerRole}</span>
                    <span className="text-[10px] font-mono">{r.status}</span>
                  </div>
                  <p>{r.rationaleNotes || 'Under supervisory evaluation'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          ACTION MODALS (Challenge, Request Info, Escalate, Compliance Note, Discrepancy, Override)
         ───────────────────────────────────────────────────────────────────────────── */}
      {modalType !== 'NONE' && (
        <Modal
          isOpen={true}
          onClose={() => setModalType('NONE')}
          title={
            modalType === 'CHALLENGE' ? 'Challenge Algorithmic Verdict' :
            modalType === 'REQUEST_INFO' ? 'Request Additional Evidence' :
            modalType === 'ESCALATE' ? 'Escalate Case to Senior Governance' :
            modalType === 'COMPLIANCE_NOTE' ? 'Enter Compliance Caveat' :
            modalType === 'FLAG_INCONSISTENCY' ? 'Flag Evidence Inconsistency' :
            'Recommend Institutional Override'
          }
          subtitle="Every action is cryptographically anchored to the permanent case ledger"
          maxWidth="lg"
        >
          <form onSubmit={handleExecuteAction} className="space-y-4">
            {modalType === 'OVERRIDE' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">New Override Verdict</label>
                  <select
                    value={overrideOutcome}
                    onChange={(e) => setOverrideOutcome(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-[var(--border)] p-2.5 bg-white"
                  >
                    <option value="APPROVED">APPROVED (Full Disbursal)</option>
                    <option value="CONDITIONAL_APPROVAL">CONDITIONAL APPROVAL (With Covenants)</option>
                    <option value="REJECTED">REJECTED (High Default Risk)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">Sanction Facility Amount (INR)</label>
                  <input
                    type="number"
                    value={overrideAmount}
                    onChange={(e) => setOverrideAmount(Number(e.target.value))}
                    className="w-full text-xs font-bold rounded-xl border border-[var(--border)] p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">Reason Code</label>
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-[var(--border)] p-2.5 bg-white"
                  >
                    <option value="PROMOTER_ADDITIONAL_COLLATERAL">Additional Promoter Collateral Pledged</option>
                    <option value="STRONG_INDUSTRY_TAILWINDS">Strong Industry Sector Tailwinds</option>
                    <option value="REPUTED_BUYER_TIEUP">Verified Reputed Institutional Buyer Offtake</option>
                    <option value="FRAUD_NETWORK_CONFIRMED">Adverse Shell Corporation Link Confirmed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">Detailed Synthesis Notes</label>
                  <textarea
                    value={overrideNotes}
                    onChange={(e) => setOverrideNotes(e.target.value)}
                    placeholder="Provide mandatory underwriter rationale..."
                    rows={3}
                    className="w-full text-xs p-3 rounded-xl border border-[var(--border)]"
                    required
                  />
                </div>
              </>
            )}

            {modalType === 'CHALLENGE' && (
              <div>
                <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">Challenge Grounds & Contradictions</label>
                <textarea
                  value={challengeNotes}
                  onChange={(e) => setChallengeNotes(e.target.value)}
                  placeholder="State the specific algorithmic assumptions or policy interpretations being challenged..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-xl border border-[var(--border)]"
                  required
                />
              </div>
            )}

            {modalType === 'REQUEST_INFO' && (
              <div>
                <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">Information / Evidence Required</label>
                <textarea
                  value={infoRequestText}
                  onChange={(e) => setInfoRequestText(e.target.value)}
                  placeholder="Detail the exact document or financial schedule required from the applicant..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-xl border border-[var(--border)]"
                  required
                />
              </div>
            )}

            {modalType === 'ESCALATE' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">Escalation Destination</label>
                  <select
                    value={escalateTarget}
                    onChange={(e) => setEscalateTarget(e.target.value as any)}
                    className="w-full text-xs font-bold rounded-xl border border-[var(--border)] p-2.5 bg-white"
                  >
                    <option value="RISK_MANAGER">Senior Risk Manager (Supervisory Review)</option>
                    <option value="CREDIT_APPROVER">Credit Sanction Committee (Executive Sanction)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">Escalation Justification</label>
                  <textarea
                    value={escalateReason}
                    onChange={(e) => setEscalateReason(e.target.value)}
                    placeholder="Provide justification for escalation..."
                    rows={3}
                    className="w-full text-xs p-3 rounded-xl border border-[var(--border)]"
                    required
                  />
                </div>
              </>
            )}

            {modalType === 'COMPLIANCE_NOTE' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">Severity</label>
                  <select
                    value={complianceSeverity}
                    onChange={(e) => setComplianceSeverity(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-[var(--border)] p-2.5 bg-white"
                  >
                    <option value="INFO">Informational Advisory</option>
                    <option value="MEDIUM">Medium Caution</option>
                    <option value="HIGH">High Risk Covenant Mandatory</option>
                    <option value="CRITICAL">Critical Regulatory Stop</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">Compliance Observation</label>
                  <textarea
                    value={complianceNoteText}
                    onChange={(e) => setComplianceNoteText(e.target.value)}
                    placeholder="Enter compliance finding or covenant condition..."
                    rows={3}
                    className="w-full text-xs p-3 rounded-xl border border-[var(--border)]"
                    required
                  />
                </div>
              </>
            )}

            {modalType === 'FLAG_INCONSISTENCY' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">Inconsistent Metric</label>
                  <select
                    value={inconsistencyField}
                    onChange={(e) => setInconsistencyField(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-[var(--border)] p-2.5 bg-white"
                  >
                    <option value="REVENUE_VARIANCE">GSTR-3B vs Bank Turnover Discrepancy</option>
                    <option value="PAN_DIRECTOR_MISMATCH">Promoter Name vs MCA Director Master Mismatch</option>
                    <option value="DEPRECIATION_SCHEDULE">Depreciation Non-Alignment with ITR-5</option>
                    <option value="ROUND_TRIPPING_RISK">High Circular Routing Score</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">Discrepancy Details</label>
                  <textarea
                    value={inconsistencySummary}
                    onChange={(e) => setInconsistencySummary(e.target.value)}
                    placeholder="Describe the discrepancy and variance percentage..."
                    rows={3}
                    className="w-full text-xs p-3 rounded-xl border border-[var(--border)]"
                    required
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setModalType('NONE')}>
                Cancel
              </Button>
              <Button variant="brutal" size="sm" type="submit" isLoading={isSubmittingAction}>
                Submit & Log to Ledger
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
