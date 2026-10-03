import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

export const CTASection: React.FC = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-[#0B1F3A] text-white p-8 sm:p-14 border-2 border-[#0F4C81] shadow-2xl overflow-hidden text-center">
          
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/3 w-80 h-80 bg-[#1687F7]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#12B8C8]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-[#12B8C8]">
              <Sparkles className="w-3.5 h-3.5 text-[#22C98A]" />
              <span>Orchestrated Financial Journey for MSMEs</span>
            </div>

            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Ready to simplify the financial journey?
            </h2>

            <p className="text-sm sm:text-base text-[#CBD5E1] max-w-2xl mx-auto leading-relaxed">
              Experience a guided, evidence-backed and explainable financial workflow with FinFlow AI. From intent to evidence, risk, decision and action.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#1687F7] to-[#12B8C8] hover:opacity-95 text-white font-black text-sm uppercase tracking-wider shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 text-[#0B1F3A]" />
              </Link>

              <Link
                to="/signin"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/20 transition-all"
              >
                <span>Sign In</span>
              </Link>

              <Link
                to="/demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-bold text-[#22C98A] hover:underline"
              >
                <span>Explore Interactive Demo</span>
              </Link>
            </div>

            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-[#94A3B8]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#22C98A]" />
                No credit card required for evaluation
              </span>
              <span>•</span>
              <span>FastAPI & Firebase Architecture</span>
              <span>•</span>
              <span>SHAP Zero-Hallucination Explanations</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
