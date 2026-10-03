import React, { useState } from 'react';
import {
  User, Users, ShieldAlert, CheckCircle2, ArrowRight,
  FileText, Sparkles, Building2, Eye, Compass
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const RoleSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customer' | 'rm' | 'risk'>('customer');

  const personas = {
    customer: {
      role: 'MSME Business Owner',
      headline: 'Empowering small enterprises with radical financial clarity.',
      desc: 'No confusing bank jargon, repetitive in-person visits, or black-box rejections. The borrower experiences a guided digital journey with clear status indicators and actionable remedies.',
      icon: <User className="w-5 h-5 text-[#22C98A]" />,
      route: '/customer',
      badge: 'Borrower Perspective',
      color: '#22C98A',
      needs: [
        'Simple, jargon-free natural-language intent capture',
        'Transparent document requirements checklist with instant OCR validation',
        'Human-readable explanation of credit terms and requirements',
        'Proactive Next Best Action guiding next steps and disbursement',
      ],
      preview: {
        title: 'Customer Dashboard Preview',
        subtitle: 'Sharma Textiles Pvt. Ltd. · Working Capital Facility',
        status: 'Sanction Ready',
        statusColor: 'text-[#22C98A] bg-[#E5F7F1]',
        highlight: 'Next Step: E-Sign digital sanction letter & authorize e-NACH mandate.',
      },
    },
    rm: {
      role: 'Relationship Manager (RM)',
      headline: 'Accelerating commercial underwriting queues with zero friction.',
      desc: 'Loan officers gain an immediate multi-borrower triage console that flags missing GST returns, highlights revenue discrepancies, and automates credit memo generation.',
      icon: <Users className="w-5 h-5 text-[#1687F7]" />,
      route: '/rm',
      badge: 'Lending Officer Flow',
      color: '#1687F7',
      needs: [
        'Centralized multi-application queue with automated priority sorting',
        'Instant alerts for missing or unverified financial evidence',
        'Synthesized risk and cash-flow summaries cross-referencing GST vs bank inflows',
        'One-click client clarification and guidance triggers',
      ],
      preview: {
        title: 'Underwriting Triage Queue',
        subtitle: '14 Active Cases · 3 Requiring Evidence Clarification',
        status: 'Action Required',
        statusColor: 'text-[#C98A10] bg-[#FEF3D9]',
        highlight: 'Triage Recommendation: Request Q4 GSTR-3B from Kavita Electronics.',
      },
    },
    risk: {
      role: 'Risk & Compliance Officer',
      headline: 'Institutional credit governance and fraud graph oversight.',
      desc: 'Chief Risk Officers and compliance leads inspect full SHAP waterfalls, verify evidence provenance down to the page level, and execute governed human overrides.',
      icon: <ShieldAlert className="w-5 h-5 text-[#C98A10]" />,
      route: '/risk',
      badge: 'Institutional Governance',
      color: '#C98A10',
      needs: [
        'Complete evidence provenance tracing every model input back to certified source files',
        'Interpretable SHAP feature attributions and factor contributions',
        'Immutable append-only audit trail logging every system transition',
        'Governed human review gates and policy calibration feedback loop',
      ],
      preview: {
        title: 'Risk & Fraud Intelligence Console',
        subtitle: 'Trust Graph Analysis · Zero Circular Routing Detected',
        status: 'Audited & Governed',
        statusColor: 'text-[#0F4C81] bg-[#EEF8F7]',
        highlight: 'Compliance Note: All mandatory policy guardrails satisfied (DSCR > 1.25x).',
      },
    },
  };

  const current = personas[activeTab];

  return (
    <section id="roles" className="py-20 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#0F4C81]">
            Multi-Persona Experience
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B1F3A] tracking-tight leading-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            One platform. Different perspectives.
          </h2>
          <p className="text-sm sm:text-base text-[#475569] leading-relaxed pt-1">
            Tailored interfaces engineered specifically for borrowers, underwriting officers, and institutional risk committees.
          </p>
        </div>

        {/* Persona Tabs */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs gap-1.5">
            <button
              onClick={() => setActiveTab('customer')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'customer'
                  ? 'bg-[#0B1F3A] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0B1F3A] hover:bg-[#F8FAFC]'
              }`}
            >
              <User className="w-4 h-4 text-[#22C98A]" />
              <span>MSME Owner</span>
            </button>

            <button
              onClick={() => setActiveTab('rm')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'rm'
                  ? 'bg-[#0B1F3A] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0B1F3A] hover:bg-[#F8FAFC]'
              }`}
            >
              <Users className="w-4 h-4 text-[#1687F7]" />
              <span>Relationship Manager</span>
            </button>

            <button
              onClick={() => setActiveTab('risk')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'risk'
                  ? 'bg-[#0B1F3A] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0B1F3A] hover:bg-[#F8FAFC]'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-[#C98A10]" />
              <span>Risk & Compliance</span>
            </button>
          </div>
        </div>

        {/* Selected Persona Detail Card */}
        <div className="mt-8 p-6 sm:p-10 rounded-3xl bg-white border-2 border-[#0B1F3A] shadow-[6px_6px_0px_#0B1F3A]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Description & Needs */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-bold text-[#0F4C81]">
                {current.icon}
                <span>{current.badge}</span>
              </div>

              <h3
                className="text-2xl sm:text-3xl font-black text-[#0B1F3A]"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {current.role}
              </h3>

              <p className="text-sm font-bold text-[#0F4C81]">
                {current.headline}
              </p>

              <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                {current.desc}
              </p>

              {/* Persona Needs Checklist */}
              <div className="pt-2 space-y-2">
                <span className="text-[11px] uppercase font-extrabold tracking-wider text-[#64748B] block">
                  Core Requirements Solved:
                </span>
                <ul className="space-y-2">
                  {current.needs.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-[#0F172A]">
                      <CheckCircle2 className="w-4 h-4 text-[#22C98A] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4">
                <Link
                  to={current.route}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B1F3A] hover:bg-[#0F4C81] text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <span>Open {current.role} View</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#22C98A]" />
                </Link>
              </div>
            </div>

            {/* Right Preview Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                      {current.preview.title}
                    </span>
                    <h5 className="text-xs font-black text-[#0B1F3A] mt-0.5">
                      {current.preview.subtitle}
                    </h5>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${current.preview.statusColor}`}>
                    {current.preview.status}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#0B1F3A] leading-relaxed">
                  <span className="font-bold block mb-1">Contextual Highlight:</span>
                  {current.preview.highlight}
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                  <span>Role Permission: Authenticated</span>
                  <span>FastAPI Verified JWT</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
