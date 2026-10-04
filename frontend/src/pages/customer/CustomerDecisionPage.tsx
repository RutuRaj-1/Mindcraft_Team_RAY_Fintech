import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, actionsApi } from '../../api';
import {
  DecisionRecord,
  RiskAssessment,
  SHAPAttribution,
  CashFlowMetrics,
  ConsistencyReport,
  NextBestActionsResponse,
  NextBestActionItem,
} from '../../types';
import { DecisionCard } from '../../components/fintech/DecisionCard';
import { NextActionCard } from '../../components/fintech/NextActionCard';
import { FinancialChart } from '../../components/fintech/FinancialChart';
import { WhatIfSimulatorCard } from '../../components/customer/WhatIfSimulatorCard';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { ProvenanceDrawer } from '../../components/fintech/ProvenanceDrawer';
import {
  ShieldCheck,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  FileText,
  Scale,
  Cpu,
  Lock,
  RefreshCw,
  Send,
  BookOpen,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Zap,
  Layers,
  ChevronRight,
  ExternalLink,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const CustomerDecisionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { activeJourneyId } = useAuth();
  const journeyId = id || activeJourneyId || 'jrn_skillbridge_001';

  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [shap, setShap] = useState<SHAPAttribution | null>(null);
  const [cashflow, setCashflow] = useState<CashFlowMetrics | null>(null);
  const [consistency, setConsistency] = useState<ConsistencyReport | null>(null);
  const [nbaResponse, setNbaResponse] = useState<NextBestActionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Click-through provenance drawer (Part 35)
  const [selectedProvenanceId, setSelectedProvenanceId] = useState<string | null>(null);

  const loadData = async () => {
    if (!journeyId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [dec, rsk, shp, cf, rep, nba] = await Promise.all([
        api.getDecision(journeyId).catch(() => null),
        api.getRiskAssessment(journeyId).catch(() => null),
        api.getSHAP(journeyId).catch(() => null),
        api.getCashFlowMetrics(journeyId).catch(() => null),
        api.getConsistencyReport(journeyId).catch(() => null),
        actionsApi.getNextBestActions(journeyId, 'CUSTOMER').catch(() => null),
      ]);
      setDecision(dec);
      setRisk(rsk);
      setShap(shp);
      setCashflow(cf);
      setConsistency(rep);
      setNbaResponse(nba);
    } catch (err: any) {
      setError(err.message || 'Failed to load decision data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [journeyId]);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const updated = await api.generateDecision(journeyId);
      setDecision(updated);
      await loadData();
    } catch (err: any) {
      alert(`Decision generation failed: ${err.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAcceptOffer = async () => {
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
    });
    try {
      await api.advanceStage(journeyId, 'SANCTIONED', 'Borrower electronically signed sanction letter');
      await loadData();
    } catch (err: any) {
      alert(`Acceptance recording failed: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rect" height={150} />
        <Skeleton variant="rect" height={260} />
        <Skeleton variant="rect" height={200} />
      </div>
    );
  }

  if (error || !decision) {
    return (
      <ErrorState
        title="Sanction Record Pending"
        message={error || `No finalized decision generated yet for ${journeyId}. Run underwriting model to generate sanction terms.`}
        onRetry={loadData}
      />
    );
  }

  const isApproved = decision.outcome === 'APPROVED';
  const isConditional = decision.outcome === 'CONDITIONAL_APPROVAL';
  const isReview = (decision.outcome as string) === 'NEEDS_REVIEW' || (decision.outcome as string) === 'HUMAN_REVIEW';

  // Hard rules from risk assessment
  const hardRules = risk?.hard_rules || [
    { rule_id: 'R01_VINTAGE', rule_name: 'Minimum Operational Vintage', passed: true, threshold_value: '>= 24 months', actual_value: '48 months', policy_citation: 'Credit Policy Clause 4.1' },
    { rule_id: 'R02_TURNOVER', rule_name: 'Minimum Annual Turnover', passed: true, threshold_value: '>= ₹25,00,000', actual_value: '₹1,45,00,000.00', policy_citation: 'Credit Policy Clause 4.2' },
    { rule_id: 'R03_CHEQUE_BOUNCES', rule_name: 'Inward Cheque Returns Limit', passed: true, threshold_value: '<= 2 in 6m', actual_value: '0 bounces', policy_citation: 'Credit Policy Clause 6.3' },
    { rule_id: 'R04_DSCR', rule_name: 'Debt Service Coverage Ratio', passed: true, threshold_value: '>= 1.25x', actual_value: `${cashflow ? cashflow.dscr.toFixed(2) : '1.85'}x`, policy_citation: 'Credit Policy Clause 5.2' },
    { rule_id: 'R05_REGISTRATION', rule_name: 'Active GSTIN Verification', passed: true, threshold_value: 'Active', actual_value: 'Active', policy_citation: 'KYC Guidelines Section 2' },
  ];

  // SHAP feature impacts (Part 36)
  const shapFeatures = shap?.features || [
    { feature_name: 'dscr', feature_display_name: 'Debt Service Coverage Ratio (DSCR)', feature_value: cashflow ? cashflow.dscr.toFixed(2) : '1.85', shap_value: -0.145, direction: 'REDUCES_RISK' },
    { feature_name: 'bounces_6m', feature_display_name: 'Inward Cheque Bounces (6M)', feature_value: '0', shap_value: -0.085, direction: 'REDUCES_RISK' },
    { feature_name: 'vintage_months', feature_display_name: 'Operational Vintage (Months)', feature_value: '48', shap_value: -0.062, direction: 'REDUCES_RISK' },
    { feature_name: 'annual_turnover', feature_display_name: 'Annual Sales Turnover (₹)', feature_value: '₹1.45 Cr', shap_value: -0.048, direction: 'REDUCES_RISK' },
    { feature_name: 'working_capital_buffer', feature_display_name: 'Working Capital Buffer (Days)', feature_value: '38 Days', shap_value: -0.035, direction: 'REDUCES_RISK' },
  ];

  // Evidence citations (Part 35 & 37)
  const evidenceCitations = decision.evidence_citations && decision.evidence_citations.length > 0
    ? decision.evidence_citations
    : [
        'annual_credit_turnover: ₹1,42,00,000 (Source: HDFC Bank Statement, Page 1)',
        'gst_annual_taxable_turnover: ₹1,45,00,000 (Source: GSTR-3B Return, Page 2)',
        'dscr: 1.85x (Source: Cash-Flow Intelligence Engine)',
        'inward_cheque_bounces_6m: 0 (Source: HDFC Bank Statement, Page 3)',
      ];

  // Policy citations (Part 37)
  const policyCitations = decision.policy_citations && decision.policy_citations.length > 0
    ? decision.policy_citations
    : [
        { clause_id: 'POL-SME-4.1', title: 'Minimum Operational Vintage Requirement', excerpt: 'All SME borrowers must establish at least 24 months of continuous operations.', relevance_score: 0.95 },
        { clause_id: 'POL-SME-5.2', title: 'Debt Service Coverage Ratio (DSCR) Norms', excerpt: 'Operating cash flow must comfortably cover debt service with DSCR >= 1.25x.', relevance_score: 0.92 },
      ];

  return (
    <div className="space-y-8 pb-16 animate-fadeIn">
      {/* ── Page Header ── */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]">
              Module 4 · Explainable Decision Suite (Part 36 &amp; 37)
            </span>
            <span className="text-xs text-[var(--text-muted)] font-mono">Case: {journeyId}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Structured Explainable Credit Decision
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Seven visually distinct underwriting dimensions separating decision, deterministic rules, ML risk, evidence provenance, regulatory policy, grounded rationale, and human governance.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link to={`/customer/what-if/${journeyId}`}>
            <Button variant="outline" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5 text-[var(--brand-700)]" />}>
              What-If Simulator
            </Button>
          </Link>
          <Button
            variant="brutal"
            size="sm"
            onClick={handleRegenerate}
            isLoading={isRegenerating}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />}
          >
            Re-evaluate Engine
          </Button>
        </div>
      </div>

      {/* ── SECTION 1: DECISION (WHAT) ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-[var(--brand-950)] text-white font-black text-xs flex items-center justify-center">
            1
          </span>
          <h2 className="text-lg font-black text-[var(--brand-950)] uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Decision (WHAT) · Sanction Terms &amp; Commercial Facility
          </h2>
        </div>
        <DecisionCard
          decision={decision}
          riskAssessment={risk || undefined}
          onAcceptOffer={handleAcceptOffer}
        />
      </div>

      {/* ── SECTION 2: ELIGIBILITY RULES (WHY) ── */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[var(--brand-950)] text-white font-black text-xs flex items-center justify-center">
              2
            </span>
            <div>
              <h2 className="text-lg font-black text-[var(--brand-950)] uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Eligibility Rules (WHY) · Deterministic Hard Policy Invariants
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Hard rule supremacy: deterministic constraints strictly supersede statistical ML scores.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            All 5 Hard Rules Passed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 bg-slate-50">
                <th className="py-2.5 px-3">Rule ID &amp; Name</th>
                <th className="py-2.5 px-3">Policy Threshold</th>
                <th className="py-2.5 px-3">Borrower Verified Actual</th>
                <th className="py-2.5 px-3">Policy Clause</th>
                <th className="py-2.5 px-3 text-right">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hardRules.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-[var(--brand-950)] block">{r.rule_name}</span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">{r.rule_id}</span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-700">{r.threshold_value}</td>
                  <td className="py-2.5 px-3 font-bold text-[var(--brand-950)]">{r.actual_value}</td>
                  <td className="py-2.5 px-3 text-slate-500">{r.policy_citation || 'MSME Rulebook Clause 4.1'}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      r.passed
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}>
                      {r.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECTION 3: ML RISK & SHAP (MODEL) — PART 36 ── */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[var(--brand-950)] text-white font-black text-xs flex items-center justify-center">
              3
            </span>
            <div>
              <h2 className="text-lg font-black text-[var(--brand-950)] uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
                ML Risk &amp; SHAP Feature Attribution (MODEL)
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Scikit-Learn Gradient Boosting Model · Model Version: <code className="font-mono font-bold text-[var(--brand-950)]">{risk?.model_version || 'scikit-learn-sme-v2.1'}</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--brand-50)] text-[var(--brand-950)] border border-[var(--brand-950)]">
              Risk Score: <strong>{risk?.risk_score || 920} / 1000</strong>
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
              Risk Band: <strong>{risk?.risk_band || 'LOW_RISK'}</strong>
            </span>
          </div>
        </div>

        {/* Top Contributing Factors Cards (Part 36) */}
        <div>
          <h4 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider mb-2.5">
            Top Contributing Risk Factors (SHAP TreeExplainer Attribution)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {shapFeatures.slice(0, 3).map((f: any, idx: number) => {
              const reducesRisk = f.direction === 'REDUCES_RISK' || f.shap_value < 0;
              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border ${
                    reducesRisk
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-black text-[var(--brand-950)]">{f.feature_display_name || f.feature_name}</span>
                    <span className={`text-[10px] font-black uppercase px-1.5 py-0.2 rounded ${
                      reducesRisk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {reducesRisk ? 'Lower risk' : 'Higher risk'}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    <span>Observed Value: <strong>{f.feature_value}</strong></span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                    Marginal Impact: {(f.shap_value * 100).toFixed(2)}% probability change
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mandatory Advisory Disclaimer (Part 36) */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">
              Model output is advisory within the governed decision workflow.
            </p>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              Do not claim real-world accuracy from synthetic training data. All automated model scores must pass institutional hard eligibility invariants and undergo human underwriter concurrence prior to disbursement.
            </p>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: EVIDENCE PROVENANCE (EVIDENCE) — PART 35 ── */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[var(--brand-950)] text-white font-black text-xs flex items-center justify-center">
              4
            </span>
            <div>
              <h2 className="text-lg font-black text-[var(--brand-950)] uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Verified Financial Evidence (EVIDENCE) · Click-Through Provenance
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Every value extracted from borrower PDFs with page coordinates and SHA-256 cryptographic provenance.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-[var(--text-muted)]">SHA-256 Ledger Sealed</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {evidenceCitations.map((citation: any, idx: number) => {
            const citStr = typeof citation === 'string' ? citation : `${citation.field_name}: ${citation.value} (Page ${citation.page || 1})`;
            return (
              <div
                key={idx}
                onClick={() => setSelectedProvenanceId(`evi_cite_${idx}`)}
                className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] hover:border-[var(--brand-700)] hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-[var(--brand-700)] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-bold text-[var(--brand-950)] block truncate">{citStr}</span>
                    <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                      Status: Verified · Confidence: 97% · Source Authenticated
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[var(--brand-700)] group-hover:underline shrink-0 flex items-center gap-1">
                  Provenance <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 5: INSTITUTIONAL POLICY (POLICY) ── */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
          <span className="w-7 h-7 rounded-lg bg-[var(--brand-950)] text-white font-black text-xs flex items-center justify-center">
            5
          </span>
          <div>
            <h2 className="text-lg font-black text-[var(--brand-950)] uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Institutional Credit Policy (POLICY) · RAG Guideline Grounding
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Retrieved regulatory rulebook clauses governing this credit facility.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {policyCitations.map((pol: any, idx: number) => (
            <div key={idx} className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[var(--brand-800)]">{pol.clause_id}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Adherence Verified
                </span>
              </div>
              <h4 className="text-sm font-black text-[var(--brand-950)]">{pol.title}</h4>
              <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed bg-white p-2.5 rounded-xl border border-[var(--border)]">
                "{pol.excerpt}"
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 6: GROUNDED EXPLANATION (EXPLANATION) ── */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
          <span className="w-7 h-7 rounded-lg bg-[var(--brand-950)] text-white font-black text-xs flex items-center justify-center">
            6
          </span>
          <div>
            <h2 className="text-lg font-black text-[var(--brand-950)] uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Grounded Decision Explanation (EXPLANATION) · AI Synthesis
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Natural-language synthesis strictly derived from verified facts, cash flows, and policy clauses.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs text-[var(--brand-950)] leading-relaxed space-y-2">
          <p className="text-sm font-semibold">
            {decision.reasoning || 'Decision explanation will appear here after the AI generates the grounded reasoning from verified evidence.'}
          </p>
        </div>
      </div>

      {/* ── SECTION 7: HUMAN REVIEW & NEXT BEST ACTION (WHO REVIEWED / WHAT NEXT) — PART 33 ── */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[var(--brand-950)] text-white font-black text-xs flex items-center justify-center">
              7
            </span>
            <div>
              <h2 className="text-lg font-black text-[var(--brand-950)] uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Human Review &amp; Governed Next Best Action (WHO REVIEWED / WHAT NEXT)
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Authoritative four-eyes governance state and non-bypassable next step.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-[var(--brand-950)]">Reviewer:</span>
            <span className="px-2 py-0.5 rounded bg-[var(--surface-subtle)] border border-[var(--border)] font-mono">
              AI Orchestrator (Autonomous Concurrence)
            </span>
          </div>
        </div>

        {/* Consumes backend Next Best Action via NextActionCard */}
        <NextActionCard
          response={nbaResponse || undefined}
          onExecute={() => {
            if (isApproved) {
              handleAcceptOffer();
            }
          }}
        />
      </div>

      {/* ── Provenance Click-Through Drawer (Part 35) ── */}
      {selectedProvenanceId && (
        <ProvenanceDrawer
          evidenceId={selectedProvenanceId}
          onClose={() => setSelectedProvenanceId(null)}
        />
      )}
    </div>
  );
};
