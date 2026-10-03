import React, { useState } from 'react';
import {
  TrendingUp, FileSearch, Sliders, History, GitFork, MessageSquareCheck,
  ArrowRight, ShieldCheck, Sparkles, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const TrustIntelligenceSection: React.FC = () => {
  const [simLoanAmount, setSimLoanAmount] = useState<number>(20); // in Lakhs
  const [simTenor, setSimTenor] = useState<number>(12); // months

  // Hypothetical scenario calculation
  const estimatedEmi = Math.round((simLoanAmount * 100000 * (1 + 0.12 * (simTenor / 12))) / simTenor);
  const hypotheticalDscr = (320000 / (estimatedEmi * 12)).toFixed(2);

  const features = [
    {
      title: 'Cash-Flow Intelligence',
      badge: 'Inflows & Volatility',
      desc: 'Deep inspection of recurring debit vs credit patterns, average minimum daily balance, and seasonal revenue volatility.',
      icon: <TrendingUp className="w-5 h-5 text-[#1687F7]" />,
      pill: 'Scenario Simulation',
    },
    {
      title: 'Evidence Provenance',
      badge: 'Source Traceability',
      desc: 'Every extracted metric is bidirectionally linked to exact page coordinates within certified GST, ITR, and bank PDFs.',
      icon: <FileSearch className="w-5 h-5 text-[#0F4C81]" />,
      pill: 'Audit Trail',
    },
    {
      title: 'What-If Simulator',
      badge: 'Counterfactual Analysis',
      desc: 'Evaluate hypothetical loan scenarios, interest variations, or reduced collateral margins without mutating live records.',
      icon: <Sliders className="w-5 h-5 text-[#12B8C8]" />,
      pill: 'Illustrative',
    },
    {
      title: 'Decision Replay',
      badge: 'Event Chronology',
      desc: 'Reconstruct the precise sequence of evidence submissions, rule checks, and model evaluations that produced the recommendation.',
      icon: <History className="w-5 h-5 text-[#6A49C6]" />,
      pill: 'Explainability',
    },
    {
      title: 'Financial Trust Graph',
      badge: 'Entity Relationships',
      desc: 'Construct a graph of buyers, suppliers, directors, and accounts to pinpoint circular invoices and hidden ownership.',
      icon: <GitFork className="w-5 h-5 text-[#22C98A]" />,
      pill: 'Fraud Prevention',
    },
    {
      title: 'Human Feedback Loop',
      badge: 'Active Calibration',
      desc: 'Systematically logs underwriting overrides and reviewer justifications to train credit policy threshold updates.',
      icon: <MessageSquareCheck className="w-5 h-5 text-[#C98A10]" />,
      pill: 'Continuous Learning',
    },
  ];

  return (
    <section id="trust-intelligence" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#12B8C8]">
            Multi-Dimensional Trust Diagnostics
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B1F3A] tracking-tight leading-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Beyond risk scores.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0F4C81] via-[#1687F7] to-[#12B8C8]">
              Understand financial trust.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-[#475569] leading-relaxed pt-1">
            Creditworthiness cannot be reduced to a single three-digit number. FinFlow AI synthesizes cash flow vitality, entity relationships, and evidence provenance into transparent trust intelligence.
          </p>
        </div>

        {/* 6 Feature Cards Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    {feat.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-[#0F4C81] border border-[#E2E8F0]">
                    {feat.pill}
                  </span>
                </div>

                <h3 className="text-base font-black text-[#0B1F3A]">
                  {feat.title}
                </h3>
                <span className="text-[11px] font-bold text-[#1687F7] block mt-0.5">
                  {feat.badge}
                </span>

                <p className="text-xs text-[#475569] mt-2.5 leading-relaxed">
                  {feat.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#22C98A]" />
                  <span>Auditable Node</span>
                </span>
                <span className="font-semibold text-[#0F4C81]">Active in v2.1</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Interactive What-If Scenario Simulator Card ── */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-[#F8FAFC] border-2 border-[#0B1F3A] shadow-[6px_6px_0px_#0B1F3A]">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-[#E2E8F0]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#FEF3D9] text-[#C98A10] border border-[#C98A10]/30">
                  Scenario Simulation · Illustrative Only
                </span>
                <span className="text-xs text-[#64748B]">Zero Live Mutation</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#0B1F3A] mt-2">
                Interactive What-If Affordability Simulator
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] mt-1">
                Explore how changing ticket size and tenor affects borrower Debt-Service Coverage (DSCR) and projected cash-flow health.
              </p>
            </div>

            <Link
              to="/customer/apply"
              className="px-5 py-2.5 rounded-xl bg-[#0B1F3A] hover:bg-[#0F4C81] text-white text-xs font-bold uppercase tracking-wider shrink-0 transition-colors shadow-xs"
            >
              Test In Sandbox
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Sliders */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#0B1F3A] mb-2">
                  <span>Simulated Loan Request:</span>
                  <span className="font-mono text-sm text-[#1687F7]">₹{simLoanAmount} Lakhs</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={simLoanAmount}
                  onChange={(e) => setSimLoanAmount(Number(e.target.value))}
                  className="w-full accent-[#0F4C81] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1">
                  <span>₹5L</span>
                  <span>₹25L</span>
                  <span>₹50L</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#0B1F3A] mb-2">
                  <span>Repayment Tenor:</span>
                  <span className="font-mono text-sm text-[#1687F7]">{simTenor} Months</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="36"
                  step="6"
                  value={simTenor}
                  onChange={(e) => setSimTenor(Number(e.target.value))}
                  className="w-full accent-[#0F4C81] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1">
                  <span>6 Mo</span>
                  <span>18 Mo</span>
                  <span>36 Mo</span>
                </div>
              </div>
            </div>

            {/* Results Preview */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-white border border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#F1F5F9]">
                <span className="text-[#64748B] font-medium">Hypothetical Monthly EMI</span>
                <span className="text-base font-black text-[#0B1F3A]">₹{estimatedEmi.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#F1F5F9]">
                <span className="text-[#64748B] font-medium">Simulated DSCR</span>
                <span
                  className={`text-base font-black ${
                    Number(hypotheticalDscr) >= 1.25 ? 'text-[#22C98A]' : 'text-[#CC4B3E]'
                  }`}
                >
                  {hypotheticalDscr}x {Number(hypotheticalDscr) >= 1.25 ? '(Viable)' : '(Strained)'}
                </span>
              </div>
              <div className="text-[10px] text-[#94A3B8] leading-tight">
                * Illustrative calculation based on demo benchmark parameters. Does not constitute an actual sanction or loan offer.
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
