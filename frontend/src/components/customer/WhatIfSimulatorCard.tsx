import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { WhatIfResponse, WhatIfRequest } from '../../types';
import { Sliders, TrendingUp, ShieldCheck, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

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
    <div className="bg-white rounded-2xl p-6 border border-[#E3ECE9] shadow-xs">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#EEF8F7] flex items-center justify-center text-[#237277]">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#123E40]">Interactive What-If Counterfactual Simulator</h3>
            <p className="text-xs text-[#687A75]">
              Simulate how revenue expansion, extended tenure, or collateral changes optimize your sanction terms.
            </p>
          </div>
        </div>
        <span className="bg-[#E8F7F1] text-[#169C73] text-xs font-semibold px-2.5 py-1 rounded-full border border-[#169C73]/20 flex items-center gap-1">
          <Zap className="w-3 h-3" /> Live Recalculation
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-6 space-y-5 bg-[#F7FAF9] p-4 rounded-xl border border-[#E3ECE9]">
          {/* Revenue Delta Slider */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-[#40524E] mb-1.5">
              <span>Expected Revenue Variation</span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                revenueDelta > 0 ? 'bg-[#E8F7F1] text-[#169C73]' : revenueDelta < 0 ? 'bg-[#FDECEA] text-[#D96559]' : 'bg-gray-100 text-gray-700'
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
              className="w-full accent-[#237277] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#687A75] mt-1">
              <span>-25% Stress</span>
              <span>Baseline (0%)</span>
              <span>+35% Growth</span>
            </div>
          </div>

          {/* Tenor Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#40524E] mb-1.5">
              Proposed Facility Tenure
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[6, 12, 18, 24].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTenorMonths(t)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    tenorMonths === t
                      ? 'bg-[#237277] text-white border-[#237277] shadow-xs'
                      : 'bg-white text-[#40524E] border-[#CBD9D5] hover:bg-[#EEF8F7]'
                  }`}
                >
                  {t} Months
                </button>
              ))}
            </div>
          </div>

          {/* Collateral Pledge */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-[#40524E] mb-1.5">
              <span>Additional Promoter Collateral</span>
              <span className="font-bold text-[#123E40]">₹{(collateralAmount / 100000).toFixed(1)} Lakhs</span>
            </div>
            <input
              type="range"
              min="0"
              max="1500000"
              step="250000"
              value={collateralAmount}
              onChange={(e) => setCollateralAmount(Number(e.target.value))}
              className="w-full accent-[#237277] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#687A75] mt-1">
              <span>Unsecured (₹0)</span>
              <span>₹7.5 Lakhs</span>
              <span>₹15 Lakhs Pledged</span>
            </div>
          </div>
        </div>

        {/* Live Simulation Outcomes Column */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          {simulation ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#EEF8F7] p-3.5 rounded-xl border border-[#D9F0EE]">
                  <p className="text-[11px] font-semibold text-[#687A75]">Debt Service (DSCR)</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-extrabold text-[#123E40]">{simulation.simulated_dscr}x</span>
                    <span className="text-xs text-[#169C73] font-semibold">
                      (from {simulation.original_dscr}x)
                    </span>
                  </div>
                </div>

                <div className="bg-[#EEF8F7] p-3.5 rounded-xl border border-[#D9F0EE]">
                  <p className="text-[11px] font-semibold text-[#687A75]">FinFlow Trust Score</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-extrabold text-[#123E40]">{simulation.simulated_risk_score}</span>
                    <span className="text-xs text-[#169C73] font-semibold">
                      ({simulation.simulated_risk_score >= simulation.original_risk_score ? `+${simulation.simulated_risk_score - simulation.original_risk_score}` : `${simulation.simulated_risk_score - simulation.original_risk_score}`})
                    </span>
                  </div>
                </div>

                <div className="bg-[#EEF8F7] p-3.5 rounded-xl border border-[#D9F0EE]">
                  <p className="text-[11px] font-semibold text-[#687A75]">Simulated Facility Limit</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-extrabold text-[#123E40]">₹{(simulation.simulated_approved_amount / 100000).toFixed(2)}L</span>
                  </div>
                </div>

                <div className="bg-[#EEF8F7] p-3.5 rounded-xl border border-[#D9F0EE]">
                  <p className="text-[11px] font-semibold text-[#687A75]">Simulated Interest Rate</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-extrabold text-[#123E40]">{simulation.simulated_interest_rate}%</span>
                    <span className="text-xs text-[#169C73] font-semibold">
                      ({simulation.simulated_interest_rate < simulation.original_interest_rate ? `-${(simulation.original_interest_rate - simulation.simulated_interest_rate).toFixed(2)}%` : 'Standard'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div className="bg-[#F7FAF9] p-3 rounded-xl border border-[#E3ECE9] space-y-1.5">
                <p className="text-xs font-bold text-[#123E40] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#237277]" /> AI Underwriting Insights:
                </p>
                {simulation.insights.map((ins, i) => (
                  <p key={i} className="text-xs text-[#40524E] flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#169C73] shrink-0 mt-0.5" />
                    <span>{ins}</span>
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[#687A75] text-xs">
              Calculating counterfactual model...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
