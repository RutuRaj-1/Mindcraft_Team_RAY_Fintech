import React, { useState } from 'react';
import {
  MessageSquare, UploadCloud, CheckCheck, LineChart,
  HelpCircle, Compass, ArrowRight, ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const HowItWorksSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      num: '01',
      title: 'Tell us what you need',
      headline: 'Natural-language intent capture',
      desc: 'Simply state your required capital, expected repayment timeframe, and business objective in plain English or regional terms. FinFlow converts this into a structured loan request.',
      icon: <MessageSquare className="w-5 h-5 text-[#1687F7]" />,
      pill: 'Step 1: Intent',
      mockup: 'Intent: "Need ₹25L working capital to purchase raw cotton ahead of Diwali season for 12 months."',
    },
    {
      num: '02',
      title: 'Upload your evidence',
      headline: 'GST, ITR, bank statements & KYC',
      desc: 'Drop official financial documents directly into the portal. Supported formats include GST returns (GSTR-1, GSTR-3B), ITR acknowledgement receipts, and PDF bank statements.',
      icon: <UploadCloud className="w-5 h-5 text-[#0F4C81]" />,
      pill: 'Step 2: Evidence',
      mockup: 'Ledger: GSTR-3B_2025.pdf (Verified) · Bank_HDFC_12M.pdf (Verified) · ITR-V.pdf (Verified)',
    },
    {
      num: '03',
      title: 'FinFlow verifies',
      headline: 'OCR + extraction + validation + cross-checks',
      desc: 'The intelligent OCR engine reads tables, calculates monthly turnover, and detects anomalies between reported GST revenue and actual bank credit entries.',
      icon: <CheckCheck className="w-5 h-5 text-[#12B8C8]" />,
      pill: 'Step 3: Verification',
      mockup: 'Reconciliation: Total Inward Bank Credits (₹24.8L) matches Reported GSTR-3B Turnover (Variance < 2%).',
    },
    {
      num: '04',
      title: 'Understand your financial position',
      headline: 'Rules + ML + financial intelligence',
      desc: 'Institutional credit policies (DSCR, leverage ratio) are evaluated alongside scikit-learn models and entity trust graphs to produce an objective risk score.',
      icon: <LineChart className="w-5 h-5 text-[#C98A10]" />,
      pill: 'Step 4: Risk Scoring',
      mockup: 'Assessment: Debt-Service Coverage Ratio (DSCR): 1.68x (Pass >= 1.25x) · Risk Tier: Prime',
    },
    {
      num: '05',
      title: 'Understand the decision',
      headline: 'Evidence-backed explanation with policy context',
      desc: 'No cryptic rejection or blind approval. Receive transparent SHAP feature attributions and zero-hallucination policy citations outlining exactly why a decision was reached.',
      icon: <HelpCircle className="w-5 h-5 text-[#22C98A]" />,
      pill: 'Step 5: Explainability',
      mockup: 'Rationale: Loan sanctioned based on stable 18-month cash flow and verified GST compliance history.',
    },
    {
      num: '06',
      title: 'Know what to do next',
      headline: 'Next Best Action guides the journey forward',
      desc: 'FinFlow continuously recommends the highest-leverage next step — whether generating an e-sanction agreement, uploading missing annexures, or counterfactual remedies.',
      icon: <Compass className="w-5 h-5 text-[#6A49C6]" />,
      pill: 'Step 6: Next Best Action',
      mockup: 'Recommendation: Proceed to digital e-sign and register NACH mandate for same-day fund disbursement.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#1687F7]">
            Frictionless Process
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B1F3A] tracking-tight leading-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            How FinFlow AI Works
          </h2>
          <p className="text-sm sm:text-base text-[#475569] leading-relaxed pt-1">
            Six guided, transparent steps connecting the applicant directly to explainable credit outcomes.
          </p>
        </div>

        {/* Step Selector Buttons Bar */}
        <div className="mt-12 flex items-center justify-start lg:justify-center gap-2 overflow-x-auto pb-4 no-scrollbar">
          {steps.map((s, idx) => {
            const isCurrent = activeStep === idx;
            return (
              <button
                key={s.num}
                onClick={() => setActiveStep(idx)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                  isCurrent
                    ? 'bg-[#0B1F3A] text-white shadow-xs'
                    : 'bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
                }`}
              >
                <span className="font-mono text-[11px] opacity-80">{s.num}</span>
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Step Feature Display */}
        <div className="mt-8 p-6 sm:p-10 rounded-3xl bg-[#F8FAFC] border-2 border-[#E2E8F0] shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E2E8F0] text-xs font-bold text-[#0F4C81]">
                {steps[activeStep].icon}
                <span>{steps[activeStep].pill}</span>
              </div>

              <h3
                className="text-2xl sm:text-3xl font-black text-[#0B1F3A]"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {steps[activeStep].title}
              </h3>

              <p className="text-sm font-bold text-[#0F4C81]">
                {steps[activeStep].headline}
              </p>

              <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                {steps[activeStep].desc}
              </p>

              <div className="pt-2 flex items-center gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B1F3A] hover:bg-[#0F4C81] text-white font-bold text-xs shadow-xs"
                >
                  <span>Experience This Step</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#22C98A]" />
                </Link>

                <button
                  onClick={() => setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : 0))}
                  className="text-xs font-bold text-[#1687F7] hover:underline"
                >
                  Next Step →
                </button>
              </div>
            </div>

            {/* Live Interactive Code/Mockup Visual */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-white border-2 border-[#0B1F3A] p-5 shadow-[4px_4px_0px_#0B1F3A] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] text-[11px] font-mono font-bold text-[#64748B]">
                  <span>Step {steps[activeStep].num} Simulation</span>
                  <span className="text-[#22C98A] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#22C98A] animate-pulse" /> Verified
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs text-[#0B1F3A] leading-relaxed">
                  {steps[activeStep].mockup}
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-1">
                  <span>Engine: FinFlow v2.1</span>
                  <span>Deterministic Audit Log: OK</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
