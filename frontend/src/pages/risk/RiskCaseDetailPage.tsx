import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { JourneyRecord, DecisionRecord, RiskAssessment, TrustGraph } from '../../types';
import { TrustGraphVisual } from '../../components/risk/TrustGraphVisual';
import { DecisionCard } from '../../components/fintech/DecisionCard';
import { AuditTimeline } from '../../components/fintech/AuditTimeline';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { ShieldAlert, AlertTriangle, Network, Compass, ShieldCheck, ArrowRight } from 'lucide-react';

export const RiskCaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const journeyId = id || 'jrn_apex_003';

  const [journey, setJourney] = useState<JourneyRecord | null>(null);
  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [graph, setGraph] = useState<TrustGraph | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);

  // Override form
  const [overrideOutcome, setOverrideOutcome] = useState('CONDITIONAL_APPROVAL');
  const [overrideAmount, setOverrideAmount] = useState(2000000);
  const [reasonCode, setReasonCode] = useState('PROMOTER_ADDITIONAL_COLLATERAL');
  const [notes, setNotes] = useState('Approved with mandatory personal guarantee and unencumbered residential property charge.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [jrn, dec, rsk, grp, aud] = await Promise.all([
        api.getJourney(journeyId),
        api.getDecision(journeyId).catch(() => null),
        api.getRiskAssessment(journeyId).catch(() => null),
        api.getTrustGraph(journeyId).catch(() => null),
        api.getAuditTrail(journeyId).catch(() => []),
      ]);
      setJourney(jrn);
      setDecision(dec);
      setRisk(rsk);
      setGraph(grp);
      setAuditLogs(aud);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [journeyId]);

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.submitOverride(journeyId, {
        new_outcome: overrideOutcome,
        new_approved_amount: overrideAmount,
        reason_code: reasonCode,
        rationale_notes: notes,
      });
      setIsOverrideOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Override failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rect" height={120} />
        <Skeleton variant="rect" height={300} />
      </div>
    );
  }

  if (!journey) {
    return <ErrorState title="Case Not Found" onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--fin-coral-bg)] text-[var(--fin-coral)] border border-[var(--fin-coral)]/30">
              Module 7: Trust Graph & Override
            </span>
            <span className="font-mono text-xs text-[var(--text-muted)]">Journey: {journey.journey_id}</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {journey.intent.business_name}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Turnover: ₹{(journey.intent.annual_turnover / 10000000).toFixed(2)}Cr · Requested: ₹{(journey.intent.requested_amount / 100000).toFixed(1)}L · Status: {journey.status}
          </p>
        </div>

        <Button
          variant="brutal"
          size="sm"
          onClick={() => setIsOverrideOpen(true)}
          leftIcon={<ShieldAlert className="w-4 h-4" />}
        >
          Execute Human Override
        </Button>
      </div>

      {/* Trust Graph */}
      {graph && (
        <Card variant="bordered" padding="md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-[var(--brand-950)] flex items-center gap-2">
              <Network className="w-4 h-4 text-[var(--brand-700)]" /> Financial Trust Graph (Entity & Counterparty Network)
            </h3>
            {graph.circular_trading_detected && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--fin-coral-bg)] text-[var(--fin-coral)] border border-[var(--fin-coral)]/30 animate-pulse">
                CIRCULAR TRADING FLAGGED
              </span>
            )}
          </div>
          <TrustGraphVisual graph={graph} />
        </Card>
      )}

      {/* Decision */}
      {decision && (
        <DecisionCard decision={decision} riskAssessment={risk || undefined} />
      )}

      {/* Audit Trail */}
      <Card variant="bordered" padding="md">
        <h3 className="text-sm font-black text-[var(--brand-950)] mb-3 flex items-center gap-2">
          <Compass className="w-4 h-4 text-[var(--brand-700)]" /> Cryptographic Audit Ledger
        </h3>
        <AuditTimeline events={auditLogs} />
      </Card>

      {/* Human Override Modal */}
      <Modal
        isOpen={isOverrideOpen}
        onClose={() => setIsOverrideOpen(false)}
        title="Institutional Underwriter Override"
        subtitle="Override decisions are cryptographically recorded and feed into active learning calibration"
        maxWidth="lg"
      >
        <form onSubmit={handleApplyOverride} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
              New Override Verdict
            </label>
            <select
              value={overrideOutcome}
              onChange={(e) => setOverrideOutcome(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-[var(--border)] p-2.5 bg-white text-[var(--brand-950)]"
            >
              <option value="APPROVED">APPROVED (Full Disbursal)</option>
              <option value="CONDITIONAL_APPROVAL">CONDITIONAL APPROVAL (With Covenants)</option>
              <option value="REJECTED">REJECTED (High Default Probability)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
              Adjusted Facility Amount (INR)
            </label>
            <input
              type="number"
              value={overrideAmount}
              onChange={(e) => setOverrideAmount(Number(e.target.value))}
              className="w-full text-xs font-bold rounded-xl border border-[var(--border)] p-2.5"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
              Reason Code
            </label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-[var(--border)] p-2.5 bg-white"
            >
              <option value="PROMOTER_ADDITIONAL_COLLATERAL">Additional Promoter Collateral Pledged</option>
              <option value="STRONG_INDUSTRY_TAILWINDS">Strong Industry Sector Tailwinds</option>
              <option value="REPUTED_BUYER_TIEUP">Verified Reputed Institutional Buyer Offtake</option>
              <option value="FRAUD_NETWORK_CONFIRMED">Adverse Shell Corporation Link Confirmed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
              Underwriting Synthesis Rationale Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs rounded-xl border border-[var(--border)] p-2.5"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsOverrideOpen(false)}>
              Cancel
            </Button>
            <Button variant="brutal" size="sm" type="submit" isLoading={isSubmitting}>
              Apply & Co-Sign Override
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
