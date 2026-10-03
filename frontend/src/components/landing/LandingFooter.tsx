import React from 'react';
import { Link } from 'react-router-dom';
import { FinFlowLogo } from '../ui/FinFlowLogo';
import { ArrowUpRight, Zap, ShieldCheck } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="bg-white border-t border-[#E2E8F0] pt-14 pb-8 text-xs text-[#475569]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-[#E2E8F0]">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <FinFlowLogo size="md" className="h-11 sm:h-12" />
            </Link>
            <p className="text-xs text-[#0F4C81] font-bold">
              "Financial Journey Orchestration for MSMEs"
            </p>
            <p className="text-xs text-[#64748B] max-w-sm leading-relaxed">
              Turn fragmented financial journeys into one intelligent, explainable, and actionable flow. From intent to evidence, risk, decision and action.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EEF8F7] text-[#0F4C81] font-bold text-[11px] border border-[#12B8C8]/30">
                <ShieldCheck className="w-3.5 h-3.5 text-[#22C98A]" />
                MindCraft Hackathon 2026 · Team RAY
              </span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-[#0B1F3A] uppercase tracking-wider text-[11px]">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#solution" className="hover:text-[#0F4C81] transition-colors">
                  Journey Orchestration
                </a>
              </li>
              <li>
                <a href="#intelligence" className="hover:text-[#0F4C81] transition-colors">
                  Document Intelligence
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#0F4C81] transition-colors">
                  Risk Intelligence
                </a>
              </li>
              <li>
                <a href="#explainability" className="hover:text-[#0F4C81] transition-colors">
                  Explainable Decisions
                </a>
              </li>
              <li>
                <a href="#solution" className="hover:text-[#0F4C81] transition-colors">
                  Next Best Action
                </a>
              </li>
              <li>
                <a href="#trust-intelligence" className="hover:text-[#0F4C81] transition-colors text-[#1687F7] font-semibold">
                  Financial Trust Intelligence
                </a>
              </li>
            </ul>
          </div>

          {/* Company & Resources */}
          <div className="space-y-3">
            <h4 className="font-bold text-[#0B1F3A] uppercase tracking-wider text-[11px]">
              Company & Docs
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#problem" className="hover:text-[#0F4C81] transition-colors">
                  About FinFlow AI
                </a>
              </li>
              <li>
                <a href="#roles" className="hover:text-[#0F4C81] transition-colors">
                  For Institutions
                </a>
              </li>
              <li>
                <Link to="/demo" className="hover:text-[#0F4C81] transition-colors flex items-center gap-1">
                  <span>Demo Hub</span>
                  <ArrowUpRight className="w-3 h-3 text-[#1687F7]" />
                </Link>
              </li>
              <li>
                <a href="#security" className="hover:text-[#0F4C81] transition-colors">
                  Security Architecture
                </a>
              </li>
              <li>
                <span className="text-[#94A3B8] cursor-not-allowed">
                  API Documentation <span className="text-[9px] bg-[#F1F5F9] px-1.5 py-0.5 rounded text-[#64748B]">v2.1</span>
                </span>
              </li>
            </ul>
          </div>

          {/* Legal & Governance */}
          <div className="space-y-3">
            <h4 className="font-bold text-[#0B1F3A] uppercase tracking-wider text-[11px]">
              Governance & Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#security" className="hover:text-[#0F4C81] transition-colors">
                  Responsible AI Policy
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-[#0F4C81] transition-colors">
                  Data Governance & Privacy
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-[#0F4C81] transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-[#0F4C81] transition-colors">
                  Evidence Retention Standards
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Bottom */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#64748B]">
          <div>
            © 2026 FinFlow AI. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <a href="#solution" className="hover:text-[#0F172A] transition-colors">
              Explainable Credit
            </a>
            <span>•</span>
            <a href="#security" className="hover:text-[#0F172A] transition-colors">
              Human-in-the-Loop
            </a>
            <span>•</span>
            <Link to="/signin" className="font-bold text-[#0F4C81] hover:underline">
              Institutional Sign In
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
};
