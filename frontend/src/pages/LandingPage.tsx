import React, { useEffect } from 'react';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { HeroSection } from '../components/landing/HeroSection';
import { TrustStrip } from '../components/landing/TrustStrip';
import { ProblemSection } from '../components/landing/ProblemSection';
import { SolutionSection } from '../components/landing/SolutionSection';
import { IntelligenceModules } from '../components/landing/IntelligenceModules';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { ExplainabilitySection } from '../components/landing/ExplainabilitySection';
import { TrustIntelligenceSection } from '../components/landing/TrustIntelligenceSection';
import { RoleSection } from '../components/landing/RoleSection';
import { SecuritySection } from '../components/landing/SecuritySection';
import { CTASection } from '../components/landing/CTASection';
import { LandingFooter } from '../components/landing/LandingFooter';

export const LandingPage: React.FC = () => {
  // Update document title and description on mount
  useEffect(() => {
    document.title = 'FinFlow AI — Financial Journey Orchestration for MSMEs';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'FinFlow AI orchestrates MSME financial journeys from intent and evidence to risk, explainable decisions and next best actions.'
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col selection:bg-[#12B8C8]/20 selection:text-[#0B1F3A]">
      {/* 1. Sticky Navigation Bar */}
      <LandingNavbar />

      {/* Main Page Flow */}
      <main className="flex-1">
        {/* 2. Hero Section */}
        <HeroSection />

        {/* 3. Trust Strip */}
        <TrustStrip />

        {/* 4. Problem Statement */}
        <ProblemSection />

        {/* 5. The FinFlow Solution Pipeline */}
        <SolutionSection />

        {/* 6. Seven Layers of Intelligence (with Module 7 Emphasis) */}
        <IntelligenceModules />

        {/* 7. How It Works Timeline */}
        <HowItWorksSection />

        {/* 8. Explainability & Transparent AI Reasoning */}
        <ExplainabilitySection />

        {/* 9. Financial Trust Intelligence & What-If Simulation */}
        <TrustIntelligenceSection />

        {/* 10. Multi-Persona / Role Experience */}
        <RoleSection />

        {/* 11. Security, Auditability & Governance Architecture */}
        <SecuritySection />

        {/* 12. Final High-Impact CTA */}
        <CTASection />
      </main>

      {/* 13. Institutional Footer */}
      <LandingFooter />
    </div>
  );
};
