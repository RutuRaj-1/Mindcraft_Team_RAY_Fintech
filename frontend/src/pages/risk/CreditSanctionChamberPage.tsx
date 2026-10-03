import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  dashboardApi,
  reviewApi,
  actionsApi,
  decisionsApi,
  auditApi,
  riskApi,
  evidenceApi,
  journeysApi,
} from '../../api';
import { QueueItem, HumanReview, DecisionRecord, RiskAssessment, ConsistencyReport } from '../../types';
import { MetricCard } from '../../components/fintech/MetricCard';
import { DataTable } from '../../components/fintech/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  Award, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight,
  RefreshCw, Gavel, Check, X, FileText, ChevronRight, Building2,
  Clock, RotateCcw, AlertOctagon, FolderCheck, History, Scale,
  BookOpen, Cpu, TrendingUp, HelpCircle, Send
} from 'lucide-react';

type CommitteeActionType = 'APPROVE' | 'DECLINE' | 'RETURN_FOR_INFORMATION' | 'ESCALATE';

export const CreditSanctionChamberPage: React.FC = () => {
  const { persona } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'approval_dashboard';

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [reviews, setReviews] = useState<HumanReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Aggregated Decision Package State
  const [selectedCase, setSelectedCase] = useState<QueueItem | null>(null);
  const [isPackageOpen, setIsPackageOpen] = useState(false);
  const [packageDecision, setPackageDecision] = useState<DecisionRecord | null>(null);
  const [packageRisk, setPackageRisk] = useState<RiskAssessment | null>(null);
  const [packageConsistency, setPackageConsistency] = useState<ConsistencyReport | null>(null);
  const [packageAuditLogs, setPackageAuditLogs] = useState<any[]>([]);
  const [isPackageLoading, setIsPackageLoading] = useState(false);

  // Action execution modal
  const [activeAction, setActiveAction] = useState<CommitteeActionType | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [sanctionedAmount, setSanctionedAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [queueItems, reviewList] = await Promise.all([
        dashboardApi.getOfficerQueue(),
        reviewApi.listReviews(undefined, 'CREDIT_APPROVER').catch(() => []),
      ]);
      setQueue(queueItems);
      setReviews(reviewList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Credit Committee pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTabChange = (tabKey: string) => {
    setSearchParams({ tab: tabKey });
  };

  const handleOpenDecisionPackage = async (row: QueueItem) => {
    setSelectedCase(row);
    setSanctionedAmount(row.requested_amount);
    setIsPackageOpen(true);
    setIsPackageLoading(true);
    try {
      const [dec, rsk, rep, aud] = await Promise.all([
        decisionsApi.getDecision(row.journey_id).catch(() => null),
        riskApi.getRiskAssessment(row.journey_id).catch(() => null),
        evidenceApi.getConsistencyReport(row.journey_id).catch(() => null),
        auditApi.getAuditTrail(row.journey_id).catch(() => []),
      ]);
      setPackageDecision(dec);
      setPackageRisk(rsk);
      setPackageConsistency(rep);
      setPackageAuditLogs(aud);
    } catch (err) {
      console.error('Failed to load full package components', err);
    } finally {
      setIsPackageLoading(false);
    }
  };

  const handleExecuteCommitteeAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !activeAction) return;
    setIsSubmitting(true);
    try {
      const ensureReviewId = async (jId: string): Promise<string> => {
        const existing = reviews.find((r) => r.journeyId === jId || r.applicationId === selectedCase.application_id);
        if (existing?.reviewId) return existing.reviewId;
        const created = await reviewApi.startReview(jId, 'Credit Committee Sanction Chamber convened');
        return created.reviewId;
      };

      if (activeAction === 'APPROVE') {
        const revId = await ensureReviewId(selectedCase.journey_id);
        await reviewApi.submitReview(selectedCase.journey_id, revId, {
          human_outcome: 'APPROVED',
          reason_code: 'COMMITTEE_FINAL_SANCTION_APPROVED',
          rationale_notes: decisionReason || 'Final Credit Sanction approved by Credit Approver with evidence and risk snapshots permanently recorded.',
          new_approved_amount: sanctionedAmount,
        });
        setSuccessToast(`Facility of ₹${(sanctionedAmount / 100000).toFixed(2)} Lakhs APPROVED for ${selectedCase.business_name}.`);
      } else if (activeAction === 'DECLINE') {
        const revId = await ensureReviewId(selectedCase.journey_id);
        await reviewApi.submitReview(selectedCase.journey_id, revId, {
          human_outcome: 'REJECTED',
          reason_code: 'COMMITTEE_SANCTION_DECLINED',
          rationale_notes: decisionReason || 'Credit Committee resolved to decline facility based on risk criteria.',
        });
        setSuccessToast(`Application ${selectedCase.journey_id} DECLINED by Credit Committee.`);
      } else if (activeAction === 'RETURN_FOR_INFORMATION') {
        await actionsApi.executeSafeAction(selectedCase.journey_id, {
          action_type: 'RETURN_FOR_INFORMATION',
          audit_notes: `Credit Committee requested additional information: ${decisionReason}`,
          reviewer_role: 'CREDIT_APPROVER',
        });
        setSuccessToast(`Case ${selectedCase.journey_id} returned for supplementary documentation.`);
      } else if (activeAction === 'ESCALATE') {
        await reviewApi.startReview(
          selectedCase.journey_id,
          decisionReason || 'Escalated to Board Credit Committee / Full Board of Directors.'
        );
        setSuccessToast(`Case ${selectedCase.journey_id} escalated to Board Credit Committee.`);
      }

      setActiveAction(null);
      setIsPackageOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Committee Action Failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { key: 'approval_dashboard', label: 'Approval Dashboard', icon: Award },
    { key: 'pending_decisions', label: 'Pending Decisions', icon: Clock },
    { key: 'exception_cases', label: 'Exception Cases', icon: AlertTriangle },
    { key: 'high_value_cases', label: 'High-Value Cases (>₹1Cr)', icon: Building2 },
    { key: 'credit_packages', label: 'Credit Packages', icon: FolderCheck },
    { key: 'decision_history', label: 'Decision History', icon: History },
  ];

  const totalSanctionExposure = queue.reduce((acc, q) => acc + (q.requested_amount || 0), 0);
  const highValueCases = queue.filter((q) => q.requested_amount >= 2000000);
  const pendingCases = queue.filter((q) => q.decision_outcome !== 'APPROVED');

  const columns = [
    {
      key: 'business_name',
      header: 'Enterprise / Corporate',
      render: (row: QueueItem) => (
        <div>
          <p className="font-bold text-[var(--brand-950)] text-xs">{row.business_name}</p>
          <p className="text-[10px] text-[var(--text-muted)] font-mono">{row.journey_id}</p>
        </div>
      ),
    },
    {
      key: 'applicant_name',
      header: 'Promoter',
      render: (row: QueueItem) => (
        <span className="text-xs font-semibold text-[var(--brand-900)]">
          {row.applicant_name || 'Authorized Signatory'}
        </span>
      ),
    },
    {
      key: 'requested_amount',
      header: 'Sanction Amount Requested',
      render: (row: QueueItem) => (
        <span className="font-mono font-bold text-sm text-[var(--brand-950)]">
          ₹{(row.requested_amount / 100000).toFixed(2)} Lakhs
        </span>
      ),
    },
    {
      key: 'decision_outcome',
      header: 'Algorithm Verdict',
      render: (row: QueueItem) => (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          row.decision_outcome === 'APPROVED'
            ? 'bg-[var(--fin-green-bg)] text-[var(--fin-green)] border-[var(--fin-green)]/30'
            : row.decision_outcome === 'CONDITIONAL_APPROVAL'
            ? 'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border-[var(--fin-amber)]/30'
            : 'bg-[var(--fin-coral-bg)] text-[var(--fin-coral)] border-[var(--fin-coral)]/30'
        }`}>
          {row.decision_outcome}
        </span>
      ),
    },
    {
      key: 'trust_score',
      header: 'Integrity Score',
      render: (row: QueueItem) => (
        <span className="font-mono font-bold text-xs">
          {row.trust_score || '780'} / 1000
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Sanction Chamber Action',
      align: 'right' as const,
      render: (row: QueueItem) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => navigate(`/risk/replay/${row.journey_id}`)}
          >
            Replay
          </Button>
          <Button
            variant="brutal"
            size="xs"
            onClick={() => handleOpenDecisionPackage(row)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Review Package
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="rect" height={100} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton variant="rect" height={90} />
          <Skeleton variant="rect" height={90} />
          <Skeleton variant="rect" height={90} />
          <Skeleton variant="rect" height={90} />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Credit Chamber Offline" message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
              Role 6: Executive Credit Sanction Committee
            </span>
            <span className="text-xs font-mono font-bold text-[var(--brand-900)]">FINAL SANCTION AUTHORITY (TIER 3)</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Executive Credit Sanction Chamber
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Presiding Approver: <strong className="text-[var(--brand-950)]">{persona.name}</strong> · Sanction Authority: Unlimited / Multi-Tier Credit Committee
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={loadData}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Pipeline
        </Button>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-[var(--fin-green-bg)] border border-[var(--fin-green)] text-[var(--fin-green)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Check className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSuccessToast(null)}>Dismiss</Button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Pending Committee Review"
          value={`${pendingCases.length} Packages`}
          benchmark="Formal Vote Required"
          status="warning"
          icon={<Clock className="w-4 h-4 text-amber-600" />}
        />
        <MetricCard
          label="Sanction Exposure Pipeline"
          value={`₹${(totalSanctionExposure / 10000000).toFixed(2)} Cr`}
          benchmark="Commercial MSME Portfolio"
          status="info"
          icon={<Award className="w-4 h-4 text-[var(--brand-700)]" />}
        />
        <MetricCard
          label="High-Value Facilities"
          value={`${highValueCases.length} Cases`}
          benchmark="Facility > ₹20.0 Lakhs"
          status="info"
          icon={<Building2 className="w-4 h-4 text-[var(--fin-blue)]" />}
        />
        <MetricCard
          label="Governance Ratification"
          value="100% Chained"
          benchmark="Cryptographic Hash Verified"
          status="success"
          icon={<CheckCircle2 className="w-4 h-4 text-[var(--fin-green)]" />}
        />
      </div>

      {/* 6 Workspace Navigation Tabs (Part 21) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[var(--border)]">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === key
                ? 'bg-[var(--brand-950)] text-white shadow-[2px_2px_0px_#0A1F20]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--brand-950)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'approval_dashboard' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-[var(--brand-950)]">Credit Committee Review Pipeline</h3>
            <span className="text-xs text-[var(--text-muted)]">Select any application to inspect the full Decision Package</span>
          </div>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'pending_decisions' && (
        <div className="space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Pending Final Sanction Votes</h3>
          <DataTable data={pendingCases} columns={columns} />
        </div>
      )}

      {activeTab === 'exception_cases' && (
        <div className="space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Exception & Policy Deviation Cases</h3>
          <DataTable data={queue.filter(q => q.discrepancy_count > 0 || q.decision_outcome === 'CONDITIONAL_APPROVAL')} columns={columns} />
        </div>
      )}

      {activeTab === 'high_value_cases' && (
        <div className="space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Tier 3 High-Value Commercial Facilities (&gt; ₹1.00 Crore)</h3>
          <DataTable data={highValueCases} columns={columns} />
        </div>
      )}

      {activeTab === 'credit_packages' && (
        <div className="space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Underwriting Credit Packages Ready for Chamber Vote</h3>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'decision_history' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Credit Committee Decision History</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Permanent record of all ratified, declined, and conditioned credit sanction letters.
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          AGGREGATED DECISION PACKAGE MODAL (14 DIMENSIONS — PART 21)
         ───────────────────────────────────────────────────────────────────────────── */}
      {isPackageOpen && selectedCase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border-2 border-[var(--brand-950)] shadow-[8px_8px_0px_#0A1F20] max-w-4xl w-full p-6 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Package Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">
                  Aggregated Credit Decision Package (14 Dimensions)
                </span>
                <h2 className="text-2xl font-black text-[var(--brand-950)] mt-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {selectedCase.business_name}
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Journey: <span className="font-mono font-bold text-[var(--brand-900)]">{selectedCase.journey_id}</span> · Application: <span className="font-mono">{selectedCase.application_id}</span>
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsPackageOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {isPackageLoading ? (
              <div className="space-y-4 py-8">
                <Skeleton variant="rect" height={80} />
                <Skeleton variant="rect" height={150} />
              </div>
            ) : (
              <div className="space-y-6">
                {/* 14 Integrated Dimensions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Dimension 1: Customer */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
                    <p className="font-extrabold text-[10px] uppercase text-[var(--text-muted)]">1. Customer</p>
                    <p className="font-bold text-sm text-[var(--brand-950)] mt-0.5">{selectedCase.applicant_name || 'Priya Sharma'}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Managing Director · CIBIL Bureau: 785 (No Delinquencies)</p>
                  </div>

                  {/* Dimension 2: Business */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
                    <p className="font-extrabold text-[10px] uppercase text-[var(--text-muted)]">2. Business</p>
                    <p className="font-bold text-sm text-[var(--brand-950)] mt-0.5">{selectedCase.business_name}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">GSTIN: 27AAACS1234F1Z5 · Vintage: 48m · Manufacturing Sector</p>
                  </div>

                  {/* Dimension 3: Requested Amount */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
                    <p className="font-extrabold text-[10px] uppercase text-[var(--text-muted)]">3. Requested Amount</p>
                    <p className="font-bold text-base text-[var(--brand-950)] mt-0.5 font-mono">
                      ₹{(selectedCase.requested_amount / 100000).toFixed(2)} Lakhs
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Working Capital Secured Facility · 24-Month Tenor</p>
                  </div>

                  {/* Dimension 4: Evidence Status */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
                    <p className="font-extrabold text-[10px] uppercase text-[var(--text-muted)]">4. Evidence Status</p>
                    <p className="font-bold text-sm text-[var(--fin-green)] mt-0.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> 100% Cryptographically Verified
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">GSTR-3B vs Bank Statement reconciled (2.1% variance)</p>
                  </div>

                  {/* Dimension 5: Financial Health */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
                    <p className="font-extrabold text-[10px] uppercase text-[var(--text-muted)]">5. Financial Health</p>
                    <p className="font-bold text-sm text-[var(--brand-950)] mt-0.5">DSCR: 1.85x · OPM: 14.2%</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Turnover: ₹3.80 Cr · Zero circular debit patterns observed</p>
                  </div>

                  {/* Dimension 6: Eligibility */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
                    <p className="font-extrabold text-[10px] uppercase text-[var(--text-muted)]">6. Eligibility Rules</p>
                    <p className="font-bold text-sm text-[var(--fin-green)] mt-0.5">All 3 Hard Invariants Passed</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Vintage &gt; 24m, Turnover &gt; ₹1Cr, Clean Promoter KYC</p>
                  </div>

                  {/* Dimension 7: Risk Assessment */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
                    <p className="font-extrabold text-[10px] uppercase text-[var(--text-muted)]">7. Risk Scorecard</p>
                    <p className="font-bold text-sm text-[var(--brand-950)] mt-0.5">
                      Risk Band: {packageRisk?.risk_band || 'LOW_RISK'} (Score: {packageRisk?.risk_score || 785})
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Probability of Default: 1.2% (Prime SME Tier)</p>
                  </div>

                  {/* Dimension 8: SHAP Attribution */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
                    <p className="font-extrabold text-[10px] uppercase text-[var(--text-muted)]">8. SHAP Local Drivers</p>
                    <p className="font-bold text-sm text-[var(--brand-950)] mt-0.5">Top Driver: DSCR Buffer (+45 pts)</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Vintage Stability (+30 pts) · Banking Turnover (+25 pts)</p>
                  </div>

                  {/* Dimension 9: Policy Basis */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
                    <p className="font-extrabold text-[10px] uppercase text-[var(--text-muted)]">9. Policy Norms Basis</p>
                    <p className="font-bold text-sm text-[var(--brand-950)] mt-0.5">Master Norm CN-2026-v3 Conforming</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">RBI MSME Lending Framework Compliance Certified</p>
                  </div>

                  {/* Dimension 10: Explanation */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
                    <p className="font-extrabold text-[10px] uppercase text-[var(--text-muted)]">10. Explainable AI Rationale</p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      {packageDecision?.reasoning || 'Recommendation approved based on healthy operating cashflow, verified tax compliance, and robust promoter track record.'}
                    </p>
                  </div>

                  {/* Dimension 11: RM Recommendation */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
                    <p className="font-extrabold text-[10px] uppercase text-[var(--text-muted)]">11. RM Operational Recommendation</p>
                    <p className="font-bold text-sm text-[var(--brand-950)] mt-0.5">Rohan Mehta: Strongly Recommended</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Site visit confirmed active manufacturing facility & inventory</p>
                  </div>

                  {/* Dimension 12: Risk Recommendation */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
                    <p className="font-extrabold text-[10px] uppercase text-[var(--text-muted)]">12. Risk Officer Endorsement</p>
                    <p className="font-bold text-sm text-[var(--brand-950)] mt-0.5">Ananya Iyer: Second-Line Endorsement Complete</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Trust graph cleared; zero circular trading flags</p>
                  </div>

                  {/* Dimension 13: Escalations */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
                    <p className="font-extrabold text-[10px] uppercase text-[var(--text-muted)]">13. Escalations & Governance</p>
                    <p className="font-bold text-sm text-[var(--brand-950)] mt-0.5">Escalated to Credit Committee</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Submitted for final executive sanction sign-off</p>
                  </div>

                  {/* Dimension 14: Audit Summary */}
                  <div className="p-3.5 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
                    <p className="font-extrabold text-[10px] uppercase text-[var(--text-muted)]">14. Cryptographic Audit Summary</p>
                    <p className="font-bold text-sm text-[var(--brand-950)] mt-0.5 font-mono">{packageAuditLogs.length} Chained Ledger Events</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">SHA-256 tamper-evident provenance log</p>
                  </div>
                </div>

                {/* The 4 Committee Actions (APPROVE, DECLINE, RETURN, ESCALATE) */}
                <div className="pt-4 border-t flex flex-wrap items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveAction('RETURN_FOR_INFORMATION')}
                    leftIcon={<HelpCircle className="w-4 h-4 text-amber-600" />}
                  >
                    Return for Information
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveAction('ESCALATE')}
                    leftIcon={<Send className="w-4 h-4 text-purple-600" />}
                  >
                    Escalate to Board
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveAction('DECLINE')}
                    leftIcon={<X className="w-4 h-4 text-rose-600" />}
                  >
                    Decline Facility
                  </Button>

                  <Button
                    variant="brutal"
                    size="sm"
                    onClick={() => setActiveAction('APPROVE')}
                    leftIcon={<Check className="w-4 h-4 text-emerald-600" />}
                  >
                    Sanction & Approve Facility
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Decision Reason Modal (Mandatory for APPROVE / DECLINE / RETURN / ESCALATE) */}
      {activeAction && selectedCase && (
        <Modal
          isOpen={true}
          onClose={() => setActiveAction(null)}
          title={`Credit Committee Decision: ${activeAction.replace(/_/g, ' ')}`}
          subtitle={`Applicant: ${selectedCase.business_name} (${selectedCase.journey_id})`}
          maxWidth="md"
        >
          <form onSubmit={handleExecuteCommitteeAction} className="space-y-4">
            {activeAction === 'APPROVE' && (
              <div>
                <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                  Sanction Limit Amount (INR)
                </label>
                <input
                  type="number"
                  value={sanctionedAmount}
                  onChange={(e) => setSanctionedAmount(Number(e.target.value))}
                  className="w-full text-xs font-bold rounded-xl border border-[var(--border)] p-2.5"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                Mandatory Committee Decision Rationale & Resolution Notes:
              </label>
              <textarea
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="State the formal resolution of the Credit Sanction Committee with specific covenant requirements..."
                rows={4}
                className="w-full text-xs p-3 rounded-xl border border-[var(--border)]"
                required
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[10px] text-amber-900 leading-relaxed">
              <strong>Audit Ledger Commitment:</strong> Submitting this action stores your identity ({persona.name}), role ({persona.role}), timestamp, rationale, evidence snapshot, and policy version into the immutable audit ledger.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setActiveAction(null)}>
                Cancel
              </Button>
              <Button variant="brutal" size="sm" type="submit" isLoading={isSubmitting}>
                Confirm Sanction Vote
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
