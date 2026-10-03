import React, { useState } from 'react';
import {
  MessageSquareQuote, FolderSearch, FileCheck2, Cpu,
  Award, FileText, ArrowRight, Zap, CheckCircle2, ChevronRight
} from 'lucide-react';

export const SolutionSection: React.FC = () => {
  const [selectedStage, setSelectedStage] = useState<number>(0);

  const stages = [
    {
      step: '01',
      tag: 'INTENT',
      title: 'Intent Capture',
      summary: 'Understand what the customer actually needs.',
      details: 'Converts unstructured natural-language requests into structured loan parameters, desired tenors, and financial purpose tags.',
      icon: <MessageSquareQuote className="w-5 h-5 text-[#1687F7]" />,
      color: 'border-[#1687F7]',
      bg: 'bg-[#1687F7]/10',
    },
    {
      step: '02',
      tag: 'EVIDENCE',
      title: 'Evidence Gathering',
      summary: 'Collect and structure financial information.',
      details: 'Pulls GST returns, ITR filings, bank statements, and director KYC into a cryptographically secured and traceable evidence ledger.',
      icon: <FolderSearch className="w-5 h-5 text-[#0F4C81]" />,
      color: 'border-[#0F4C81]',
      bg: 'bg-[#0F4C81]/10',
    },
    {
      step: '03',
      tag: 'VERIFICATION',
      title: 'Multi-Pass Verification',
      summary: 'Extract, validate, and cross-check documents.',
      details: 'OCR extracts financial tables, checks document tampering, and automatically reconciles GSTR-3B revenue against verified bank credits.',
      icon: <FileCheck2 className="w-5 h-5 text-[#12B8C8]" />,
      color: 'border-[#12B8C8]',
      bg: 'bg-[#12B8C8]/10',
    },
    {
      step: '04',
      tag: 'RISK',
      title: 'Deterministic & ML Risk',
      summary: 'Combine deterministic rules with ML-based assessment.',
      details: 'Evaluates institutional policy guardrails (DSCR, debt-to-equity) alongside scikit-learn credit scoring and fraud graph heuristics.',
      icon: <Cpu className="w-5 h-5 text-[#C98A10]" />,
      color: 'border-[#C98A10]',
      bg: 'bg-[#C98A10]/10',
    },
    {
      step: '05',
      tag: 'DECISION',
      title: 'Grounded Decisioning',
      summary: 'Generate explainable outcomes grounded in evidence.',
      details: 'Produces unambiguous underwriting recommendations (Approved, Conditional, Needs Review, Decline) rooted in verified facts.',
      icon: <Award className="w-5 h-5 text-[#22C98A]" />,
      color: 'border-[#22C98A]',
      bg: 'bg-[#22C98A]/10',
    },
    {
      step: '06',
      tag: 'EXPLANATION',
      title: 'Zero-Hallucination Explanations',
      summary: 'Deconstruct reasoning with policy and SHAP attributions.',
      details: 'Generates auditable rationale directly linking credit terms to specific financial line items and institutional credit policies.',
      icon: <FileText className="w-5 h-5 text-[#6A49C6]" />,
      color: 'border-[#6A49C6]',
      bg: 'bg-[#6A49C6]/10',
    },
    {
      step: '07',
      tag: 'ACTION',
      title: 'Next Best Action (NBA)',
      summary: 'Recommend the next best step.',
      details: 'Prescribes precise remediation actions for the borrower or underwriting officer, ensuring the journey moves forward without friction.',
      icon: <Zap className="w-5 h-5 text-[#1687F7]" />,
      color: 'border-[#1687F7]',
      bg: 'bg-[#1687F7]/10',
    },
  ];

  return (
    <section id="solution" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#1687F7]">
            The FinFlow Architecture
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B1F3A] tracking-tight leading-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            One intelligent journey from intent to action.
          </h2>
          <p className="text-sm sm:text-base text-[#475569] leading-relaxed pt-1">
            FinFlow AI orchestrates the entire credit assessment into an unbroken, auditable pipeline where every stage informs the next.
          </p>
        </div>

        {/* 7 Pipeline Stages Cards Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {stages.map((stg, idx) => {
            const isSelected = selectedStage === idx;
            return (
              <button
                key={stg.step}
                type="button"
                onClick={() => setSelectedStage(idx)}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#0B1F3A] text-white border-[#0B1F3A] shadow-md scale-[1.02]'
                    : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-black font-mono px-2 py-0.5 rounded ${
                        isSelected ? 'bg-white/10 text-white' : 'bg-white text-[#475569] border border-[#E2E8F0]'
                      }`}
                    >
                      {stg.step}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-white/10 text-[#22C98A]' : stg.bg
                      }`}
                    >
                      {stg.icon}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-black tracking-wider block ${
                      isSelected ? 'text-[#22C98A]' : 'text-[#0F4C81]'
                    }`}
                  >
                    {stg.tag}
                  </span>

                  <h3 className={`text-xs font-bold mt-1 line-clamp-1 ${isSelected ? 'text-white' : 'text-[#0B1F3A]'}`}>
                    {stg.title}
                  </h3>
                </div>

                <p
                  className={`text-[11px] mt-2 leading-relaxed ${
                    isSelected ? 'text-[#CBD5E1]' : 'text-[#64748B]'
                  }`}
                >
                  "{stg.summary}"
                </p>
              </button>
            );
          })}
        </div>

        {/* Interactive Detail Preview of Selected Stage */}
        <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-[#F8FAFC] border-2 border-[#E2E8F0] shadow-xs">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#0F4C81] text-white">
                  Stage {stages[selectedStage].step}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1687F7]">
                  {stages[selectedStage].tag}
                </span>
              </div>
              <h4 className="text-xl font-black text-[#0B1F3A]">
                {stages[selectedStage].title}
              </h4>
              <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                {stages[selectedStage].details}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setSelectedStage((prev) => (prev > 0 ? prev - 1 : stages.length - 1))}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#0F172A] transition-colors"
              >
                Previous Stage
              </button>
              <button
                onClick={() => setSelectedStage((prev) => (prev < stages.length - 1 ? prev + 1 : 0))}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0B1F3A] hover:bg-[#0F4C81] text-white transition-colors flex items-center gap-1.5"
              >
                <span>Next Stage</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#22C98A]" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
