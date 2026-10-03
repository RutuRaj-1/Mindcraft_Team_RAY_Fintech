import React from 'react';
import { SHAPAttribution } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Sparkles, HelpCircle } from 'lucide-react';

interface SHAPProps {
  shapData?: SHAPAttribution;
}

export const SHAPWaterfallChart: React.FC<SHAPProps> = ({ shapData }) => {
  if (!shapData || !shapData.features || shapData.features.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-[#E3ECE9] text-center text-[#687A75]">
        <p>No SHAP attribution generated yet. Run risk evaluation to see feature contributions.</p>
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
    <div className="bg-white rounded-2xl p-6 border border-[#E3ECE9] shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#7457C8]" />
            <h3 className="text-base font-bold text-[#123E40]">SHAP Explainability Waterfall</h3>
            <span className="bg-[#F2EEFF] text-[#7457C8] text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[#7457C8]/20">
              TreeExplainer Attribution
            </span>
          </div>
          <p className="text-xs text-[#687A75] mt-0.5">
            Marginal contribution of each financial driver towards the borrower default probability.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#687A75]">Base Default Rate E[f(x)]</p>
          <p className="text-sm font-bold text-[#123E40]">{(shapData.base_value * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="h-64 w-full">
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
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#40524E"
              fontSize={11}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: any, _: any, item: any) => [
                `${(Number(value) * 100).toFixed(2)}% (${item.payload.direction === 'REDUCES_RISK' ? 'Favorable / Improves Score' : 'Adverse / Increases Risk'})`,
                'Contribution'
              ]}
              contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #CBD9D5', fontSize: '12px' }}
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

      <div className="mt-3 pt-3 border-t border-[#E3ECE9] flex items-center justify-between text-xs text-[#687A75]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#169C73] inline-block"></span>
            Green = Favorable (Reduces Default Risk)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#D96559] inline-block"></span>
            Red = Adverse (Increases Default Risk)
          </span>
        </div>
        <span className="text-[11px] font-medium text-[#123E40]">
          Model Output f(x): {(shapData.model_output * 100).toFixed(1)}% PD
        </span>
      </div>
    </div>
  );
};
