import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wallet,
  BarChart2,
  Zap,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../api/client';
import {
  CashFlowMetrics,
  MonthlyCashFlow,
  CashFlowAnomalyRecord,
  HealthIndicator,
} from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  v >= 100_000
    ? `₹${(v / 100_000).toFixed(2)}L`
    : `₹${v.toLocaleString('en-IN')}`;

const fmtK = (v: number) => `₹${(v / 1000).toFixed(0)}K`;

const STATUS_COLORS: Record<string, string> = {
  HEALTHY: '#10B981',
  ADEQUATE: '#3B82F6',
  STRESSED: '#F59E0B',
  CRITICAL: '#EF4444',
};
const STATUS_BG: Record<string, string> = {
  HEALTHY: 'bg-emerald-50 border-emerald-200',
  ADEQUATE: 'bg-blue-50 border-blue-200',
  STRESSED: 'bg-amber-50 border-amber-200',
  CRITICAL: 'bg-red-50 border-red-200',
};
const STATUS_TEXT: Record<string, string> = {
  HEALTHY: 'text-emerald-700',
  ADEQUATE: 'text-blue-700',
  STRESSED: 'text-amber-700',
  CRITICAL: 'text-red-700',
};
const SEVERITY_ICON: Record<string, React.ReactNode> = {
  INFO: <Info className="w-4 h-4 text-blue-500" />,
  WARNING: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  REVIEW_REQUIRED: <AlertCircle className="w-4 h-4 text-red-500" />,
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface TooltipCardProps {
  title: string;
  explanation: string;
  benchmark?: string;
  children: React.ReactNode;
}
const TooltipCard: React.FC<TooltipCardProps> = ({ title, explanation, benchmark, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      {children}
      <button
        onClick={() => setOpen((p) => !p)}
        className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-[var(--brand-700)] transition-colors"
        aria-label={`Info about ${title}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute z-20 top-8 right-0 w-72 bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] rounded-xl p-3 text-xs">
          <p className="font-bold text-[var(--brand-950)] mb-1">{title}</p>
          <p className="text-[var(--text-secondary)] leading-relaxed">{explanation}</p>
          {benchmark && (
            <p className="mt-2 text-[10px] font-mono text-[var(--text-muted)] border-t border-[var(--border)] pt-1.5">
              {benchmark}
            </p>
          )}
          <button
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-[var(--brand-950)]"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

interface MetricBlockProps {
  label: string;
  value: string;
  sub?: string;
  status?: string;
  explanation?: string;
  benchmark?: string;
  icon?: React.ReactNode;
}
const MetricBlock: React.FC<MetricBlockProps> = ({
  label, value, sub, status = 'ADEQUATE', explanation = '', benchmark, icon,
}) => (
  <TooltipCard title={label} explanation={explanation} benchmark={benchmark}>
    <div
      className={`relative p-4 rounded-2xl border ${STATUS_BG[status] || 'bg-white border-[var(--border)]'} transition-all`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
          <p className={`text-xl font-black mt-0.5 ${STATUS_TEXT[status] || 'text-[var(--brand-950)]'}`}
            style={{ fontFamily: 'Outfit, sans-serif' }}>
            {value}
          </p>
          {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
        </div>
        {icon && (
          <div className="mt-0.5 opacity-70">{icon}</div>
        )}
      </div>
      {status && (
        <span
          className="mt-2 inline-block text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: STATUS_COLORS[status] + '22',
            color: STATUS_COLORS[status],
          }}
        >
          {status}
        </span>
      )}
    </div>
  </TooltipCard>
);

interface HealthCardProps { indicator: HealthIndicator; }
const HealthCard: React.FC<HealthCardProps> = ({ indicator }) => {
  const color = STATUS_COLORS[indicator.status] || '#6B7280';
  const bg = STATUS_BG[indicator.status] || 'bg-white border-[var(--border)]';
  const tc = STATUS_TEXT[indicator.status] || 'text-[var(--brand-950)]';
  const StatusIcon =
    indicator.status === 'HEALTHY' ? CheckCircle2 :
    indicator.status === 'ADEQUATE' ? Shield :
    indicator.status === 'STRESSED' ? AlertTriangle : XCircle;

  return (
    <TooltipCard
      title={indicator.label}
      explanation={indicator.explanation}
      benchmark={indicator.benchmark}
    >
      <div className={`relative p-4 rounded-2xl border ${bg} h-full`}>
        <div className="flex items-center gap-2 mb-2">
          <StatusIcon className="w-4 h-4" style={{ color }} />
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
            {indicator.label}
          </span>
        </div>
        <p className={`text-2xl font-black ${tc}`} style={{ fontFamily: 'Outfit, sans-serif' }}>
          {indicator.unit === '₹'
            ? fmt(indicator.value)
            : `${indicator.value}${indicator.unit}`}
        </p>
        <p
          className="mt-2 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block"
          style={{ backgroundColor: color + '22', color }}
        >
          {indicator.status}
        </p>
      </div>
    </TooltipCard>
  );
};

interface AnomalyRowProps { anomaly: CashFlowAnomalyRecord; }
const AnomalyRow: React.FC<AnomalyRowProps> = ({ anomaly }) => (
  <div className="flex gap-3 p-3 rounded-xl border border-[var(--border)] bg-white hover:border-[var(--brand-700)] transition-colors">
    <div className="mt-0.5 flex-shrink-0">{SEVERITY_ICON[anomaly.severity]}</div>
    <div className="min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-[var(--brand-950)]">
          {anomaly.anomaly_type.replace(/_/g, ' ')}
        </span>
        {anomaly.month_affected && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--text-muted)] font-mono">
            {anomaly.month_affected}
          </span>
        )}
        <span
          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
            anomaly.severity === 'INFO'
              ? 'bg-blue-100 text-blue-700'
              : anomaly.severity === 'WARNING'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {anomaly.severity}
        </span>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
        {anomaly.description}
      </p>
      {anomaly.expected_range && (
        <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1">
          Expected: {anomaly.expected_range}
        </p>
      )}
    </div>
  </div>
);

// ── Custom Recharts tooltip ───────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border-2 border-[var(--brand-950)] shadow-[3px_3px_0px_#0A1F20] rounded-xl px-3 py-2 text-xs">
      <p className="font-bold text-[var(--brand-950)] mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--text-secondary)]">{p.name}:</span>
          <span className="font-bold text-[var(--brand-950)]">
            {fmt(Number(p.value))}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-[var(--border)] rounded-xl ${className}`} />
);

// ── Main Page ─────────────────────────────────────────────────────────────────
export const CashFlowIntelligencePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'trend' | 'obligations' | 'anomalies'>('overview');

  const { data, isLoading, isError, refetch, isFetching } = useQuery<CashFlowMetrics>({
    queryKey: ['cashflow', id],
    queryFn: () => api.getCashFlowMetrics(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-[var(--fin-amber)] mb-3" />
        <h3 className="font-black text-[var(--brand-950)]">Cash-flow data unavailable</h3>
        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
          This may occur if bank statements have not yet been uploaded or processed.
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 text-xs font-bold text-[var(--brand-700)] flex items-center gap-1 hover:underline"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  const m = data;
  const trendData = m.monthly_trend.map((t: MonthlyCashFlow) => ({
    month: t.month,
    inflow: t.inflow,
    outflow: t.outflow,
    net: t.net_flow,
    balance: t.closing_balance,
  }));
  const hasAnomalies = m.anomalies && m.anomalies.length > 0;
  const warningAnomalies = m.anomalies?.filter(a => a.severity !== 'INFO').length || 0;

  // Tabs
  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'trend', label: '6-Month Trend' },
    { key: 'obligations', label: 'EMI & Obligations' },
    { key: 'anomalies', label: `Signals${warningAnomalies > 0 ? ` (${warningAnomalies})` : ''}` },
  ] as const;

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="p-5 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--fin-blue-bg)] text-[var(--fin-blue)] border border-[var(--fin-blue)]/30">
              Module 7
            </span>
            <span className="text-xs text-[var(--text-muted)]">Analytical aid · Not a guarantee of loan approval</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Cash-Flow Intelligence
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            6-month bank statement analysis · Debt service simulation · Health indicators
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 text-xs font-bold text-[var(--brand-700)] border border-[var(--brand-700)] rounded-xl px-3 py-2 hover:bg-[var(--brand-50)] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Recalculate
        </button>
      </div>

      {/* ── Key KPI Bar ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricBlock
          label="Avg Monthly Inflow"
          value={fmt(m.avg_monthly_inflow)}
          sub="Bank credits · 6-mo average"
          status={m.avg_monthly_inflow > 0 ? 'HEALTHY' : 'STRESSED'}
          explanation="Average monthly credits recorded in the bank statement over the last 6 months. This is the primary revenue signal used for underwriting."
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
        />
        <MetricBlock
          label="Avg Monthly Outflow"
          value={fmt(m.avg_monthly_outflow)}
          sub="Bank debits · 6-mo average"
          status="ADEQUATE"
          explanation="Average monthly debits (expenses, supplier payments, tax). Outflow is compared against inflow to compute operating surplus."
          icon={<TrendingDown className="w-5 h-5 text-red-400" />}
        />
        <MetricBlock
          label="Operating Surplus"
          value={fmt(m.net_monthly_surplus)}
          sub="Avg inflow − avg outflow"
          status={m.net_monthly_surplus > 0 ? (m.net_monthly_surplus > m.avg_monthly_inflow * 0.15 ? 'HEALTHY' : 'ADEQUATE') : 'STRESSED'}
          explanation="The estimated monthly surplus after covering all operating expenses. This is the available pool for debt service."
          icon={<Wallet className="w-5 h-5 text-blue-500" />}
        />
        <MetricBlock
          label="DSCR"
          value={`${m.dscr.toFixed(2)}x`}
          sub="Debt Service Coverage Ratio"
          status={m.dscr >= 1.5 ? 'HEALTHY' : m.dscr >= 1.2 ? 'ADEQUATE' : m.dscr >= 1.0 ? 'STRESSED' : 'CRITICAL'}
          explanation={`DSCR = Annual Operating Surplus ÷ Annual Debt Service. Current value: ${m.dscr.toFixed(2)}x. A higher ratio means stronger repayment capacity.`}
          benchmark="Policy minimum: 1.2x | Healthy: ≥1.5x"
          icon={<Shield className="w-5 h-5 text-[var(--brand-700)]" />}
        />
      </div>

      {/* ── Tab Navigation ───────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-[var(--surface-muted)] p-1 rounded-2xl w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === key
                ? 'bg-white shadow text-[var(--brand-950)] border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--brand-700)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Health Indicators Grid */}
          <div>
            <h2 className="text-sm font-black text-[var(--brand-950)] mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Financial Health Indicators
              <span className="text-[10px] font-normal text-[var(--text-muted)] ml-1">(click ℹ️ on any card for full explanation)</span>
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {(m.health_indicators || []).map((hi: HealthIndicator) => (
                <HealthCard key={hi.indicator_id} indicator={hi} />
              ))}
            </div>
          </div>

          {/* Quick Cash-Flow Summary Chart */}
          <div className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
            <h4 className="text-sm font-black text-[var(--brand-950)] mb-0.5">
              6-Month Cash-Flow Overview
            </h4>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Bank-verified inflows vs outflows · GSTR-3B cross-referenced
            </p>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cfIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cfOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3ECE9" />
                  <XAxis dataKey="month" stroke="#94A7A1" fontSize={11} tickLine={false} />
                  <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} stroke="#94A7A1" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="inflow" name="Monthly Inflow" stroke="#10B981" strokeWidth={2} fill="url(#cfIn)" />
                  <Area type="monotone" dataKey="outflow" name="Monthly Outflow" stroke="#EF4444" strokeWidth={2} fill="url(#cfOut)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Anomaly teaser */}
          {hasAnomalies && (
            <div
              className="p-4 rounded-2xl border border-amber-200 bg-amber-50 flex items-start gap-3 cursor-pointer hover:border-amber-400 transition-colors"
              onClick={() => setActiveTab('anomalies')}
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">
                  {m.anomalies.length} cash-flow signal{m.anomalies.length !== 1 ? 's' : ''} detected
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  These are patterns flagged for review — not fraud indicators. Click to inspect each signal with full context.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-600 mt-0.5" />
            </div>
          )}
        </div>
      )}

      {/* 6-MONTH TREND TAB */}
      {activeTab === 'trend' && (
        <div className="space-y-5">
          {/* Inflow / Outflow Area Chart */}
          <div className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
            <h4 className="text-sm font-black text-[var(--brand-950)] mb-0.5">Monthly Inflow vs Outflow</h4>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Showing last 6 months · Shaded areas show trend bands
            </p>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cfIn2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cfOut2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3ECE9" />
                  <XAxis dataKey="month" stroke="#94A7A1" fontSize={11} tickLine={false} />
                  <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} stroke="#94A7A1" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area type="monotone" dataKey="inflow" name="Monthly Inflow" stroke="#10B981" strokeWidth={2.5} fill="url(#cfIn2)" />
                  <Area type="monotone" dataKey="outflow" name="Monthly Outflow" stroke="#EF4444" strokeWidth={2.5} fill="url(#cfOut2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Net Cash Flow Bar Chart */}
          <div className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
            <h4 className="text-sm font-black text-[var(--brand-950)] mb-0.5">Net Monthly Cash Flow</h4>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Positive = surplus · Negative months signal potential stress
            </p>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3ECE9" />
                  <XAxis dataKey="month" stroke="#94A7A1" fontSize={11} tickLine={false} />
                  <YAxis tickFormatter={(v) => fmtK(v)} stroke="#94A7A1" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={0} stroke="#0A1F20" strokeWidth={1.5} strokeDasharray="4 2" />
                  <Bar dataKey="net" name="Net Cash Flow" radius={[4, 4, 0, 0]}
                    fill="#3B82F6"
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Summary Table */}
          <div className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs overflow-x-auto">
            <h4 className="text-sm font-black text-[var(--brand-950)] mb-3">Month-by-Month Summary</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Month', 'Inflow', 'Outflow', 'Net Flow', 'Closing Balance'].map((h) => (
                    <th key={h} className="pb-2 text-left font-extrabold text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.monthly_trend.map((row: MonthlyCashFlow) => (
                  <tr key={row.month} className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-muted)] transition-colors">
                    <td className="py-2 font-bold text-[var(--brand-950)]">{row.month}</td>
                    <td className="py-2 text-emerald-700 font-semibold">{fmt(row.inflow)}</td>
                    <td className="py-2 text-red-600 font-semibold">{fmt(row.outflow)}</td>
                    <td className={`py-2 font-bold ${row.net_flow >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {row.net_flow >= 0 ? '+' : ''}{fmt(row.net_flow)}
                    </td>
                    <td className="py-2 text-[var(--text-secondary)]">{fmt(row.closing_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Volatility & Seasonality */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl border border-[var(--border)] bg-white">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Inflow Volatility</p>
              <p className="text-2xl font-black text-[var(--brand-950)] mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {(m.volatility_index * 100).toFixed(1)}%
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">CV of monthly credits</p>
            </div>
            <div className="p-4 rounded-2xl border border-[var(--border)] bg-white">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Seasonality Ratio</p>
              <p className="text-2xl font-black text-[var(--brand-950)] mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {m.seasonality_ratio.toFixed(2)}x
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Peak ÷ trough month inflow</p>
            </div>
            <div className="p-4 rounded-2xl border border-[var(--border)] bg-white">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Daily Burn Rate</p>
              <p className="text-2xl font-black text-[var(--brand-950)] mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {fmt(m.cash_burn_rate)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Average daily outflow</p>
            </div>
          </div>
        </div>
      )}

      {/* OBLIGATIONS TAB */}
      {activeTab === 'obligations' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricBlock
              label="Existing Monthly EMI"
              value={fmt(m.existing_monthly_emi)}
              sub="Declared + extracted from bank data"
              status={m.existing_monthly_emi < m.avg_monthly_inflow * 0.2 ? 'HEALTHY' : 'ADEQUATE'}
              explanation="Sum of existing loan EMI obligations identified from bank debits and applicant declaration. Does not include the proposed facility."
              icon={<Wallet className="w-5 h-5 text-blue-500" />}
            />
            <MetricBlock
              label="Proposed Facility EMI"
              value={fmt(m.proposed_monthly_emi)}
              sub="Estimated at 12% p.a. reducing"
              status="ADEQUATE"
              explanation={`Estimated monthly EMI for the requested facility (₹${fmt(m.avg_monthly_inflow * 12)} annualised), computed using a standard reducing-balance schedule at 12% p.a.`}
              icon={<Zap className="w-5 h-5 text-violet-500" />}
            />
            <MetricBlock
              label="Total Obligations"
              value={fmt(m.total_monthly_obligations)}
              sub="Existing + proposed EMI combined"
              status={m.debt_service_burden_pct < 30 ? 'HEALTHY' : m.debt_service_burden_pct < 45 ? 'ADEQUATE' : 'STRESSED'}
              explanation="Combined monthly outflow for all loan obligations. This is the figure used to calculate DSCR and debt service burden."
              icon={<BarChart2 className="w-5 h-5 text-amber-500" />}
            />
            <MetricBlock
              label="Obligation-to-Inflow"
              value={`${m.debt_service_burden_pct.toFixed(1)}%`}
              sub="Total obligations ÷ avg inflow"
              status={m.debt_service_burden_pct < 30 ? 'HEALTHY' : m.debt_service_burden_pct < 45 ? 'ADEQUATE' : 'STRESSED'}
              explanation="Percentage of average monthly inflow consumed by total loan obligations. Below 30% is healthy; above 45% signals repayment stress."
              benchmark="Healthy: <30%  |  Stressed: >45%"
              icon={<Activity className="w-5 h-5 text-[var(--brand-700)]" />}
            />
            <MetricBlock
              label="Surplus After Obligations"
              value={fmt(m.surplus_after_obligations)}
              sub="Post-EMI operating buffer"
              status={m.surplus_after_obligations > 0 ? (m.surplus_after_obligations > m.avg_monthly_inflow * 0.1 ? 'HEALTHY' : 'ADEQUATE') : 'CRITICAL'}
              explanation="Remaining monthly buffer after covering all loan EMIs (existing + proposed). This represents capacity to absorb operating cost surprises."
              icon={<Shield className="w-5 h-5 text-emerald-600" />}
            />
            <MetricBlock
              label="Working Capital Buffer"
              value={`${m.working_capital_buffer_days} days`}
              sub="Estimated cash runway"
              status={m.working_capital_buffer_days >= 30 ? 'HEALTHY' : m.working_capital_buffer_days >= 14 ? 'ADEQUATE' : 'STRESSED'}
              explanation="Number of days the current average monthly balance (AMB) can cover daily outflows without new inflows. A buffer of ≥30 days is recommended."
              benchmark="Healthy: ≥30 days  |  Stressed: <14 days"
              icon={<Clock className="w-5 h-5 text-[var(--text-muted)]" />}
            />
          </div>

          {/* Obligation Waterfall */}
          <div className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
            <h4 className="text-sm font-black text-[var(--brand-950)] mb-0.5">Monthly Cash Waterfall</h4>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              From average monthly inflow, step down through obligations to arrive at post-obligation surplus.
            </p>
            <div className="space-y-2">
              {[
                { label: 'Avg Monthly Inflow', value: m.avg_monthly_inflow, color: '#10B981', arrow: false, pct: 100 },
                { label: '− Operating Outflow', value: -m.avg_monthly_outflow, color: '#EF4444', arrow: true, pct: (m.avg_monthly_outflow / m.avg_monthly_inflow) * 100 },
                { label: '= Operating Surplus', value: m.net_monthly_surplus, color: '#3B82F6', arrow: false, pct: Math.max(0, (m.net_monthly_surplus / m.avg_monthly_inflow) * 100) },
                { label: '− Existing EMI', value: -m.existing_monthly_emi, color: '#F59E0B', arrow: true, pct: (m.existing_monthly_emi / m.avg_monthly_inflow) * 100 },
                { label: '− Proposed EMI', value: -m.proposed_monthly_emi, color: '#8B5CF6', arrow: true, pct: (m.proposed_monthly_emi / m.avg_monthly_inflow) * 100 },
                { label: '= Post-Obligation Surplus', value: m.surplus_after_obligations, color: m.surplus_after_obligations >= 0 ? '#10B981' : '#EF4444', arrow: false, pct: Math.abs((m.surplus_after_obligations / m.avg_monthly_inflow) * 100) },
              ].map((row, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-40 text-right text-xs font-semibold text-[var(--text-secondary)] flex-shrink-0">
                    {row.label}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div
                      className="h-6 rounded-md transition-all duration-700"
                      style={{
                        width: `${Math.min(row.pct, 100)}%`,
                        backgroundColor: row.color + '33',
                        borderLeft: `3px solid ${row.color}`,
                      }}
                    />
                    <span className="text-xs font-bold flex-shrink-0" style={{ color: row.color }}>
                      {row.value >= 0 ? '' : '−'}{fmt(Math.abs(row.value))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ANOMALIES TAB */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              <strong>Signals, not verdicts.</strong> The patterns below describe unusual cash-flow behaviour
              that warrants further review. None of these are determinations of fraud, misrepresentation, or
              intent. Each signal includes full context and the expected range.
            </p>
          </div>

          {(!m.anomalies || m.anomalies.length === 0) ? (
            <div className="flex flex-col items-center py-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
              <h3 className="font-black text-[var(--brand-950)]">No signals detected</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
                Cash-flow patterns are within expected ranges for all 6 months.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {m.anomalies.map((a: CashFlowAnomalyRecord) => (
                <AnomalyRow key={a.anomaly_id} anomaly={a} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Disclaimer ──────────────────────────────────────────────────────── */}
      <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[10px] text-[var(--text-muted)] leading-relaxed">
        <strong>Analytical aid only.</strong> Cash-flow metrics are derived from bank statement data and
        application-declared figures. They are intended as decision-support inputs and do not constitute a
        guarantee of loan approval, repayment capacity, or creditworthiness. Final lending decisions remain
        subject to full underwriting review, policy compliance, and officer oversight.
      </div>
    </div>
  );
};
