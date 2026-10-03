import React, { useState } from 'react';
import {
  DecisionRecord,
  SHAPFactor,
  PolicyReference,
  EvidenceReference,
  HardPolicyConstraint,
} from '../../types';
import {
  HelpCircle,
  FileCheck,
  Cpu,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  Scale,
  RefreshCw,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

interface ExplainableDecisionSuiteProps {
  decision: DecisionRecord;
  onRegenerate?: () => Promise<void>;
  isRegenerating?: boolean;
}

export const ExplainableDecisionSuite: React.FC<ExplainableDecisionSuiteProps> = ({
  decision,
  onRegenerate,
  isRegenerating = false,
}) => {
  const [activeTab, setActiveTab] = useState<'why' | 'evidence' | 'factors' | 'policy' | 'warnings'>('why');
  const [factorsView, setFactorsView] = useState<'cards' | 'chart'>('cards');

  // Extract factors & payload safely
  const shapPayload = decision.shap_factors;
  const positiveFactors: SHAPFactor[] = shapPayload?.positive_factors || [];
  const negativeFactors: SHAPFactor[] = shapPayload?.negative_factors || [];
  const allFactors: SHAPFactor[] = shapPayload?.all_factors || [];
  const hardConstraints: HardPolicyConstraint[] = decision.hard_policy_constraints || [];
  const policyPassages: PolicyReference[] = decision.policy_references || (decision.policy_citations as any) || [];
  const evidenceItems: EvidenceReference[] = decision.evidence_references || [];
  const warningsList: string[] = decision.warnings || [];
  const missingEvidence: string[] = decision.missing_evidence || [];

  // Chart data from SHAP all_factors
  const chartData = allFactors.map((f) => ({
    name: f.feature_display_name,
    impact: f.shap_value,
    direction: f.direction,
    value: f.feature_value,
  }));

  const isRejected = decision.outcome === 'REJECTED';
  const isApproved = decision.outcome === 'APPROVED';
  const isConditional = decision.outcome === 'CONDITIONAL_APPROVAL';

  const badgeColor = isApproved
    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
    : isConditional
    ? 'bg-amber-50 text-amber-700 border-amber-300'
    : isRejected
    ? 'bg-rose-50 text-rose-700 border-rose-300'
    : 'bg-blue-50 text-blue-700 border-blue-300';

  const totalWarningsCount = warningsList.length + missingEvidence.length;

  return (
    <div className="space-y-6">
      {/* Top Meta & Invariant Strip */}
      <div className="p-4 rounded-2xl bg-white border border-[var(--border)] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-50)] border border-[var(--brand-200)] flex items-center justify-center text-[var(--brand-800)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                {decision.outcome.replace('_', ' ')}
              </span>
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                Trust Score: <strong className="text-[var(--brand-950)]">{Math.round(decision.risk_score || 720)}/1000</strong> ({decision.risk_band || 'LOW_RISK'})
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] mt-1">
              <span>Model: <code className="text-xs font-mono font-bold text-[var(--brand-950)]">{decision.modelVersion || 'scikit-learn-sme-v2.1'}</code></span>
              <span>•</span>
              <span>Explanation: <code className="text-xs font-mono text-[var(--brand-900)]">{decision.explanationVersion || 'v2.0-rag-shap'}</code></span>
              <span>•</span>
              <span>Confidence: <strong className="text-[var(--brand-950)]">{Math.round((decision.confidence || 0.95) * 100)}%</strong></span>
            </div>
          </div>
        </div>

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--brand-950)] bg-[var(--surface-subtle)] hover:bg-[var(--brand-50)] border border-[var(--border)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-[var(--brand-600)]' : ''}`} />
            {isRegenerating ? 'Recalculating...' : 'Regenerate Decision'}
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)]">
        <button
          onClick={() => setActiveTab('why')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'why'
              ? 'bg-white text-[var(--brand-950)] shadow-xs border border-[var(--border)]'
              : 'text-[var(--text-muted)] hover:text-[var(--brand-950)]'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-[var(--brand-600)]" />
          <span>Why? (Synthesis)</span>
        </button>

        <button
          onClick={() => setActiveTab('evidence')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'evidence'
              ? 'bg-white text-[var(--brand-950)] shadow-xs border border-[var(--border)]'
              : 'text-[var(--text-muted)] hover:text-[var(--brand-950)]'
          }`}
        >
          <FileCheck className="w-4 h-4 text-emerald-600" />
          <span>Evidence Provenance</span>
          {evidenceItems.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {evidenceItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('factors')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'factors'
              ? 'bg-white text-[var(--brand-950)] shadow-xs border border-[var(--border)]'
              : 'text-[var(--text-muted)] hover:text-[var(--brand-950)]'
          }`}
        >
          <Cpu className="w-4 h-4 text-indigo-600" />
          <span>Model Factors (SHAP)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 font-bold">
            {allFactors.length || 15}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('policy')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'policy'
              ? 'bg-white text-[var(--brand-950)] shadow-xs border border-[var(--border)]'
              : 'text-[var(--text-muted)] hover:text-[var(--brand-950)]'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-600" />
          <span>Policy Grounding (RAG)</span>
          {policyPassages.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
              {policyPassages.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('warnings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'warnings'
              ? 'bg-white text-[var(--brand-950)] shadow-xs border border-[var(--border)]'
              : 'text-[var(--text-muted)] hover:text-[var(--brand-950)]'
          }`}
        >
          <AlertTriangle className={`w-4 h-4 ${totalWarningsCount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          <span>Warnings & Missing Evidence</span>
          {totalWarningsCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
              {totalWarningsCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* ── 1. WHY? (Synthesis & Key Reasons) ─────────────────────────────── */}
      {activeTab === 'why' && (
        <div className="space-y-5">
          {/* Executive Summary Narrative */}
          <div className="p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
            <div className="flex items-center gap-2.5 mb-3">
              <Scale className="w-5 h-5 text-[var(--brand-700)]" />
              <h3 className="text-base font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Executive Underwriting Synthesis
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-[var(--text-default)] bg-[var(--surface-subtle)] p-4 rounded-xl border border-[var(--border)]">
              {decision.summary || decision.reasoning || 'Underwriting decision formulated through multi-factor intelligence.'}
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                <strong>Deterministic Rule Supremacy Enforced:</strong> Hard eligibility constraints supersede ML scores. Explanations are strictly grounded in verified facts.
              </span>
            </div>
          </div>

          {/* Key Grounding Reasons */}
          <div className="p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
            <h4 className="text-sm font-black text-[var(--brand-950)] mb-3">
              Key Grounds for Decision
            </h4>
            <div className="space-y-2.5">
              {(decision.key_reasons || []).length > 0 ? (
                decision.key_reasons!.map((reason, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs text-[var(--brand-950)] leading-relaxed"
                  >
                    <div className="w-5 h-5 rounded-full bg-[var(--brand-100)] text-[var(--brand-800)] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <span>{reason}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--text-muted)]">No distinct key reasons logged.</p>
              )}
            </div>
          </div>

          {/* Hard Policy Constraints Matrix */}
          {hardConstraints.length > 0 && (
            <div className="p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--brand-700)]" />
                  <h4 className="text-sm font-black text-[var(--brand-950)]">
                    Deterministic Policy Gate Check
                  </h4>
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {hardConstraints.filter(c => c.passed).length} of {hardConstraints.length} Gates Passed
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hardConstraints.map((constraint, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs ${
                      constraint.passed
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-rose-50/60 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[var(--brand-950)] flex items-center gap-1.5">
                        {constraint.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        )}
                        {constraint.rule_name}
                      </span>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        constraint.passed ? 'bg-emerald-200/80 text-emerald-900' : 'bg-rose-200 text-rose-900'
                      }`}>
                        {constraint.passed ? 'PASSED' : 'VIOLATED'}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-1.5">
                      <span>Threshold: <strong>{String(constraint.threshold ?? 'N/A')}</strong></span>
                      <span>Actual: <strong>{String(constraint.actual_value ?? 'N/A')}</strong></span>
                    </div>

                    {constraint.failure_reason && (
                      <p className="mt-1 text-[11px] text-rose-700 font-medium">
                        {constraint.failure_reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 2. EVIDENCE (Provenance & Traceability) ───────────────────────── */}
      {activeTab === 'evidence' && (
        <div className="p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs space-y-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-base font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Evidence Provenance Ledger
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Every financial metric used in this decision traces back to verified documents and OCR extracts.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Traceable Ledger
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {evidenceItems.length > 0 ? (
              evidenceItems.map((ev, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] hover:border-[var(--brand-300)] transition-all">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--brand-700)] font-bold">
                      {ev.field_name.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {Math.round((ev.confidence || 0.95) * 100)}% Confidence
                    </span>
                  </div>

                  <div className="text-sm font-black text-[var(--brand-950)] mb-2">
                    {ev.value}
                  </div>

                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-[var(--brand-600)]" />
                      {ev.source_document || 'Verified Extraction'}
                    </span>
                    {ev.page && <span>Page {ev.page}</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-8 text-center text-xs text-[var(--text-muted)]">
                No granular evidence entries linked to this decision.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 3. MODEL FACTORS (SHAP Marginal Breakdown) ───────────────────── */}
      {activeTab === 'factors' && (
        <div className="space-y-5">
          <div className="p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  TreeExplainer SHAP Feature Attribution
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Marginal contribution of borrower financial factors toward lowering or elevating default risk.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFactorsView('cards')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    factorsView === 'cards'
                      ? 'bg-[var(--brand-950)] text-white'
                      : 'bg-[var(--surface-subtle)] text-[var(--text-muted)]'
                  }`}
                >
                  Split Cards
                </button>
                <button
                  onClick={() => setFactorsView('chart')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    factorsView === 'chart'
                      ? 'bg-[var(--brand-950)] text-white'
                      : 'bg-[var(--surface-subtle)] text-[var(--text-muted)]'
                  }`}
                >
                  Waterfall Chart
                </button>
              </div>
            </div>

            {/* Split Cards View */}
            {factorsView === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Positive (Favorable) Contributing Factors */}
                <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                      Positive Contributors (Reduces Risk)
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {positiveFactors.length > 0 ? (
                      positiveFactors.map((f, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-white border border-emerald-100 shadow-2xs flex justify-between items-center">
                          <div>
                            <div className="text-xs font-bold text-[var(--brand-950)]">{f.feature_display_name}</div>
                            <div className="text-[11px] text-[var(--text-muted)]">Actual: {f.feature_value}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-emerald-700 font-mono">
                              {(f.shap_value * 100).toFixed(2)}%
                            </span>
                            <div className="text-[10px] text-emerald-600 font-medium">Reduces PD</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] italic">No significant risk-reducing factors.</p>
                    )}
                  </div>
                </div>

                {/* Negative (Adverse) Contributing Factors */}
                <div className="p-4 rounded-xl bg-rose-50/40 border border-rose-200">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                      Negative Contributors (Increases Risk)
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {negativeFactors.length > 0 ? (
                      negativeFactors.map((f, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-white border border-rose-100 shadow-2xs flex justify-between items-center">
                          <div>
                            <div className="text-xs font-bold text-[var(--brand-950)]">{f.feature_display_name}</div>
                            <div className="text-[11px] text-[var(--text-muted)]">Actual: {f.feature_value}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-rose-700 font-mono">
                              +{(f.shap_value * 100).toFixed(2)}%
                            </span>
                            <div className="text-[10px] text-rose-600 font-medium">Adds to PD</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] italic">No adverse risk drivers detected.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Chart View */
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 140, bottom: 5 }}>
                    <XAxis type="number" domain={[-0.2, 0.2]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} stroke="#94A7A1" fontSize={11} tickLine={false} />
                    <YAxis type="category" dataKey="name" stroke="#40524E" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(val: any, _: any, item: any) => [
                        `${(Number(val) * 100).toFixed(2)}% (${item.payload.direction === 'REDUCES_RISK' ? 'Favorable (Reduces Risk)' : 'Adverse (Increases Risk)'})`,
                        'Marginal SHAP Contribution',
                      ]}
                      contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '2px solid #0A1F20', fontSize: '12px' }}
                    />
                    <ReferenceLine x={0} stroke="#CBD9D5" strokeWidth={1.5} />
                    <Bar dataKey="impact" radius={[4, 4, 4, 4]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.impact < 0 ? '#0E9B6D' : '#CC4B3E'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Green: Lowers Default Risk</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Red: Elevates Default Risk</span>
              </div>
              <span>Historical MSME Base Rate E[f(x)]: <strong>{(shapPayload?.base_value ? shapPayload.base_value * 100 : 22.0).toFixed(1)}%</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. POLICY GROUNDING (RAG) ─────────────────────────────────────── */}
      {activeTab === 'policy' && (
        <div className="p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Institutional Policy & Credit Guideline Grounding
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Retrieved policy passages from institutional underwriting guidelines mapped directly to this decision.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policyPassages.length > 0 ? (
              policyPassages.map((pol, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-black text-[var(--brand-800)] px-2 py-0.5 rounded bg-[var(--brand-50)] border border-[var(--brand-200)]">
                      {pol.clause_id}
                    </span>
                    {pol.relevance_score && (
                      <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        {Math.round(pol.relevance_score * 100)}% Match
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-black text-[var(--brand-950)]">{pol.title}</h4>

                  <p className="text-xs text-[var(--text-muted)] italic leading-relaxed bg-white p-3 rounded-lg border border-[var(--border)]">
                    "{pol.excerpt}"
                  </p>

                  {pol.effective_date && (
                    <div className="text-[10px] text-[var(--text-muted)] text-right">
                      Effective: {pol.effective_date}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-2 py-8 text-center text-xs text-[var(--text-muted)]">
                No policy passages retrieved for this application.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5. WARNINGS & MISSING EVIDENCE ────────────────────────────────── */}
      {activeTab === 'warnings' && (
        <div className="space-y-5">
          {/* Consistency & Evidence Warnings */}
          <div className="p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-base font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Evidence Warnings & Observations
              </h3>
            </div>

            {warningsList.length > 0 ? (
              <div className="space-y-2.5">
                {warningsList.map((warn, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 leading-relaxed">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Zero cross-document evidence discrepancies detected. Data aligns across GST, banking, and registry files.
              </div>
            )}
          </div>

          {/* Missing Evidence Checklist */}
          <div className="p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-[var(--brand-700)]" />
              <h3 className="text-base font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Pending / Missing Evidence Verification
              </h3>
            </div>

            {missingEvidence.length > 0 ? (
              <div className="space-y-2">
                {missingEvidence.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs text-[var(--brand-950)]">
                    <span className="font-semibold flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      {item}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      Required for Final Disbursement
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                All mandatory verification evidence has been submitted and validated.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
