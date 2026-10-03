import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { JourneyRecord, DecisionRecord, ConsistencyReport, RiskAssessment } from '../../types';
import { JourneyStepper } from '../../components/fintech/JourneyStepper';
import { DecisionCard } from '../../components/fintech/DecisionCard';
import { RiskBadge } from '../../components/fintech/RiskBadge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { Users, AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight, RefreshCw, Compass } from 'lucide-react';

export const RMCaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const journeyId = id || 'jrn_kavita_002';

  const [journey, setJourney] = useState<JourneyRecord | null>(null);
  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [consistency, setConsistency] = useState<ConsistencyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [jrn, dec, rsk, rep] = await Promise.all([
        api.getJourney(journeyId),
        api.getDecision(journeyId).catch(() => null),
        api.getRiskAssessment(journeyId).catch(() => null),
        api.getConsistencyReport(journeyId).catch(() => null),
      ]);
      setJourney(jrn);
      setDecision(dec);
      setRisk(rsk);
      setConsistency(rep);
    } catch (err: any) {
      setError(err.message || 'Failed to load case detail');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [journeyId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rect" height={120} />
        <Skeleton variant="rect" height={200} />
      </div>
    );
  }

  if (error || !journey) {
    return <ErrorState title="Case Not Found" message={error || 'Could not find case.'} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--fin-blue-bg)] text-[var(--fin-blue)] border border-[var(--fin-blue)]/30">
              RM Underwriting Review
            </span>
            <span className="font-mono text-xs text-[var(--text-muted)]">Journey: {journey.journey_id}</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {journey.intent.business_name}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Turnover: ₹{(journey.intent.annual_turnover / 10000000).toFixed(2)}Cr · Vintage: {journey.intent.vintage_months}m · Requested: ₹{(journey.intent.requested_amount / 100000).toFixed(1)}L
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to={`/risk/cases/${journey.journey_id}`}>
            <Button variant="brutal" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Route to Risk Officer
            </Button>
          </Link>
        </div>
      </div>

      <JourneyStepper currentStage={journey.current_stage} />

      {/* Discrepancy Reconciliation */}
      {consistency && (
        <Card variant={consistency.is_consistent ? 'default' : 'brutal'} padding="md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-[var(--brand-950)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--brand-700)]" /> GSTR-3B vs Bank Statement Reconciliation
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              consistency.is_consistent ? 'bg-[var(--fin-green-bg)] text-[var(--fin-green)]' : 'bg-[var(--fin-coral-bg)] text-[var(--fin-coral)]'
            }`}>
              {consistency.is_consistent ? 'Consistent' : 'Discrepancy Flagged'}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {consistency.summary}
          </p>
        </Card>
      )}

      {/* Underwriting Sanction Decision */}
      {decision && (
        <DecisionCard decision={decision} riskAssessment={risk || undefined} />
      )}
    </div>
  );
};
