import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth, PERSONAS } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Zap, ArrowRight, ShieldCheck, UserCheck, AlertTriangle, Settings,
  Activity, Sparkles, FileText, CheckCircle2, ChevronRight, Building2
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const LandingPage: React.FC = () => {
  const { switchRole, setActiveJourneyId } = useAuth();

  const handleSelectPersona = (role: UserRole, journeyId: string) => {
    switchRole(role);
    setActiveJourneyId(journeyId);
  };

  const personaCards = [
    {
      role: 'CUSTOMER' as UserRole,
      title: 'SME Customer Portal',
      personaName: 'Priya Sharma',
      desc: 'Experience frictionless working capital application, transparent document ledger, and instant e-sanctions.',
      journeyId: 'jrn_priya_001',
      route: '/customer',
      icon: <UserCheck className="w-6 h-6 text-[var(--fin-green)]" />,
      accentColor: 'border-[var(--fin-green)]',
      badgeText: 'Applicant Flow',
    },
    {
      role: 'RM' as UserRole,
      title: 'Relationship Manager (RM)',
      personaName: 'Rohan Mehta',
      desc: 'Triage multi-borrower application queue, reconcile GST vs bank credits, and guide applicants.',
      journeyId: 'jrn_kavita_002',
      route: '/rm',
      icon: <ShieldCheck className="w-6 h-6 text-[var(--fin-blue)]" />,
      accentColor: 'border-[var(--fin-blue)]',
      badgeText: 'Underwriting Flow',
    },
    {
      role: 'RISK_OFFICER' as UserRole,
      title: 'Risk & Compliance Console',
      personaName: 'Ananya Iyer',
      desc: 'Detect circular fund routing on the Financial Trust Graph, inspect SHAP waterfalls, and execute overrides.',
      journeyId: 'jrn_apex_003',
      route: '/risk',
      icon: <AlertTriangle className="w-6 h-6 text-[var(--fin-amber)]" />,
      accentColor: 'border-[var(--fin-amber)]',
      badgeText: 'Fraud & Graph Control',
    },
    {
      role: 'ADMIN' as UserRole,
      title: 'Governance & Observability',
      personaName: 'System Administrator',
      desc: 'Straight-through processing rates, latency telemetry, and active learning credit rule calibration.',
      journeyId: 'jrn_priya_001',
      route: '/admin',
      icon: <Settings className="w-6 h-6 text-[var(--fin-violet)]" />,
      accentColor: 'border-[var(--fin-violet)]',
      badgeText: 'System Telemetry',
    },
  ];

  return (
    <div className="space-y-10 py-4">
      {/* Hero Section */}
      <div className="p-8 sm:p-12 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[6px_6px_0px_#0A1F20] relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)] text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-[var(--brand-600)]" />
            MindCraft Hackathon 2026 · Fintech Innovation
          </div>

          <h1
            className="text-3xl sm:text-5xl font-black text-[var(--brand-950)] tracking-tight leading-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Intelligent & Explainable <br className="hidden sm:inline" />
            <span className="text-[var(--brand-700)] underline decoration-[var(--brand-300)] decoration-4">
              Financial Journey Orchestration
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            FinFlow AI transforms fragmented SME lending into a continuous, verifiable journey.
            Deterministic underwriting guardrails paired with scikit-learn models, SHAP feature attributions,
            and interactive Financial Trust Graphs for zero-hallucination institutional credit decisions.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link to="/customer/apply">
              <Button variant="brutal" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Start New SME Application
              </Button>
            </Link>

            <Link to="/demo">
              <Button variant="secondary" size="md" leftIcon={<Sparkles className="w-4 h-4" />}>
                Launch Benchmark Scenarios
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Persona Gateways */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[var(--brand-950)] tracking-tight">
              Select Operating Persona
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Explore FinFlow AI from each stakeholder's perspective with pre-configured authority
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {personaCards.map((card) => (
            <div
              key={card.role}
              className={`p-6 rounded-2xl bg-white border-2 border-[var(--brand-950)] shadow-[3px_3px_0px_#0A1F20] flex flex-col justify-between hover:translate-y-[-2px] transition-all`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-center border border-[var(--border)]">
                    {card.icon}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-muted)]">
                    {card.badgeText}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-[var(--brand-950)]">
                    {card.title}
                  </h3>
                  <p className="text-xs font-semibold text-[var(--brand-700)] mt-0.5">
                    {card.personaName}
                  </p>
                </div>

                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {card.desc}
                </p>
              </div>

              <div className="pt-6">
                <Link
                  to={card.route}
                  onClick={() => handleSelectPersona(card.role, card.journeyId)}
                >
                  <Button variant="secondary" size="xs" className="w-full" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                    Enter as {card.role}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3 Benchmark Scenarios Overview */}
      <div className="p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs space-y-4">
        <h3 className="text-base font-black text-[var(--brand-950)] flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[var(--brand-700)]" /> Pre-Seeded Hackathon Benchmark Cases
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            to="/customer/journey/jrn_priya_001"
            onClick={() => handleSelectPersona('CUSTOMER', 'jrn_priya_001')}
            className="p-4 rounded-xl border border-[var(--fin-green)]/30 bg-[var(--fin-green-bg)]/30 hover:bg-[var(--fin-green-bg)]/60 transition-colors"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-xs text-[var(--brand-950)]">1. Sharma Textiles Pvt Ltd</span>
              <span className="text-[10px] font-bold text-[var(--fin-green)] px-2 py-0.5 rounded bg-white">APPROVED</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Prime Tier: ₹15L Facility · 48m Vintage · DSCR 1.85x · Zero Cheque Bounces
            </p>
          </Link>

          <Link
            to="/customer/journey/jrn_kavita_002"
            onClick={() => handleSelectPersona('RM', 'jrn_kavita_002')}
            className="p-4 rounded-xl border border-[var(--fin-amber)]/30 bg-[var(--fin-amber-bg)]/30 hover:bg-[var(--fin-amber-bg)]/60 transition-colors"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-xs text-[var(--brand-950)]">2. Kavita Electronics</span>
              <span className="text-[10px] font-bold text-[var(--fin-amber)] px-2 py-0.5 rounded bg-white">CONDITIONAL</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Borderline: ₹25L Facility · 30m Vintage · DSCR 1.30x · Promoter Co-Obligation
            </p>
          </Link>

          <Link
            to="/risk/cases/jrn_apex_003"
            onClick={() => handleSelectPersona('RISK_OFFICER', 'jrn_apex_003')}
            className="p-4 rounded-xl border border-[var(--fin-coral)]/30 bg-[var(--fin-coral-bg)]/30 hover:bg-[var(--fin-coral-bg)]/60 transition-colors"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-xs text-[var(--brand-950)]">3. Apex Logistics & Freight</span>
              <span className="text-[10px] font-bold text-[var(--fin-coral)] px-2 py-0.5 rounded bg-white">NEEDS REVIEW</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Fraud Detection: Circular Trading · Shell Entity · GST Revenue Discrepancy
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};
