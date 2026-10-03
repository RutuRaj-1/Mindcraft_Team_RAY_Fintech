import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { QueueItem, HumanReview } from '../../types';
import { MetricCard } from '../../components/fintech/MetricCard';
import { DataTable } from '../../components/fintech/DataTable';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  Scale, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight,
  RefreshCw, Check, X, FileText, ChevronRight, Gavel
} from 'lucide-react';

export const RiskManagerDeskPage: React.FC = () => {
  const { persona } = useAuth();
  const navigate = useNavigate();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [reviews, setReviews] = useState<HumanReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [queueItems, reviewList] = await Promise.all([
        api.getOfficerQueue(),
        api.listReviews('OPEN', 'RISK_MANAGER').catch(() => []),
      ]);
      setQueue(queueItems);
      setReviews(reviewList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Supervisory Risk data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const highExposureCases = queue.filter((q) => q.requested_amount >= 2500000);
  const totalSupervisedExposure = queue.reduce((acc, q) => acc + (q.requested_amount || 0), 0);

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
            <span className="font-bold text-xs text-[var(--brand-900)]">
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
      header: 'Supervisory Action',
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
            onClick={() => navigate(`/risk/cases/${row.journey_id}`)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Supervise / Challenge
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300">
              Role 5: Supervisory Risk & Senior Credit Risk Desk
            </span>
            <span className="text-xs font-mono font-bold text-[var(--brand-900)]">Delegated Limit: ≤ ₹1.00 Crore</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Senior Risk Supervisory Desk
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Senior Risk Officer: <span className="font-bold text-[var(--brand-950)]">{persona.name}</span> · {persona.organization}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh Desk
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Supervised Exposure"
          value={isLoading ? '...' : `₹${(totalSupervisedExposure / 10000000).toFixed(2)} Cr`}
          benchmark="Within delegated portfolio"
          status="success"
          icon={<Scale className="w-4 h-4 text-purple-700" />}
        />
        <MetricCard
          label="Escalated to Supervisory"
          value={isLoading ? '...' : `${highExposureCases.length} Cases`}
          benchmark="Exceeds Risk Officer limit"
          status={highExposureCases.length > 0 ? "warning" : "success"}
          icon={<ShieldAlert className="w-4 h-4 text-amber-600" />}
        />
        <MetricCard
          label="Approval Ceiling"
          value="₹1.00 Crore"
          benchmark="Tier 2 Mandate Limit"
          status="info"
          icon={<Gavel className="w-4 h-4 text-[var(--brand-800)]" />}
        />
        <MetricCard
          label="Concurrence Rate"
          value="88.5%"
          benchmark="AI vs Senior Risk"
          status="success"
          delta={{ value: "+1.2%", isPositive: true, label: "model agreement" }}
          icon={<CheckCircle2 className="w-4 h-4 text-[var(--fin-green)]" />}
        />
      </div>

      {/* Supervisory Challenge Protocol Notice */}
      <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border-1.5 border-[var(--brand-950)] flex items-start gap-3">
        <Scale className="w-5 h-5 text-[var(--brand-950)] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-[var(--brand-950)]">
            Four-Eyes Governance & Delegated Sanction Policy:
          </p>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            As Senior Credit Risk Officer, you hold autonomous approval authority up to ₹1.00 Crore for applications with consistent cash flows (DSCR ≥ 1.25x).
            Applications exceeding ₹1.00 Crore or flagged with synthetic fraud network risks require joint escalation to the Credit Sanction Committee.
          </p>
        </div>
      </div>

      {/* Case Review Table */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">
              Second-Line Escalation Queue
            </span>
            <h2 className="text-lg font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Supervisory Review & Concurrence Ledger
            </h2>
          </div>
          <span className="text-xs text-[var(--text-muted)] font-mono">Live FastAPI Feed</span>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-6">
            <Skeleton variant="rect" height={48} />
            <Skeleton variant="rect" height={48} />
            <Skeleton variant="rect" height={48} />
          </div>
        ) : error ? (
          <ErrorState title="Supervisory Queue Error" message={error} onRetry={loadData} />
        ) : (
          <DataTable
            data={queue}
            columns={columns}
            searchKey="business_name"
            searchPlaceholder="Search commercial entities..."
          />

        )}
      </div>
    </div>
  );
};
