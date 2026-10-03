import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, FileText,
  Activity, Sparkles, TrendingUp, ChevronRight, Lock, Eye, Building2
} from 'lucide-react';

export const HeroSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(2); // 0=Intent, 1=Evidence, 2=Risk, 3=Decision, 4=Action

  const stages = [
    { id: 0, label: 'Intent', status: 'completed' },
    { id: 1, label: 'Evidence', status: 'completed' },
    { id: 2, label: 'Risk Analysis', status: 'active' },
    { id: 3, label: 'Decision', status: 'pending' },
    { id: 4, label: 'Action', status: 'pending' },
  ];

  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#F1F5F9]">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#1687F7]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#12B8C8]/6 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* ── LEFT COLUMN: Value Proposition ── */}
          <div className="lg:col-span-6 space-y-6">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF8F7] border border-[#12B8C8]/30 text-xs font-bold text-[#0F4C81] tracking-wide shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#22C98A] animate-pulse" />
              <span>AI-Powered Financial Journey Orchestration</span>
            </div>

            {/* Main Headline */}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0B1F3A] tracking-tight leading-[1.1]"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Turn a fragmented financial journey into{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0F4C81] via-[#1687F7] to-[#12B8C8]">
                one intelligent flow.
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="text-lg sm:text-xl font-medium text-[#0F4C81]">
              Your Financial Journey. Intelligent. Explainable. Actionable.
            </p>

            {/* Supporting Paragraph */}
            <p className="text-base text-[#475569] leading-relaxed max-w-xl">
              FinFlow AI helps MSMEs and financial institutions move from intent to evidence, risk, explainable decisions and next best actions through one guided journey.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#0B1F3A] hover:bg-[#0F4C81] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 text-[#22C98A]" />
              </Link>

              <a
                href="#solution"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#0F172A] font-bold text-sm border-2 border-[#E2E8F0] hover:border-[#CBD5E1] transition-all"
              >
                <span>Explore FinFlow</span>
                <ChevronRight className="w-4 h-4 text-[#475569]" />
              </a>

              <Link
                to="/demo"
                className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-xs font-semibold text-[#0F4C81] hover:text-[#1687F7] transition-colors"
              >
                <Sparkles className="w-4 h-4 text-[#1687F7]" />
                <span>Interactive Demo Hub</span>
              </Link>
            </div>

            {/* Micro value badges */}
            <div className="pt-4 flex flex-wrap items-center gap-4 text-xs text-[#64748B] font-medium border-t border-[#E2E8F0]/80">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#22C98A]" />
                <span>Evidence-Backed Rationale</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#1687F7]" />
                <span>Zero Hallucinations</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#0F4C81]" />
                <span>Enterprise RBAC Guardrails</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Interactive Product Orchestration Card ── */}
          <div className="lg:col-span-6">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              
              {/* Outer decorative card shadow */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#0F4C81]/20 via-[#1687F7]/20 to-[#12B8C8]/20 blur-xl opacity-70" />

              {/* Main Journey Card */}
              <div className="relative rounded-3xl bg-white border-2 border-[#0B1F3A]/90 p-5 sm:p-7 shadow-[6px_6px_0px_#0B1F3A]">
                
                {/* Header with Case Info */}
                <div className="flex items-start justify-between pb-4 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0F4C81] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                      <Building2 className="w-5 h-5 text-[#12B8C8]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#0B1F3A] text-base">Demo Textile Traders</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FEF3D9] text-[#C98A10] border border-[#C98A10]/30">
                          Illustrative Demo
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B]">Application ID: APP-2026-9481 · Working Capital Term</p>
                    </div>
                  </div>

                  <span className="hidden sm:inline-flex text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#F1F5F9] text-[#0F4C81]">
                    Stage: Risk Assessment
                  </span>
                </div>

                {/* Orchestration Stage Stepper */}
                <div className="py-4">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0B1F3A] mb-2">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#1687F7]" />
                      Financial Journey Progress
                    </span>
                    <span className="text-[#1687F7] font-semibold text-[11px]">Stage 3 of 5</span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {stages.map((stg) => {
                      const isComplete = stg.status === 'completed';
                      const isActive = stg.status === 'active';
                      return (
                        <button
                          key={stg.id}
                          onClick={() => setActiveStep(stg.id)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#0B1F3A] text-white shadow-xs'
                              : isComplete
                              ? 'bg-[#EEF8F7] text-[#0F4C81] border border-[#12B8C8]/30'
                              : 'bg-[#F8FAFC] text-[#94A3B8] border border-[#E2E8F0]'
                          }`}
                        >
                          <span className="text-[10px] font-extrabold truncate w-full">
                            {stg.label}
                          </span>
                          <span className="text-xs">
                            {isComplete ? '✓' : isActive ? '●' : '○'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Synthetic Metrics Grid */}
                <div className="grid grid-cols-3 gap-2.5 my-3">
                  <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-[10px] uppercase font-bold text-[#64748B] block">Annual Inflow</span>
                    <span className="text-base font-black text-[#0B1F3A]">₹24.8L</span>
                    <span className="text-[10px] text-[#22C98A] font-semibold flex items-center gap-0.5 mt-0.5">
                      <TrendingUp className="w-3 h-3" /> +14.2% YoY
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-[10px] uppercase font-bold text-[#64748B] block">Evidence Items</span>
                    <span className="text-base font-black text-[#0B1F3A]">8 / 10</span>
                    <span className="text-[10px] text-[#12B8C8] font-semibold block mt-0.5">
                      OCR Cross-Verified
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-[10px] uppercase font-bold text-[#64748B] block">Risk Rating</span>
                    <span className="text-base font-black text-[#C98A10]">Medium</span>
                    <span className="text-[10px] text-[#64748B] font-semibold block mt-0.5">
                      SHAP: 68 / 100
                    </span>
                  </div>
                </div>

                {/* Floating Intelligence Callout */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0F4C81]/5 via-[#1687F7]/5 to-[#12B8C8]/5 border border-[#1687F7]/20 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#0F4C81] text-[#12B8C8] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0B1F3A]">Next Best Action Recommendation</span>
                      <span className="text-[10px] font-semibold text-[#1687F7]">Confidence 92%</span>
                    </div>
                    <p className="text-[#475569] leading-relaxed">
                      "Cross-check Q4 GSTR-3B with primary ICICI bank statements to clear ₹3.2L outward supply discrepancy."
                    </p>
                  </div>
                </div>

                {/* Footer simulation notice */}
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#0F4C81]" />
                    Deterministic Rules + Scikit-Learn Model
                  </span>
                  <Link
                    to="/demo"
                    className="font-bold text-[#1687F7] hover:underline flex items-center gap-1"
                  >
                    <span>Inspect Live Graph</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
