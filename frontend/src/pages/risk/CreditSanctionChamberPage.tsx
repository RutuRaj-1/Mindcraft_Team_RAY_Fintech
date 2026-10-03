import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { QueueItem } from '../../types';
import { MetricCard } from '../../components/fintech/MetricCard';
import { DataTable } from '../../components/fintech/DataTable';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  Award, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight,
  RefreshCw, Gavel, Check, X, FileText, ChevronRight
} from 'lucide-react';

export const CreditSanctionChamberPage: React.FC = () => {
  const { persona } = useAuth();
  const navigate = useNavigate();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queueItems = await api.getOfficerQueue();
      setQueue(queueItems);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Credit Committee pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalSanctionExposure = queue.reduce((acc, q) => acc + (q.requested_amount || 0), 0);
  const highValueCases = queue.filter((q) => q.requested_amount >= 2000000);

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
      key: 'governance_level',
      header: 'Sanction Level',
      render: (_: QueueItem) => (
        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
          Committee Sanction
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Committee Action',
      align: 'right' as const,
      render: (row: QueueItem) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => navigate(`/risk/replay/${row.journey_id}`)}
          >
            Decision Replay
          </Button>
          <Button
            variant="brutal"
            size="xs"
            onClick={() => navigate(`/risk/cases/${row.journey_id}`)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Open Sanction Package
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
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
              Role 6: Executive Credit Sanction Committee
            </span>
            <span className="text-xs font-mono font-bold text-[var(--brand-900)]">FINAL SANCTION AUTHORITY</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Executive Credit Sanction Chamber
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Presiding Approver: <span className="font-bold text-[var(--brand-950)]">{persona.name}</span> · {persona.organization}
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
            Refresh Sanction Pipeline
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Facility In Review"
          value={isLoading ? '...' : `₹${(totalSanctionExposure / 10000000).toFixed(2)} Cr`}
          benchmark="Portfolio Exposure Under Consideration"
          status="success"
          icon={<Award className="w-4 h-4 text-emerald-700" />}
        />
        <MetricCard
          label="Committee Quorum"
          value="3 / 3 Active"
          benchmark="Four-Eyes Protocol Active"
          status="info"
          icon={<Gavel className="w-4 h-4 text-[var(--brand-800)]" />}
        />
        <MetricCard
          label="High-Value Mandates"
          value={isLoading ? '...' : `${highValueCases.length} Cases`}
          benchmark="Tier 3 (>₹25L exposure)"
          status={highValueCases.length > 0 ? "warning" : "success"}
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
        />
        <MetricCard
          label="Portfolio NPA Rate"
          value="0.48%"
          benchmark="Institutional Benchmark < 1.50%"
          status="success"
          delta={{ value: "-0.12%", isPositive: true, label: "risk-weighted" }}
          icon={<CheckCircle2 className="w-4 h-4 text-[var(--fin-green)]" />}
        />
      </div>

      {/* Governance & Fiduciary Notice */}
      <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border-1.5 border-[var(--brand-950)] flex items-start gap-3">
        <Gavel className="w-5 h-5 text-[var(--brand-950)] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-[var(--brand-950)]">
            Institutional Fiduciary Mandate (Role 6):
          </p>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            The Credit Approver & Committee holds sole institutional authority to issue formal credit sanction letters for Tier 3 facilities and high-exposure MSME credits.
            Every sanction or rejection is logged with cryptographic timestamps in the immutable audit ledger.
          </p>
        </div>
      </div>

      {/* Sanction Pipeline Table */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">
              Executive Committee Docket
            </span>
            <h2 className="text-lg font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Pending Facilities for Final Sanction
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
          <ErrorState title="Failed to load Docket" message={error} onRetry={loadData} />
        ) : (
          <DataTable
            data={queue}
            columns={columns}
            searchKey="business_name"
            searchPlaceholder="Search facilities by name..."
          />

        )}
      </div>
    </div>
  );
};
