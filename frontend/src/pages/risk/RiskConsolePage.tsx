import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { QueueItem, TrustGraph } from '../../types';
import { MetricCard } from '../../components/fintech/MetricCard';
import { DataTable } from '../../components/fintech/DataTable';
import { TrustGraphVisual } from '../../components/risk/TrustGraphVisual';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { ShieldAlert, AlertTriangle, Network, ArrowRight, Eye, RefreshCw } from 'lucide-react';

export const RiskConsolePage: React.FC = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [graphData, setGraphData] = useState<TrustGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [items, grp] = await Promise.all([
        api.getOfficerQueue(),
        api.getTrustGraph('jrn_apex_003').catch(() => null),
      ]);
      setQueue(items);
      setGraphData(grp);
    } catch (err: any) {
      setError(err.message || 'Failed to load risk telemetry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns = [
    {
      key: 'business_name',
      header: 'Entity Name',
      render: (row: QueueItem) => (
        <div>
          <p className="font-bold text-[var(--brand-950)] text-xs">{row.business_name}</p>
          <p className="text-[10px] text-[var(--text-muted)] font-mono">{row.journey_id}</p>
        </div>
      ),
    },
    {
      key: 'requested_amount',
      header: 'Exposure (INR)',
      render: (row: QueueItem) => (
        <span className="font-bold text-xs text-[var(--brand-900)]">
          ₹{(row.requested_amount / 100000).toFixed(1)}L
        </span>
      ),
    },
    {
      key: 'decision_outcome',
      header: 'Verdict',
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
          {row.trust_score || '—'} / 1000
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
          Audit Case
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
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border border-[var(--fin-amber)]/30">
              Risk Officer Persona
            </span>
            <span className="text-xs text-[var(--text-muted)]">Ananya Iyer · Credit Risk & Fraud Control</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Financial Trust Intelligence & Fraud Graph
          </h1>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={loadData}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Graph Telemetry
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Circular Trading Incidents"
          value="1 Active Flag"
          benchmark="Apex Logistics flagged"
          status="danger"
          icon={<AlertTriangle className="w-4 h-4 text-[var(--fin-coral)]" />}
        />
        <MetricCard
          label="Portfolio Graph Density"
          value="48 Nodes"
          benchmark="124 Verified Edges"
          status="info"
          icon={<Network className="w-4 h-4 text-[var(--brand-700)]" />}
        />
        <MetricCard
          label="Underwriter Overrides"
          value="0 Overrides"
          benchmark="Human-in-the-loop audit"
          status="info"
          icon={<ShieldAlert className="w-4 h-4 text-[var(--fin-amber)]" />}
        />
        <MetricCard
          label="Fraud Prevention Catch"
          value="₹35.0 Lakhs"
          benchmark="Avoided default exposure"
          status="success"
          icon={<ShieldAlert className="w-4 h-4 text-[var(--fin-green)]" />}
        />
      </div>

      {/* Featured Trust Graph */}
      {graphData && (
        <div className="p-5 rounded-2xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[var(--brand-950)] flex items-center gap-2">
                <Network className="w-4 h-4 text-[var(--fin-coral)]" />
                Live Financial Trust Graph (Flagged Case: Apex Logistics)
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Force-directed entity graph with circular routing and shell corporation heuristics
              </p>
            </div>

            <Button
              variant="brutal"
              size="xs"
              onClick={() => navigate('/risk/cases/jrn_apex_003')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Inspect Apex Network
            </Button>
          </div>

          <TrustGraphVisual graph={graphData} />
        </div>
      )}

      {/* Queue Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-[var(--brand-950)]">
          Institutional Portfolio Risk Triage Table
        </h3>
        {isLoading ? (
          <Skeleton variant="rect" height={250} />
        ) : error ? (
          <ErrorState title="Error Loading Queue" message={error} onRetry={loadData} />
        ) : (
          <DataTable
            columns={columns}
            data={queue}
            searchKey="business_name"
            searchPlaceholder="Search risk queue by entity name..."
            onRowClick={(row) => navigate(`/risk/cases/${row.journey_id}`)}
          />
        )}
      </div>
    </div>
  );
};
