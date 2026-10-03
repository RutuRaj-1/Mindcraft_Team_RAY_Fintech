import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export interface ChartDataPoint {
  month: string;
  inflow: number;
  outflow: number;
  net_surplus?: number;
}

export interface FinancialChartProps {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
  className?: string;
}

export const FinancialChart: React.FC<FinancialChartProps> = ({
  data,
  title = '6-Month Cash-Flow & Runway Trajectory',
  subtitle = 'Bank statements & GSTR-3B verified transaction credits vs debits',
  height = 240,
  className = '',
}) => {
  const chartData = data.map((d) => ({
    ...d,
    net_surplus: d.net_surplus ?? (d.inflow - d.outflow),
  }));

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h4 className="text-sm font-black text-[var(--brand-950)] tracking-tight">
              {title}
            </h4>
          )}
          {subtitle && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="finInflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#237277" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#237277" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="finOutflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D96559" stopOpacity={0.2} />
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
                name === 'inflow' ? 'Credits (Inflow)' : name === 'outflow' ? 'Debits (Outflow)' : 'Net Surplus'
              ]}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '2px solid #0A1F20',
                boxShadow: '3px 3px 0px #0A1F20',
                fontSize: '12px',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              formatter={(value) => <span className="text-[var(--text-secondary)] font-medium">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="inflow"
              name="Monthly Inflow (Credits)"
              stroke="#237277"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#finInflow)"
            />
            <Area
              type="monotone"
              dataKey="outflow"
              name="Monthly Outflow (Debits)"
              stroke="#D96559"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#finOutflow)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
