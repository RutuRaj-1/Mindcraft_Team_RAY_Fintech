import React from 'react';
import {
  FileWarning, Clock, Split, HelpCircle, AlertOctagon, Repeat,
  ArrowRight, CheckCircle2, ShieldAlert
} from 'lucide-react';

export const ProblemSection: React.FC = () => {
  const touchpoints = [
    { title: 'Customer', desc: 'SME applicant with urgent capital need' },
    { title: 'Application Form', desc: 'Lengthy PDF/web inputs' },
    { title: 'Document Portal', desc: 'Disjointed file drops' },
    { title: 'Verification', desc: 'Manual cross-referencing' },
    { title: 'Risk Team', desc: 'Black-box scoring' },
    { title: 'Support', desc: 'Status uncertainty' },
    { title: 'Decision', desc: 'Opaque approvals/rejections' },
    { title: 'Follow-up', desc: 'Repeated queries & delays' },
  ];

  const bottlenecks = [
    {
      icon: <Split className="w-5 h-5 text-[#CC4B3E]" />,
      title: 'Multiple Disconnected Touchpoints',
      desc: 'Applicants toggle across portals, email threads, and manual phone checks with no single source of truth.',
    },
    {
      icon: <Repeat className="w-5 h-5 text-[#C98A10]" />,
      title: 'Repeated Document Submissions',
      desc: 'ITR, GST, and bank statements are re-requested multiple times due to format mismatches and version drift.',
    },
    {
      icon: <Clock className="w-5 h-5 text-[#0F4C81]" />,
      title: 'Slow Manual Verification',
      desc: 'Underwriters waste hours manually cross-checking reported GST turnover against bank credit entries.',
    },
    {
      icon: <HelpCircle className="w-5 h-5 text-[#6A49C6]" />,
      title: 'Unclear Status & Friction',
      desc: 'Applicants have zero visibility into what stage their case is at or why additional evidence is needed.',
    },
    {
      icon: <FileWarning className="w-5 h-5 text-[#CC4B3E]" />,
      title: 'Slow Multi-Week Decision Cycles',
      desc: 'Fragmented hand-offs between sales, verification, credit risk, and operations stall critical funding.',
    },
    {
      icon: <AlertOctagon className="w-5 h-5 text-[#C98A10]" />,
      title: 'Difficult-to-Understand Decisions',
      desc: 'Rejections arrive as unhelpful one-liners with no actionable guidance or counterfactual remedies.',
    },
  ];

  return (
    <section id="problem" className="py-20 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#CC4B3E]">
            The Core Industry Dilemma
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B1F3A] tracking-tight leading-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Financial services are digital.{' '}
            <br className="hidden sm:inline" />
            <span className="text-[#CC4B3E]">The journey is still fragmented.</span>
          </h2>
          <p className="text-sm sm:text-base text-[#475569] leading-relaxed pt-2">
            Even in modern digital lending, financial workflows break across disparate silos.
            The borrower provides evidence repeatedly while credit teams struggle with manual validation and black-box models.
          </p>
        </div>

        {/* Visual Fragmented Journey Pipeline */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E2E8F0]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#CC4B3E]" />
              The Traditional Fragmented Process
            </span>
            <span className="text-[11px] font-semibold text-[#CC4B3E] bg-[#FDECEA] px-2.5 py-0.5 rounded-full border border-[#CC4B3E]/30">
              High Friction · Disconnected Silos
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 relative">
            {touchpoints.map((tp, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col justify-between relative group hover:border-[#CBD5E1]"
              >
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#94A3B8]">0{idx + 1}</span>
                  <h4 className="text-xs font-bold text-[#0B1F3A] mt-1 line-clamp-1">{tp.title}</h4>
                  <p className="text-[10px] text-[#64748B] mt-1 leading-snug line-clamp-2">{tp.desc}</p>
                </div>
                {idx < touchpoints.length - 1 && (
                  <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-[#94A3B8]">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 6 Key Failure Points */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bottlenecks.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] shadow-2xs hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mb-3">
                {item.icon}
              </div>
              <h3 className="text-sm font-bold text-[#0B1F3A]">
                {item.title}
              </h3>
              <p className="text-xs text-[#475569] mt-2 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Transition Banner */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0B1F3A] via-[#0F4C81] to-[#12B8C8] text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#22C98A]">
              The Orchestration Breakthrough
            </span>
            <h3
              className="text-2xl sm:text-3xl font-black text-white"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              FinFlow AI brings the journey together.
            </h3>
            <p className="text-xs sm:text-sm text-[#E2E8F0] max-w-xl">
              By unifying intent, documents, OCR extraction, fraud graph analytics, explainable models, and Next Best Actions into one cohesive pipeline.
            </p>
          </div>

          <a
            href="#solution"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-[#0B1F3A] hover:bg-[#F8FAFC] font-bold text-xs uppercase tracking-wider shrink-0 transition-all shadow-md active:scale-[0.98]"
          >
            <span>See The Solution</span>
            <ArrowRight className="w-4 h-4 text-[#1687F7]" />
          </a>
        </div>

      </div>
    </section>
  );
};
