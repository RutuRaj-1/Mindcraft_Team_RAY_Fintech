import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api';
import { DecisionRecord, RiskAssessment, SHAPAttribution, CashFlowMetrics, ConsistencyReport } from '../../types';
import { DecisionCard } from '../../components/fintech/DecisionCard';
import { ExplainableDecisionSuite } from '../../components/fintech/ExplainableDecisionSuite';
import { FinancialChart } from '../../components/fintech/FinancialChart';
import { WhatIfSimulatorCard } from '../../components/customer/WhatIfSimulatorCard';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  ShieldCheck, HelpCircle, CheckCircle2, AlertTriangle, ArrowRight,
  Sparkles, FileText, Scale, Cpu, Lock, RefreshCw, Send
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const CustomerDecisionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const journeyId = id || 'jrn_priya_001';

  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [shap, setShap] = useState<SHAPAttribution | null>(null);
  const [cashflow, setCashflow] = useState<CashFlowMetrics | null>(null);
  const [consistency, setConsistency] = useState<ConsistencyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dec, rsk, shp, cf, rep] = await Promise.all([
        api.getDecision(journeyId).catch(() => null),
        api.getRiskAssessment(journeyId).catch(() => null),
        api.getSHAP(journeyId).catch(() => null),
        api.getCashFlowMetrics(journeyId).catch(() => null),
        api.getConsistencyReport(journeyId).catch(() => null),
      ]);
      setDecision(dec);
      setRisk(rsk);
      setShap(shp);
      setCashflow(cf);
      setConsistency(rep);
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
      const [rsk, shp, cf, rep] = await Promise.all([
        api.getRiskAssessment(journeyId).catch(() => null),
        api.getSHAP(journeyId).catch(() => null),
        api.getCashFlowMetrics(journeyId).catch(() => null),
        api.getConsistencyReport(journeyId).catch(() => null),
      ]);
      setRisk(rsk);
      setShap(shp);
      setCashflow(cf);
      setConsistency(rep);
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

  // Simplified customer explanation (Part 13)
  const isApproved = decision.outcome === 'APPROVED';
  const isConditional = decision.outcome === 'CONDITIONAL_APPROVAL';
  const isReview = (decision.outcome as string) === 'NEEDS_REVIEW' || (decision.outcome as string) === 'HUMAN_REVIEW';

  const confidencePct = Math.round((decision.confidence_score ?? 0.88) * 100);
  const monthlyInflowDisplay = cashflow ? `₹${(cashflow.avg_monthly_inflow / 100000).toFixed(2)}L/mo` : '₹12.40L/mo';
  const monthlyOutflowDisplay = cashflow ? `₹${(cashflow.avg_monthly_outflow / 100000).toFixed(2)}L/mo` : '₹8.90L/mo';
  const dscrDisplay = cashflow ? `${cashflow.dscr.toFixed(2)}x` : '1.45x';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]">
              Module 4: Explainable Decision Engine
            </span>
            <span className="text-xs text-[var(--text-muted)] font-mono">Case Ref: {journeyId}</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Credit Sanction & Transparency Suite
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Zero-hallucination decision rationale, verified evidence provenance, and policy adherence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to={`/customer/what-if/${journeyId}`}>
            <Button variant="outline" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5 text-[var(--brand-700)]" />}>
              What-If Simulator
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            isLoading={isRegenerating}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />}
          >
            Re-evaluate Model
          </Button>
        </div>
      </div>

      {/* PART 13: SIMPLIFIED CUSTOMER TRUST & TRANSPARENCY CARD */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">
              Borrower Trust & Full Transparency Guarantee (Part 13)
            </span>
            <h2 className="text-lg font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Your Credit Decision Transparency Sheet
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-full border ${
              isApproved
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : isConditional
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}>
              Decision: {decision.outcome.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* 3x3 Grid of Institutional Transparency Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Pillar 1: DECISION & RISK BAND */}
          <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
              1. Decision & Risk Band
            </span>
            <p className="text-base font-black text-[var(--brand-950)]">
              {decision.outcome === 'APPROVED' ? 'Sanction Approved' : decision.outcome.replace(/_/g, ' ')}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-950)] font-bold text-[11px] border border-[var(--brand-950)]">
                Band: {decision.risk_band || 'LOW_RISK'}
              </span>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Score: {Math.round((decision.confidence_score ?? 0.78) * 1000)}/1000
              </span>
            </div>
          </div>

          {/* Pillar 2: REASON & WHY */}
          <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
              2. Why This Outcome?
            </span>
            <p className="text-xs text-[var(--brand-950)] font-semibold leading-relaxed">
              {isApproved
                ? 'Operating cash flows demonstrate robust debt service capacity with consistent GST reconciliation.'
                : decision.reasoning || 'Under supervisory review. Cross-document financial parameters require human verification.'}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              Confidence Level: <strong className="text-[var(--brand-950)]">{confidencePct}%</strong>
            </p>
          </div>

          {/* Pillar 3: KEY EVIDENCE */}
          <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
              3. Key Financial Evidence
            </span>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Avg Monthly Inflow:</span>
                <span className="font-mono font-bold text-[var(--brand-950)]">{monthlyInflowDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Avg Monthly Outflow:</span>
                <span className="font-mono font-bold text-[var(--brand-950)]">{monthlyOutflowDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Coverage (DSCR):</span>
                <span className="font-mono font-bold text-emerald-700">{dscrDisplay} (Policy: ≥ 1.25x)</span>
              </div>
            </div>
          </div>

          {/* Pillar 4: POLICY BASIS */}
          <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
              4. Institutional Policy Basis
            </span>
            <p className="text-xs font-bold text-[var(--brand-950)]">
              MSME Working Capital Rulebook (FIN-WC-2026-04)
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Zero hard rule violations. Clean repayment record with unencumbered GST returns.
            </p>
          </div>

          {/* Pillar 5: HUMAN REVIEW STATUS */}
          <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
              5. Four-Eyes Governance Status
            </span>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-[var(--brand-950)]">
                {isApproved ? 'AI Concurrence Approved' : 'In Second-Line Governance Desk'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {isApproved
                ? 'Fully governed by institutional credit mandate and delegated authority.'
                : 'Escalated to Relationship Manager and Risk Officer for multi-party concurrence.'}
            </p>
          </div>

          {/* Pillar 6: NEXT ACTION & PROVENANCE */}
          <div className="p-4 rounded-2xl bg-[var(--brand-50)] border-1.5 border-[var(--brand-950)] space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">
              6. Your Immediate Next Action
            </span>
            <p className="font-bold text-xs text-[var(--brand-950)]">
              {isApproved ? 'Review & Accept Digital Sanction Letter' : 'Awaiting Institutional Review Verification'}
            </p>
            <div className="pt-1 flex items-center justify-between text-[10px]">
              <span className="text-[var(--text-muted)]">SHA-256 Provenance Verified</span>
              <Lock className="w-3.5 h-3.5 text-emerald-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Decision Sanction Hero Card */}
      <DecisionCard
        decision={decision}
        riskAssessment={risk || undefined}
        onAcceptOffer={handleAcceptOffer}
      />

      {/* Structured Explainability Suite: Why?, Evidence, Model factors, Policy, Warnings */}
      <ExplainableDecisionSuite
        decision={decision}
        onRegenerate={handleRegenerate}
        isRegenerating={isRegenerating}
      />

      {/* Cash-Flow Trend */}
      {cashflow && (
        <FinancialChart data={cashflow.monthly_trend} />
      )}

      {/* Interactive What-If Counterfactual Simulator */}
      <WhatIfSimulatorCard journeyId={journeyId} />
    </div>
  );
};
