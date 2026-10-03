import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MetricCard } from '../../components/fintech/MetricCard';
import { NextActionCard } from '../../components/fintech/NextActionCard';
import { JourneyStepper } from '../../components/fintech/JourneyStepper';
import { Button } from '../../components/ui/Button';
import { PlusCircle, FileText, ArrowRight, ShieldCheck, Clock, TrendingUp, Sparkles, BarChart2 } from 'lucide-react';

export const CustomerDashboardPage: React.FC = () => {
  const { persona, activeJourneyId } = useAuth();

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
          value="885 / 1000"
          benchmark="Tier 1 Low Risk"
          status="info"
          delta={{ value: "+35 pts", isPositive: true, label: "after GST check" }}
          icon={<ShieldCheck className="w-4 h-4 text-[var(--brand-700)]" />}
        />
        <MetricCard
          label="Operating Cash Runway"
          value="45 Days"
          benchmark="Burn: ₹12.5k / day"
          status="info"
          icon={<Clock className="w-4 h-4 text-[var(--fin-blue)]" />}
        />
        <MetricCard
          label="Verified Documents"
          value="4 / 4 Verified"
          benchmark="SHA-256 Provenance"
          status="success"
          icon={<FileText className="w-4 h-4 text-[var(--fin-green)]" />}
        />
      </div>

      {/* Recommended Next Action */}
      <NextActionCard
        action={{
          action_id: 'act_001',
          action_type: 'OFFER_ACCEPTANCE',
          title: 'Review & Sign Sanction Letter',
          description: 'Your ₹15L working capital facility has completed automated underwriting with zero policy exceptions. Complete digital acceptance to initiate account activation.',
          priority: 1,
          cta_label: 'View Sanction & Accept',
          safe_guardrail_status: 'SAFE',
          safety_confidence: 0.98,
        }}
        onExecute={() => window.location.href = `/customer/decision/${activeJourneyId}`}
      />

      {/* Active Journey Progress Stepper */}
      <JourneyStepper currentStage="EXPLAINABLE_DECISION" />

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
            <span className="text-[10px] font-bold uppercase text-[var(--fin-blue)]">Module 3</span>
            <h3 className="text-base font-black text-[var(--brand-950)] mt-1">Evidence & OCR Ledger</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Upload bank statements and GSTR-3B filings. Inspect bounding boxes and tamper-proof hashes.
            </p>
          </div>
          <div className="pt-4 flex items-center gap-1.5 text-xs font-bold text-[var(--brand-700)]">
            <span>Manage Evidence</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to={`/customer/cashflow/${activeJourneyId}`}
          className="p-5 rounded-2xl bg-white border border-[var(--border)] hover:border-[var(--brand-950)] hover:shadow-[3px_3px_0px_#0A1F20] transition-all flex flex-col justify-between"
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-[var(--fin-green)]">Module 7</span>
            <h3 className="text-base font-black text-[var(--brand-950)] mt-1">Cash-Flow Intelligence</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Explore 6-month inflow/outflow trends, DSCR, obligation waterfall, seasonality, and cash-flow signals.
            </p>
          </div>
          <div className="pt-4 flex items-center gap-1.5 text-xs font-bold text-[var(--fin-green)]">
            <BarChart2 className="w-3.5 h-3.5" />
            <span>View Cash-Flow Report</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to={`/customer/decision/${activeJourneyId}`}
          className="p-5 rounded-2xl bg-white border border-[var(--border)] hover:border-[var(--brand-950)] hover:shadow-[3px_3px_0px_#0A1F20] transition-all flex flex-col justify-between"
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-[var(--fin-amber)]">Module 4</span>
            <h3 className="text-base font-black text-[var(--brand-950)] mt-1">Decision & What-If Simulator</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              View plain-language sanction reasoning, SHAP attributions, and test counterfactual credit limits.
            </p>
          </div>
          <div className="pt-4 flex items-center gap-1.5 text-xs font-bold text-[var(--brand-700)]">
            <span>Explore Decision</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
    </div>
  );
};
