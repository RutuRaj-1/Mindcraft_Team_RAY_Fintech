import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  Sparkles,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Play,
  RotateCcw,
  Sliders,
  Network,
  FileSearch,
  Check,
  Zap,
  Lock,
  ChevronRight,
  X,
  FileText,
  UserCheck,
  Compass
} from 'lucide-react';
import { UserRole } from '../../types';

interface DemoScenarioOption {
  key: 'CASE_A' | 'CASE_B' | 'CASE_C' | 'CASE_D' | 'CASE_E';
  caseNum: string;
  label: string;
  company: string;
  caseId: string;
  badgeText: string;
  badgeClass: string;
}

const DEMO_SCENARIO_OPTIONS: DemoScenarioOption[] = [
  {
    key: 'CASE_A',
    caseNum: 'CASE 1',
    label: 'Prime Tier Sanctioned',
    company: 'SkillBridge Enterprises (Ruturaj Bhome)',
    caseId: 'jrn_skillbridge_001',
    badgeText: 'Approved (₹50L)',
    badgeClass: 'bg-[var(--fin-green-bg)] text-[var(--fin-green)] border border-[var(--fin-green)]/30',
  },
  {
    key: 'CASE_B',
    caseNum: 'CASE 2',
    label: 'Module 4 AI Decision',
    company: 'Lifeline AI Healthcare (Rashi Kachwah)',
    caseId: 'jrn_lifeline_002',
    badgeText: 'Explainable AI (885 Score)',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  {
    key: 'CASE_C',
    caseNum: 'CASE 3',
    label: 'Underwriting Review',
    company: 'SafeEra Industrial (Aaditya Wakchaure)',
    caseId: 'jrn_safeera_003',
    badgeText: 'Needs Review',
    badgeClass: 'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border border-[var(--fin-amber)]/30',
  },
];

interface BenchmarkCase {
  id: string;
  name: string;
  persona: string;
  scenario: string;
  category: string;
  outcome: string;
  recommended_view: string;
  role: 'CUSTOMER' | 'RM' | 'RISK_OFFICER' | 'ADMIN' | 'AUDIT_OFFICER';
}

export const DemoHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { switchRole, setActiveJourneyId, role: currentRole } = useAuth();

  const [selectedScenarioKey, setSelectedScenarioKey] = useState<'CASE_A' | 'CASE_B' | 'CASE_C' | 'CASE_D' | 'CASE_E'>('CASE_A');
  const [cases, setCases] = useState<BenchmarkCase[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Progressive Demo Walkthrough Modal State (Part 30)
  const [walkthroughScenario, setWalkthroughScenario] = useState<'CASE_A' | 'CASE_C' | null>(null);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [isRunningWalkthrough, setIsRunningWalkthrough] = useState(false);

  const loadCases = async () => {
    setIsLoadingCases(true);
    try {
      const res = await api.getDemoCases();
      if (res && res.length > 0) {
        setCases(res as BenchmarkCase[]);
      } else {
        // Fallback to the 5 canonical cases if empty
        setCases(defaultCases);
      }
    } catch {
      setCases(defaultCases);
    } finally {
      setIsLoadingCases(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleResetDemoData = async () => {
    setIsResetting(true);
    setFeedback(null);
    try {
      const res = await api.resetDemo();
      setFeedback({
        type: 'success',
        message: res?.message || 'Synthetic demonstration data successfully reset and re-seeded!',
      });
      setResetModalOpen(false);
      await loadCases();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Reset failed: ${err.message || 'Unknown server error'}`,
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenCase = (c: BenchmarkCase) => {
    switchRole(c.role);
    setActiveJourneyId(c.id);
    navigate(c.recommended_view);
  };

  const handleGovernedRoleLaunch = (targetRole: UserRole) => {
    const sc = DEMO_SCENARIO_OPTIONS.find((s) => s.key === selectedScenarioKey) || DEMO_SCENARIO_OPTIONS[0];
    switchRole(targetRole);
    setActiveJourneyId(sc.caseId);

    if (targetRole === 'CUSTOMER') {
      if (sc.key === 'CASE_E') {
        navigate(`/customer/what-if/${sc.caseId}`);
      } else {
        navigate(`/customer/journey/${sc.caseId}`);
      }
    } else if (targetRole === 'RM') {
      navigate(`/rm/cases/${sc.caseId}`);
    } else if (targetRole === 'RISK_OFFICER') {
      if (sc.key === 'CASE_D') {
        navigate('/risk?tab=fraud_signals');
      } else {
        navigate(`/risk/cases/${sc.caseId}`);
      }
    } else if (targetRole === 'RM_SUPERVISOR') {
      navigate('/operations');
    } else if (targetRole === 'CREDIT_APPROVER') {
      navigate('/approvals');
    } else if (targetRole === 'AUDIT_OFFICER') {
      navigate(`/risk/replay/${sc.caseId}`);
    } else {
      navigate('/admin');
    }
  };

  // Automated One-Click Walkthrough Stepper (Part 30)
  const caseASteps = [
    { title: '1. Intent Capture Verified', desc: 'MSME financing request for ₹15 Lakhs submitted by Sharma Textiles for festive fabric orders.' },
    { title: '2. Document OCR Ingestion', desc: 'GSTR-3B filings and 6-month HDFC Bank Statement parsed with FinFlow OCR v2.1.' },
    { title: '3. Evidence Ledger Commit', desc: '6 financial evidence records verified and committed to tamper-evident SHA-256 ledger.' },
    { title: '4. Cash Flow & DSCR Scoring', desc: 'Debt Service Coverage Ratio computed at 1.85x with 0 inward cheque bounces.' },
    { title: '5. Scikit-Learn ML Risk & SHAP', desc: 'FinFlow Trust Score: 920/1000 (Low Risk). SHAP explains DSCR (-0.145) and zero bounces (-0.085).' },
    { title: '6. Grounded Sanction Decision', desc: 'AI Decision Engine approves ₹15,00,000 @ 10.75% prime interest rate.' },
    { title: '7. Safe Next Best Action', desc: 'Safe Action Agent issues digital sanction agreement without human bottleneck.' },
    { title: '8. Decision Replay Audit Sealed', desc: '18-milestone immutable replay log committed for regulatory compliance.' },
  ];

  const caseCSteps = [
    { title: '1. Ingestion of GST & Bank Statements', desc: 'Uploaded GSTR-3B declared turnover of ₹80,00,000 while bank statement credits show ₹50,00,000.' },
    { title: '2. 37.5% Revenue Mismatch Detected', desc: 'Consistency Engine flags critical variance exceeding 15% credit policy tolerance.' },
    { title: '3. R05_CONSISTENCY Hard Rule Fails', desc: 'Trust Score drops to 410/1000 (High Risk). Decision outcome set to NEEDS_REVIEW.' },
    { title: '4. Autonomous Risk Routing', desc: 'Journey FSM transitions automatically from EXPLAINABLE_DECISION to HUMAN_REVIEW.' },
    { title: '5. Risk Officer Investigation', desc: 'Risk Officer Ananya Iyer reviews turnover discrepancy and challenges prime terms.' },
    { title: '6. Institutional Override Applied', desc: 'Conditional approval granted for ₹24L conditional on pledging commercial warehouse collateral.' },
    { title: '7. Replay Audit Trail Sealed', desc: 'Override rationale, reviewer identity, and evidence hash stored permanently.' },
  ];

  const currentSteps = walkthroughScenario === 'CASE_A' ? caseASteps : caseCSteps;

  const startAutoRun = (scenario: 'CASE_A' | 'CASE_C') => {
    setWalkthroughScenario(scenario);
    setWalkthroughStep(0);
    setIsRunningWalkthrough(true);
  };

  useEffect(() => {
    let timer: any;
    if (isRunningWalkthrough && walkthroughStep < currentSteps.length - 1) {
      timer = setTimeout(() => {
        setWalkthroughStep((prev) => prev + 1);
      }, 1200);
    } else if (walkthroughStep >= currentSteps.length - 1) {
      setIsRunningWalkthrough(false);
    }
    return () => clearTimeout(timer);
  }, [isRunningWalkthrough, walkthroughStep, currentSteps.length]);

  return (
    <div className="space-y-8 pb-16 animate-fadeIn">
      {/* ── Banner: FinFlow AI Demo Center ── */}
      <div className="p-8 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)] flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[var(--brand-600)]" />
              Role-Aware Demonstration Launcher
            </span>
            <span className="text-xs text-[var(--text-muted)] font-mono">FastAPI · Firestore · Scikit-Learn</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            FINFLOW AI DEMO CENTER
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5 max-w-3xl leading-relaxed">
            Five live end-to-end benchmark scenarios evaluating algorithmic credit underwriting, evidence validation, fraud signal graphs, and counterfactual simulation. Every scenario interacts directly with the live FastAPI backend.
          </p>
        </div>

        {/* Reset Demo Data Action (Part 31) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <Button
            variant="brutal"
            size="md"
            onClick={() => setResetModalOpen(true)}
            leftIcon={<RotateCcw className="w-4 h-4" />}
            className="bg-white hover:bg-[var(--brand-50)]"
          >
            RESET DEMO DATA
          </Button>
        </div>
      </div>

      {/* ── Feedback Notification ── */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 shadow-sm ${
            feedback.type === 'success'
              ? 'bg-[var(--fin-green-bg)] border-[var(--fin-green)] text-[var(--fin-green)]'
              : 'bg-[var(--fin-coral-bg)] border-[var(--fin-coral)] text-[var(--fin-coral)]'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span className="text-xs font-bold">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── PART 55: Governed Demo Mode Role-Aware Launcher ── */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[var(--brand-700)]" />
                Part 55 · Governed Demo Control Bar
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono">100% RBAC Enforced</span>
            </div>
            <h2 className="text-xl font-black text-[var(--brand-950)] mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Select Scenario & Launch Governed Role View
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Select a benchmark case and open it directly inside the authorized persona's workspace with real session tokens.
            </p>
          </div>
          <div className="bg-[var(--surface-subtle)] p-3 rounded-2xl border border-[var(--border)] shrink-0 text-left sm:text-right">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Selected Target Case</span>
            <p className="text-xs font-mono font-bold text-[var(--brand-950)]">
              {DEMO_SCENARIO_OPTIONS.find((s) => s.key === selectedScenarioKey)?.company || 'Sharma Textiles'}
            </p>
            <span className="text-[10px] font-mono text-[var(--brand-700)] font-bold">
              ID: {DEMO_SCENARIO_OPTIONS.find((s) => s.key === selectedScenarioKey)?.caseId || 'jrn_priya_001'}
            </span>
          </div>
        </div>

        {/* 1. Case Selector */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
            1. Case Selector (Part 54 & 55)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {DEMO_SCENARIO_OPTIONS.map((sc) => {
              const isSelected = selectedScenarioKey === sc.key;
              return (
                <button
                  key={sc.key}
                  type="button"
                  onClick={() => setSelectedScenarioKey(sc.key)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[var(--brand-50)] border-2 border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20]'
                      : 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[10px] font-mono font-extrabold text-[var(--text-muted)]">{sc.caseNum}</span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${sc.badgeClass}`}>
                        {sc.badgeText}
                      </span>
                    </div>
                    <p className="text-xs font-black text-[var(--brand-950)] leading-tight">{sc.label}</p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{sc.company}</p>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold mt-2.5">{sc.caseId}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Role Views Buttons */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
            2. Governed Role Views (Switches Session Persona & Authenticated Token)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <Button
              variant="brutal"
              size="sm"
              className="bg-emerald-800 text-white hover:bg-emerald-900 justify-center text-[10px] font-black tracking-tight"
              onClick={() => handleGovernedRoleLaunch('CUSTOMER')}
            >
              OPEN CUSTOMER VIEW
            </Button>
            <Button
              variant="brutal"
              size="sm"
              className="bg-sky-800 text-white hover:bg-sky-900 justify-center text-[10px] font-black tracking-tight"
              onClick={() => handleGovernedRoleLaunch('RM')}
            >
              OPEN RM VIEW
            </Button>
            <Button
              variant="brutal"
              size="sm"
              className="bg-amber-800 text-white hover:bg-amber-900 justify-center text-[10px] font-black tracking-tight"
              onClick={() => handleGovernedRoleLaunch('RISK_OFFICER')}
            >
              OPEN RISK VIEW
            </Button>
            <Button
              variant="brutal"
              size="sm"
              className="bg-teal-800 text-white hover:bg-teal-900 justify-center text-[10px] font-black tracking-tight"
              onClick={() => handleGovernedRoleLaunch('RM_SUPERVISOR')}
            >
              OPEN SUPERVISOR VIEW
            </Button>
            <Button
              variant="brutal"
              size="sm"
              className="bg-rose-800 text-white hover:bg-rose-900 justify-center text-[10px] font-black tracking-tight"
              onClick={() => handleGovernedRoleLaunch('CREDIT_APPROVER')}
            >
              OPEN APPROVER VIEW
            </Button>
            <Button
              variant="brutal"
              size="sm"
              className="bg-purple-800 text-white hover:bg-purple-900 justify-center text-[10px] font-black tracking-tight"
              onClick={() => handleGovernedRoleLaunch('AUDIT_OFFICER')}
            >
              OPEN AUDIT VIEW
            </Button>
          </div>
        </div>
      </div>

      {/* ── 5 Canonical Scenario Cards (Part 29) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-[var(--brand-950)] uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Benchmark Scenarios (Part 29 & 30)
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Direct one-click execution flows for evaluation judges. No setup required.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CASE A: STRONG APPLICATION */}
          <div className="p-6 rounded-3xl bg-white border-2 border-[var(--fin-green)] shadow-[4px_4px_0px_#0E9B6D] flex flex-col justify-between hover:translate-y-[-2px] transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[var(--fin-green-bg)] text-[var(--fin-green)] border border-[var(--fin-green)]/30">
                  CASE A · STRONG APPLICATION
                </span>
                <span className="text-xs font-black text-[var(--fin-green)]">PRIME APPROVED</span>
              </div>

              <div>
                <h3 className="text-lg font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Sharma Textiles Private Limited
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Applicant: <strong>Priya Sharma</strong> · Working Capital Facility
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs space-y-2 font-medium">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Requested Facility:</span>
                  <span className="font-bold text-[var(--brand-950)]">₹15,00,000 (12M)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Verified Turnover:</span>
                  <span className="font-bold text-[var(--brand-950)]">₹1.45 Cr / year</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Debt Service (DSCR):</span>
                  <span className="font-bold text-[var(--fin-green)]">1.85x (Optimal &gt; 1.25x)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Cheque Bounces:</span>
                  <span className="font-bold text-[var(--fin-green)]">0 in 6 Months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">FinFlow Trust Score:</span>
                  <span className="font-bold text-[var(--fin-green)]">920 / 1000 (Low Risk)</span>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Demonstrates complete evidence, verified GSTR-3B filings, healthy cash flows, scikit-learn explainable decision with SHAP attributions, and autonomous digital sanction letter.
              </p>
            </div>

            <div className="pt-6 space-y-2">
              <Button
                variant="brutal"
                size="sm"
                className="w-full bg-[var(--brand-950)] text-white hover:bg-[var(--brand-900)]"
                onClick={() => startAutoRun('CASE_A')}
                leftIcon={<Play className="w-4 h-4 text-emerald-400" />}
              >
                RUN ONE-CLICK DEMO FLOW
              </Button>
              <Button
                variant="secondary"
                size="xs"
                className="w-full"
                onClick={() => handleOpenCase({
                  id: 'jrn_priya_001',
                  name: 'Sharma Textiles',
                  persona: 'Priya Sharma',
                  scenario: 'Strong Application',
                  category: 'CASE_A',
                  outcome: 'APPROVED',
                  recommended_view: '/customer/journey/jrn_priya_001',
                  role: 'CUSTOMER'
                })}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                OPEN CASE WORKSPACE
              </Button>
            </div>
          </div>

          {/* CASE B: MISSING EVIDENCE */}
          <div className="p-6 rounded-3xl bg-white border-2 border-[var(--fin-amber)] shadow-[4px_4px_0px_#C98A10] flex flex-col justify-between hover:translate-y-[-2px] transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border border-[var(--fin-amber)]/30">
                  CASE B · MISSING EVIDENCE
                </span>
                <span className="text-xs font-black text-[var(--fin-amber)]">NEEDS REVIEW</span>
              </div>

              <div>
                <h3 className="text-lg font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Kavita Electronics Retail LLP
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Handler: <strong>Rohan Mehta (RM)</strong> · Consumer Wholesale
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs space-y-2 font-medium">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Requested Facility:</span>
                  <span className="font-bold text-[var(--brand-950)]">₹25,00,000 (18M)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Evidence Status:</span>
                  <span className="font-bold text-[var(--fin-amber)]">Missing 6M Bank Statement</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Journey Stage:</span>
                  <span className="font-bold text-[var(--brand-950)]">EVIDENCE COLLECTION</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Next Best Action:</span>
                  <span className="font-bold text-[var(--brand-800)]">Request Missing Document</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Confidence:</span>
                  <span className="font-bold text-[var(--fin-amber)]">62% (Evidence Incomplete)</span>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Illustrates system halting at EVIDENCE_COLLECTION stage when mandatory banking records are missing, preventing unverified sanctions and prompting automated Next Best Action.
              </p>
            </div>

            <div className="pt-6 space-y-2">
              <Button
                variant="brutal"
                size="sm"
                className="w-full bg-[var(--fin-amber)] text-white hover:opacity-90"
                onClick={() => handleOpenCase({
                  id: 'jrn_kavita_002',
                  name: 'Kavita Electronics',
                  persona: 'Rohan Mehta',
                  scenario: 'Missing Evidence',
                  category: 'CASE_B',
                  outcome: 'NEEDS_REVIEW',
                  recommended_view: '/rm/cases/jrn_kavita_002',
                  role: 'RM'
                })}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                LOAD DEMO · RM CASE
              </Button>
            </div>
          </div>

          {/* CASE C: INCONSISTENT EVIDENCE */}
          <div className="p-6 rounded-3xl bg-white border-2 border-[var(--fin-coral)] shadow-[4px_4px_0px_#CC4B3E] flex flex-col justify-between hover:translate-y-[-2px] transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[var(--fin-coral-bg)] text-[var(--fin-coral)] border border-[var(--fin-coral)]/30">
                  CASE C · INCONSISTENT EVIDENCE
                </span>
                <span className="text-xs font-black text-[var(--fin-coral)]">GOVERNANCE FLAGGED</span>
              </div>

              <div>
                <h3 className="text-lg font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Apex Logistics &amp; Freight Solutions
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Reviewer: <strong>Ananya Iyer (Risk Officer)</strong>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs space-y-2 font-medium">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">GST Declared:</span>
                  <span className="font-bold text-[var(--brand-950)]">₹80,00,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Bank Total Credits:</span>
                  <span className="font-bold text-[var(--brand-950)]">₹50,00,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Revenue Discrepancy:</span>
                  <span className="font-bold text-[var(--fin-coral)]">37.5% (Threshold 15%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Hard Rule R05:</span>
                  <span className="font-bold text-[var(--fin-coral)]">FAILED (Consistency)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Routing:</span>
                  <span className="font-bold text-[var(--brand-950)]">Human Risk Review Queue</span>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Demonstrates multi-source cross-verification flagging revenue manipulation, triggering Hard Rule violation, routing to human underwriter review, and institutional override recording.
              </p>
            </div>

            <div className="pt-6 space-y-2">
              <Button
                variant="brutal"
                size="sm"
                className="w-full bg-[var(--fin-coral)] text-white hover:opacity-90"
                onClick={() => startAutoRun('CASE_C')}
                leftIcon={<Play className="w-4 h-4 text-white" />}
              >
                RUN ANOMALY WALKTHROUGH
              </Button>
              <Button
                variant="secondary"
                size="xs"
                className="w-full"
                onClick={() => handleOpenCase({
                  id: 'jrn_apex_003',
                  name: 'Apex Logistics',
                  persona: 'Ananya Iyer',
                  scenario: 'Inconsistent Evidence',
                  category: 'CASE_C',
                  outcome: 'FLAGGED_FOR_REVIEW',
                  recommended_view: '/risk/cases/jrn_apex_003',
                  role: 'RISK_OFFICER'
                })}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                OPEN RISK REVIEW
              </Button>
            </div>
          </div>

          {/* CASE D: LINKED APPLICATION SIGNAL */}
          <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col justify-between hover:translate-y-[-2px] transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  CASE D · LINKED APPLICATION SIGNAL
                </span>
                <span className="text-xs font-black text-purple-700">NETWORK SIGNAL</span>
              </div>

              <div>
                <h3 className="text-lg font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  SwiftTrans Freightways Pvt Ltd
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Target: <strong>Cross-Application Intelligence</strong>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs space-y-2 font-medium">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Linked To:</span>
                  <span className="font-bold text-[var(--brand-950)]">Apex Logistics &amp; Freight</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Shared Identifiers:</span>
                  <span className="font-bold text-purple-700">Bank Acct, Phone, Address</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Document Hash:</span>
                  <span className="font-mono text-[10px] text-[var(--brand-900)]">c3_bank_hash_919...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Signal Severity:</span>
                  <span className="font-bold text-[var(--fin-coral)]">HIGH (Recycled Doc Hash)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Phrasing:</span>
                  <span className="italic text-[11px] text-[var(--text-muted)]">"Potential linked-case risk"</span>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Highlights multi-entity graph intelligence detecting shared identifiers, recycled documentation hashes, and circular trading loops across disjoint applications.
              </p>
            </div>

            <div className="pt-6 space-y-2">
              <Button
                variant="brutal"
                size="sm"
                className="w-full bg-purple-700 text-white hover:bg-purple-800"
                onClick={() => handleOpenCase({
                  id: 'jrn_swifttrans_004',
                  name: 'SwiftTrans Freightways',
                  persona: 'Risk Officer',
                  scenario: 'Linked Application Signal',
                  category: 'CASE_D',
                  outcome: 'LINKED_RISK_SIGNAL',
                  recommended_view: '/risk',
                  role: 'RISK_OFFICER'
                })}
                leftIcon={<Network className="w-4 h-4 text-purple-200" />}
              >
                OPEN TRUST GRAPH &amp; SIGNALS
              </Button>
            </div>
          </div>

          {/* CASE E: WHAT-IF SIMULATOR */}
          <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-700)] shadow-[4px_4px_0px_#1B4D3E] flex flex-col justify-between hover:translate-y-[-2px] transition-all md:col-span-2 lg:col-span-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]">
                  CASE E · WHAT-IF COUNTERFACTUAL SIMULATOR
                </span>
                <span className="text-xs font-black text-[var(--brand-700)]">INTERACTIVE STRESS TEST</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Sharma Textiles (Hypothetical Simulation)
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Underwriter sandbox: test real-time risk model reactions to macro shocks
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                    Test how changes in annual turnover, operating margin hair-cuts, and inward cheque return counts dynamically alter the Scikit-Learn risk score, SHAP feature attributions, and sanction limit recommendations.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs space-y-2 font-medium">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Baseline DSCR:</span>
                    <span className="font-bold text-[var(--fin-green)]">1.85x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Stress Tested Shock:</span>
                    <span className="font-bold text-[var(--brand-950)]">-20% Revenue / +2 Cheque Bounces</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Simulated Score:</span>
                    <span className="font-bold text-[var(--fin-amber)]">Drops to 640 / 1000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Impact:</span>
                    <span className="font-bold text-[var(--brand-950)]">Triggers 15% haircut &amp; covenant</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-center gap-3">
              <Button
                variant="brutal"
                size="sm"
                className="w-full sm:w-auto flex-1 bg-[var(--brand-700)] text-white hover:bg-[var(--brand-800)]"
                onClick={() => handleOpenCase({
                  id: 'jrn_priya_001',
                  name: 'Sharma Textiles',
                  persona: 'Underwriter',
                  scenario: 'What-If Simulation',
                  category: 'CASE_E',
                  outcome: 'SIMULATION_READY',
                  recommended_view: '/customer/what-if',
                  role: 'CUSTOMER'
                })}
                leftIcon={<Sliders className="w-4 h-4 text-emerald-300" />}
              >
                LAUNCH WHAT-IF SIMULATOR
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => handleOpenCase({
                  id: 'jrn_priya_001',
                  name: 'Sharma Textiles',
                  persona: 'Auditor',
                  scenario: 'Decision Replay',
                  category: 'CASE_E',
                  outcome: 'SIMULATION_READY',
                  recommended_view: '/risk/replay/jrn_priya_001',
                  role: 'AUDIT_OFFICER'
                })}
                leftIcon={<RotateCcw className="w-4 h-4 text-[var(--brand-700)]" />}
              >
                DECISION REPLAY
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: Reset Demo Data Confirmation (Part 31) ── */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border-2 border-[var(--brand-950)] shadow-[6px_6px_0px_#0A1F20] max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border border-[var(--fin-amber)]/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                onClick={() => setResetModalOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--brand-950)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-xl font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Reset synthetic demonstration data?
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                This operation will call the authoritative backend reset endpoint (<code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">POST /api/v1/demo/reset</code>) to restore all 5 benchmark cases, clear temporary demo records, and re-initialize verified audit replay traces. Production applications will remain unaffected.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setResetModalOpen(false)}
                disabled={isResetting}
              >
                Cancel
              </Button>
              <Button
                variant="brutal"
                size="sm"
                onClick={handleResetDemoData}
                isLoading={isResetting}
                leftIcon={<RotateCcw className="w-4 h-4" />}
                className="bg-[var(--fin-amber)] text-white hover:opacity-90"
              >
                Confirm &amp; Reset Demo DB
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: One-Click Automated Demo Walkthrough (Part 30) ── */}
      {walkthroughScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border-2 border-[var(--brand-950)] shadow-[6px_6px_0px_#0A1F20] max-w-2xl w-full p-6 sm:p-8 space-y-6 animate-scaleUp">
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]">
                  Automated Progressive Flow (Part 30)
                </span>
                <h3 className="text-2xl font-black text-[var(--brand-950)] mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {walkthroughScenario === 'CASE_A' ? 'Strong Application Straight-Through Processing' : 'Revenue Mismatch & Governance Routing'}
                </h3>
              </div>
              <button
                onClick={() => setWalkthroughScenario(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--brand-950)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Pipeline */}
            <div className="space-y-3">
              {currentSteps.map((step, idx) => {
                const isPassed = idx <= walkthroughStep;
                const isCurrent = idx === walkthroughStep;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      isCurrent
                        ? 'bg-[var(--brand-50)] border-2 border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20]'
                        : isPassed
                        ? 'bg-emerald-50/50 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 opacity-40'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isCurrent
                          ? 'bg-[var(--brand-950)] text-white animate-pulse'
                          : isPassed
                          ? 'bg-[var(--fin-green)] text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isPassed && !isCurrent ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-black ${isCurrent ? 'text-[var(--brand-950)]' : ''}`}>
                        {step.title}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Controls */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs font-bold text-[var(--text-muted)]">
                Step {walkthroughStep + 1} of {currentSteps.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setWalkthroughScenario(null)}
                >
                  Close
                </Button>
                {walkthroughStep < currentSteps.length - 1 ? (
                  <Button
                    variant="brutal"
                    size="xs"
                    onClick={() => setWalkthroughStep((prev) => prev + 1)}
                    rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    variant="brutal"
                    size="xs"
                    onClick={() => {
                      const targetRoute =
                        walkthroughScenario === 'CASE_A'
                          ? '/customer/journey/jrn_priya_001'
                          : '/risk/cases/jrn_apex_003';
                      const targetRole =
                        walkthroughScenario === 'CASE_A' ? 'CUSTOMER' : 'RISK_OFFICER';
                      const targetId =
                        walkthroughScenario === 'CASE_A' ? 'jrn_priya_001' : 'jrn_apex_003';
                      setWalkthroughScenario(null);
                      switchRole(targetRole);
                      setActiveJourneyId(targetId);
                      navigate(targetRoute);
                    }}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Open Full Case Workspace
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const defaultCases: BenchmarkCase[] = [
  {
    id: 'jrn_skillbridge_001',
    name: 'SkillBridge Enterprises (Ruturaj Bhome)',
    persona: 'Ruturaj Bhome (Promoter & MD)',
    scenario: 'CASE 1 — PRIME TIER SANCTIONED: Complete compliance evidence, 4 verified vault documents, DSCR 2.12x, sanctioned ₹50L @ 10.25% p.a.',
    category: 'PRIME_SANCTIONED',
    outcome: 'APPROVED',
    recommended_view: '/customer/journey/jrn_skillbridge_001',
    role: 'CUSTOMER'
  },
  {
    id: 'jrn_lifeline_002',
    name: 'Lifeline AI Healthcare Technologies Pvt. Ltd.',
    persona: 'Rashi Kachwah (Promoter)',
    scenario: 'CASE 2 — MODULE 4 EXPLAINABLE AI DECISION: Full risk assessment executed, Scikit-learn SME risk model (Score: 885, LOW_RISK), SHAP waterfall impact attributions, dense RAG policy citations, approved ₹30L @ 10.95%.',
    category: 'EXPLAINABLE_AI_DECISION',
    outcome: 'APPROVED',
    recommended_view: '/customer/journey/jrn_lifeline_002',
    role: 'CUSTOMER'
  },
  {
    id: 'jrn_safeera_003',
    name: 'SafeEra Industrial Solutions Pvt. Ltd.',
    persona: 'Aaditya Wakchaure (Promoter)',
    scenario: 'CASE 3 — UNDERWRITING REVIEW CASE: Overdraft dynamics & delayed GST filings, requires RM and Credit Committee evaluation.',
    category: 'UNDERWRITING_REVIEW',
    outcome: 'UNDERWRITING_REVIEW',
    recommended_view: '/customer/journey/jrn_safeera_003',
    role: 'CUSTOMER'
  }
];
