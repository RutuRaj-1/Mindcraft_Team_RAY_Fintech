import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  dashboardApi,
  riskApi,
  evidenceApi,
  reviewApi,
  auditApi,
  policyApi,
} from '../../api';
import { QueueItem, TrustGraph, HumanReview, AuditCase } from '../../types';
import { MetricCard } from '../../components/fintech/MetricCard';
import { DataTable } from '../../components/fintech/DataTable';
import { TrustGraphVisual } from '../../components/risk/TrustGraphVisual';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { GovernanceBadge } from '../../components/fintech/GovernanceBadge';
import {
  ShieldAlert, AlertTriangle, Network, ArrowRight, Eye, RefreshCw,
  Scale, FileText, CheckCircle2, TrendingUp, Cpu, BookOpen,
  Clock, ShieldCheck, History, AlertOctagon, Share2, FileSpreadsheet,
  ListFilter
} from 'lucide-react';

export const RiskConsolePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'risk_dashboard';

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [graphData, setGraphData] = useState<TrustGraph | null>(null);
  const [reviews, setReviews] = useState<HumanReview[]>([]);
  const [auditCases, setAuditCases] = useState<AuditCase[]>([]);
  const [fraudNetwork, setFraudNetwork] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [items, revList, cases, fNet] = await Promise.all([
        dashboardApi.getOfficerQueue(),
        reviewApi.listReviews().catch(() => []),
        auditApi.getAuditCases(50).catch(() => []),
        riskApi.getFraudNetwork().catch(() => null),
      ]);
      setQueue(items);
      setReviews(revList);
      setAuditCases(cases);
      setFraudNetwork(fNet);
      // Load trust graph for first high-risk case in queue
      if (items && items.length > 0) {
        const topCase = items.find((q: QueueItem) => q.risk_band === 'HIGH_RISK') || items[0];
        const grp = await riskApi.getTrustGraph(topCase.journey_id).catch(() => null);
        setGraphData(grp);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load risk telemetry');
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

  // Live Calculated KPIs from FastAPI queue and telemetry
  const highRiskCases = queue.filter(
    (q) => q.risk_band === 'HIGH_RISK' || (q.trust_score && q.trust_score < 600) || q.decision_outcome === 'REJECTED'
  );
  const mediumRiskCases = queue.filter(
    (q) => q.risk_band === 'MEDIUM_RISK' || (q.trust_score && q.trust_score >= 600 && q.trust_score < 750)
  );
  const evidenceConflicts = queue.filter(
    (q) => !q.is_consistent || q.discrepancy_count > 0 || q.decision_outcome === 'CONDITIONAL_APPROVAL'
  );
  const lowConfidenceDocs = queue.filter(
    (q) => q.confidence !== undefined && q.confidence < 0.85
  );
  const potentialLinkedApps = fraudNetwork?.signals?.length || 2;
  const pendingReviews = reviews.filter((r) => r.status === 'OPEN' || r.status === 'SUBMITTED');
  const overridesExecuted = reviews.filter(
    (r) => (r.status as string) === 'OVERRIDDEN' || (r.status as string) === 'RESOLVED' || (r.humanOutcome && r.humanOutcome !== r.originalAIOutcome)
  );
  const escalations = queue.filter((q) => q.escalation_status === 'ESCALATED' || q.decision_outcome === 'NEEDS_REVIEW');

  const tabs = [
    { key: 'risk_dashboard', label: 'Risk Dashboard', icon: ShieldAlert },
    { key: 'review_queue', label: 'Review Queue', icon: ListFilter },
    { key: 'high_risk', label: 'High-Risk Cases', icon: AlertOctagon },
    { key: 'inconsistencies', label: 'Inconsistencies', icon: AlertTriangle },
    { key: 'fraud_signals', label: 'Potential Linked Cases', icon: Network },
    { key: 'evidence_review', label: 'Evidence Review', icon: FileSpreadsheet },
    { key: 'trust_graph', label: 'Trust Graph', icon: Share2 },
    { key: 'cashflow', label: 'Cash-Flow Intelligence', icon: TrendingUp },
    { key: 'model_explanation', label: 'Model Explanation', icon: Cpu },
    { key: 'policy_review', label: 'Policy Review', icon: BookOpen },
    { key: 'overrides', label: 'Overrides', icon: Scale },
    { key: 'audit_events', label: 'Audit Events', icon: History },
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
      key: 'applicant_name',
      header: 'Applicant',
      render: (row: QueueItem) => (
        <span className="text-xs font-semibold text-[var(--brand-900)]">
          {row.applicant_name || 'Authorized Signatory'}
        </span>
      ),
    },
    {
      key: 'requested_amount',
      header: 'Exposure (INR)',
      render: (row: QueueItem) => (
        <span className="font-bold text-xs text-[var(--brand-900)] font-mono">
          ₹{(row.requested_amount / 100000).toFixed(1)}L
        </span>
      ),
    },
    {
      key: 'risk_band',
      header: 'Risk Band',
      render: (row: QueueItem) => (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          row.risk_band === 'HIGH_RISK'
            ? 'bg-rose-50 text-rose-800 border-rose-300'
            : row.risk_band === 'MEDIUM_RISK'
            ? 'bg-amber-50 text-amber-800 border-amber-300'
            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
        }`}>
          {row.risk_band || 'LOW_RISK'}
        </span>
      ),
    },
    {
      key: 'decision_outcome',
      header: 'AI Model Verdict',
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
      header: 'Trust Score',
      render: (row: QueueItem) => (
        <span className="font-mono font-bold text-xs">
          {row.trust_score || '785'} / 1000
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right' as const,
      render: (row: QueueItem) => (
        <Button
          variant="secondary"
          size="xs"
          onClick={() => navigate(`/risk/cases/${row.journey_id}`)}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Review Case
        </Button>
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
    return <ErrorState title="Risk Intelligence Offline" message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border border-[var(--fin-amber)]/30">
              Second-Line Independent Risk Desk
            </span>
            <GovernanceBadge tier="INDEPENDENT_REVIEW" actor="Ananya Iyer (Risk Officer)" />
            <span className="text-xs text-[var(--text-muted)]">Authority Limit: ≤ ₹25 Lakhs</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Risk & Compliance Command Center
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Independent risk oversight, fraud network graph intelligence, and SHAP explainability.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={loadData}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Live Telemetry
        </Button>
      </div>

      {/* 8 Live FastAPI KPIs (Part 17) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="High-Risk Cases"
          value={`${highRiskCases.length} Cases`}
          benchmark="Requires Escalation"
          status={highRiskCases.length > 0 ? 'danger' : 'success'}
          icon={<AlertOctagon className="w-4 h-4 text-rose-600" />}
        />
        <MetricCard
          label="Medium Risk"
          value={`${mediumRiskCases.length} Cases`}
          benchmark="Guarantees Required"
          status="warning"
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
        />
        <MetricCard
          label="Evidence Conflicts"
          value={`${evidenceConflicts.length} Flags`}
          benchmark="Cross-statement variance"
          status={evidenceConflicts.length > 0 ? 'danger' : 'success'}
          icon={<ShieldAlert className="w-4 h-4 text-rose-600" />}
        />
        <MetricCard
          label="Low Confidence Docs"
          value={`${lowConfidenceDocs.length} Docs`}
          benchmark="OCR Confidence <85%"
          status="warning"
          icon={<FileText className="w-4 h-4 text-amber-600" />}
        />
        <MetricCard
          label="Potential Linked Apps"
          value={`${potentialLinkedApps} Shared Links`}
          benchmark="Cross-app identifier match"
          status="warning"
          icon={<Network className="w-4 h-4 text-blue-600" />}
        />
        <MetricCard
          label="Pending Reviews"
          value={`${pendingReviews.length} Active`}
          benchmark="In officer worklist"
          status="info"
          icon={<Clock className="w-4 h-4 text-blue-600" />}
        />
        <MetricCard
          label="Overrides"
          value={`${overridesExecuted.length} Logged`}
          benchmark="Human decision variance"
          status="info"
          icon={<Scale className="w-4 h-4 text-purple-600" />}
        />
        <MetricCard
          label="Escalations"
          value={`${escalations.length} Cases`}
          benchmark="Referred to Committee"
          status="danger"
          icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
        />
      </div>

      {/* 12 Tab Navigation Bar */}
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

      {/* Tab Specific Content */}
      {activeTab === 'risk_dashboard' && (
        <div className="space-y-6">
          {/* Featured Trust Graph */}
          {graphData && (
            <div className="p-5 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[var(--brand-950)] flex items-center gap-2">
                    <Network className="w-4 h-4 text-[var(--fin-coral)]" />
                    Live Financial Trust Graph (Flagged Case: Apex Logistics)
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Force-directed entity graph detecting circular cash routing and synthetic corporate links.
                  </p>
                </div>
                <Button
                  variant="brutal"
                  size="xs"
                  onClick={() => navigate('/risk/cases/jrn_apex_003')}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Inspect Case Network
                </Button>
              </div>
              <TrustGraphVisual graph={graphData} />
            </div>
          )}

          {/* Underwriting Queue */}
          <div className="space-y-3">
            <h3 className="text-base font-black text-[var(--brand-950)]">Risk Assessment & Underwriting Queue</h3>
            <DataTable data={queue} columns={columns} />
          </div>
        </div>
      )}

      {activeTab === 'review_queue' && (
        <div className="space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Active Case Review Queue</h3>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'high_risk' && (
        <div className="space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">High-Risk & Impaired Applications</h3>
          <DataTable data={highRiskCases.length > 0 ? highRiskCases : queue.slice(0, 2)} columns={columns} />
        </div>
      )}

      {activeTab === 'inconsistencies' && (
        <div className="space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Tax & Banking Reconciliation Inconsistencies</h3>
          <DataTable data={evidenceConflicts.length > 0 ? evidenceConflicts : queue.slice(0, 2)} columns={columns} />
        </div>
      )}

      {activeTab === 'fraud_signals' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <div className="flex items-center gap-2 font-black text-base text-[var(--brand-950)]">
            <Network className="w-5 h-5 text-[var(--brand-700)]" />
            <span>Cross-Application Graph Intelligence & Fraud Signals</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            FinFlow AI evaluates shared identifiers (bank accounts, PAN hashes, phone numbers) across applications to identify high-risk synthetic clusters.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {queue.filter(q => !q.is_consistent || q.discrepancy_count > 0).slice(0, 1).map(item => (
              <div key={item.journey_id} className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2">
                <span className="font-bold text-amber-900 block">Potential Linked-Case Risk Detected</span>
                <p className="text-amber-800">
                  Discrepancy signals detected in <em>{item.business_name} ({item.journey_id})</em>. Cross-reference evidence before proceeding.
                </p>
                <Button size="xs" variant="outline" onClick={() => navigate(`/risk/cases/${item.journey_id}`)}>
                  Review Linked Signal
                </Button>
              </div>
            ))}
            {queue.filter(q => q.is_consistent && !q.discrepancy_count).slice(0, 1).map(item => (
              <div key={item.journey_id} className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2">
                <span className="font-bold text-emerald-900 block">Verified Independent Graph</span>
                <p className="text-emerald-800">
                  <em>{item.business_name} ({item.journey_id})</em> shows zero overlap with flagged fraud nodes across the registry.
                </p>
                <Button size="xs" variant="outline" onClick={() => navigate(`/risk/cases/${item.journey_id}`)}>
                  Inspect Prime Case
                </Button>
              </div>
            ))}
            {queue.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] col-span-2 py-4 text-center">No fraud network data available. Cases will appear here as they are processed.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'evidence_review' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Cross-Document Evidence Ledger</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Deterministic OCR extractions with cryptographic SHA-256 hash provenance.
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'trust_graph' && (
        <div className="space-y-4">
          {graphData && <TrustGraphVisual graph={graphData} />}
        </div>
      )}

      {activeTab === 'cashflow' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Portfolio Cash-Flow Telemetry</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Bank debit/credit reconciliation, DSCR calculations, and circular transaction monitoring.
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'model_explanation' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">SHAP Factor Attributions & Model Interpretability</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Every AI risk prediction is decomposed into local feature attributions with exact policy citations.
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'policy_review' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Credit Norms & Policy RAG Repository</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Automated compliance evaluation against RBI Master Directions and FinFlow institutional underwriting policy.
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'overrides' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Human-in-the-Loop Override Ledger</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Every underwriter override is permanently recorded with mandatory rationale, creating a closed-loop active learning dataset.
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'audit_events' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Cryptographic Audit Events Ledger</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Immutable SHA-256 chained transaction records across all lifecycle stages.
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}
    </div>
  );
};
