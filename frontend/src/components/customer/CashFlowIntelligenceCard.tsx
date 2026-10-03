import React from 'react';
import { CashFlowMetrics } from '../../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Activity, ShieldCheck, Calendar, DollarSign } from 'lucide-react';

interface CashFlowProps {
  metrics?: CashFlowMetrics;
}

export const CashFlowIntelligenceCard: React.FC<CashFlowProps> = ({ metrics }) => {
  if (!metrics) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#E3ECE9] shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#EAF2FF] flex items-center justify-center text-[#2563EB]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#123E40]">Cash-Flow Intelligence & Runway</h3>
            <p className="text-xs text-[#687A75]">
              Derived from verified bank statements and GSTR-3B filings over the past 6 months.
            </p>
          </div>
        </div>
        <span className="bg-[#E8F7F1] text-[#169C73] text-xs font-semibold px-2.5 py-1 rounded-full border border-[#169C73]/20 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> DSCR: {metrics.dscr}x Healthy
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#F7FAF9] p-3 rounded-xl border border-[#E3ECE9]">
          <p className="text-[11px] text-[#687A75] font-medium">Debt Service Ratio (DSCR)</p>
          <p className="text-lg font-extrabold text-[#123E40] mt-0.5">{metrics.dscr}x</p>
          <p className="text-[10px] text-[#169C73] font-semibold">Min required: 1.25x</p>
        </div>
        <div className="bg-[#F7FAF9] p-3 rounded-xl border border-[#E3ECE9]">
          <p className="text-[11px] text-[#687A75] font-medium">Working Capital Buffer</p>
          <p className="text-lg font-extrabold text-[#123E40] mt-0.5">{metrics.working_capital_buffer_days} Days</p>
          <p className="text-[10px] text-[#687A75]">Daily burn: ₹{(metrics.cash_burn_rate / 30 / 1000).toFixed(1)}k</p>
        </div>
        <div className="bg-[#F7FAF9] p-3 rounded-xl border border-[#E3ECE9]">
          <p className="text-[11px] text-[#687A75] font-medium">Avg Monthly Inflow</p>
          <p className="text-lg font-extrabold text-[#123E40] mt-0.5">₹{(metrics.avg_monthly_inflow / 100000).toFixed(2)}L</p>
          <p className="text-[10px] text-[#2563EB]">Verified credits</p>
        </div>
        <div className="bg-[#F7FAF9] p-3 rounded-xl border border-[#E3ECE9]">
          <p className="text-[11px] text-[#687A75] font-medium">Inflow Volatility Index</p>
          <p className="text-lg font-extrabold text-[#123E40] mt-0.5">{metrics.volatility_index}</p>
          <p className="text-[10px] text-[#169C73]">Stable low variance</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={metrics.monthly_trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#237277" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#237277" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D96559" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#D96559" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3ECE9" />
            <XAxis dataKey="month" stroke="#94A7A1" fontSize={11} />
            <YAxis
              tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
              stroke="#94A7A1"
              fontSize={11}
            />
            <Tooltip
              formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
              contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #CBD9D5', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Area
              type="monotone"
              dataKey="inflow"
              name="Monthly Inflow (Credits)"
              stroke="#237277"
              strokeWidth={2}
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
  );
};
