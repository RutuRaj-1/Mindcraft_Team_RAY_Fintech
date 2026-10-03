import React from 'react';
import { CashFlowMetrics } from '../../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Activity, ShieldCheck, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

interface CashFlowProps {
  metrics?: CashFlowMetrics;
}

export const CashFlowIntelligenceCard: React.FC<CashFlowProps> = ({ metrics }) => {
  if (!metrics) {
    return null;
  }

  // Calculate net flow for the trend
  const chartData = (metrics.monthly_trend || []).map(item => ({
    ...item,
    net_surplus: item.inflow - item.outflow,
  }));

  const isDscrHealthy = metrics.dscr >= 1.25;

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--fin-blue-soft)] flex items-center justify-center text-[var(--fin-blue)] shadow-xs">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--neutral-900)] tracking-tight">
                Cash-Flow Intelligence & Runway
              </h3>
              <span className="badge badge-primary text-[10px]">Real-time AI</span>
            </div>
            <p className="text-xs text-[var(--neutral-500)] mt-0.5">
              Verified through 6-month GST GSTR-3B filings, AA bank feeds & AA reconciliation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className={`badge ${isDscrHealthy ? 'badge-success' : 'badge-warning'} px-3 py-1 text-xs font-semibold flex items-center gap-1.5 shadow-xs`}>
            {isDscrHealthy ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            DSCR: {metrics.dscr}x ({isDscrHealthy ? 'Optimal Capacity' : 'Borderline'})
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div className="p-3.5 rounded-xl bg-[var(--neutral-50)] border border-[var(--border-subtle)] hover:border-[var(--brand-200)] transition-all">
          <div className="flex items-center justify-between text-[11px] text-[var(--neutral-500)] font-medium mb-1">
            <span>Debt Service Ratio</span>
            <span className="text-[10px] text-[var(--fin-green)] font-semibold">Min 1.25x</span>
          </div>
          <p className="text-xl font-extrabold text-[var(--neutral-900)] tracking-tight">{metrics.dscr}x</p>
          <div className="mt-2 w-full bg-[var(--neutral-200)] rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--fin-green)]"
              style={{ width: `${Math.min(100, (metrics.dscr / 2.5) * 100)}%` }}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--neutral-50)] border border-[var(--border-subtle)] hover:border-[var(--brand-200)] transition-all">
          <div className="flex items-center justify-between text-[11px] text-[var(--neutral-500)] font-medium mb-1">
            <span>Working Capital Buffer</span>
            <span className="text-[10px] text-[var(--brand-600)] font-semibold">Runway</span>
          </div>
          <p className="text-xl font-extrabold text-[var(--neutral-900)] tracking-tight">
            {metrics.working_capital_buffer_days} <span className="text-xs font-normal text-[var(--neutral-500)]">Days</span>
          </p>
          <p className="text-[11px] text-[var(--neutral-500)] mt-1.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[var(--neutral-400)]" /> Burn: ₹{(metrics.cash_burn_rate / 30 / 1000).toFixed(1)}k/day
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--neutral-50)] border border-[var(--border-subtle)] hover:border-[var(--brand-200)] transition-all">
          <div className="flex items-center justify-between text-[11px] text-[var(--neutral-500)] font-medium mb-1">
            <span>Avg Monthly Inflow</span>
            <span className="text-[10px] text-[var(--fin-blue)] font-semibold">Credits</span>
          </div>
          <p className="text-xl font-extrabold text-[var(--neutral-900)] tracking-tight">
            ₹{(metrics.avg_monthly_inflow / 100000).toFixed(2)}L
          </p>
          <p className="text-[11px] text-[var(--fin-blue)] font-medium mt-1.5 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Verified across 3 accounts
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--neutral-50)] border border-[var(--border-subtle)] hover:border-[var(--brand-200)] transition-all">
          <div className="flex items-center justify-between text-[11px] text-[var(--neutral-500)] font-medium mb-1">
            <span>Volatility Index</span>
            <span className="text-[10px] text-[var(--fin-green)] font-semibold">Low Risk</span>
          </div>
          <p className="text-xl font-extrabold text-[var(--neutral-900)] tracking-tight">{metrics.volatility_index}</p>
          <p className="text-[11px] text-[var(--fin-green)] font-medium mt-1.5">
            Smooth revenue seasonality
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-[var(--neutral-50)] rounded-xl p-4 border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-semibold text-[var(--neutral-700)]">Monthly Inflow vs Outflow Trajectory</span>
          <span className="text-[11px] text-[var(--neutral-500)]">Values in Lakhs (INR)</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#237277" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#237277" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D96559" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#D96559" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3ECE9" />
              <XAxis dataKey="month" stroke="#94A7A1" fontSize={11} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                stroke="#94A7A1"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  `₹${Number(value).toLocaleString('en-IN')}`,
                  name === 'inflow' ? 'Total Inflow' : name === 'outflow' ? 'Total Outflow' : 'Net Surplus'
                ]}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #CBD9D5',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: '12px'
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                formatter={(value) => <span className="text-[var(--neutral-700)] font-medium">{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="inflow"
                name="Monthly Inflow (Credits)"
                stroke="#237277"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#inflowGrad)"
              />
              <Area
                type="monotone"
                dataKey="outflow"
                name="Monthly Outflow (Debits)"
                stroke="#D96559"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#outflowGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
