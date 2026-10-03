import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { NormalizedIntent, IntentSubmitResponse } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
  Banknote,
  Receipt,
  FileText,
  AlertCircle,
  HelpCircle,
  Copy,
  ChevronRight,
  RefreshCw,
  Sliders,
  Send,
  UploadCloud,
  FileCheck
} from 'lucide-react';

interface GuidedAnswers {
  need: string;
  amount: string;
  business_type: string;
  vintage: string;
  revenue: string;
  obligations: string;
  business_name?: string;
}

const EXAMPLE_PROMPTS = [
  {
    label: "Textile Working Capital (7 Lakh)",
    text: "I need 7 lakh for working capital to fulfil a bulk textile order.",
  },
  {
    label: "Machinery Purchase (15 Lakh)",
    text: "Need 15 lakh to purchase a CNC milling machine. Running precision engineering for 4 years, monthly sales 10 lakh.",
  },
  {
    label: "Invoice Discounting (25 Lakh)",
    text: "Need 25 lakh invoice discounting against pending buyer receivables. Wholesale pharma business for 3 years, monthly revenue 20 lakh.",
  },
];

const JOURNEY_STAGES = [
  { key: "INTENT_CAPTURE", label: "Intent Capture", num: 1 },
  { key: "EVIDENCE_COLLECTION", label: "Evidence Collection", num: 2 },
  { key: "VERIFICATION", label: "Verification", num: 3 },
  { key: "RISK_ASSESSMENT", label: "Risk Assessment", num: 4 },
  { key: "DECISION", label: "Decision", num: 5 },
  { key: "NEXT_ACTION", label: "Next Action", num: 6 },
  { key: "RESOLUTION", label: "Resolution", num: 7 },
];

export const ApplyLoanPage: React.FC = () => {
  const navigate = useNavigate();

  // Active input mode: "natural" | "guided"
  const [activeTab, setActiveTab] = useState<'natural' | 'guided'>('natural');

  // Raw user inputs
  const [naturalText, setNaturalText] = useState("I need 7 lakh for working capital to fulfil a bulk textile order.");
  const [answers, setAnswers] = useState<GuidedAnswers>({
    need: "Working capital to fulfil a bulk textile order",
    amount: "7 lakh",
    business_type: "Textile & Garment Manufacturing",
    vintage: "3 years",
    revenue: "5 lakh / month",
    obligations: "None",
    business_name: "Sharma Textiles & Weaving Mill",
  });

  // Parsing & Submission state
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Normalized preview
  const [preview, setPreview] = useState<NormalizedIntent | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Post-submission result (Journey Tracker)
  const [submissionResult, setSubmissionResult] = useState<IntentSubmitResponse | null>(null);

  // Initial parse on load
  useEffect(() => {
    handleParse();
  }, []);

  const handleParse = async () => {
    setIsParsing(true);
    setParseError(null);
    try {
      const result = await api.parseIntent({
        natural_text: naturalText,
        answers: answers as any,
      });
      setPreview(result);
    } catch (err: any) {
      setParseError(err.message || "Failed to analyze intent. Using local fallback.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyExample = (text: string) => {
    setNaturalText(text);
    setActiveTab('natural');
    // Trigger immediate parse
    setIsParsing(true);
    api.parseIntent({ natural_text: text, answers: {} })
      .then((res) => {
        setPreview(res);
        // Pre-fill answers to match
        setAnswers({
          need: res.purpose,
          amount: `₹${(res.requested_amount / 100000).toFixed(1)} Lakh`,
          business_type: res.business_type,
          vintage: res.business_vintage,
          revenue: `₹${(res.declared_revenue / 1200000).toFixed(1)} Lakh / month`,
          obligations: res.existing_obligations > 0 ? `₹${res.existing_obligations.toLocaleString()}` : "None",
          business_name: answers.business_name || "My MSME Enterprise",
        });
      })
      .catch((err) => setParseError(err.message))
      .finally(() => setIsParsing(false));
  };

  const handleSubmit = async () => {
    if (!preview) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await api.submitIntent({
        natural_text: naturalText,
        answers: answers as any,
        normalized_intent: preview,
        business_name: answers.business_name || preview.business_type || "MSME Enterprise",
      });
      setSubmissionResult(response);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setSubmitError(err.message || "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // ============================================================================
  // POST-SUBMISSION: LIVE JOURNEY TRACKER SCREEN
  // ============================================================================
  if (submissionResult) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-fadeIn">
        {/* Success Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-[var(--brand-950)] text-white p-6 rounded-2xl shadow-xl relative overflow-hidden border border-emerald-500/30">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    Application Persisted in Firestore
                  </span>
                  <span className="text-xs text-emerald-200/80">Journey Graph Initialized</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Financial Journey Successfully Initialized
                </h1>
                <p className="text-xs text-emerald-100/80 mt-1 max-w-xl">
                  Your intent for <strong className="text-white">₹{submissionResult.requested_amount.toLocaleString()}</strong> has been parsed and structured into the authoritative Journey Ledger. No manual paperwork required.
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/20 shrink-0">
              <div className="text-[11px] text-emerald-200 font-bold uppercase tracking-wider">Journey ID</div>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm font-mono font-bold text-white bg-black/30 px-2 py-0.5 rounded">
                  {submissionResult.journey_id}
                </code>
                <button
                  onClick={() => copyToClipboard(submissionResult.journey_id)}
                  className="p-1 text-emerald-200 hover:text-white transition-colors"
                  title="Copy Journey ID"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copiedId && <span className="text-[10px] text-emerald-300 block mt-1">Copied to clipboard!</span>}
            </div>
          </div>
        </div>

        {/* 7-Stage Interactive Journey Stepper */}
        <Card variant="bordered" padding="md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">
                Authoritative Journey Graph
              </span>
              <h3 className="text-base font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Current Stage: <span className="text-[var(--brand-700)]">{submissionResult.current_stage}</span>
              </h3>
            </div>
            <Badge variant="green" size="sm">
              Status: {submissionResult.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {JOURNEY_STAGES.map((s, idx) => {
              const isCurrent = s.key === submissionResult.current_stage;
              const isCompleted = s.key === "INTENT_CAPTURE";
              return (
                <div
                  key={s.key}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? 'bg-[var(--brand-50)] border-[var(--brand-500)] shadow-sm ring-2 ring-[var(--brand-500)]/20'
                      : isCompleted
                      ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-center mb-1">
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                        isCurrent
                          ? 'bg-[var(--brand-700)] text-white'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isCompleted && !isCurrent ? '✓' : s.num}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold leading-tight truncate">
                    {s.label}
                  </div>
                  <div className="text-[9px] mt-0.5 font-medium">
                    {isCurrent ? 'Active Now' : isCompleted ? 'Completed' : 'Upcoming'}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 2-Column Split: Next Best Action & Missing Evidence Checklist */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Next Best Action Card (Left - 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card variant="bordered" padding="lg" className="border-l-4 border-l-[var(--brand-600)] shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--brand-100)] text-[var(--brand-900)]">
                  Next Best Action (NBA)
                </span>
                <span className="text-xs text-[var(--text-muted)]">Rule & State Machine Enforced</span>
              </div>

              <h2 className="text-lg font-black text-[var(--brand-950)] flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <UploadCloud className="w-5 h-5 text-[var(--brand-700)]" />
                {submissionResult.next_action?.title || "Upload Financial Evidence"}
              </h2>

              <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                {submissionResult.next_action?.description ||
                  "Submit certified GSTR-3B returns, 12-month primary bank statements, and business KYC to unlock automated underwriting and credit limit generation."}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate(`/customer/documents/${submissionResult.journey_id}`)}
                  className="font-bold shadow-md hover:shadow-lg"
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  {submissionResult.next_action?.cta_label || "Upload Financial Documents"}
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => navigate(`/customer/journey/${submissionResult.journey_id}`)}
                  className="font-bold"
                >
                  View Journey Graph & Timeline
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </Card>

            {/* Audit & Raw Input Integrity Card */}
            <Card variant="bordered" padding="md" className="bg-slate-50">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Immutable Audit Trail: Dual Intent Retention
              </h4>
              <p className="text-[11px] text-slate-600 mb-3">
                In compliance with FinFlow explainability invariants, both your raw natural conversation and normalized parameters have been persisted to Firestore without information loss.
              </p>

              <div className="space-y-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Raw Customer Input</span>
                  <p className="font-mono text-xs text-slate-800 italic mt-0.5">
                    "{submissionResult.raw_customer_intent?.natural_text || naturalText}"
                  </p>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Normalized Credit Schema</span>
                  <div className="grid grid-cols-2 gap-2 mt-1 font-mono text-[11px] text-slate-700">
                    <div>Product: <strong className="text-slate-900">{submissionResult.normalized_structured_intent?.product_type}</strong></div>
                    <div>Amount: <strong className="text-slate-900">₹{submissionResult.requested_amount.toLocaleString()}</strong></div>
                    <div>Vintage: <strong className="text-slate-900">{submissionResult.normalized_structured_intent?.business_vintage}</strong></div>
                    <div>Turnover: <strong className="text-slate-900">₹{submissionResult.normalized_structured_intent?.declared_revenue?.toLocaleString()}</strong></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Missing Evidence Requirements Checklist (Right - 5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card variant="bordered" padding="md" className="bg-white shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-[var(--brand-700)]" />
                  <h3 className="text-sm font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Required Evidence Checklist
                  </h3>
                </div>
                <Badge variant="amber" size="sm">
                  {submissionResult.missing_evidence_requirements?.length || 0} Pending
                </Badge>
              </div>

              <p className="text-[11px] text-[var(--text-muted)] mb-4">
                The Journey Orchestrator calculated the exact evidence items required for this facility:
              </p>

              <div className="space-y-2.5">
                {submissionResult.missing_evidence_requirements?.map((req, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-950"
                  >
                    <div className="w-4 h-4 rounded border-2 border-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-amber-700">{idx + 1}</span>
                    </div>
                    <span className="font-medium leading-snug">{req}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Multi-Pass OCR Ready</span>
                <span className="font-bold text-[var(--brand-700)]">Instant Digital Reconciliation</span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PRE-SUBMISSION: CONVERSATIONAL INTENT CAPTURE FORM
  // ============================================================================
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]">
            Module 1: Conversational Intent Capture
          </span>
          <span className="text-xs text-[var(--text-muted)]">Zero Lending Terminology Required</span>
        </div>
        <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Tell Us What Your Business Needs
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-2xl">
          Describe your funding requirements in simple, everyday language or answer 6 straightforward questions. FinFlow AI translates your goals into structured parameters and orchestrates your underwriting journey.
        </p>
      </div>

      {/* Example Prompt Chips */}
      <div className="p-3.5 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 shrink-0">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>Quick Example Prompts:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((ex, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyExample(ex.text)}
              className="text-[11px] font-semibold bg-white hover:bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs transition-all hover:border-blue-300"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Input Column & Live Preview Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Conversational Inputs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card variant="bordered" padding="md">
            {/* Tab Switcher */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('natural')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'natural'
                      ? 'bg-[var(--brand-700)] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Natural Statement
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('guided')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'guided'
                      ? 'bg-[var(--brand-700)] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  6 Guided Questions
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleParse}
                disabled={isParsing}
                className="text-xs font-bold text-[var(--brand-700)]"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isParsing ? 'animate-spin' : ''}`} />
                {isParsing ? 'Analyzing...' : 'Re-Analyze'}
              </Button>
            </div>

            {/* TAB 1: Natural Language Statement */}
            {activeTab === 'natural' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Describe your business requirement in your own words:
                  </label>
                  <p className="text-[11px] text-[var(--text-muted)] mb-2">
                    Mention how much you need, what it's for, and any details about your monthly sales or business type.
                  </p>
                  <div className="relative">
                    <textarea
                      rows={4}
                      value={naturalText}
                      onChange={(e) => setNaturalText(e.target.value)}
                      placeholder='e.g., "I need 7 lakh for working capital to fulfil a bulk textile order."'
                      className="w-full p-3 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:border-[var(--brand-700)] focus:ring-2 focus:ring-[var(--brand-100)] transition-all resize-none shadow-xs"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-700 mb-1">Enterprise Trade Name</div>
                  <input
                    type="text"
                    value={answers.business_name || ""}
                    onChange={(e) => setAnswers({ ...answers, business_name: e.target.value })}
                    placeholder="e.g. Sharma Textiles & Weaving Mill"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[var(--brand-700)] bg-white font-medium shadow-2xs"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: 6 Guided Form-Light Questions */}
            {activeTab === 'guided' && (
              <div className="space-y-4">
                <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 text-[11px] text-blue-900 mb-3">
                  No lending jargon. Answer what you know, and FinFlow handles the underwriting translation.
                </div>

                <div className="space-y-3.5">
                  {/* Q1 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      1. What do you need the money for?
                    </label>
                    <input
                      type="text"
                      value={answers.need}
                      onChange={(e) => setAnswers({ ...answers, need: e.target.value })}
                      placeholder="e.g. Buying bulk textile yarn, equipment repair, inventory"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[var(--brand-700)] shadow-xs font-medium"
                    />
                  </div>

                  {/* Q2 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      2. How much funding do you need?
                    </label>
                    <input
                      type="text"
                      value={answers.amount}
                      onChange={(e) => setAnswers({ ...answers, amount: e.target.value })}
                      placeholder="e.g. 7 lakh, 1500000, 25 Lakhs"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[var(--brand-700)] shadow-xs font-medium"
                    />
                  </div>

                  {/* Q3 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      3. What type of business do you run?
                    </label>
                    <input
                      type="text"
                      value={answers.business_type}
                      onChange={(e) => setAnswers({ ...answers, business_type: e.target.value })}
                      placeholder="e.g. Textile manufacturing, precision machine shop, retail pharmacy"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[var(--brand-700)] shadow-xs font-medium"
                    />
                  </div>

                  {/* Q4 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      4. How long has the business operated?
                    </label>
                    <input
                      type="text"
                      value={answers.vintage}
                      onChange={(e) => setAnswers({ ...answers, vintage: e.target.value })}
                      placeholder="e.g. 3 years, 18 months, established 5+ years"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[var(--brand-700)] shadow-xs font-medium"
                    />
                  </div>

                  {/* Q5 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      5. Approximate monthly revenue
                    </label>
                    <input
                      type="text"
                      value={answers.revenue}
                      onChange={(e) => setAnswers({ ...answers, revenue: e.target.value })}
                      placeholder="e.g. 5 lakh / month, 12 Lakhs"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[var(--brand-700)] shadow-xs font-medium"
                    />
                  </div>

                  {/* Q6 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      6. Existing monthly EMI / loan obligations
                    </label>
                    <input
                      type="text"
                      value={answers.obligations}
                      onChange={(e) => setAnswers({ ...answers, obligations: e.target.value })}
                      placeholder="e.g. None, 25000 / month"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[var(--brand-700)] shadow-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Business Trade Name
                    </label>
                    <input
                      type="text"
                      value={answers.business_name || ""}
                      onChange={(e) => setAnswers({ ...answers, business_name: e.target.value })}
                      placeholder="e.g. Sharma Textiles & Weaving Mill"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[var(--brand-700)] shadow-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-[var(--text-muted)]">
                Updates trigger instant structured extraction
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleParse}
                disabled={isParsing}
                className="text-xs font-bold"
              >
                Sync & Analyze
              </Button>
            </div>
          </Card>

          {/* Fallback Guarantee Badge */}
          <div className="flex items-center gap-2 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <strong className="font-bold">Zero-Downtime Guarantee:</strong> If cloud LLM services are unreachable, FinFlow's deterministic rule engine parses amounts, Indian numbering (lakhs/crores), and sector parameters locally with zero loss of intent.
            </div>
          </div>
        </div>

        {/* Right Column: Live Structured Intent Preview & Submit (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card variant="bordered" padding="md" className="shadow-md bg-white border-[var(--brand-200)] relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[var(--brand-700)]" />
                <h3 className="text-sm font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Live Structured Intent Preview
                </h3>
              </div>
              {preview && (
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  preview.parser_used === 'LLM'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  {preview.parser_used === 'LLM' ? 'AI Neural Model' : 'Deterministic Engine'}
                </span>
              )}
            </div>

            {isParsing && (
              <div className="p-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-[var(--brand-700)] animate-spin mx-auto" />
                <p className="text-xs text-[var(--text-muted)] font-medium">Extracting and normalizing intent parameters...</p>
              </div>
            )}

            {!isParsing && preview && (
              <div className="space-y-3.5 text-xs">
                {/* 1. Facility & Amount Highlight */}
                <div className="p-3 bg-gradient-to-r from-[var(--brand-50)] to-blue-50/50 rounded-xl border border-[var(--brand-100)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)] block">
                      Target Credit Product
                    </span>
                    <span className="text-sm font-black text-[var(--brand-950)]">
                      {preview.product_type === 'sme_working_capital'
                        ? 'SME Working Capital Line'
                        : preview.product_type === 'machinery_term_loan'
                        ? 'Machinery Term Loan'
                        : 'Invoice Discounting Facility'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)] block">
                      Requested Amount
                    </span>
                    <span className="text-base font-black text-[var(--brand-950)]">
                      ₹{preview.requested_amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 2. Structured Parameters Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Purpose</span>
                    <span className="font-semibold text-slate-800 truncate block mt-0.5" title={preview.purpose}>
                      {preview.purpose}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Business Type</span>
                    <span className="font-semibold text-slate-800 truncate block mt-0.5" title={preview.business_type}>
                      {preview.business_type}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Business Vintage</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {preview.business_vintage} ({preview.business_vintage_months} mos)
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Declared Revenue</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      ₹{preview.declared_revenue.toLocaleString()} / yr
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 col-span-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Existing Monthly Obligations</span>
                      <span className="font-semibold text-slate-800">
                        {preview.existing_obligations > 0
                          ? `₹${preview.existing_obligations.toLocaleString()} / month`
                          : '₹0 (No existing debt)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Synthesized Plain Language Summary */}
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Intent Synthesis
                  </span>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                    {preview.intent_summary}
                  </p>
                </div>

                {/* 4. Missing Evidence Preview */}
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block mb-1.5 flex items-center justify-between">
                    <span>Anticipated Document Checklist</span>
                    <span className="font-mono text-[9px]">{preview.missing_evidence_requirements.length} Items</span>
                  </span>
                  <ul className="space-y-1 text-[10px] text-amber-950 font-medium list-disc pl-3">
                    {preview.missing_evidence_requirements.slice(0, 3).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                    {preview.missing_evidence_requirements.length > 3 && (
                      <li className="text-amber-700 italic">
                        +{preview.missing_evidence_requirements.length - 3} more items calculated after submission
                      </li>
                    )}
                  </ul>
                </div>

                {/* Raw Input Disclosure */}
                <details className="text-[11px] text-slate-500 cursor-pointer pt-1">
                  <summary className="font-semibold hover:text-slate-800 transition-colors">
                    View raw customer input being committed
                  </summary>
                  <pre className="mt-2 p-2 bg-slate-900 text-slate-200 text-[10px] font-mono rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify({ natural_text: naturalText, answers }, null, 2)}
                  </pre>
                </details>

                {submitError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isSubmitting || isParsing}
                    className="w-full font-black text-sm shadow-md hover:shadow-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Initializing Journey Orchestrator...
                      </>
                    ) : (
                      <>
                        Confirm Intent & Launch Journey
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                  <p className="text-[10px] text-center text-[var(--text-muted)] mt-2">
                    Creates authenticated Journey ID in Firestore & initiates Stage 1
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
