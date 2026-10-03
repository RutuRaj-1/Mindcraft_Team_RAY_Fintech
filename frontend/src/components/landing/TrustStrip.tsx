import React from 'react';
import { ShieldCheck, FileCheck2, History, UserCheck2 } from 'lucide-react';

export const TrustStrip: React.FC = () => {
  const principles = [
    {
      icon: <FileCheck2 className="w-5 h-5 text-[#1687F7]" />,
      title: 'Evidence-Backed',
      desc: 'Ground truth extracted from verified GST, ITR, and bank records with zero guesswork.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-[#22C98A]" />,
      title: 'Explainable AI',
      desc: 'Transparent SHAP feature attributions and deterministic policy citations for every outcome.',
    },
    {
      icon: <History className="w-5 h-5 text-[#12B8C8]" />,
      title: 'Auditable Ledger',
      desc: 'Immutable append-only provenance tracing every input, rule evaluation, and system event.',
    },
    {
      icon: <UserCheck2 className="w-5 h-5 text-[#0F4C81]" />,
      title: 'Human-in-the-Loop',
      desc: 'Configurable institutional governance gates with explicit officer review and override trails.',
    },
  ];

  return (
    <section className="border-y border-[#E2E8F0] bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <p className="text-xs uppercase font-extrabold tracking-widest text-[#0F4C81]">
            Institutional Design Principles
          </p>
          <h2 className="text-xl sm:text-2xl font-black text-[#0B1F3A] mt-1">
            Built around explainability, evidence, and human oversight.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {principles.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all flex flex-col items-start gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                {item.icon}
              </div>
              <div>
                <h3 className="text-sm font-black text-[#0B1F3A] flex items-center gap-1.5">
                  <span>✓ {item.title}</span>
                </h3>
                <p className="text-xs text-[#475569] mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
