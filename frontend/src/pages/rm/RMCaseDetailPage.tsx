import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { JourneyRecord, DecisionRecord, ConsistencyReport, RiskAssessment, HumanReview } from '../../types';
import { JourneyStepper } from '../../components/fintech/JourneyStepper';
import { DecisionCard } from '../../components/fintech/DecisionCard';
import { RiskBadge } from '../../components/fintech/RiskBadge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  Users, AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight,
  RefreshCw, Send, Check, Clock, FileText
} from 'lucide-react';

export const RMCaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const journeyId = id || 'jrn_kavita_002';

  const [journey, setJourney] = useState<JourneyRecord | null>(null);
  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [consistency, setConsistency] = useState<ConsistencyReport | null>(null);
  const [reviews, setReviews] = useState<HumanReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalationSuccess, setEscalationSuccess] = useState(false);
  const [escalationNotes, setEscalationNotes] = useState('');
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [jrn, dec, rsk, rep, revList] = await Promise.all([
        api.getJourney(journeyId),
        api.getDecision(journeyId).catch(() => null),
        api.getRiskAssessment(journeyId).catch(() => null),
        api.getConsistencyReport(journeyId).catch(() => null),
        api.getJourneyReviews(journeyId).catch(() => []),
      ]);
      setJourney(jrn);
      setDecision(dec);
      setRisk(rsk);
      setConsistency(rep);
      setReviews(revList);
    } catch (err: any) {
      setError(err.message || 'Failed to load case detail');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [journeyId]);

  const handleEscalateToRisk = async () => {
    if (!journey) return;
    setIsEscalating(true);
    try {
      await api.startReview(
        journey.journey_id,
        escalationNotes || 'RM First-Line Review completed: Recommended for Second-Line Risk Validation'
      );
      setEscalationSuccess(true);
      setShowEscalateModal(false);
      // Reload reviews
      const updatedReviews = await api.getJourneyReviews(journey.journey_id).catch(() => []);
      setReviews(updatedReviews);
    } catch (err: any) {
      alert(`Escalation error: ${err.message}`);
    } finally {
      setIsEscalating(false);
    }
  };

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

  const activeReview = reviews.find((r) => r.status === 'OPEN' || r.status === 'SUBMITTED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--fin-blue-bg)] text-[var(--fin-blue)] border border-[var(--fin-blue)]/30">
              RM Underwriting Review & Assist
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
          {activeReview ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>In Governance Queue ({activeReview.reviewerRole})</span>
            </div>
          ) : (
            <Button
              variant="brutal"
              size="sm"
              onClick={() => setShowEscalateModal(true)}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Recommend for Risk Approval
            </Button>
          )}
        </div>
      </div>

      {escalationSuccess && (
        <div className="p-4 rounded-2xl bg-[var(--fin-green-bg)] border border-[var(--fin-green)] text-[var(--fin-green)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Check className="w-4 h-4" />
            <span>Case escalated successfully to Second-Line Risk Desk with immutable audit record.</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEscalationSuccess(false)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Escalation Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[var(--brand-950)] shadow-[8px_8px_0px_#0A1F20] max-w-md w-full p-6 space-y-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">
                Four-Eyes Governance Handover
              </span>
              <h3 className="text-lg font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Escalate Case to Risk Officer
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                As Relationship Manager, you are submitting your first-line operational endorsement. The Second-Line Risk Desk will perform independent verification.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--brand-950)]">
                RM Underwriting & Client Visit Notes:
              </label>
              <textarea
                value={escalationNotes}
                onChange={(e) => setEscalationNotes(e.target.value)}
                placeholder="e.g. Conducted site visit at Bhiwandi warehouse; verified GST 3B reconciliation and inventory turn. Recommended for credit sanction."
                className="w-full text-xs p-3 rounded-xl border border-[var(--border)] focus:border-[var(--brand-950)] focus:ring-0 h-24"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEscalateModal(false)}
                disabled={isEscalating}
              >
                Cancel
              </Button>
              <Button
                variant="brutal"
                size="sm"
                onClick={handleEscalateToRisk}
                isLoading={isEscalating}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Submit Handover
              </Button>
            </div>
          </div>
        </div>
      )}

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
