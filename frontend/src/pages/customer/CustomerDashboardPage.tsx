import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { NextBestActionsResponse, NextBestActionItem, JourneyStage } from '../../types';
import { MetricCard } from '../../components/fintech/MetricCard';
import { NextActionCard } from '../../components/fintech/NextActionCard';
import { JourneyStepper } from '../../components/fintech/JourneyStepper';
import { Button } from '../../components/ui/Button';
import { PlusCircle, FileText, ArrowRight, TrendingUp } from 'lucide-react';

export const CustomerDashboardPage: React.FC = () => {
  const { persona, activeJourneyId } = useAuth();
  const navigate = useNavigate();

  const [nbaResponse, setNbaResponse] = useState<NextBestActionsResponse | null>(null);
  const [currentStage, setCurrentStage] = useState<JourneyStage>('EXPLAINABLE_DECISION');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [nbaData, journeyData] = await Promise.all([
          api.getNextBestActions(activeJourneyId, 'CUSTOMER').catch(() => null),
          api.getJourney(activeJourneyId).catch(() => null),
        ]);

        if (isMounted) {
          if (nbaData) setNbaResponse(nbaData);
          if (journeyData?.current_stage) setCurrentStage(journeyData.current_stage);
        }
      } catch (err) {
        console.warn('Dashboard NBA load warning:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [activeJourneyId]);

  const handleExecuteAction = (action: NextBestActionItem) => {
    const actType = (action.recommendedAction || action.action_type || '').toLowerCase();
    if (actType.includes('upload') || actType.includes('document')) {
      navigate(`/customer/documents/${activeJourneyId}`);
    } else if (actType.includes('explanation')) {
      navigate(`/customer/decision/${activeJourneyId}`);
    } else if (actType.includes('accept') || actType.includes('sanction') || actType.includes('sign')) {
      navigate(`/customer/decision/${activeJourneyId}`);
    } else if (actType.includes('intent') || actType.includes('apply')) {
      navigate('/customer/apply');
    } else {
      navigate(`/customer/journey/${activeJourneyId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--fin-green-bg)] text-[var(--fin-green)] border border-[var(--fin-green)]/30">
              Active SME Borrower
            </span>
            <span className="text-xs text-[var(--text-muted)]">CIN: U17111MH2020PTC334455</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Welcome back, {persona.name}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {persona.organization} · Working Capital Facility & Live Underwriting
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/customer/apply">
            <Button variant="brutal" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
              Apply for New Facility
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Pre-Approved Limit"
          value="₹15.00 Lakhs"
          benchmark="11.5% reducing interest"
          status="success"
          delta={{ value: "+25%", isPositive: true, label: "from last quarter" }}
          icon={<TrendingUp className="w-4 h-4 text-[var(--fin-green)]" />}
        />
        <MetricCard
          label="FinFlow Trust Score"
          value="780 / 1000"
          benchmark="Prime MSME Tier"
          status="success"
          delta={{ value: "+30 pts", isPositive: true, label: "via GST reconciliation" }}
          icon={<TrendingUp className="w-4 h-4 text-[var(--brand-700)]" />}
        />
        <MetricCard
          label="Debt Service Coverage"
          value="1.45x DSCR"
          benchmark="Minimum 1.25x policy"
          status="success"
          icon={<TrendingUp className="w-4 h-4 text-[var(--brand-800)]" />}
        />
        <MetricCard
          label="Verified Documents"
          value="4 / 4 Verified"
          benchmark="SHA-256 Provenance"
          status="success"
          icon={<FileText className="w-4 h-4 text-[var(--fin-green)]" />}
        />
      </div>

      {/* Recommended Next Best Action with Single Primary CTA */}
      <NextActionCard
        response={nbaResponse || undefined}
        action={nbaResponse?.primary_action || {
          action_id: 'act_default',
          action_type: 'ACCEPT_CONFIGURED_NEXT_STEP',
          recommendedAction: 'accept configured next step',
          title: 'Review & Sign Sanction Letter',
          description: 'Your ₹15L working capital facility has completed automated underwriting with zero policy exceptions. Complete digital acceptance to initiate account activation.',
          priority: 1,
          cta_label: 'View Sanction & Accept',
          safe_guardrail_status: 'SAFE',
          safety_confidence: 0.98,
          actor: 'CUSTOMER',
          estimatedImpact: 'Finalizes credit facility and prepares disbursement mandate',
        }}
        onExecute={handleExecuteAction}
      />

      {/* Active Journey Progress Stepper */}
      <JourneyStepper currentStage={currentStage} />

      {/* Navigation Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Link
          to={`/customer/journey/${activeJourneyId}`}
          className="p-5 rounded-2xl bg-white border border-[var(--border)] hover:border-[var(--brand-950)] hover:shadow-[3px_3px_0px_#0A1F20] transition-all flex flex-col justify-between"
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-[var(--brand-700)]">Module 2</span>
            <h3 className="text-base font-black text-[var(--brand-950)] mt-1">Live Journey State</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Track finite state machine progress, time-in-stage metrics, and automated milestones.
            </p>
          </div>
          <div className="pt-4 flex items-center gap-1.5 text-xs font-bold text-[var(--brand-700)]">
            <span>Inspect Journey</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to={`/customer/documents/${activeJourneyId}`}
          className="p-5 rounded-2xl bg-white border border-[var(--border)] hover:border-[var(--brand-950)] hover:shadow-[3px_3px_0px_#0A1F20] transition-all flex flex-col justify-between"
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-[var(--brand-700)]">Module 3</span>
            <h3 className="text-base font-black text-[var(--brand-950)] mt-1">Document Evidence</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Upload bank statements, GST-3B returns, and verify extraction provenance.
            </p>
          </div>
          <div className="pt-4 flex items-center gap-1.5 text-xs font-bold text-[var(--brand-700)]">
            <span>Evidence Locker</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to={`/customer/cashflow/${activeJourneyId}`}
          className="p-5 rounded-2xl bg-white border border-[var(--border)] hover:border-[var(--brand-950)] hover:shadow-[3px_3px_0px_#0A1F20] transition-all flex flex-col justify-between"
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-[var(--brand-700)]">Module 7</span>
            <h3 className="text-base font-black text-[var(--brand-950)] mt-1">Cash-Flow Intelligence</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Inspect monthly inflow volatility, recurring obligations, and DSCR buffer calculations.
            </p>
          </div>
          <div className="pt-4 flex items-center gap-1.5 text-xs font-bold text-[var(--brand-700)]">
            <span>Explore Cash-Flow</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to={`/customer/decision/${activeJourneyId}`}
          className="p-5 rounded-2xl bg-white border border-[var(--border)] hover:border-[var(--brand-950)] hover:shadow-[3px_3px_0px_#0A1F20] transition-all flex flex-col justify-between"
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-[var(--brand-700)]">Module 4</span>
            <h3 className="text-base font-black text-[var(--brand-950)] mt-1">Explainable Sanction</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Review transparent sanction terms, marginal SHAP risk drivers, and policy RAG citations.
            </p>
          </div>
          <div className="pt-4 flex items-center gap-1.5 text-xs font-bold text-[var(--brand-700)]">
            <span>View Sanction Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
    </div>
  );
};
