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
  Building2, Users, Clock, AlertTriangle, CheckCircle2,
  ArrowRight, RefreshCw, Filter, ShieldCheck, Compass
} from 'lucide-react';

export const RMSupervisorDashboardPage: React.FC = () => {
  const { persona } = useAuth();
  const navigate = useNavigate();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slaFilter, setSlaFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING_RM'>('ALL');

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [queueItems, portfolioMetrics] = await Promise.all([
        api.getOfficerQueue(),
        api.getPortfolioMetrics().catch(() => ({})),
      ]);
      setQueue(queueItems);
      setMetrics(portfolioMetrics);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Operations telemetry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalExposure = queue.reduce((acc, q) => acc + (q.requested_amount || 0), 0);
  const pendingCases = queue.filter((q) => q.decision_outcome !== 'APPROVED');

  const columns = [
    {
      key: 'business_name',
      header: 'Applicant Business',
      render: (row: QueueItem) => (
        <div>
          <p className="font-bold text-[var(--brand-950)] text-xs">{row.business_name}</p>
          <p className="text-[10px] text-[var(--text-muted)] font-mono">{row.journey_id}</p>
        </div>
      ),
    },
    {
      key: 'assigned_rm',
      header: 'Assigned RM',
      render: (_: QueueItem) => (
        <span className="text-xs font-semibold text-[var(--brand-900)]">
          Rohan Verma (RM-Mum-01)
        </span>
      ),
    },
    {
      key: 'requested_amount',
      header: 'Requested Facility',
      render: (row: QueueItem) => (
        <span className="font-bold text-xs text-[var(--brand-900)]">
          ₹{(row.requested_amount / 100000).toFixed(1)}L
        </span>
      ),
    },
    {
      key: 'current_stage',
      header: 'Pipeline Stage',
      render: (row: QueueItem) => (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-950)] border border-[var(--brand-950)]">
          {row.current_stage || 'UNDERWRITING'}
        </span>
      ),
    },
    {
      key: 'sla_status',
      header: 'SLA Aging',
      render: (row: QueueItem) => {
        const isWarning = (row.requested_amount || 0) > 2000000;
        return (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            isWarning
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : 'bg-[var(--fin-green-bg)] text-[var(--fin-green)] border-[var(--fin-green)]/30'
          }`}>
            {isWarning ? '36h · Priority SLA' : '14h · On Track'}
          </span>
        );
      },
    },

    {
      key: 'actions',
      header: 'Operations Action',
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
            variant="secondary"
            size="xs"
            onClick={() => navigate(`/rm/cases/${row.journey_id}`)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Inspect
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
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
              Role 4: First-Line Operations & RM Supervisory Desk
            </span>
            <span className="text-xs text-[var(--text-muted)] font-mono">FIN-OPS-CTRL</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Credit Operations Command Center
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Supervising Officer: <span className="font-bold text-[var(--brand-950)]">{persona.name}</span> · {persona.organization}
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
            Refresh Pipeline
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active RM Pipeline"
          value={isLoading ? '...' : `${queue.length} Cases`}
          benchmark="Across 8 Regional RMs"
          status="info"
          icon={<Users className="w-4 h-4 text-blue-600" />}
        />
        <MetricCard
          label="Pipeline Exposure"
          value={isLoading ? '...' : `₹${(totalExposure / 10000000).toFixed(2)} Cr`}
          benchmark="Current quarter in-flight"
          status="success"
          icon={<Building2 className="w-4 h-4 text-[var(--fin-green)]" />}
        />
        <MetricCard
          label="SLA Compliance Rate"
          value="94.2%"
          benchmark="Target > 90.0%"
          status="success"
          delta={{ value: "+2.1%", isPositive: true, label: "vs last month" }}
          icon={<Clock className="w-4 h-4 text-[var(--brand-800)]" />}
        />
        <MetricCard
          label="Escalations to Risk"
          value={isLoading ? '...' : `${pendingCases.length} Pending`}
          benchmark="Second-line review queue"
          status={pendingCases.length > 2 ? 'warning' : 'success'}
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
        />
      </div>

      {/* Pipeline Table */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">
              Operational Queue & SLA Management
            </span>
            <h2 className="text-lg font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              MSME Case Allocation Ledger
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Showing live FastAPI backend queue</span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-6">
            <Skeleton variant="rect" height={48} />
            <Skeleton variant="rect" height={48} />
            <Skeleton variant="rect" height={48} />
          </div>
        ) : error ? (
          <ErrorState title="Failed to load Queue" message={error} onRetry={loadData} />
        ) : (
          <DataTable
            data={queue}
            columns={columns}
            searchKey="business_name"
            searchPlaceholder="Search cases by business name..."
          />

        )}
      </div>
    </div>
  );
};
