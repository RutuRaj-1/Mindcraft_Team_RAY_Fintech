import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  JourneyRecord, DocumentRecord, EvidenceItem, CashFlowMetrics,
  RiskAssessment, SHAPAttribution, DecisionRecord, NextBestActionsResponse,
  JourneyFrictionMetrics
} from '../../types';
import { JourneyStepper } from '../journey/JourneyStepper';
import { SafeActionBanner } from './SafeActionBanner';
import { DocumentUploadLedger } from './DocumentUploadLedger';
import { CashFlowIntelligenceCard } from './CashFlowIntelligenceCard';
import { DecisionExplainableCard } from './DecisionExplainableCard';
import { SHAPWaterfallChart } from './SHAPWaterfallChart';
import { WhatIfSimulatorCard } from './WhatIfSimulatorCard';
import {
  Sparkles, FileText, Activity, Sliders, ShieldCheck,
  ArrowRight, Clock, TrendingUp, AlertCircle, Zap, RefreshCw
} from 'lucide-react';

interface CustomerViewProps {
  journeyId: string;
}

const TABS = [
  { id: 'overview',        label: 'Decision & Sanction',       Icon: ShieldCheck,  color: 'var(--brand-700)' },
  { id: 'documents',       label: 'Evidence & OCR',             Icon: FileText,     color: 'var(--fin-blue)'  },
  { id: 'cashflow',        label: 'Cash-Flow Intelligence',     Icon: Activity,     color: 'var(--fin-green)' },
  { id: 'explainability',  label: 'SHAP Explainability',        Icon: Sparkles,     color: 'var(--fin-violet)'},
  { id: 'simulator',       label: 'What-If Simulator',          Icon: Sliders,      color: 'var(--fin-amber)' },
] as const;

type TabId = typeof TABS[number]['id'];

export const CustomerJourneyView: React.FC<CustomerViewProps> = ({ journeyId }) => {
  const [journey,        setJourney]        = useState<JourneyRecord | null>(null);
  const [documents,      setDocuments]      = useState<DocumentRecord[]>([]);
  const [evidence,       setEvidence]       = useState<EvidenceItem[]>([]);
  const [cashflow,       setCashflow]       = useState<CashFlowMetrics | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [shapData,       setShapData]       = useState<SHAPAttribution | null>(null);
  const [decision,       setDecision]       = useState<DecisionRecord | null>(null);
  const [nba,            setNba]            = useState<NextBestActionsResponse | null>(null);
  const [friction,       setFriction]       = useState<JourneyFrictionMetrics | null>(null);
  const [activeTab,      setActiveTab]      = useState<TabId>('overview');
  const [isLoading,      setIsLoading]      = useState<boolean>(true);
  const [isEvaluating,   setIsEvaluating]   = useState<boolean>(false);

  const fetchJourneyData = async () => {
    setIsLoading(true);
    try {
      const [jrn, docs, evi, cf, act, frict] = await Promise.all([
        api.getJourney(journeyId),
        api.listDocuments(journeyId).catch(() => []),
        api.getEvidenceLedger(journeyId).catch(() => []),
        api.getCashFlowMetrics(journeyId).catch(() => null),
        api.getNextBestActions(journeyId).catch(() => null),
        api.getFriction(journeyId).catch(() => null),
      ]);
      setJourney(jrn); setDocuments(docs); setEvidence(evi);
      setCashflow(cf); setNba(act); setFriction(frict);

      try {
        const [rsk, shp, dec] = await Promise.all([
          api.getRiskAssessment(journeyId),
          api.getSHAP(journeyId),
          api.getDecision(journeyId),
        ]);
        setRiskAssessment(rsk); setShapData(shp); setDecision(dec);
      } catch (_) {}
    } catch (err) {
      console.error('Error fetching journey:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchJourneyData(); }, [journeyId]);

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const dec = await api.evaluateRisk(journeyId);
      setDecision(dec);
      await fetchJourneyData();
    } catch (err: any) {
      alert(`Evaluation failed: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isLoading && !journey) {
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-[var(--text-muted)]">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-[var(--brand-100)]" />
            <div className="absolute inset-0 rounded-full border-4 border-[var(--brand-600)] border-t-transparent animate-spin" />
            <div className="absolute inset-3 rounded-full bg-[var(--brand-50)] flex items-center justify-center">
              <Zap className="w-4 h-4 text-[var(--brand-600)]" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-[var(--brand-900)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Orchestrating Journey...
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Fetching financial data & running intelligence engines</p>
          </div>
        </div>
      </div>
    );
  }

  if (!journey) return (
    <div className="page-container">
      <div className="alert-panel danger text-center">
        <AlertCircle className="w-5 h-5 text-[var(--fin-coral)] mx-auto mb-2" />
        <p className="text-sm font-semibold">Journey not found.</p>
      </div>
    </div>
  );

  const outcome = decision?.outcome;
  const outcomeGradient =
    outcome === 'APPROVED'            ? 'from-[#0E9B6D] to-[#169C73]' :
    outcome === 'CONDITIONAL_APPROVAL'? 'from-[#C98A10] to-[#D89B22]' :
    outcome === 'REJECTED'            ? 'from-[#CC4B3E] to-[#D96559]' :
    'from-[var(--brand-800)] to-[var(--brand-600)]';

  return (
    <div className="page-container space-y-5">

      {/* ── Hero Journey Card ── */}
      <div className={`card overflow-hidden animate-fadeInUp`}>
        {/* Gradient accent bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${outcomeGradient}`} />

        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="badge badge-teal text-[10px]">
                  {journey.intent.industry_sector || 'SME Working Capital'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  ID: {journey.journey_id}
                </span>
                <span className={`badge text-[10px] ${
                  journey.status === 'FLAGGED' ? 'badge-coral' :
                  journey.status === 'COMPLETED' ? 'badge-green' : 'badge-teal'
                }`}>
                  {journey.status}
                </span>
              </div>
              <h1
                className="text-2xl sm:text-3xl font-black text-[var(--brand-950)] leading-tight"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {journey.intent.business_name}
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 flex items-center flex-wrap gap-2">
                <span>
                  Requested <strong className="text-[var(--text-primary)]">
                    ₹{(journey.intent.requested_amount / 100000).toFixed(1)}L
                  </strong>
                </span>
                <span className="text-[var(--border-strong)]">•</span>
                <span>{journey.intent.tenor_months} months</span>
                <span className="text-[var(--border-strong)]">•</span>
                <span className="italic">{journey.intent.purpose}</span>
              </p>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Friction indicator */}
              {friction && (
                <div className="hidden sm:block text-right">
                  <div className={`badge text-[11px] ${
                    friction.friction_score < 30 ? 'badge-green' :
                    friction.friction_score < 60 ? 'badge-amber' : 'badge-coral'
                  }`}>
                    Friction {friction.friction_score}/100
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {Math.round(friction.total_time_seconds / 60)}m journey
                  </p>
                </div>
              )}

              {/* Decision quick score */}
              {riskAssessment && (
                <div className="bg-[var(--brand-50)] border border-[var(--brand-200)] rounded-xl px-3 py-2 text-center hidden md:block">
                  <p className="text-[10px] font-semibold text-[var(--text-muted)]">Trust Score</p>
                  <p className="text-xl font-black text-[var(--brand-800)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {riskAssessment.risk_score}
                  </p>
                  <p className="text-[9px] font-bold text-[var(--text-muted)]">/1000</p>
                </div>
              )}

              {(!decision || decision.outcome === 'NEEDS_REVIEW') && (
                <button
                  onClick={handleRunEvaluation}
                  disabled={isEvaluating}
                  className="btn-primary"
                >
                  {isEvaluating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{isEvaluating ? 'Running AI Model...' : 'Run Risk Model'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4 pt-4 border-t border-[var(--border)]">
            {[
              { label: 'Turnover', value: `₹${(journey.intent.annual_turnover / 10000000).toFixed(2)}Cr`, icon: TrendingUp, color: 'var(--fin-green)' },
              { label: 'Vintage', value: `${journey.intent.vintage_months}m`, icon: Clock, color: 'var(--brand-600)' },
              { label: 'Documents', value: String(documents.length), icon: FileText, color: 'var(--fin-blue)' },
              { label: 'Evidence', value: String(evidence.length), icon: Sparkles, color: 'var(--fin-violet)' },
              { label: 'DSCR', value: cashflow ? `${cashflow.dscr}x` : '—', icon: Activity, color: cashflow && cashflow.dscr >= 1.25 ? 'var(--fin-green)' : 'var(--fin-amber)' },
              { label: 'PAN', value: journey.intent.pan || '—', icon: ShieldCheck, color: 'var(--brand-600)' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <item.icon className="w-3.5 h-3.5 shrink-0" style={{ color: item.color }} />
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{item.label}</p>
                  <p className="text-[12px] font-bold text-[var(--text-primary)] truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Journey Stepper ── */}
      <div className="animate-fadeInUp stagger-1">
        <JourneyStepper currentStage={journey.current_stage} />
      </div>

      {/* ── Safe Action Banner ── */}
      <div className="animate-fadeInUp stagger-2">
        <SafeActionBanner
          nba={nba || undefined}
          onExecuteAction={(type) => {
            if (type === 'UPLOAD_DOCUMENT') setActiveTab('documents');
            else if (type === 'OFFER_ACCEPTANCE') setActiveTab('overview');
          }}
        />
      </div>

      {/* ── Tab Navigation ── */}
      <div className="animate-fadeInUp stagger-3">
        <div className="tab-bar overflow-x-auto">
          {TABS.map(({ id, label, Icon, color }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`tab-item ${activeTab === id ? 'active' : ''}`}
              style={activeTab === id ? { color } : {}}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}
                {id === 'documents' && documents.length > 0 && (
                  <span className="ml-1 text-[9px] font-bold bg-[var(--brand-100)] text-[var(--brand-700)] rounded-full px-1.5 py-0.5">
                    {documents.length}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Panels ── */}
      <div className="animate-fadeInUp stagger-4">
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <DecisionExplainableCard
              decision={decision || undefined}
              riskAssessment={riskAssessment || undefined}
              onAcceptOffer={() => {
                api.advanceStage(journeyId, 'SANCTIONED', 'Applicant e-signed sanction letter');
                fetchJourneyData();
              }}
            />
            {cashflow && <CashFlowIntelligenceCard metrics={cashflow} />}
            {shapData && <SHAPWaterfallChart shapData={shapData} />}
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentUploadLedger
            journeyId={journeyId}
            documents={documents}
            evidence={evidence}
            onRefresh={fetchJourneyData}
          />
        )}

        {activeTab === 'cashflow' && (
          <CashFlowIntelligenceCard metrics={cashflow || undefined} />
        )}

        {activeTab === 'explainability' && (
          <div className="space-y-5">
            <SHAPWaterfallChart shapData={shapData || undefined} />
            {decision && (
              <div className="card p-6">
                <h4 className="text-sm font-bold text-[var(--brand-900)] mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  RAG Grounding Sources
                </h4>
                <p className="text-xs text-[var(--text-muted)] mb-4">
                  Decision reasoning cites verified evidence items and underwriting policy corpus clauses:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {decision.policy_citations.map((c, i) => (
                    <div key={i} className="p-3 bg-[var(--brand-50)] rounded-xl border border-[var(--brand-100)]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-[var(--brand-700)]">{c.clause_id}</span>
                        <span className="text-[10px] badge badge-teal">{(c.relevance_score * 100).toFixed(0)}% match</span>
                      </div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{c.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 italic">"{c.excerpt}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'simulator' && (
          <WhatIfSimulatorCard journeyId={journeyId} />
        )}
      </div>
    </div>
  );
};
