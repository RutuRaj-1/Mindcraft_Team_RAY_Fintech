import React from 'react';
import {
  FileText, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight,
  Sparkles, Layers, Sliders, UserCheck, Scale
} from 'lucide-react';

export const ExplainabilitySection: React.FC = () => {
  const pillars = [
    { title: 'RULE', desc: 'Deterministic hard limits (DSCR thresholds, tax filing delays, sanction lists).' },
    { title: 'MODEL', desc: 'Calibrated scikit-learn models outputting empirical probabilities and SHAP values.' },
    { title: 'EVIDENCE', desc: 'Extracted financial ground-truth documents tied to SHA-256 hashes.' },
    { title: 'EXPLANATION', desc: 'Zero-hallucination natural language synthesis referencing exact evidence points.' },
    { title: 'HUMAN REVIEW', desc: 'Final underwriting discretion and institutional governance gates.' },
  ];

  return (
    <section id="explainability" className="py-20 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#0F4C81]">
            Transparent AI Governance
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B1F3A] tracking-tight leading-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            AI that explains its reasoning.
          </h2>
          <p className="text-sm sm:text-base text-[#475569] leading-relaxed pt-1">
            Black-box scoring is unacceptable in regulated finance. FinFlow strictly separates the deterministic policy rule, the machine learning model, verifiable evidence, narrative explanation, and human sign-off.
          </p>
        </div>

        {/* 5 Distinct System Layers */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {pillars.map((p, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-mono font-bold text-[#1687F7] block">LAYER 0{idx + 1}</span>
                <h4 className="text-sm font-black text-[#0B1F3A] mt-1">{p.title}</h4>
                <p className="text-[11px] text-[#64748B] mt-1.5 leading-snug">{p.desc}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#F1F5F9] flex items-center gap-1 text-[10px] font-bold text-[#0F4C81]">
                <CheckCircle2 className="w-3 h-3 text-[#22C98A]" />
                <span>Isolated Boundary</span>
              </div>
            </div>
          ))}
        </div>

        {/* Visual Case Study Card */}
        <div className="mt-10 p-6 sm:p-10 rounded-3xl bg-white border-2 border-[#0B1F3A] shadow-[6px_6px_0px_#0B1F3A]">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Left: Case Outcome */}
            <div className="lg:w-1/2 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Case Decision</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-3 py-1 rounded-full bg-[#FEF3D9] text-[#C98A10] border border-[#C98A10]/30 font-black text-sm flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      Needs Review
                    </span>
                    <span className="text-xs text-[#64748B]">Case Ref: #CF-2026-081</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#64748B]">SHAP Confidence</span>
                  <div className="text-base font-black text-[#0B1F3A]">84%</div>
                </div>
              </div>

              {/* Why Flagged */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] mb-2">
                  Why was this flagged for review?
                </h4>
                <ul className="space-y-2 text-xs text-[#475569]">
                  <li className="flex items-start gap-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-[#C98A10] font-bold">•</span>
                    <span><strong>Missing mandatory evidence:</strong> Q4 GST filing is pending upload.</span>
                  </li>
                  <li className="flex items-start gap-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-[#C98A10] font-bold">•</span>
                    <span><strong>Revenue inconsistency:</strong> 18% variance detected between GSTR-3B and ITR-V declared revenue.</span>
                  </li>
                  <li className="flex items-start gap-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-[#C98A10] font-bold">•</span>
                    <span><strong>Risk factor:</strong> Working capital turnover cycle elongated by 22 days.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right: Evidence Provenance & Recommended Action */}
            <div className="lg:w-1/2 space-y-4">
              <div className="p-4 rounded-2xl bg-[#EEF8F7] border border-[#12B8C8]/30">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] block mb-2">
                  Evidence Comparison (Grounded Facts)
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                    <span className="text-[10px] text-[#64748B] block">GSTR-3B Annual Revenue</span>
                    <span className="text-sm font-black text-[#0B1F3A]">₹24,80,000</span>
                    <span className="text-[10px] text-[#12B8C8] font-semibold block mt-0.5">Verified OCR</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                    <span className="text-[10px] text-[#64748B] block">ITR Declared Revenue</span>
                    <span className="text-sm font-black text-[#0B1F3A]">₹20,30,000</span>
                    <span className="text-[10px] text-[#C98A10] font-semibold block mt-0.5">Under-reporting Flag</span>
                  </div>
                </div>
              </div>

              {/* Recommended Next Action */}
              <div className="p-4 rounded-2xl bg-[#0B1F3A] text-white space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#22C98A] uppercase tracking-wider text-[10px]">
                    Recommended Next Action
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">Policy Rule POL-GST-04</span>
                </div>
                <p className="text-xs text-[#E2E8F0] leading-relaxed">
                  "Upload the latest audited financial statement or bank reconciliation certificate to explain the 18% variance between tax filings and bank records."
                </p>
              </div>

              {/* Regulatory & Safety Clarification */}
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#64748B] flex items-start gap-2">
                <Scale className="w-4 h-4 text-[#0F4C81] shrink-0 mt-0.5" />
                <p>
                  <strong>Responsible AI Guardrail:</strong> The LLM is strictly restricted to narrative explanation and journey orchestration. It cannot issue autonomous unvetted financial approvals.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
