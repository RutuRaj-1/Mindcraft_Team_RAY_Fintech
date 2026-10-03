import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { QueueItem } from '../../types';
import { DataTable } from '../../components/fintech/DataTable';
import { MetricCard } from '../../components/fintech/MetricCard';
import { Tabs } from '../../components/ui/Tabs';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { Users, Filter, ArrowRight, ShieldCheck, Clock, TrendingUp } from 'lucide-react';

export const RMQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await api.getOfficerQueue(filter === 'ALL' ? undefined : filter);
      setQueue(items);
    } catch (err: any) {
      setError(err.message || 'Failed to load officer queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [filter]);

  const totalVolume = queue.reduce((acc, item) => acc + item.requested_amount, 0);

  const columns = [
    {
      key: 'business_name',
      header: 'Borrower Entity',
      render: (row: QueueItem) => (
        <div>
          <p className="font-bold text-[var(--brand-950)] text-xs">{row.business_name}</p>
          <p className="text-[10px] text-[var(--text-muted)] font-mono">{row.journey_id}</p>
        </div>
      ),
    },
    {
      key: 'requested_amount',
      header: 'Requested Facility',
      render: (row: QueueItem) => (
        <span className="font-bold text-xs text-[var(--brand-900)]">
          ₹{(row.requested_amount / 100000).toFixed(2)} Lakhs
        </span>
      ),
    },
    {
      key: 'current_stage',
      header: 'Current Stage',
      render: (row: QueueItem) => (
        <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
          {row.current_stage.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'decision_outcome',
      header: 'Decision State',
      render: (row: QueueItem) => {
        const isApp = row.decision_outcome === 'APPROVED';
        const isCond = row.decision_outcome === 'CONDITIONAL_APPROVAL';
        const isRev = row.decision_outcome === 'NEEDS_REVIEW' || row.decision_outcome === 'HUMAN_REVIEW';

        const color = isApp
          ? 'bg-[var(--fin-green-bg)] text-[var(--fin-green)] border-[var(--fin-green)]/30'
          : isCond
          ? 'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border-[var(--fin-amber)]/30'
          : isRev
          ? 'bg-[var(--fin-coral-bg)] text-[var(--fin-coral)] border-[var(--fin-coral)]/30'
          : 'bg-[var(--surface-subtle)] text-[var(--text-muted)] border-[var(--border)]';

        return (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
            {row.decision_outcome}
          </span>
        );
      },
    },
    {
      key: 'trust_score',
      header: 'Trust Score',
      render: (row: QueueItem) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-xs text-[var(--brand-950)]">
            {row.trust_score || '—'}
          </span>
          {row.risk_band && (
            <span className="text-[10px] text-[var(--text-muted)]">
              ({row.risk_band.replace(/_/g, ' ')})
            </span>
          )}
        </div>
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
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/rm/cases/${row.journey_id}`);
          }}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--fin-blue-bg)] text-[var(--fin-blue)] border border-[var(--fin-blue)]/30">
              Loan Officer Persona
            </span>
            <span className="text-xs text-[var(--text-muted)]">Rohan Mehta · Commercial SME Portfolio</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Underwriting & Triage Queue
          </h1>
        </div>

        <Tabs
          items={[
            { id: 'ALL', label: 'All Cases', count: queue.length },
            { id: 'NEEDS_REVIEW', label: 'Needs Review' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'CONDITIONAL_APPROVAL', label: 'Conditional' },
          ]}
          activeId={filter}
          onChange={(newId) => setFilter(newId)}
          variant="segmented"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Active Queue"
          value={queue.length}
          benchmark="Underwriting cases"
          status="info"
          icon={<Users className="w-4 h-4 text-[var(--fin-blue)]" />}
        />
        <MetricCard
          label="Pipeline Sanction Volume"
          value={`₹${(totalVolume / 100000).toFixed(1)}L`}
          benchmark="Total requested principal"
          status="success"
          icon={<TrendingUp className="w-4 h-4 text-[var(--fin-green)]" />}
        />
        <MetricCard
          label="Straight-Through Processing"
          value="66.7%"
          benchmark="Zero-touch decisioning"
          status="success"
          icon={<ShieldCheck className="w-4 h-4 text-[var(--fin-green)]" />}
        />
        <MetricCard
          label="Average Turnaround"
          value="1.8 Mins"
          benchmark="Fastest in class"
          status="info"
          icon={<Clock className="w-4 h-4 text-[var(--brand-700)]" />}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton variant="rect" height={300} />
      ) : error ? (
        <ErrorState title="Error Loading Queue" message={error} onRetry={loadQueue} />
      ) : (
        <DataTable
          columns={columns}
          data={queue}
          searchKey="business_name"
          searchPlaceholder="Search applicant by business name or ID..."
          onRowClick={(row) => navigate(`/rm/cases/${row.journey_id}`)}
        />
      )}
    </div>
  );
};
