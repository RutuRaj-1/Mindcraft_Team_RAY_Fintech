import React from 'react';
import { SHAPAttribution } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Sparkles, Info, BookOpen } from 'lucide-react';

export interface PolicyCitation {
  clause_id: string;
  title: string;
  excerpt: string;
  relevance_score: number;
}

export interface ExplainabilityPanelProps {
  shapData?: SHAPAttribution;
  citations?: PolicyCitation[];
  className?: string;
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({
  shapData,
  citations = [],
  className = '',
}) => {
  const chartData = (shapData?.features || []).map((f) => ({
    name: f.feature_display_name,
    impact: f.shap_value,
    direction: f.direction,
    value: f.feature_value,
  }));

  return (
    <div className={`space-y-4 ${className}`}>
      {/* SHAP Chart */}
      <div className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--fin-violet)]" />
              <h4 className="text-sm font-black text-[var(--brand-950)]">
                SHAP Marginal Feature Attribution (TreeExplainer)
              </h4>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Marginal impact of financial drivers on borrower default probability
            </p>
          </div>

          {shapData && (
            <div className="text-right text-xs">
              <span className="text-[var(--text-muted)]">Base Probability E[f(x)]: </span>
              <strong className="text-[var(--brand-950)]">{(shapData.base_value * 100).toFixed(1)}%</strong>
            </div>
          )}
        </div>

        {chartData.length > 0 ? (
          <div className="h-60 w-full">
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
                    `${(Number(value) * 100).toFixed(2)}% (${item.payload.direction === 'REDUCES_RISK' ? 'Favorable (Reduces Risk)' : 'Adverse (Increases Risk)'})`,
                    'Marginal Contribution',
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '2px solid #0A1F20',
                    fontSize: '12px',
                  }}
                />
                <ReferenceLine x={0} stroke="#CBD9D5" strokeWidth={1.5} />
                <Bar dataKey="impact" radius={[4, 4, 4, 4]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.impact < 0 ? '#0E9B6D' : '#CC4B3E'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[var(--text-muted)]">
            Run risk assessment to generate marginal SHAP attribution.
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--fin-green)]" />
              Green: Reduces Default Risk (Favorable)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--fin-coral)]" />
              Red: Increases Default Risk (Adverse)
            </span>
          </div>
          {shapData && (
            <span className="font-semibold text-[var(--brand-950)]">
              Output f(x): {(shapData.model_output * 100).toFixed(1)}% PD
            </span>
          )}
        </div>
      </div>

      {/* RAG Policy Citations */}
      {citations.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-[var(--brand-700)]" />
            <h4 className="text-sm font-black text-[var(--brand-950)]">
              Institutional Policy & Credit Guideline Grounding
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {citations.map((c, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-[var(--brand-700)]">{c.clause_id}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]">
                    {(c.relevance_score * 100).toFixed(0)}% Match
                  </span>
                </div>
                <p className="text-xs font-bold text-[var(--brand-950)]">{c.title}</p>
                <p className="text-[11px] text-[var(--text-muted)] italic mt-1 leading-relaxed">
                  "{c.excerpt}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
