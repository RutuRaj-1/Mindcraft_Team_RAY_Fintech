import React from 'react';
import {
  MessageSquare, Network, FileSearch, ShieldCheck, UserCheck,
  Briefcase, Sparkles, LineChart, GitFork, RotateCcw, Sliders,
  Eye, AlertTriangle, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const IntelligenceModules: React.FC = () => {
  const modules = [
    {
      num: '01',
      title: 'Intent & Journey Understanding',
      desc: 'Dissects conversational and semi-structured MSME loan inquiries to deduce tenor, ticket size, seasonality, and loan purpose.',
      icon: <MessageSquare className="w-5 h-5 text-[#1687F7]" />,
    },
    {
      num: '02',
      title: 'Journey Orchestration',
      desc: 'Finite state machine (FSM) enforcing valid progression across application, document collection, verification, scoring, and e-sanction.',
      icon: <Network className="w-5 h-5 text-[#0F4C81]" />,
    },
    {
      num: '03',
      title: 'Document Intelligence & Evidence',
      desc: 'OCR table extraction across GST returns, ITR-V forms, and multi-bank PDF statements with cryptographic document hashing.',
      icon: <FileSearch className="w-5 h-5 text-[#12B8C8]" />,
    },
    {
      num: '04',
      title: 'Risk & Decision Intelligence',
      desc: 'Deterministic eligibility thresholds coupled with scikit-learn credit scoring and SHAP feature attributions.',
      icon: <ShieldCheck className="w-5 h-5 text-[#C98A10]" />,
    },
    {
      num: '05',
      title: 'Trust, Governance & Human Oversight',
      desc: 'Strict role-based access control (RBAC), multi-officer approval gates, and immutable append-only audit trail logging.',
      icon: <UserCheck className="w-5 h-5 text-[#22C98A]" />,
    },
    {
      num: '06',
      title: 'Product & Financial Workflow',
      desc: 'Dynamic loan schedule generation, automated sanction letter generation, and contextual Next Best Action triggers.',
      icon: <Briefcase className="w-5 h-5 text-[#6A49C6]" />,
    },
  ];

  const module7Features = [
    { name: 'Financial Trust Graph', desc: 'Surfaces circular fund transfers and shell-entity relationships.' },
    { name: 'Cash-Flow Intelligence', desc: 'Evaluates seasonal volatility, bounce ratios, and debt-service capacity.' },
    { name: 'Evidence Provenance', desc: 'Direct bidirectional links between credit decisions and raw document nodes.' },
    { name: 'What-If Simulation', desc: 'Test hypothetical loan amounts, margins, and stress scenarios.' },
    { name: 'Decision Replay', desc: 'Chronological replay of how evidence and rules led to the recommendation.' },
    { name: 'Fraud & Inconsistency Graph', desc: 'Cross-checks GST outward supplies with bank credit entries.' },
    { name: 'Human Feedback Loop', desc: 'Captures underwriter override rationale to refine future rules.' },
    { name: 'Journey Friction Detection', desc: 'Surfaces stage drop-offs and missing evidence bottlenecks.' },
  ];

  return (
    <section id="intelligence" className="py-20 bg-gradient-to-b from-[#F8FAFC] to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#0F4C81]">
            Comprehensive System Architecture
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B1F3A] tracking-tight leading-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Seven layers of intelligence
          </h2>
          <p className="text-sm sm:text-base text-[#475569] leading-relaxed pt-1">
            Engineered as a modular, enterprise-grade architecture that moves from intent understanding to institutional trust intelligence.
          </p>
        </div>

        {/* Modules 1 to 6 Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m) => (
            <div
              key={m.num}
              className="p-6 rounded-2xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] shadow-2xs hover:shadow-xs transition-all relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono font-black text-[#0F4C81] px-2 py-0.5 rounded bg-[#EEF8F7] border border-[#12B8C8]/20">
                    MODULE {m.num}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
                    {m.icon}
                  </div>
                </div>

                <h3 className="text-base font-black text-[#0B1F3A]">
                  {m.title}
                </h3>
                <p className="text-xs text-[#475569] mt-2 leading-relaxed">
                  {m.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center gap-1.5 text-[11px] font-semibold text-[#0F4C81]">
                <span>Active Layer</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C98A]" />
              </div>
            </div>
          ))}
        </div>

        {/* ── MODULE 7: SPECIAL EMPHASIS HERO CARD ── */}
        <div className="mt-8 relative rounded-3xl bg-[#0B1F3A] text-white p-7 sm:p-10 border-2 border-[#12B8C8]/40 shadow-xl overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#1687F7]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#12B8C8]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {/* Tag & Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#12B8C8]/20 border border-[#12B8C8]/40 text-xs font-bold text-[#12B8C8]">
                  <Sparkles className="w-3.5 h-3.5 text-[#22C98A]" />
                  <span>ADVANCED PINNACLE LAYER · MODULE 07</span>
                </div>
                <h3
                  className="text-2xl sm:text-3xl font-black text-white"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  Financial Trust Intelligence
                </h3>
                <p className="text-xs sm:text-sm text-[#94A3B8] max-w-2xl leading-relaxed">
                  The crowning intelligence system operating continuously on top of the core modules — synthesizing entity graphs, counterfactual simulations, and continuous audit feedback.
                </p>
              </div>

              <Link
                to="/demo"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#1687F7] to-[#12B8C8] hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider shrink-0 transition-all shadow-md"
              >
                <span>Launch Graph Demo</span>
                <ArrowRight className="w-4 h-4 text-[#0B1F3A]" />
              </Link>
            </div>

            {/* 8 Features of Module 7 Grid */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {module7Features.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#12B8C8]/50 hover:bg-white/10 transition-all flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C98A]" />
                      <span>{feat.name}</span>
                    </h4>
                    <p className="text-[11px] text-[#94A3B8] mt-1.5 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
