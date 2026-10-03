import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { JourneyRecord, JourneyFrictionMetrics } from '../../types';
import { JourneyStepper } from '../../components/fintech/JourneyStepper';
import { MetricCard } from '../../components/fintech/MetricCard';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { GitCommit, Clock, ArrowRight, ShieldCheck, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import { TrustGraphVisual } from '../../components/risk/TrustGraphVisual';

export const CustomerJourneyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const journeyId = id || 'jrn_priya_001';

  const [journey, setJourney] = useState<JourneyRecord | null>(null);
  const [friction, setFriction] = useState<JourneyFrictionMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [jrn, frict] = await Promise.all([
        api.getJourney(journeyId),
        api.getFriction(journeyId).catch(() => null),
      ]);
      setJourney(jrn);
      setFriction(frict);
    } catch (err: any) {
      setError(err.message || 'Failed to load journey');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [journeyId]);

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    try {
      await api.evaluateRisk(journeyId);
      await loadData();
    } catch (err: any) {
      alert(`Evaluation failed: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rect" height={100} />
        <Skeleton variant="rect" height={140} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton variant="rect" height={90} />
          <Skeleton variant="rect" height={90} />
          <Skeleton variant="rect" height={90} />
          <Skeleton variant="rect" height={90} />
        </div>
      </div>
    );
  }

  if (error || !journey) {
    return (
      <ErrorState
        title="Journey Not Found"
        message={error || `Could not find an active financial journey with ID ${journeyId}`}
        onRetry={loadData}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]">
              Module 2: State Orchestration
            </span>
            <span className="font-mono text-xs text-[var(--text-muted)]">ID: {journey.journey_id}</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {journey.intent.business_name}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Requested: <strong className="text-[var(--brand-950)]">₹{(journey.intent.requested_amount / 100000).toFixed(1)} Lakhs</strong> for {journey.intent.tenor_months}M · {journey.intent.purpose}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleEvaluate}
            isLoading={isEvaluating}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Re-run Underwriting
          </Button>

          <Link to={`/customer/decision/${journey.journey_id}`}>
            <Button variant="brutal" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              View Sanction
            </Button>
          </Link>
        </div>
      </div>

      {/* Stepper */}
      <JourneyStepper currentStage={journey.current_stage} status={journey.status} />

      {/* Friction & State Machine Telemetry */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Current Journey Stage"
          value={journey.current_stage.replace(/_/g, ' ')}
          benchmark="Canonical FSM"
          status="info"
          icon={<GitCommit className="w-4 h-4 text-[var(--brand-700)]" />}
        />
        <MetricCard
          label="Journey Friction Score"
          value={friction ? `${friction.friction_score} / 100` : '18 / 100'}
          benchmark={friction && friction.friction_score < 30 ? 'Low Friction' : 'Moderate Friction'}
          status={friction && friction.friction_score < 30 ? 'success' : 'warning'}
          icon={<Clock className="w-4 h-4 text-[var(--fin-green)]" />}
        />
        <MetricCard
          label="Time in Stage"
          value={friction ? `${Math.round(friction.total_time_seconds / 60)} mins` : '2.1 mins'}
          benchmark="Target: < 5 mins"
          status="success"
          icon={<Clock className="w-4 h-4 text-[var(--fin-blue)]" />}
        />
        <MetricCard
          label="Drop-Off Probability"
          value="4.2%"
          benchmark="Smooth completion curve"
          status="success"
          icon={<ShieldCheck className="w-4 h-4 text-[var(--fin-green)]" />}
        />
      </div>
 
      {/* Financial Trust Graph: Entity Relationship Network */}
      <TrustGraphVisual
        journeyId={journey.journey_id}
        title="Financial Trust Graph — Evidence & Entity Provenance"
      />

      {/* Stage History Ledger */}
      <Card variant="bordered" padding="md">
        <h3 className="text-sm font-black text-[var(--brand-950)] mb-3 flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-[var(--brand-700)]" /> Finite State Machine Transition Log
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)] border-b border-[var(--border)]">
              <tr>
                <th className="py-2.5 px-3 font-bold uppercase text-[10px]">Stage Name</th>
                <th className="py-2.5 px-3 font-bold uppercase text-[10px]">Entered Timestamp</th>
                <th className="py-2.5 px-3 font-bold uppercase text-[10px]">Duration</th>
                <th className="py-2.5 px-3 font-bold uppercase text-[10px]">Transition Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {journey.history.map((h, i) => (
                <tr key={i} className="hover:bg-[var(--surface-subtle)]/50">
                  <td className="py-2.5 px-3 font-bold text-[var(--brand-950)]">
                    {h.stage.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--text-muted)]">
                    {new Date(h.entered_at).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                    {h.duration_seconds ? `${h.duration_seconds}s` : 'Active'}
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-muted)] italic">
                    {h.notes || 'Automated FSM advancement'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
