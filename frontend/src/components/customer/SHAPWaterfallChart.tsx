import React from 'react';
import { SHAPAttribution } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Sparkles, HelpCircle, Info } from 'lucide-react';

interface SHAPProps {
  shapData?: SHAPAttribution;
}

export const SHAPWaterfallChart: React.FC<SHAPProps> = ({ shapData }) => {
  if (!shapData || !shapData.features || shapData.features.length === 0) {
    return (
      <div className="card p-8 text-center text-[var(--neutral-500)]">
        <Sparkles className="w-8 h-8 text-[var(--fin-violet)] mx-auto mb-2 opacity-60" />
        <p className="font-semibold text-sm text-[var(--neutral-700)]">No SHAP attribution generated yet</p>
        <p className="text-xs text-[var(--neutral-500)] mt-1">Run risk evaluation to view marginal feature contributions.</p>
      </div>
    );
  }

  // Format chart data
  const chartData = shapData.features.map(f => ({
    name: f.feature_display_name,
    impact: f.shap_value,
    direction: f.direction,
    value: f.feature_value,
    absImpact: Math.abs(f.shap_value)
  }));

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--fin-violet-soft)] flex items-center justify-center text-[var(--fin-violet)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[var(--neutral-900)] tracking-tight">
              SHAP Feature Attribution (TreeExplainer)
            </h3>
            <span className="badge badge-purple text-[10px]">Explainable AI</span>
          </div>
          <p className="text-xs text-[var(--neutral-500)] mt-1">
            Quantifies the marginal contribution of each financial driver towards the borrower's default risk.
          </p>
        </div>

        <div className="bg-[var(--neutral-50)] px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] text-right self-start sm:self-auto">
          <p className="text-[10px] text-[var(--neutral-500)] font-medium">Base Portfolio Default Rate E[f(x)]</p>
          <p className="text-sm font-black text-[var(--neutral-900)]">{(shapData.base_value * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 w-full bg-[var(--neutral-50)] rounded-xl p-3 border border-[var(--border-subtle)]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 140, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[-0.2, 0.2]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              stroke="#94A7A1"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#40524E"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: any, _: any, item: any) => [
                `${(Number(value) * 100).toFixed(2)}% (${item.payload.direction === 'REDUCES_RISK' ? 'Favorable / Improves Score' : 'Adverse / Increases Risk'})`,
                'SHAP Impact'
              ]}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #CBD9D5',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '12px'
              }}
            />
            <ReferenceLine x={0} stroke="#CBD9D5" strokeWidth={1.5} />
            <Bar dataKey="impact" radius={[4, 4, 4, 4]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.impact < 0 ? '#169C73' : '#D96559'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Legend */}
      <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[var(--neutral-600)]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded-full bg-[var(--fin-green)] inline-block"></span>
            Green: Favorable (Reduces Default Risk)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded-full bg-[var(--fin-coral)] inline-block"></span>
            Red: Adverse (Increases Default Risk)
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-semibold text-[var(--neutral-900)]">
          <Info className="w-3.5 h-3.5 text-[var(--brand-600)]" />
          <span>Calibrated PD f(x): {(shapData.model_output * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};
