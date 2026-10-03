import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  JourneyRecord, DocumentRecord, EvidenceItem, CashFlowMetrics,
  RiskAssessment, SHAPAttribution, DecisionRecord, NextBestActionsResponse,
  JourneyStage, JourneyFrictionMetrics
} from '../../types';
import { JourneyStepper } from '../journey/JourneyStepper';
import { SafeActionBanner } from './SafeActionBanner';
import { DocumentUploadLedger } from './DocumentUploadLedger';
import { CashFlowIntelligenceCard } from './CashFlowIntelligenceCard';
import { DecisionExplainableCard } from './DecisionExplainableCard';
import { SHAPWaterfallChart } from './SHAPWaterfallChart';
import { WhatIfSimulatorCard } from './WhatIfSimulatorCard';
import { Sparkles, FileText, Activity, Sliders, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';

interface CustomerViewProps {
  journeyId: string;
}

export const CustomerJourneyView: React.FC<CustomerViewProps> = ({ journeyId }) => {
  const [journey, setJourney] = useState<JourneyRecord | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [cashflow, setCashflow] = useState<CashFlowMetrics | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [shapData, setShapData] = useState<SHAPAttribution | null>(null);
  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [nba, setNba] = useState<NextBestActionsResponse | null>(null);
  const [friction, setFriction] = useState<JourneyFrictionMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'cashflow' | 'explainability' | 'simulator'>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const fetchJourneyData = async () => {
    setIsLoading(true);
    try {
      const [jrn, docs, evi, cf, act, frict] = await Promise.all([
        api.getJourney(journeyId),
        api.listDocuments(journeyId).catch(() => []),
        api.getEvidenceLedger(journeyId).catch(() => []),
        api.getCashFlowMetrics(journeyId).catch(() => null),
        api.getNextBestActions(journeyId).catch(() => null),
        api.getFriction(journeyId).catch(() => null)
      ]);

      setJourney(jrn);
      setDocuments(docs);
      setEvidence(evi);
      setCashflow(cf);
      setNba(act);
      setFriction(frict);

      // Try fetching decision & risk if available
      try {
        const [rsk, shp, dec] = await Promise.all([
          api.getRiskAssessment(journeyId),
          api.getSHAP(journeyId),
          api.getDecision(journeyId)
        ]);
        setRiskAssessment(rsk);
        setShapData(shp);
        setDecision(dec);
      } catch (_) {}
    } catch (err) {
      console.error('Error fetching journey:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJourneyData();
  }, [journeyId]);

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
      <div className="max-w-7xl mx-auto py-12 px-4 text-center text-[#687A75]">
        <div className="w-8 h-8 border-3 border-[#237277] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-semibold">Loading journey orchestration...</p>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 text-center text-[#687A75]">
        <p>Journey not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Hero Card */}
      <div className="bg-white rounded-2xl p-6 border border-[#E3ECE9] shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#237277] uppercase tracking-wider">
              {journey.intent.industry_sector || 'SME Working Capital Facility'}
            </span>
            <span className="text-xs text-[#CBD9D5]">•</span>
            <span className="text-xs text-[#687A75]">Case ID: {journey.journey_id}</span>
          </div>
          <h1 className="text-2xl font-black text-[#123E40]">{journey.intent.business_name}</h1>
          <p className="text-xs text-[#687A75] mt-1">
            Requested: <strong className="text-[#172825]">₹{journey.intent.requested_amount.toLocaleString('en-IN')}</strong> for {journey.intent.tenor_months} months • Purpose: {journey.intent.purpose}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Friction Indicator */}
          {friction && (
            <div className="text-right hidden sm:block">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                friction.friction_score < 30 ? 'bg-[#E8F7F1] text-[#169C73]' : friction.friction_score < 60 ? 'bg-[#FFF6DF] text-[#D89B22]' : 'bg-[#FDECEA] text-[#D96559]'
              }`}>
                Friction Score: {friction.friction_score}/100
              </span>
              <p className="text-[10px] text-[#687A75] mt-0.5">Journey Time: {Math.round(friction.total_time_seconds / 60)} mins</p>
            </div>
          )}

          {(!decision || decision.outcome === 'NEEDS_REVIEW') && (
            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
              className="py-2.5 px-4 bg-[#237277] hover:bg-[#18575A] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isEvaluating ? 'Evaluating Model...' : 'Re-Run Risk Model'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 7-Stage Interactive Journey Stepper */}
      <JourneyStepper currentStage={journey.current_stage} />

      {/* Safe Action Hero Banner */}
      <SafeActionBanner
        nba={nba || undefined}
        onExecuteAction={(type) => {
          if (type === 'UPLOAD_DOCUMENT') setActiveTab('documents');
          else if (type === 'OFFER_ACCEPTANCE') setActiveTab('overview');
        }}
      />

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#E3ECE9] gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 transition-colors flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'text-[#237277] border-b-2 border-[#237277] font-bold'
              : 'text-[#687A75] hover:text-[#172825]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Decision & Sanction</span>
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-3 transition-colors flex items-center gap-1.5 ${
            activeTab === 'documents'
              ? 'text-[#237277] border-b-2 border-[#237277] font-bold'
              : 'text-[#687A75] hover:text-[#172825]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Evidence & OCR ({documents.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('cashflow')}
          className={`pb-3 transition-colors flex items-center gap-1.5 ${
            activeTab === 'cashflow'
              ? 'text-[#237277] border-b-2 border-[#237277] font-bold'
              : 'text-[#687A75] hover:text-[#172825]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Cash-Flow Intelligence</span>
        </button>
        <button
          onClick={() => setActiveTab('explainability')}
          className={`pb-3 transition-colors flex items-center gap-1.5 ${
            activeTab === 'explainability'
              ? 'text-[#237277] border-b-2 border-[#237277] font-bold'
              : 'text-[#687A75] hover:text-[#172825]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#7457C8]" />
          <span>SHAP Explainability</span>
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`pb-3 transition-colors flex items-center gap-1.5 ${
            activeTab === 'simulator'
              ? 'text-[#237277] border-b-2 border-[#237277] font-bold'
              : 'text-[#687A75] hover:text-[#172825]'
          }`}
        >
          <Sliders className="w-4 h-4 text-[#D89B22]" />
          <span>What-If Simulator</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
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
        <div className="space-y-6">
          <CashFlowIntelligenceCard metrics={cashflow || undefined} />
        </div>
      )}

      {activeTab === 'explainability' && (
        <div className="space-y-6">
          <SHAPWaterfallChart shapData={shapData || undefined} />
          {decision && (
            <div className="bg-white rounded-2xl p-6 border border-[#E3ECE9] shadow-xs">
              <h4 className="text-sm font-bold text-[#123E40] mb-2">RAG Context Grounding Sources</h4>
              <p className="text-xs text-[#687A75] mb-4">
                The decision reasoning cites verified extracted evidence items and underwriting policy corpus clauses:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {decision.policy_citations.map((c, i) => (
                  <div key={i} className="p-3 bg-[#EEF8F7] rounded-xl border border-[#D9F0EE]">
                    <span className="text-xs font-bold text-[#237277]">{c.clause_id}: {c.title}</span>
                    <p className="text-xs text-[#40524E] mt-1 italic">"{c.excerpt}"</p>
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
  );
};
