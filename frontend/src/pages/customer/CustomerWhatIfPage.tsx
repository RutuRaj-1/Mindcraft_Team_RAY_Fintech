import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { WhatIfSimulatorCard } from '../../components/customer/WhatIfSimulatorCard';
import { Button } from '../../components/ui/Button';
import { Sparkles, ArrowLeft, ArrowRight, HelpCircle, ShieldCheck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export const CustomerWhatIfPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const journeyId = id || 'jrn_priya_001';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]">
              Step 11 of 13 · Customer Financial Journey
            </span>
            <span className="text-xs font-mono font-bold text-[var(--brand-900)]">Case: {journeyId}</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            What-If Counterfactual Simulator
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Test loan adjustments, observe real-time policy impact, and explore optimal financing configurations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to={`/customer/decision/${journeyId}`}>
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to Sanction Offer
            </Button>
          </Link>
          <Link to={`/customer/journey/${journeyId}`}>
            <Button variant="brutal" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Live Journey Tracker
            </Button>
          </Link>
        </div>
      </div>

      {/* 5-Question Customer Transparency Banner */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">
          Real-Time Customer Transparency
        </span>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
            <p className="font-extrabold text-[var(--brand-950)] uppercase text-[10px]">1. Where am I?</p>
            <p className="text-[var(--text-secondary)] mt-1">Step 11 · Interactive What-If Counterfactual Simulation Chamber.</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
            <p className="font-extrabold text-[var(--brand-950)] uppercase text-[10px]">2. What happened?</p>
            <p className="text-[var(--text-secondary)] mt-1">Baseline decision was generated based on verified GST and bank statements.</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
            <p className="font-extrabold text-[var(--brand-950)] uppercase text-[10px]">3. Why?</p>
            <p className="text-[var(--text-secondary)] mt-1">Simulate how adjusting tenure or collateral improves pricing before signing.</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
            <p className="font-extrabold text-[var(--brand-950)] uppercase text-[10px]">4. What is required?</p>
            <p className="text-[var(--text-secondary)] mt-1">Adjust facility sliders below and run instant zero-impact counterfactuals.</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--brand-50)] border-1.5 border-[var(--brand-950)]">
            <p className="font-extrabold text-[var(--brand-950)] uppercase text-[10px]">5. What happens next?</p>
            <p className="text-[var(--brand-950)] font-medium mt-1">Accept the optimized parameters and proceed to final digital sanction.</p>
          </div>
        </div>
      </div>

      {/* Simulator Component */}
      <WhatIfSimulatorCard journeyId={journeyId} />
    </div>
  );
};
