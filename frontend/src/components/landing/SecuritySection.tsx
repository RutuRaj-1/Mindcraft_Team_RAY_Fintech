import React from 'react';
import {
  ShieldCheck, Lock, KeyRound, Database, FileCheck,
  UserCheck2, Sparkles, Scale, CheckCircle2
} from 'lucide-react';

export const SecuritySection: React.FC = () => {
  const securityPillars = [
    {
      title: 'Firebase Authentication',
      desc: 'Industry-standard token lifecycle management, session persistence across tabs, and secure client-side cryptographic token verification.',
      icon: <Lock className="w-5 h-5 text-[#0F4C81]" />,
    },
    {
      title: 'Role-Based Access Control (RBAC)',
      desc: 'Hierarchical permission gates enforced at both route levels and backend FastAPI dependency injections (Customer, RM, Risk Officer, Admin).',
      icon: <KeyRound className="w-5 h-5 text-[#1687F7]" />,
    },
    {
      title: 'Secure API Communication',
      desc: 'Cryptographically validated Bearer JWT tokens attached to all protected FastAPI endpoints with automatic token freshness refresh.',
      icon: <ShieldCheck className="w-5 h-5 text-[#12B8C8]" />,
    },
    {
      title: 'Evidence Traceability',
      desc: 'All source GST, ITR, and banking documents are indexed with SHA-256 integrity hashes to safeguard against tampering.',
      icon: <FileCheck className="w-5 h-5 text-[#22C98A]" />,
    },
    {
      title: 'Append-Only Audit Logging',
      desc: 'Immutable audit log collection capturing every stage transition, OCR extraction event, and underwriting evaluation for full governance replay.',
      icon: <Database className="w-5 h-5 text-[#6A49C6]" />,
    },
    {
      title: 'Controlled AI Actions & Human Review',
      desc: 'Strictly bounded LLM orchestration without autonomous lending power; institutional underwriters retain absolute discretion and override control.',
      icon: <UserCheck2 className="w-5 h-5 text-[#C98A10]" />,
    },
  ];

  return (
    <section id="security" className="py-20 bg-white border-t border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#0F4C81]">
            Engineering & Governance Rigor
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B1F3A] tracking-tight leading-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Built for financial trust.
          </h2>
          <p className="text-sm sm:text-base text-[#475569] leading-relaxed pt-1">
            FinFlow AI enforces strict defense-in-depth architectural boundaries across identity, data persistence, and model execution.
          </p>
        </div>

        {/* 6 Security Pillars Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityPillars.map((p, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] shadow-2xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center mb-4 shadow-2xs">
                  {p.icon}
                </div>
                <h3 className="text-base font-black text-[#0B1F3A]">
                  {p.title}
                </h3>
                <p className="text-xs text-[#475569] mt-2 leading-relaxed">
                  {p.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center gap-1.5 text-[10px] font-bold text-[#0F4C81]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22C98A]" />
                <span>Enforced by Design</span>
              </div>
            </div>
          ))}
        </div>

        {/* Explicit Institutional Governance Statement Banner */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-[#EEF8F7] border-2 border-[#12B8C8]/40 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0F4C81] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Scale className="w-6 h-6 text-[#12B8C8]" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81]">
                Governance Disclaimer & Institutional Boundary
              </span>
              <p className="text-xs sm:text-sm text-[#0B1F3A] font-semibold leading-relaxed">
                "FinFlow AI is designed to support financial decision workflows; final institutional decisions remain subject to configured policies and human governance."
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
