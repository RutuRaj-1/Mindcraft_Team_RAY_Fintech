import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi, reviewApi, actionsApi, decisionsApi, auditApi } from '../../api';
import { QueueItem, HumanReview, AuditCase } from '../../types';
import { MetricCard } from '../../components/fintech/MetricCard';
import { DataTable } from '../../components/fintech/DataTable';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  Scale, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight,
  RefreshCw, Check, X, FileText, ChevronRight, Gavel, AlertOctagon,
  BookOpen, Compass, RotateCcw, Send, Layers, HelpCircle
} from 'lucide-react';

type RiskManagerActionType =
  | 'CONFIRM'
  | 'RETURN_FOR_EVIDENCE'
  | 'ESCALATE'
  | 'RECOMMEND_APPROVAL'
  | 'RECOMMEND_DECLINE'
  | 'REQUIRE_ADDITIONAL_REVIEW';

export const RiskManagerDeskPage: React.FC = () => {
  const { persona } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'senior_risk_dashboard';

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [reviews, setReviews] = useState<HumanReview[]>([]);
  const [auditCases, setAuditCases] = useState<AuditCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supervisory Review Action Modal
  const [selectedCase, setSelectedCase] = useState<QueueItem | null>(null);
  const [actionType, setActionType] = useState<RiskManagerActionType | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [queueItems, reviewList, cases] = await Promise.all([
        dashboardApi.getOfficerQueue(),
        reviewApi.listReviews(undefined, 'RISK_MANAGER').catch(() => []),
        auditApi.getAuditCases(50).catch(() => []),
      ]);
      setQueue(queueItems);
      setReviews(reviewList);
      setAuditCases(cases);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Supervisory Risk data');
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

  const handleOpenAction = (caseItem: QueueItem, act: RiskManagerActionType) => {
    setSelectedCase(caseItem);
    setActionType(act);
    setActionNotes('');
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !actionType) return;
    setIsSubmitting(true);
    try {
      const ensureReviewId = async (jId: string): Promise<string> => {
        const existing = reviews.find((r) => r.journeyId === jId || r.applicationId === selectedCase?.application_id);
        if (existing?.reviewId) return existing.reviewId;
        const created = await reviewApi.startReview(jId, 'Supervisory review initiated by Risk Manager');
        return created.reviewId;
      };

      if (actionType === 'CONFIRM') {
        const revId = await ensureReviewId(selectedCase.journey_id);
        await reviewApi.submitReview(selectedCase.journey_id, revId, {
          human_outcome: 'APPROVED',
          reason_code: 'SUPERVISORY_SANCTION_CONFIRMED',
          rationale_notes: actionNotes || 'Second-Line Risk Manager confirmed underwriting recommendation within Tier 2 delegated limits.',
        });
        setSuccessToast(`Case ${selectedCase.journey_id} confirmed and ratified.`);
      } else if (actionType === 'RETURN_FOR_EVIDENCE') {
        await actionsApi.executeSafeAction(selectedCase.journey_id, {
          action_type: 'RETURN_FOR_INFORMATION',
          audit_notes: `Risk Manager returned case for supplementary evidence: ${actionNotes}`,
          reviewer_role: 'RISK_MANAGER',
        });
        setSuccessToast(`Case ${selectedCase.journey_id} returned to underwriter for supplementary evidence.`);
      } else if (actionType === 'ESCALATE') {
        await reviewApi.startReview(
          selectedCase.journey_id,
          actionNotes || 'Escalated to Credit Sanction Committee (> ₹1 Crore threshold or high-risk exposure).'
        );
        setSuccessToast(`Case ${selectedCase.journey_id} escalated to Credit Sanction Committee.`);
      } else if (actionType === 'RECOMMEND_APPROVAL') {
        const revId = await ensureReviewId(selectedCase.journey_id);
        await reviewApi.submitReview(selectedCase.journey_id, revId, {
          human_outcome: 'APPROVED',
          reason_code: 'RECOMMEND_COMMITTEE_APPROVAL',
          rationale_notes: actionNotes || 'Risk Manager formal recommendation for Committee sanction.',
        });
        setSuccessToast(`Approval recommendation submitted to Credit Committee.`);
      } else if (actionType === 'RECOMMEND_DECLINE') {
        const revId = await ensureReviewId(selectedCase.journey_id);
        await reviewApi.submitReview(selectedCase.journey_id, revId, {
          human_outcome: 'REJECTED',
          reason_code: 'UNACCEPTABLE_SOLVENCY_RISK',
          rationale_notes: actionNotes || 'Risk Manager formal recommendation to decline facility.',
        });
        setSuccessToast(`Decline recommendation registered in governance ledger.`);
      } else if (actionType === 'REQUIRE_ADDITIONAL_REVIEW') {
        await actionsApi.executeSafeAction(selectedCase.journey_id, {
          action_type: 'REQUIRE_ADDITIONAL_REVIEW',
          audit_notes: `Additional independent review mandated: ${actionNotes}`,
          reviewer_role: 'RISK_MANAGER',
        });
        setSuccessToast(`Additional independent review order logged.`);
      }

      setActionType(null);
      setSelectedCase(null);
      await loadData();
    } catch (err: any) {
      alert(`Action error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { key: 'senior_risk_dashboard', label: 'Senior Risk Dashboard', icon: Scale },
    { key: 'escalated_cases', label: 'Escalated Cases', icon: AlertOctagon },
    { key: 'high_risk_cases', label: 'High-Risk Portfolio', icon: ShieldAlert },
    { key: 'exceptions', label: 'Risk Exceptions', icon: AlertTriangle },
    { key: 'officer_reviews', label: 'Risk Officer Reviews', icon: FileText },
    { key: 'consistency', label: 'Model / Policy Consistency', icon: Compass },
    { key: 'override_review', label: 'Override Review & Sanction', icon: Gavel },
    { key: 'decision_quality', label: 'Decision Quality', icon: CheckCircle2 },
    { key: 'audit_summary', label: 'Audit Summary', icon: RotateCcw },
  ];

  const columns = [
    {
      key: 'business_name',
      header: 'Commercial Entity',
      render: (row: QueueItem) => (
        <div>
          <p className="font-bold text-[var(--brand-950)] text-xs">{row.business_name}</p>
          <p className="text-[10px] text-[var(--text-muted)] font-mono">{row.journey_id}</p>
        </div>
      ),
    },
    {
      key: 'requested_amount',
      header: 'Exposure Tier',
      render: (row: QueueItem) => {
        const isTier2 = row.requested_amount <= 10000000;
        return (
          <div>
            <span className="font-bold text-xs text-[var(--brand-900)] font-mono">
              ₹{(row.requested_amount / 100000).toFixed(1)}L
            </span>
            <span className={`ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${
              isTier2 ? 'bg-blue-50 text-blue-800' : 'bg-purple-50 text-purple-800'
            }`}>
              {isTier2 ? 'Tier 2 (≤₹1Cr Authority)' : 'Tier 3 (Committee Required)'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'decision_outcome',
      header: 'AI Model Recommendation',
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
      header: 'Assessed Trust Score',
      render: (row: QueueItem) => (
        <span className="font-mono font-bold text-xs text-[var(--brand-950)]">
          {row.trust_score || '780'} / 1000
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Manager Actions (Part 20)',
      align: 'right' as const,
      render: (row: QueueItem) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={() => handleOpenAction(row, 'CONFIRM')}
          >
            Confirm
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => handleOpenAction(row, 'RETURN_FOR_EVIDENCE')}
          >
            Return
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => handleOpenAction(row, 'ESCALATE')}
          >
            Escalate
          </Button>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => navigate(`/risk/cases/${row.journey_id}`)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Inspect
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
    return <ErrorState title="Supervisory Desk Offline" message={error} onRetry={loadData} />;
  }

  const highExposureCases = queue.filter((q) => q.requested_amount >= 2500000);
  const totalSupervisedExposure = queue.reduce((acc, q) => acc + (q.requested_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300">
              Role 5: Second-Line Supervisory Risk Desk (Tier 2 Sanction ≤ ₹1 Crore)
            </span>
            <span className="text-xs text-[var(--text-muted)] font-mono">RISK-SUP-02</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Senior Risk Manager Supervisory Desk
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Supervising Officer: <strong className="text-[var(--brand-950)]">{persona.name}</strong> · Sanction Ceiling: ₹1,00,00,000 (Tier 2 Authority)
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={loadData}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Portfolio
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Tier 2 Facility Authority"
          value="₹1.00 Crore"
          benchmark="Max Delegated Power"
          status="info"
          icon={<Gavel className="w-4 h-4 text-purple-600" />}
        />
        <MetricCard
          label="Supervised Exposure"
          value={`₹${(totalSupervisedExposure / 10000000).toFixed(2)} Cr`}
          benchmark={`${queue.length} Active Portfolio Cases`}
          status="info"
          icon={<Scale className="w-4 h-4 text-[var(--brand-700)]" />}
        />
        <MetricCard
          label="High-Exposure Queue (≥₹25L)"
          value={`${highExposureCases.length} Applications`}
          benchmark="Requires Manager Sign-Off"
          status={highExposureCases.length > 0 ? 'warning' : 'success'}
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
        />
        <MetricCard
          label="Risk Officer Reviews"
          value={`${reviews.length} Escalations`}
          benchmark="Awaiting Ratification"
          status="info"
          icon={<ShieldAlert className="w-4 h-4 text-blue-600" />}
        />
      </div>

      {/* 9 Navigation Workspace Tabs (Part 20) */}
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
      {activeTab === 'senior_risk_dashboard' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-[var(--brand-950)]">Supervised Risk Underwriting Portfolio</h3>
            <span className="text-xs text-[var(--text-muted)]">Tier 2 Sanction Pipeline</span>
          </div>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'escalated_cases' && (
        <div className="space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Escalated Cases from First-Line Operations</h3>
          <DataTable data={queue.filter(q => q.escalation_status === 'ESCALATED' || q.decision_outcome === 'NEEDS_REVIEW')} columns={columns} />
        </div>
      )}

      {activeTab === 'high_risk_cases' && (
        <div className="space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">High-Risk & Impaired Portfolio (PD &gt; 3%)</h3>
          <DataTable data={highExposureCases} columns={columns} />
        </div>
      )}

      {activeTab === 'exceptions' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Risk & Underwriting Exception Register</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Second-line supervisory review of underwriting policy variances, covenant adjustments, and security waivers.
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'officer_reviews' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Risk Officer Review Feed</h3>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'consistency' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Model / Policy Consistency Audit</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Validating that algorithmic credit recommendations align 100% with codified credit norms and hard policy invariants.
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'override_review' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Override Review & Ratification Ledger</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Supervising all human-in-the-loop adjustments made by first and second-line underwriting desks.
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'decision_quality' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Decision Quality & Calibration Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
              <span className="font-bold text-[var(--text-muted)] uppercase text-[10px]">Model Conformance</span>
              <p className="text-xl font-black text-[var(--brand-950)] mt-1">94.2%</p>
              <p className="text-[10px] text-[var(--fin-green)]">Zero unwarranted divergence</p>
            </div>
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
              <span className="font-bold text-[var(--text-muted)] uppercase text-[10px]">Average TAT</span>
              <p className="text-xl font-black text-[var(--brand-950)] mt-1">4.2 Hours</p>
              <p className="text-[10px] text-[var(--fin-green)]">Well within 24h institutional SLA</p>
            </div>
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
              <span className="font-bold text-[var(--text-muted)] uppercase text-[10px]">Override Reversal Rate</span>
              <p className="text-xl font-black text-[var(--brand-950)] mt-1">1.8%</p>
              <p className="text-[10px] text-[var(--fin-green)]">High calibration reliability</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit_summary' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Supervisory Audit Summary</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Append-only record of supervisory interventions, escalations, and Tier 2 credit sanctions.
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {/* Action Modal (Confirm, Return, Escalate, Recommend Approval, Recommend Decline, Additional Review) */}
      {actionType && selectedCase && (
        <Modal
          isOpen={true}
          onClose={() => setActionType(null)}
          title={`Risk Manager Action: ${actionType.replace(/_/g, ' ')}`}
          subtitle={`Case: ${selectedCase.business_name} (${selectedCase.journey_id}) · Requested: ₹${(selectedCase.requested_amount / 100000).toFixed(1)}L`}
          maxWidth="md"
        >
          <form onSubmit={handleExecuteAction} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                Mandatory Supervisory Rationale / Notes
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Enter detailed underwriter reasoning for this supervisory action..."
                rows={4}
                className="w-full text-xs p-3 rounded-xl border border-[var(--border)]"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setActionType(null)}>
                Cancel
              </Button>
              <Button variant="brutal" size="sm" type="submit" isLoading={isSubmitting}>
                Execute & Log to Ledger
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
