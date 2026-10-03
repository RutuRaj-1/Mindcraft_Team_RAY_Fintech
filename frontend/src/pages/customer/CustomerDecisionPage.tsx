import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { DecisionRecord, RiskAssessment, SHAPAttribution, CashFlowMetrics } from '../../types';
import { DecisionCard } from '../../components/fintech/DecisionCard';
import { ExplainableDecisionSuite } from '../../components/fintech/ExplainableDecisionSuite';
import { FinancialChart } from '../../components/fintech/FinancialChart';
import { WhatIfSimulatorCard } from '../../components/customer/WhatIfSimulatorCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import confetti from 'canvas-confetti';

export const CustomerDecisionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const journeyId = id || 'jrn_priya_001';

  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [shap, setShap] = useState<SHAPAttribution | null>(null);
  const [cashflow, setCashflow] = useState<CashFlowMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dec, rsk, shp, cf] = await Promise.all([
        api.getDecision(journeyId).catch(() => null),
        api.getRiskAssessment(journeyId).catch(() => null),
        api.getSHAP(journeyId).catch(() => null),
        api.getCashFlowMetrics(journeyId).catch(() => null),
      ]);
      setDecision(dec);
      setRisk(rsk);
      setShap(shp);
      setCashflow(cf);
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
      const [rsk, shp, cf] = await Promise.all([
        api.getRiskAssessment(journeyId).catch(() => null),
        api.getSHAP(journeyId).catch(() => null),
        api.getCashFlowMetrics(journeyId).catch(() => null),
      ]);
      setRisk(rsk);
      setShap(shp);
      setCashflow(cf);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]">
            Module 4: Explainable Decision Engine
          </span>
          <span className="text-xs text-[var(--text-muted)]">Rule Gate + ML + TreeExplainer SHAP + Policy RAG + Evidence Provenance</span>
        </div>
        <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Credit Sanction & Explainability Suite
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Audit the multi-layer decision rationale, inspect marginal risk drivers, and verify institutional policy adherence.
        </p>
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
