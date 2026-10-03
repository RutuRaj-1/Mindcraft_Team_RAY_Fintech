import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import { WhatIfResponse, WhatIfRequest } from '../../types';
import {
  Sliders,
  TrendingUp,
  Zap,
  CheckCircle2,
  DollarSign,
  Calendar,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  RefreshCw,
  Info,
  Lock,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  Scale,
  Activity,
} from 'lucide-react';

interface SimulatorProps {
  journeyId: string;
}

export const WhatIfSimulatorCard: React.FC<SimulatorProps> = ({ journeyId }) => {
  // Simulator State
  const [loanAmount, setLoanAmount] = useState<number>(500000);
  const [tenorMonths, setTenorMonths] = useState<number>(12);
  const [interestRate, setInterestRate] = useState<number>(11.5);
  const [revenueDelta, setRevenueDelta] = useState<number>(0);
  const [existingObligations, setExistingObligations] = useState<number>(25000);

  const [simulation, setSimulation] = useState<WhatIfResponse | null>(null);
  const [history, setHistory] = useState<WhatIfResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialLoaded, setIsInitialLoaded] = useState<boolean>(false);

  // Load initial baseline or history
  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      try {
        const histRes = await api.getWhatIfHistory(journeyId);
        if (isMounted && histRes) {
          if (histRes.scenarios && histRes.scenarios.length > 0) {
            setHistory(histRes.scenarios);
            const latest = histRes.latest || histRes.scenarios[0];
            setSimulation(latest);

            // Populate sliders from base values if available
            if (latest.baseApplicationValues && !isInitialLoaded) {
              const base = latest.baseApplicationValues;
              setLoanAmount(base.requestedLoanAmount || 500000);
              setTenorMonths(base.loanTenure || 12);
              setInterestRate(base.estimatedInterestRate || 11.5);
              setExistingObligations(base.existingObligations || 0);
              setIsInitialLoaded(true);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch what-if history, will run fresh simulation:', err);
      }
    };
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, [journeyId, isInitialLoaded]);

  // Run simulation with debounce
  const runSimulation = useCallback(
    async (
      overrideAmount?: number,
      overrideTenure?: number,
      overrideRate?: number,
      overrideRev?: number,
      overrideOblig?: number
    ) => {
      setIsLoading(true);
      try {
        const req: WhatIfRequest = {
          requestedLoanAmount: overrideAmount !== undefined ? overrideAmount : loanAmount,
          loanTenure: overrideTenure !== undefined ? overrideTenure : tenorMonths,
          estimatedInterestRate: overrideRate !== undefined ? overrideRate : interestRate,
          declaredRevenueAdjustment: overrideRev !== undefined ? overrideRev : revenueDelta,
          existingObligations: overrideOblig !== undefined ? overrideOblig : existingObligations,
          // Legacy mappings
          revenue_delta_pct: overrideRev !== undefined ? overrideRev : revenueDelta,
          tenor_months: overrideTenure !== undefined ? overrideTenure : tenorMonths,
        };

        const res = await api.simulateWhatIf(journeyId, req);
        setSimulation(res);
        setHistory((prev) => [res, ...prev.filter((s) => s.scenarioId !== res.scenarioId)].slice(0, 5));
      } catch (e) {
        console.error('Simulation error:', e);
      } finally {
        setIsLoading(false);
      }
    },
    [journeyId, loanAmount, tenorMonths, interestRate, revenueDelta, existingObligations]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      runSimulation();
    }, 250);
    return () => clearTimeout(timer);
  }, [loanAmount, tenorMonths, interestRate, revenueDelta, existingObligations, runSimulation]);

  // Quick Preset Handlers (e.g. ₹5L scenario vs ₹7L requested)
  const applyPreset = (amt: number, tenure: number, rev: number) => {
    setLoanAmount(amt);
    setTenorMonths(tenure);
    setRevenueDelta(rev);
  };

  const baseValues = simulation?.baseApplicationValues;
  const metrics = simulation?.calculatedMetrics;
  const burden = simulation?.cashFlowBurden || 'MODERATE';

  const getBurdenBadge = (b: string) => {
    switch (b) {
      case 'LOW':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'MODERATE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="card p-6 border border-[var(--border-subtle)] shadow-sm bg-white rounded-2xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg font-bold text-[var(--neutral-900)] tracking-tight">
                What-If Affordability & Risk Simulator
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3 h-3" /> Live Counterfactual Engine
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700">
                <Lock className="w-3 h-3 text-gray-500" /> Application Immutable
              </span>
            </div>
            <p className="text-xs text-[var(--neutral-500)] mt-1 max-w-2xl">
              Model how adjusting loan quantum, tenure, interest rate, or monthly obligations shifts your
              repayment burden, debt-service coverage, and FinFlow ML trust score without impacting your submitted file.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          {isLoading && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Recalibrating...
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              if (baseValues) {
                setLoanAmount(baseValues.requestedLoanAmount || 500000);
                setTenorMonths(baseValues.loanTenure || 12);
                setInterestRate(baseValues.estimatedInterestRate || 11.5);
                setRevenueDelta(0);
                setExistingObligations(baseValues.existingObligations || 0);
              }
            }}
            className="text-xs font-semibold text-[var(--neutral-600)] hover:text-indigo-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-200 bg-white hover:bg-gray-50 transition-colors"
          >
            Reset to Baseline
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls (5 Inputs) vs Right Scenarios (Base vs Simulated) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (5 cols) */}
        <div className="lg:col-span-5 space-y-5 bg-slate-50/80 p-5 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-600" /> Scenario Levers
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">Drag to experiment</span>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => applyPreset(500000, 12, 0)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                loanAmount === 500000
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'
              }`}
            >
              ₹5L (Optimized)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(700000, 12, 0)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                loanAmount === 700000
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'
              }`}
            >
              ₹7L (Requested)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(1000000, 24, 10)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                loanAmount === 1000000 && tenorMonths === 24
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'
              }`}
            >
              ₹10L / 24M
            </button>
          </div>

          {/* 1. Requested Loan Amount Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                Requested Loan Amount
              </span>
              <span className="text-sm font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                ₹{(loanAmount / 100000).toFixed(2)} Lakhs
              </span>
            </div>
            <input
              type="range"
              min="100000"
              max="2500000"
              step="50000"
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>₹1.0L Min</span>
              <span>₹7.0L Case</span>
              <span>₹15.0L</span>
              <span>₹25.0L Max</span>
            </div>
          </div>

          {/* 2. Loan Tenure Selector */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Loan Tenure (Months)
              </span>
              <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {tenorMonths} Months ({(tenorMonths / 12).toFixed(1)} Yrs)
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[6, 12, 18, 24, 36].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTenorMonths(t)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    tenorMonths === t
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'
                  }`}
                >
                  {t}M
                </button>
              ))}
            </div>
          </div>

          {/* 3. Estimated Interest Rate */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-slate-500" />
                Estimated Interest Rate
              </span>
              <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {interestRate.toFixed(2)}% p.a.
              </span>
            </div>
            <input
              type="range"
              min="9.0"
              max="18.0"
              step="0.25"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>9.0% Prime</span>
              <span>11.5% Standard</span>
              <span>18.0% Subprime</span>
            </div>
          </div>

          {/* 4. Declared Revenue Adjustment */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span>Revenue Growth / Stress Adjustment</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  revenueDelta > 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : revenueDelta < 0
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
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
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>-25% Stress</span>
              <span>0% Baseline</span>
              <span>+35% Expansion</span>
            </div>
          </div>

          {/* 5. Existing Monthly Obligations */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span>Existing Monthly Obligations</span>
              <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                ₹{existingObligations.toLocaleString('en-IN')}/mo
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="150000"
              step="5000"
              value={existingObligations}
              onChange={(e) => setExistingObligations(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>₹0 Clean</span>
              <span>₹50K</span>
              <span>₹1.5L High</span>
            </div>
          </div>
        </div>

        {/* Comparison & Results Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
          {/* Explicit BASE CASE vs SIMULATED SCENARIO Header */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* BASE CASE Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                  BASE CASE
                </span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Original Baseline</p>
              <div className="mt-2.5 space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Loan Facility:</span>
                  <span className="font-semibold text-slate-900">
                    ₹{baseValues ? (baseValues.requestedLoanAmount / 100000).toFixed(2) : '10.00'}L
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tenure / Rate:</span>
                  <span className="font-semibold text-slate-900">
                    {baseValues?.loanTenure || 12}M @ {baseValues?.estimatedInterestRate || 11.5}%
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">Base EMI:</span>
                  <span className="font-bold text-slate-900">
                    ₹{baseValues ? Math.round(baseValues.estimatedEMI).toLocaleString('en-IN') : '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Base Surplus:</span>
                  <span className="font-semibold text-slate-900">
                    ₹{baseValues ? Math.round(baseValues.monthlySurplus).toLocaleString('en-IN') : '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trust Score:</span>
                  <span className="font-bold text-indigo-700">
                    {baseValues?.riskScore || 780}/1000 ({baseValues?.riskBand || 'LOW_RISK'})
                  </span>
                </div>
              </div>
            </div>

            {/* SIMULATED SCENARIO Card */}
            <div className="p-4 rounded-xl border-2 border-indigo-500/40 bg-indigo-50/20 relative overflow-hidden shadow-xs">
              <div className="absolute top-2 right-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-600 text-white tracking-wide">
                  SIMULATED SCENARIO
                </span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Hypothetical Model</p>
              <div className="mt-2.5 space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Loan Facility:</span>
                  <span className="font-bold text-indigo-900">
                    ₹{(loanAmount / 100000).toFixed(2)}L
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tenure / Rate:</span>
                  <span className="font-semibold text-slate-900">
                    {tenorMonths}M @ {interestRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-indigo-100">
                  <span className="text-slate-500 font-medium">Estimated EMI:</span>
                  <span className="font-extrabold text-indigo-700 text-sm">
                    ₹{simulation ? Math.round(simulation.estimatedEMI).toLocaleString('en-IN') : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Operating Surplus:</span>
                  <span className="font-bold text-emerald-700">
                    ₹{metrics ? Math.round(metrics.monthlySurplus).toLocaleString('en-IN') : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Simulated Score:</span>
                  <span className="font-extrabold text-indigo-700">
                    {simulation?.riskScore || 780}/1000 ({simulation?.riskBand || 'LOW_RISK'})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Key 4 Impact Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Tile 1: Monthly EMI */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly EMI</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base font-extrabold text-slate-900">
                  ₹{simulation ? Math.round(simulation.estimatedEMI).toLocaleString('en-IN') : '—'}
                </span>
              </div>
              {metrics && metrics.emiDelta !== 0 && (
                <p
                  className={`text-[11px] font-semibold flex items-center gap-0.5 mt-0.5 ${
                    metrics.emiDelta < 0 ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {metrics.emiDelta < 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                  {metrics.emiDelta < 0 ? `-${Math.abs(metrics.emiDelta).toLocaleString('en-IN')}` : `+${metrics.emiDelta.toLocaleString('en-IN')}`}
                </p>
              )}
            </div>

            {/* Tile 2: Operating Surplus */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly Surplus</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base font-extrabold text-slate-900">
                  ₹{metrics ? Math.round(metrics.monthlySurplus).toLocaleString('en-IN') : '—'}
                </span>
              </div>
              {metrics && metrics.surplusDelta !== 0 && (
                <p
                  className={`text-[11px] font-semibold flex items-center gap-0.5 mt-0.5 ${
                    metrics.surplusDelta > 0 ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {metrics.surplusDelta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {metrics.surplusDelta > 0 ? `+${metrics.surplusDelta.toLocaleString('en-IN')}` : `-${Math.abs(metrics.surplusDelta).toLocaleString('en-IN')}`}
                </p>
              )}
            </div>

            {/* Tile 3: Obligation Ratio & Burden */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Obligation Ratio</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base font-extrabold text-slate-900">
                  {metrics ? `${metrics.obligationRatio.toFixed(1)}%` : '—'}
                </span>
              </div>
              <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold border ${getBurdenBadge(burden)}`}>
                {burden} BURDEN
              </span>
            </div>

            {/* Tile 4: DSCR */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DSCR Coverage</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base font-extrabold text-slate-900">
                  {metrics ? `${metrics.dscr.toFixed(2)}x` : '—'}
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                Target ≥ 1.30x
              </span>
            </div>
          </div>

          {/* Risk Feature Changes Table */}
          {simulation && simulation.riskFeatureChanges && simulation.riskFeatureChanges.length > 0 && (
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-indigo-600" />
                  Key Risk-Feature Deltas:
                </p>
                <span className="text-[10px] text-slate-500">Recomputed via Risk Engine</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {simulation.riskFeatureChanges.slice(0, 4).map((fc, i) => (
                  <div key={i} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                    <span className="text-slate-600 text-[11px] truncate max-w-[120px]">{fc.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 text-[11px]">{fc.baseValue.toLocaleString('en-IN')}{fc.unit}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-bold text-slate-900 text-[11px]">{fc.simulatedValue.toLocaleString('en-IN')}{fc.unit}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          fc.impact === 'POSITIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : fc.impact === 'NEGATIVE'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {fc.impact === 'POSITIVE' ? 'Favorable' : fc.impact === 'NEGATIVE' ? 'Higher Stress' : 'Neutral'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Underwriting Explanation */}
          {simulation?.explanation && (
            <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 space-y-1.5">
              <p className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                Affordability & Risk Explanation:
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">
                {simulation.explanation}
              </p>
            </div>
          )}

          {/* Transparent Formula & Compliance Disclaimer */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-amber-950">
                Regulatory Invariant: Hypothetical Scenario Only
              </p>
              <p className="text-[11px] text-amber-800 leading-normal">
                This simulator uses transparent standard reducing-balance EMI formula (EMI = P · r · (1+r)ⁿ / ((1+r)ⁿ - 1)).
                Outputs are counterfactual estimates for affordability planning and do not modify your application.
                <strong className="font-semibold text-amber-950"> This does not guarantee credit approval.</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
