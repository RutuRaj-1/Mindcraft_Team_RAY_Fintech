import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import {
  HumanReview, HumanReviewOutcome, SubmitReviewRequest,
  FeedbackEvent, DecisionRecord, RiskAssessment,
} from '../../types';
import {
  UserCheck, AlertTriangle, CheckCircle2, XCircle, Clock,
  ArrowRight, FileText, GitBranch, BarChart2, ShieldCheck,
  MessageSquare, Zap, ChevronDown, ChevronUp, Info,
  Scale, BookOpen, Send, RotateCcw,
} from 'lucide-react';

interface HumanReviewWorkflowProps {
  journeyId: string;
  onRefresh: () => void;
}

const REASON_CODES = [
  { value: 'COLLATERAL_BACKED',          label: 'COLLATERAL_BACKED — Commercial Property / FD Pledged' },
  { value: 'PROVEN_CASHFLOW',            label: 'PROVEN_CASHFLOW — Strong Historical Seasonality Buffer' },
  { value: 'RELATIONSHIP_EXCEPTION',     label: 'RELATIONSHIP_EXCEPTION — Tier-1 Anchor Corporate Guarantee' },
  { value: 'FIELD_VERIFIED',             label: 'FIELD_VERIFIED — Physical Stock & Depot Inspection Passed' },
  { value: 'POLICY_EXCEPTION_COMMITTEE', label: 'POLICY_EXCEPTION_COMMITTEE — Credit Committee Exception' },
  { value: 'FRAUD_RISK_CONFIRMED',       label: 'FRAUD_RISK_CONFIRMED — Risk Intelligence Confirmed Exposure' },
  { value: 'ADDITIONAL_DOCUMENTS_REQUIRED', label: 'ADDITIONAL_DOCUMENTS_REQUIRED — Evidence Incomplete' },
  { value: 'ESCALATION_SENIOR_CREDIT',   label: 'ESCALATION_SENIOR_CREDIT — Senior Credit Review Required' },
  { value: 'AI_ASSESSMENT_CONCURRED',    label: 'AI_ASSESSMENT_CONCURRED — Human Concurs with AI Outcome' },
  { value: 'REGULATORY_OVERRIDE',        label: 'REGULATORY_OVERRIDE — Regulatory / Compliance Directive' },
];

const OUTCOMES: { value: HumanReviewOutcome; label: string; color: string; bg: string }[] = [
  { value: 'APPROVED',             label: 'APPROVE',                  color: 'var(--fin-green)',  bg: 'var(--fin-green-bg)' },
  { value: 'DECLINED',             label: 'DECLINE',                  color: 'var(--fin-coral)',  bg: 'var(--fin-coral-bg)' },
  { value: 'NEEDS_REVIEW',         label: 'REQUEST MORE INFORMATION', color: '#d97706',           bg: '#fef3c7' },
  { value: 'CONDITIONAL_APPROVAL', label: 'OVERRIDE',                 color: '#dc2626',           bg: '#fee2e2' },
  { value: 'ESCALATED',            label: 'ESCALATE',                 color: 'var(--fin-violet)', bg: '#f3f0ff' },
];

const outcomeLabel = (o: string) =>
  OUTCOMES.find(x => x.value === o)?.label || o.replace(/_/g, ' ');

const outcomeColor = (o: string) =>
  OUTCOMES.find(x => x.value === o)?.color || 'var(--text-secondary)';

// Friendly elapsed-time label
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const HumanReviewWorkflow: React.FC<HumanReviewWorkflowProps> = ({
  journeyId,
  onRefresh,
}) => {
  const [reviews,        setReviews]        = useState<HumanReview[]>([]);
  const [feedbackEvents, setFeedbackEvents] = useState<FeedbackEvent[]>([]);
  const [decision,       setDecision]       = useState<DecisionRecord | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);

  // Active review (one at a time per session)
  const [activeReview,   setActiveReview]   = useState<HumanReview | null>(null);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  // Submission form state
  const [submitting,     setSubmitting]     = useState(false);
  const [outcome,        setOutcome]        = useState<HumanReviewOutcome>('APPROVED');
  const [reasonCode,     setReasonCode]     = useState('AI_ASSESSMENT_CONCURRED');
  const [rationale,      setRationale]      = useState('');
  const [coSigner,       setCoSigner]       = useState('');
  const [newAmount,      setNewAmount]      = useState<number | ''>('');
  const [newRate,        setNewRate]        = useState<number | ''>('');

  // ---------- Load data ---------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reviewsRes, feedbackRes, decRes, rskRes] = await Promise.all([
        api.getJourneyReviews(journeyId).catch(() => [] as HumanReview[]),
        api.getFeedbackEvents(journeyId).catch(() => [] as FeedbackEvent[]),
        api.getDecision(journeyId).catch(() => null),
        api.getRiskAssessment(journeyId).catch(() => null),
      ]);
      setReviews(reviewsRes);
      setFeedbackEvents(feedbackRes);
      setDecision(decRes);
      setRiskAssessment(rskRes);

      // Auto-open any OPEN review
      const openReview = reviewsRes.find(r => r.status === 'OPEN');
      if (openReview) setActiveReview(openReview);
    } catch (e: any) {
      setError(e.message || 'Failed to load review data');
    } finally {
      setLoading(false);
    }
  }, [journeyId]);

  useEffect(() => { load(); }, [load]);

  // ---------- Start a new review ------------------------------------------
  const handleStartReview = async () => {
    try {
      const review = await api.startReview(journeyId);
      setActiveReview(review);
      setReviews(prev => [review, ...prev]);
    } catch (e: any) {
      alert(`Could not open review: ${e.message}`);
    }
  };

  // ---------- Submit outcome -----------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReview) return;

    // When OVERRIDE, require Reason
    const isOverride = outcome === 'CONDITIONAL_APPROVAL';
    if (isOverride && !reasonCode.trim()) {
      alert('A Reason is strictly mandatory when performing an OVERRIDE.');
      return;
    }

    if (!rationale.trim() || rationale.trim().length < 5) {
      alert('A supporting note or rationale (min 5 chars) is required.');
      return;
    }

    setSubmitting(true);
    try {
      const req: SubmitReviewRequest = {
        human_outcome: outcome,
        reason_code: reasonCode,
        rationale_notes: rationale.trim(),
        co_signed_by: coSigner || undefined,
        new_approved_amount: newAmount !== '' ? Number(newAmount) : undefined,
        new_interest_rate: newRate !== '' ? Number(newRate) : undefined,
      };
      const updated = await api.submitReview(journeyId, activeReview.reviewId, req);
      setActiveReview(updated);
      setReviews(prev => prev.map(r => r.reviewId === updated.reviewId ? updated : r));

      // Refresh all 5 backend states (decision, journey, next action, review state, audit timeline)
      await Promise.all([
        api.getDecision(journeyId).catch(() => null),
        api.getJourney(journeyId).catch(() => null),
        api.getNextBestActions(journeyId).catch(() => null),
        api.getJourneyReviews(journeyId).catch(() => []),
        api.replayDecision(journeyId).catch(() => null),
      ]);

      await load();
      onRefresh();
    } catch (e: any) {
      alert(`Submission failed: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Derived UI helpers -------------------------------------------
  const hasOpenReview    = reviews.some(r => r.status === 'OPEN');
  const submittedReviews = reviews.filter(r => r.status !== 'OPEN');

  // =========================================================================
  // Render
  // =========================================================================
  if (loading) {
    return (
      <div className="card p-12 text-center">
        <div className="w-8 h-8 border-2 border-[var(--brand-600)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-[var(--text-muted)]">Loading review data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-700)] to-[var(--brand-500)] flex items-center justify-center shadow">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Human Review & Governance Workflow
              </h2>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                Structured override workflow · AI decisions preserved · Immutable audit trail
              </p>
            </div>
          </div>

          {/* Governance badge */}
          <div className="flex items-center gap-2">
            {decision && (
              <div className={`px-3 py-1.5 rounded-xl border text-center`}
                style={{ background: 'var(--fin-amber-bg)', borderColor: 'rgba(217,119,6,.2)' }}>
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">AI Decision</p>
                <p className="text-[11px] font-black" style={{ color: outcomeColor(decision.outcome) }}>
                  {outcomeLabel(decision.outcome)}
                </p>
              </div>
            )}
            {!hasOpenReview && (
              <button
                onClick={handleStartReview}
                className="btn-primary text-xs"
                style={{ background: 'linear-gradient(135deg, #0F2220, #237277)' }}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Open Case for Review
              </button>
            )}
          </div>
        </div>

        {/* Governance principle banner */}
        <div className="mt-4 alert-panel warning flex items-start gap-2 text-[11px]">
          <Info className="w-4 h-4 text-[var(--fin-amber)] shrink-0 mt-0.5" />
          <span>
            <strong>Governance Principle:</strong> The original AI decision is never deleted.
            Human outcomes are stored separately. Every override becomes an immutable feedback event
            that drives future model calibration.
          </span>
        </div>
      </div>

      {/* ── AI Decision Snapshot (context panel) ───────────────────────────── */}
      {decision && riskAssessment && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              label: 'Trust Score',
              value: String(riskAssessment.risk_score ?? '–'),
              sub: '/1000  · ' + (riskAssessment.risk_band?.replace('_', ' ') || ''),
              color: (riskAssessment.risk_score ?? 0) > 800 ? 'var(--fin-green)'
                   : (riskAssessment.risk_score ?? 0) > 600 ? 'var(--fin-amber)' : 'var(--fin-coral)',
              icon: ShieldCheck,
            },
            {
              label: 'AI Decision',
              value: outcomeLabel(decision.outcome),
              sub: `By ${decision.decided_by || 'AI_ORCHESTRATOR'}`,
              color: outcomeColor(decision.outcome),
              icon: BarChart2,
            },
            {
              label: 'Approved Amount',
              value: decision.approved_amount
                ? `₹${(decision.approved_amount / 100000).toFixed(1)}L`
                : 'N/A',
              sub: decision.interest_rate ? `@ ${decision.interest_rate}% p.a.` : '',
              color: 'var(--brand-700)',
              icon: Zap,
            },
          ].map((kpi, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="metric-label">{kpi.label}</p>
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <p className="metric-value text-xl" style={{ color: kpi.color }}>{kpi.value}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── AI Reasoning (from decision) ───────────────────────────────────── */}
      {decision?.reasoning && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-[var(--brand-600)]" />
            <span className="text-xs font-bold text-[var(--brand-900)]">AI Reasoning (read-only snapshot)</span>
            <span className="badge badge-green ml-auto">Immutable</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {decision.reasoning}
          </p>
        </div>
      )}

      {/* ── Active Review Form ─────────────────────────────────────────────── */}
      {activeReview && activeReview.status === 'OPEN' && (
        <div className="card overflow-hidden">
          {/* Form header */}
          <div className="bg-gradient-to-r from-[var(--brand-900)] to-[var(--brand-700)] px-5 py-4">
            <div className="flex items-center gap-2 text-white">
              <UserCheck className="w-4 h-4 text-[var(--brand-300)]" />
              <div>
                <h3 className="text-sm font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Case Review — {activeReview.reviewId}
                </h3>
                <p className="text-[10px] text-[var(--brand-200)] mt-0.5">
                  Opened {timeAgo(activeReview.createdAt)} · {activeReview.reviewerRole}
                </p>
              </div>
            </div>
          </div>

          {/* AI vs Human side-by-side comparison */}
          <div className="grid grid-cols-2 gap-4 p-5 border-b border-[var(--border)]">
            <div className="bg-[var(--surface-subtle)] rounded-xl p-4 border border-[var(--border)]">
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
                AI Recommendation (Preserved)
              </p>
              <p className="text-sm font-black" style={{ color: outcomeColor(activeReview.originalAIOutcome) }}>
                {outcomeLabel(activeReview.originalAIOutcome)}
              </p>
              {activeReview.aiDecisionSnapshot?.approved_amount && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  ₹{(activeReview.aiDecisionSnapshot.approved_amount / 100000).toFixed(1)}L
                  {activeReview.aiDecisionSnapshot.interest_rate
                    ? ` @ ${activeReview.aiDecisionSnapshot.interest_rate}% p.a.`
                    : ''}
                </p>
              )}
              {activeReview.aiDecisionSnapshot?.risk_score && (
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Trust Score: {activeReview.aiDecisionSnapshot.risk_score} / 1000
                </p>
              )}
            </div>
            <div className="bg-[var(--brand-50)] rounded-xl p-4 border border-[var(--brand-200)]">
              <p className="text-[9px] font-bold text-[var(--brand-600)] uppercase tracking-widest mb-2">
                Your Decision
              </p>
              <p className="text-sm font-black" style={{ color: outcomeColor(outcome) }}>
                {outcomeLabel(outcome)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                {reasonCode.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {/* Review form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">

            {/* Outcome selector */}
            <div>
              <label className="fin-label">Human Review Outcome *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {OUTCOMES.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setOutcome(o.value)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                      outcome === o.value
                        ? 'shadow-sm ring-2'
                        : 'opacity-60 hover:opacity-90'
                    }`}
                    style={{
                      background: o.bg,
                      borderColor: outcome === o.value ? o.color : 'transparent',
                      color: o.color,
                      outlineColor: o.color,
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason code */}
            <div>
              <label className="fin-label">Institutional Reason Code *</label>
              <select
                value={reasonCode}
                onChange={e => setReasonCode(e.target.value)}
                className="fin-input text-xs"
                required
              >
                {REASON_CODES.map(rc => (
                  <option key={rc.value} value={rc.value}>{rc.label}</option>
                ))}
              </select>
            </div>

            {/* Amount & rate overrides (conditional) */}
            {(outcome === 'APPROVED' || outcome === 'CONDITIONAL_APPROVAL') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="fin-label">Override Approved Amount (INR)</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Leave blank to keep AI amount"
                    className="fin-input text-xs"
                  />
                </div>
                <div>
                  <label className="fin-label">Override Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={newRate}
                    onChange={e => setNewRate(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Leave blank to keep AI rate"
                    className="fin-input text-xs"
                  />
                </div>
              </div>
            )}

            {/* Mandatory rationale */}
            <div>
              <label className="fin-label">
                Mandatory Underwriting Rationale{' '}
                <span className="text-[var(--fin-coral)]">*</span>
              </label>
              <textarea
                rows={4}
                value={rationale}
                onChange={e => setRationale(e.target.value)}
                placeholder="State the factual basis for your review decision. This is required for the immutable audit record..."
                className="fin-input text-xs resize-none"
                required
                minLength={10}
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                {rationale.length} / 10 minimum characters
              </p>
            </div>

            {/* Co-signer */}
            <div>
              <label className="fin-label">Co-Signing Officer / Supervisor (Optional)</label>
              <input
                type="text"
                value={coSigner}
                onChange={e => setCoSigner(e.target.value)}
                placeholder="Name and title of co-signatory"
                className="fin-input text-xs"
              />
            </div>

            {/* Audit notice */}
            <div className="alert-panel warning flex items-start gap-2 text-[11px]">
              <AlertTriangle className="w-4 h-4 text-[var(--fin-amber)] shrink-0 mt-0.5" />
              <span>
                This review decision will be recorded immutably in the audit ledger.
                A feedback event will be created for model calibration. The original AI decision
                is preserved unchanged in the <code>decisions</code> collection.
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setActiveReview(null)}
                className="btn-secondary text-xs"
              >
                Save Draft & Close
              </button>
              <button
                type="submit"
                disabled={submitting || rationale.trim().length < 10}
                className="btn-primary text-xs gap-2"
                style={{ background: 'linear-gradient(135deg, #0F2220, #237277)' }}
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Submitting…' : 'Commit Review to Audit Ledger'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Review History ─────────────────────────────────────────────────── */}
      {submittedReviews.length > 0 && (
        <div className="card p-5">
          <h3 className="text-[13px] font-bold text-[var(--brand-900)] mb-4 flex items-center gap-2"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
            <GitBranch className="w-4 h-4 text-[var(--brand-600)]" />
            Review History
            <span className="badge badge-green ml-auto">{submittedReviews.length} submitted</span>
          </h3>

          <div className="space-y-3">
            {submittedReviews.map(r => (
              <div
                key={r.reviewId}
                className="border border-[var(--border)] rounded-xl overflow-hidden"
              >
                {/* Row header */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--surface-subtle)] hover:bg-[var(--surface)] transition-colors text-left"
                  onClick={() => setExpandedReview(expandedReview === r.reviewId ? null : r.reviewId)}
                >
                  {r.status === 'ESCALATED' ? (
                    <Clock className="w-4 h-4 text-[var(--fin-violet)] shrink-0" />
                  ) : r.humanOutcome && ['APPROVED', 'CONDITIONAL_APPROVAL'].includes(r.humanOutcome) ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--fin-green)] shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[var(--fin-coral)] shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {r.reviewerName || r.reviewerRole}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        · {r.reviewerRole}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        · {timeAgo(r.submittedAt || r.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-[var(--text-muted)]">AI: {outcomeLabel(r.originalAIOutcome)}</span>
                      <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                      <span className="text-[10px] font-bold" style={{ color: outcomeColor(r.humanOutcome || '') }}>
                        {r.humanOutcome ? outcomeLabel(r.humanOutcome) : 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`badge ${r.humanOutcome === r.originalAIOutcome ? 'badge-green' : 'badge-coral'}`}>
                      {r.humanOutcome === r.originalAIOutcome ? 'Concurred' : 'Override'}
                    </span>
                    {expandedReview === r.reviewId
                      ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {expandedReview === r.reviewId && (
                  <div className="p-4 space-y-3 border-t border-[var(--border)]">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">
                          Reason Code
                        </p>
                        <p className="text-xs font-semibold text-[var(--text-primary)]">
                          {r.reasonCode?.replace(/_/g, ' ') || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">
                          Co-Signed By
                        </p>
                        <p className="text-xs font-semibold text-[var(--text-primary)]">
                          {r.coSignedBy || 'None'}
                        </p>
                      </div>
                    </div>

                    {r.rationaleNotes && (
                      <div className="bg-[var(--surface-subtle)] p-3 rounded-lg border border-[var(--border)]">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <MessageSquare className="w-3 h-3 text-[var(--brand-600)]" />
                          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                            Rationale
                          </p>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                          {r.rationaleNotes}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                      <ShieldCheck className="w-3 h-3 text-[var(--fin-green)]" />
                      <span>Review ID: <code>{r.reviewId}</code></span>
                      <span>·</span>
                      <span>AI Decision: <code>{r.aiDecisionId}</code></span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Feedback Events (Model Calibration Signal) ─────────────────────── */}
      {feedbackEvents.length > 0 && (
        <div className="card p-5">
          <h3 className="text-[13px] font-bold text-[var(--brand-900)] mb-4 flex items-center gap-2"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Zap className="w-4 h-4 text-[var(--fin-amber)]" />
            Feedback Events — Model Calibration Signal
            <span className="badge badge-amber ml-auto">{feedbackEvents.length} events</span>
          </h3>

          <div className="space-y-2">
            {feedbackEvents.slice(0, 8).map((ev, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)]">
                <div className={`w-2 h-2 rounded-full shrink-0 ${ev.isOverride ? 'bg-amber-500' : 'bg-green-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {ev.reviewerRole}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">{ev.reviewerName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-[var(--text-muted)]">AI: {outcomeLabel(ev.AIOutcome)}</span>
                    <ArrowRight className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                    <span className="text-[10px] font-bold" style={{ color: outcomeColor(ev.HumanOutcome) }}>
                      {outcomeLabel(ev.HumanOutcome)}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      · {ev.reasonCode?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`badge ${ev.isOverride ? 'badge-coral' : 'badge-green'}`}>
                    {ev.isOverride ? 'Override' : 'Concurred'}
                  </span>
                  <p className="text-[9px] text-[var(--text-muted)] mt-1">{timeAgo(ev.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>

          {feedbackEvents.length > 0 && (
            <div className="mt-4 bg-[var(--brand-50)] p-3 rounded-xl border border-[var(--brand-200)]">
              <p className="text-[10px] text-[var(--brand-700)]">
                <strong>Calibration Signal:</strong>{' '}
                {feedbackEvents.filter(e => e.isOverride).length} out of{' '}
                {feedbackEvents.length} review(s) resulted in a human override.
                These events feed into the next model retraining cycle.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {reviews.length === 0 && !activeReview && !loading && (
        <div className="card p-12 text-center">
          <UserCheck className="w-10 h-10 text-[var(--border-strong)] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--text-secondary)]">No reviews yet for this case</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
            Open a human review to inspect evidence, risk factors, policy, and submit a decision.
          </p>
          <button
            onClick={handleStartReview}
            className="btn-primary text-xs mx-auto"
            style={{ background: 'linear-gradient(135deg, #0F2220, #237277)' }}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Open Case for Review
          </button>
        </div>
      )}

      {error && (
        <div className="alert-panel danger flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-[var(--fin-coral)] shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};
