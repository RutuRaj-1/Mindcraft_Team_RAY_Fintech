import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { WhatIfResponse } from '../../types';
import { Sliders, TrendingUp, Zap, CheckCircle2, DollarSign, Calendar, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SimulatorProps {
  journeyId: string;
}

export const WhatIfSimulatorCard: React.FC<SimulatorProps> = ({ journeyId }) => {
  const [revenueDelta, setRevenueDelta] = useState<number>(15);
  const [tenorMonths, setTenorMonths] = useState<number>(12);
  const [collateralAmount, setCollateralAmount] = useState<number>(0);
  const [simulation, setSimulation] = useState<WhatIfResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const runSimulation = async () => {
    setIsLoading(true);
    try {
      const res = await api.simulateWhatIf(journeyId, {
        revenue_delta_pct: revenueDelta,
        tenor_months: tenorMonths,
        buffer_days_delta: revenueDelta > 0 ? 8 : -5,
        collateral_offered_amount: collateralAmount
      });
      setSimulation(res);
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [journeyId, revenueDelta, tenorMonths, collateralAmount]);

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-50)] flex items-center justify-center text-[var(--brand-700)]">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--neutral-900)] tracking-tight">
                Interactive What-If Counterfactual Simulator
              </h3>
              <span className="badge badge-primary text-[10px]">Real-Time ML</span>
            </div>
            <p className="text-xs text-[var(--neutral-500)] mt-0.5">
              Simulate how revenue expansion, extended tenure, or collateral changes optimize your sanction terms.
            </p>
          </div>
        </div>

        <span className="badge badge-success px-3 py-1 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-xs">
          <Zap className="w-3.5 h-3.5" /> Instant Recalibration
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-6 space-y-5 bg-[var(--neutral-50)] p-5 rounded-xl border border-[var(--border-subtle)]">
          {/* Revenue Delta Slider */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-[var(--neutral-700)] mb-2">
              <span>Expected Revenue Variation</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                revenueDelta > 0 ? 'bg-[var(--fin-green-soft)] text-[var(--fin-green)]' : revenueDelta < 0 ? 'bg-[var(--fin-coral-soft)] text-[var(--fin-coral)]' : 'bg-gray-100 text-gray-700'
              }`}>
                {revenueDelta > 0 ? `+${revenueDelta}%` : `${revenueDelta}%`}
              </span>
            </div>
            <input
              type="range"
              min="-25"
              max="35"
              step="5"
              value={revenueDelta}
              onChange={(e) => setRevenueDelta(Number(e.target.value))}
              className="w-full accent-[var(--brand-600)] cursor-pointer h-2 bg-[var(--neutral-200)] rounded-lg"
            />
            <div className="flex justify-between text-[11px] text-[var(--neutral-400)] mt-1.5 font-medium">
              <span>-25% Stress</span>
              <span>Baseline (0%)</span>
              <span>+35% Growth</span>
            </div>
          </div>

          {/* Tenor Selector */}
          <div>
            <label className="block text-xs font-semibold text-[var(--neutral-700)] mb-2">
              Proposed Facility Tenor
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[6, 12, 18, 24].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTenorMonths(t)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    tenorMonths === t
                      ? 'bg-[var(--brand-700)] text-white border-[var(--brand-700)] shadow-xs'
                      : 'bg-white text-[var(--neutral-700)] border-[var(--border-subtle)] hover:bg-[var(--brand-50)] hover:border-[var(--brand-200)]'
                  }`}
                >
                  {t} Months
                </button>
              ))}
            </div>
          </div>

          {/* Collateral Pledge */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-[var(--neutral-700)] mb-2">
              <span>Additional Promoter Collateral</span>
              <span className="font-bold text-[var(--neutral-900)]">₹{(collateralAmount / 100000).toFixed(1)} Lakhs</span>
            </div>
            <input
              type="range"
              min="0"
              max="1500000"
              step="250000"
              value={collateralAmount}
              onChange={(e) => setCollateralAmount(Number(e.target.value))}
              className="w-full accent-[var(--brand-600)] cursor-pointer h-2 bg-[var(--neutral-200)] rounded-lg"
            />
            <div className="flex justify-between text-[11px] text-[var(--neutral-400)] mt-1.5 font-medium">
              <span>Clean / Unsecured (₹0)</span>
              <span>₹7.5L</span>
              <span>₹15L Pledged</span>
            </div>
          </div>
        </div>

        {/* Live Simulation Outcomes Column */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          {simulation ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-[var(--neutral-50)] p-4 rounded-xl border border-[var(--border-subtle)]">
                  <p className="text-[11px] font-semibold text-[var(--neutral-500)]">Simulated DSCR</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-[var(--neutral-900)]">{simulation.simulated_dscr}x</span>
                    <span className="text-xs text-[var(--fin-green)] font-semibold flex items-center">
                      <ArrowUpRight className="w-3 h-3" /> from {simulation.original_dscr}x
                    </span>
                  </div>
                </div>

                <div className="bg-[var(--neutral-50)] p-4 rounded-xl border border-[var(--border-subtle)]">
                  <p className="text-[11px] font-semibold text-[var(--neutral-500)]">Simulated Trust Score</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-[var(--neutral-900)]">{simulation.simulated_risk_score}</span>
                    <span className="text-xs text-[var(--fin-green)] font-semibold">
                      ({simulation.simulated_risk_score >= simulation.original_risk_score ? `+${simulation.simulated_risk_score - simulation.original_risk_score}` : `${simulation.simulated_risk_score - simulation.original_risk_score}`})
                    </span>
                  </div>
                </div>

                <div className="bg-[var(--neutral-50)] p-4 rounded-xl border border-[var(--border-subtle)]">
                  <p className="text-[11px] font-semibold text-[var(--neutral-500)]">Optimized Facility Limit</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-[var(--brand-700)]">
                      ₹{(simulation.simulated_approved_amount / 100000).toFixed(2)}L
                    </span>
                  </div>
                </div>

                <div className="bg-[var(--neutral-50)] p-4 rounded-xl border border-[var(--border-subtle)]">
                  <p className="text-[11px] font-semibold text-[var(--neutral-500)]">Optimized Interest Rate</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-[var(--neutral-900)]">{simulation.simulated_interest_rate}%</span>
                    <span className="text-xs text-[var(--fin-green)] font-semibold flex items-center">
                      <ArrowDownRight className="w-3 h-3" />
                      {simulation.simulated_interest_rate < simulation.original_interest_rate ? `-${(simulation.original_interest_rate - simulation.simulated_interest_rate).toFixed(2)}%` : 'Standard'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div className="bg-[var(--brand-50)] p-4 rounded-xl border border-[var(--brand-200)] space-y-2">
                <p className="text-xs font-bold text-[var(--neutral-900)] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[var(--brand-700)]" /> AI Underwriting Insights:
                </p>
                {simulation.insights.map((ins, i) => (
                  <p key={i} className="text-xs text-[var(--neutral-700)] flex items-start gap-2 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--fin-green)] shrink-0 mt-0.5" />
                    <span>{ins}</span>
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[var(--neutral-500)] text-xs">
              Calculating counterfactual model...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
