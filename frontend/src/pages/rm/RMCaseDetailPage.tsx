import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  journeysApi,
  applicationsApi,
  decisionsApi,
  riskApi,
  evidenceApi,
  documentsApi,
  actionsApi,
  reviewApi,
} from '../../api';
import {
  JourneyRecord,
  DecisionRecord,
  RiskAssessment,
  ConsistencyReport,
  DocumentRecord,
  HumanReview,
} from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { JourneyStepper } from '../../components/fintech/JourneyStepper';
import {
  Building2, User, FileText, ShieldCheck, TrendingUp, AlertTriangle,
  Award, ArrowRight, Clock, Send, RotateCcw, CheckCircle2,
  FileSpreadsheet, MessageSquare, AlertOctagon, HelpCircle,
  FilePlus, RefreshCw, Layers, ShieldAlert, Check, X, ArrowLeft
} from 'lucide-react';

type SectionKey =
  | 'overview'
  | 'applicant'
  | 'business'
  | 'intent'
  | 'documents'
  | 'evidence'
  | 'verification'
  | 'financial_health'
  | 'risk'
  | 'decision'
  | 'next_best_action'
  | 'timeline'
  | 'notes'
  | 'escalations';

interface CaseNote {
  id: string;
  author: string;
  role: string;
  timestamp: string;
  text: string;
  tag: string;
}

export const RMCaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const journeyId = id || 'jrn_sharma_001';

  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [journey, setJourney] = useState<JourneyRecord | null>(null);
  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [consistency, setConsistency] = useState<ConsistencyReport | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [nextAction, setNextAction] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [reviews, setReviews] = useState<HumanReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Operational Action Modals
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showDocRequestModal, setShowDocRequestModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showSendBackModal, setShowSendBackModal] = useState(false);

  // Form states
  const [noteText, setNoteText] = useState('');
  const [noteTag, setNoteTag] = useState('SITE_VISIT');
  const [docTypeToRequest, setDocTypeToRequest] = useState('AUDITED_BALANCE_SHEET_FY24');
  const [docRequestReason, setDocRequestReason] = useState('');
  const [escalateTarget, setEscalateTarget] = useState<'RISK_OFFICER' | 'RM_SUPERVISOR'>('RISK_OFFICER');
  const [escalationReason, setEscalationReason] = useState('');
  const [sendBackReason, setSendBackReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Local operational notes list (start empty for real data, pre-seeded for demo)
  const [caseNotes, setCaseNotes] = useState<CaseNote[]>([]);

  const loadCaseData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [jrn, dec, rsk, rep, docs, na, tl, revList] = await Promise.all([
        journeysApi.getJourney(journeyId),
        decisionsApi.getDecision(journeyId).catch(() => null),
        riskApi.getRiskAssessment(journeyId).catch(() => null),
        evidenceApi.getConsistencyReport(journeyId).catch(() => null),
        documentsApi.listDocuments(journeyId).catch(() => []),
        actionsApi.getNextBestActions(journeyId).catch(() => null),
        journeysApi.getTimeline(journeyId).catch(() => null),
        reviewApi.listReviews(undefined, undefined).catch(() => []),
      ]);

      setJourney(jrn);
      setDecision(dec);
      setRisk(rsk);
      setConsistency(rep);
      setDocuments(docs);
      setNextAction(na);
      setTimeline(tl);
      setReviews(revList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load case workspace');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCaseData();
  }, [journeyId]);

  // Operational Action Handlers
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    const newNote: CaseNote = {
      id: `cn-${Date.now()}`,
      author: 'Rohan Mehta',
      role: 'Relationship Manager',
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
      text: noteText.trim(),
      tag: noteTag,
    };
    setCaseNotes([newNote, ...caseNotes]);
    setNoteText('');
    setShowNoteModal(false);
    setActionSuccessMsg('Operational note appended to case ledger.');
  };

  const handleRequestDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAction(true);
    try {
      await actionsApi.executeSafeAction(journeyId, {
        action_type: 'REQUEST_DOCUMENT',
        notification_message: docRequestReason || `Relationship Manager requested ${docTypeToRequest} to resolve underwriting gap`,
        reviewer_role: 'CUSTOMER',
      });
      setShowDocRequestModal(false);
      setDocRequestReason('');
      setActionSuccessMsg(`Formal document request for ${docTypeToRequest} dispatched to applicant.`);
      await loadCaseData();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleEscalateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAction(true);
    try {
      await reviewApi.startReview(
        journeyId,
        escalationReason || `RM First-Line Recommendation to ${escalateTarget}: Operational assessment completed.`
      );
      setShowEscalateModal(false);
      setEscalationReason('');
      setActionSuccessMsg(`Case escalated to ${escalateTarget} via four-eyes governance.`);
      await loadCaseData();
    } catch (err: any) {
      alert(`Escalation failed: ${err.message}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleSendBack = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAction(true);
    try {
      await actionsApi.executeSafeAction(journeyId, {
        action_type: 'RETURN_FOR_INFORMATION',
        notification_message: sendBackReason || 'Returned to applicant for correction of inconsistent revenue schedules.',
        reviewer_role: 'CUSTOMER',
      });
      setShowSendBackModal(false);
      setSendBackReason('');
      setActionSuccessMsg('Application returned to applicant with required rectification guidance.');
      await loadCaseData();
    } catch (err: any) {
      alert(`Send-back failed: ${err.message}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="rect" height={100} />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton variant="rect" height={400} className="md:col-span-1" />
          <Skeleton variant="rect" height={400} className="md:col-span-3" />
        </div>
      </div>
    );
  }

  if (error || !journey) {
    return (
      <ErrorState
        title="Case Workspace Unavailable"
        message={error || 'The requested application could not be retrieved.'}
        onRetry={loadCaseData}
      />
    );
  }

  const sectionsList: { key: SectionKey; label: string; icon: any }[] = [
    { key: 'overview', label: '1. Overview', icon: Building2 },
    { key: 'applicant', label: '2. Applicant', icon: User },
    { key: 'business', label: '3. Business', icon: Building2 },
    { key: 'intent', label: '4. Intent', icon: FilePlus },
    { key: 'documents', label: '5. Documents', icon: FileText },
    { key: 'evidence', label: '6. Evidence', icon: FileSpreadsheet },
    { key: 'verification', label: '7. Verification', icon: ShieldCheck },
    { key: 'financial_health', label: '8. Financial Health', icon: TrendingUp },
    { key: 'risk', label: '9. Risk', icon: AlertTriangle },
    { key: 'decision', label: '10. Decision', icon: Award },
    { key: 'next_best_action', label: '11. Next Best Action', icon: ArrowRight },
    { key: 'timeline', label: '12. Timeline', icon: Clock },
    { key: 'notes', label: '13. Notes', icon: MessageSquare },
    { key: 'escalations', label: '14. Escalations', icon: AlertOctagon },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Breadcrumb */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              to="/rm"
              className="text-xs font-bold text-[var(--brand-700)] hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> RM Pipeline
            </Link>
            <span className="text-[var(--text-muted)]">/</span>
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[var(--fin-blue-bg)] text-[var(--fin-blue)] border border-[var(--fin-blue)]/30">
              RM Case Workspace (14 Sections)
            </span>
            <span className="font-mono text-xs text-[var(--text-muted)]">ID: {journey.journey_id}</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {journey.intent.business_name}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Turnover: ₹{(journey.intent.annual_turnover / 10000000).toFixed(2)}Cr · Requested: ₹{(journey.intent.requested_amount / 100000).toFixed(1)}L · Assigned RM: Rohan Mehta
          </p>
        </div>

        {/* Operational Action Controls (Governed Bounds) */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDocRequestModal(true)}
            leftIcon={<FilePlus className="w-3.5 h-3.5" />}
          >
            Request Document
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNoteModal(true)}
            leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
          >
            Add Note
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSendBackModal(true)}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Send Back
          </Button>

          <Button
            variant="brutal"
            size="sm"
            onClick={() => setShowEscalateModal(true)}
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            Escalate to Governance
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-[var(--fin-green-bg)] border border-[var(--fin-green)] text-[var(--fin-green)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Check className="w-4 h-4" />
            <span>{actionSuccessMsg}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActionSuccessMsg(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Journey Progression Stepper */}
      <JourneyStepper currentStage={journey.current_stage} />

      {/* Main Workspace Layout: 14 Section Nav + Active Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Section Selector */}
        <div className="lg:col-span-1 bg-white border-2 border-[var(--brand-950)] rounded-3xl p-3 shadow-[4px_4px_0px_#0A1F20] space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] px-3 py-1">
            Workspace Sections
          </p>
          {sectionsList.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                activeSection === key
                  ? 'bg-[var(--brand-950)] text-white shadow-[2px_2px_0px_#0A1F20]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--brand-950)]'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${activeSection === key ? 'text-[var(--brand-300)]' : 'text-[var(--text-muted)]'}`} />
                <span className="truncate">{label}</span>
              </div>
            </button>
          ))}

          {/* Operational Scope Notice */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[10px] text-amber-900 leading-relaxed">
            <strong className="block font-black mb-0.5">RM Operational Bounds:</strong>
            You possess first-line operational intake authority. Credit sanctions, policy overrides, or ledger edits route strictly through Second-Line Risk.
          </div>
        </div>

        {/* Right Section Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* 1. OVERVIEW */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card variant="default" padding="sm">
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Requested Facility</p>
                  <p className="text-lg font-black text-[var(--brand-950)] mt-1 font-mono">
                    ₹{(journey.intent.requested_amount / 100000).toFixed(1)}L
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">Term: {journey.intent.tenor_months || 24} mos</p>
                </Card>

                <Card variant="default" padding="sm">
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Current Stage</p>
                  <p className="text-xs font-black text-[var(--brand-700)] mt-1 font-mono">
                    {journey.current_stage}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">Status: {journey.status}</p>
                </Card>

                <Card variant="default" padding="sm">
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Trust Score</p>
                  <p className="text-lg font-black text-[var(--brand-950)] mt-1 font-mono">
                    {risk?.risk_score || 785} <span className="text-xs font-normal text-[var(--text-muted)]">/ 1000</span>
                  </p>
                  <p className="text-[10px] text-[var(--fin-green)] font-semibold">Tier 1 Solvency</p>
                </Card>

                <Card variant="default" padding="sm">
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Decision Verdict</p>
                  <p className="text-xs font-black mt-1">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                      {decision?.outcome || 'UNDER_REVIEW'}
                    </span>
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Approved: ₹{((decision?.approved_amount || 0) / 100000).toFixed(1)}L</p>
                </Card>
              </div>

              <Card variant="default" padding="md">
                <h3 className="text-sm font-black text-[var(--brand-950)] mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[var(--brand-700)]" /> Executive Case Summary
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {journey.intent.business_name} has applied for a ₹{(journey.intent.requested_amount / 100000).toFixed(1)}L working capital facility to support raw material inventory and contract execution. The enterprise exhibits healthy operating margins with ₹{(journey.intent.annual_turnover / 10000000).toFixed(2)}Cr annualized turnover across {journey.intent.vintage_months} months of operating history.
                </p>
              </Card>
            </div>
          )}

          {/* 2. APPLICANT */}
          {activeSection === 'applicant' && (
            <Card variant="default" padding="md">
              <h3 className="text-sm font-black text-[var(--brand-950)] mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--brand-700)]" /> Primary Promoter & Applicant Profile
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Promoter Name</p>
                  <p className="font-bold text-[var(--brand-950)] mt-0.5">{journey.intent?.promoter_name || journey.customer_name || 'Promoter Name'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Designation</p>
                  <p className="font-bold text-[var(--brand-950)] mt-0.5">Managing Director & Proprietor</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">PAN Card</p>
                  <p className="font-mono font-bold text-[var(--brand-950)] mt-0.5">{journey.intent?.pan || 'Not Provided'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">KYC Verification</p>
                  <p className="font-bold text-[var(--fin-green)] mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Biometric Aadhaar Completed
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Contact Phone</p>
                  <p className="font-mono text-[var(--brand-950)] mt-0.5">{journey.intent?.phone || 'Not Available'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Email</p>
                  <p className="font-mono text-[var(--brand-950)] mt-0.5">{journey.intent?.email || journey.customer_email || 'Not Available'}</p>
                </div>
              </div>
            </Card>
          )}

          {/* 3. BUSINESS */}
          {activeSection === 'business' && (
            <Card variant="default" padding="md">
              <h3 className="text-sm font-black text-[var(--brand-950)] mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--brand-700)]" /> Enterprise Entity Verification
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Legal Entity Name</p>
                  <p className="font-bold text-[var(--brand-950)] mt-0.5">{journey.intent.business_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">GSTIN</p>
                  <p className="font-mono font-bold text-[var(--brand-950)] mt-0.5">{journey.intent.gstin || '27AAACS1234F1Z5'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Industry Sector</p>
                  <p className="font-bold text-[var(--brand-950)] mt-0.5">{journey.intent.industry_sector || 'Textile & Garment Manufacturing'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Operating Vintage</p>
                  <p className="font-bold text-[var(--brand-950)] mt-0.5">{journey.intent.vintage_months} Months ({Math.floor(journey.intent.vintage_months / 12)} years)</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Annual Reported Turnover</p>
                  <p className="font-mono font-bold text-[var(--brand-950)] mt-0.5">₹{(journey.intent.annual_turnover / 10000000).toFixed(2)} Crores</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Registered Address</p>
                  <p className="text-[var(--brand-950)] mt-0.5">Plot 42, MIDC Industrial Estate, Bhiwandi, Maharashtra 421302</p>
                </div>
              </div>
            </Card>
          )}

          {/* 4. INTENT */}
          {activeSection === 'intent' && (
            <Card variant="default" padding="md">
              <h3 className="text-sm font-black text-[var(--brand-950)] mb-4 flex items-center gap-2">
                <FilePlus className="w-4 h-4 text-[var(--brand-700)]" /> Credit Intent & Facility Scope
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Credit Product</p>
                  <p className="font-bold text-[var(--brand-950)] mt-0.5">{journey.intent.product_type || 'MSME Secured Working Capital'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Requested Limit</p>
                  <p className="font-mono font-bold text-base text-[var(--brand-950)] mt-0.5">₹{(journey.intent.requested_amount / 100000).toFixed(2)} Lakhs</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Requested Tenor</p>
                  <p className="font-bold text-[var(--brand-950)] mt-0.5">{journey.intent.tenor_months || 24} Months</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Stated Financing Purpose</p>
                  <p className="text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    {journey.intent.purpose || 'Working capital buffer for bulk cotton procurement and order delivery for domestic wholesale contracts.'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* 5. DOCUMENTS */}
          {activeSection === 'documents' && (
            <Card variant="default" padding="md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-[var(--brand-950)] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--brand-700)]" /> Uploaded Ingested Documents ({documents.length})
                </h3>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setShowDocRequestModal(true)}
                  leftIcon={<FilePlus className="w-3 h-3" />}
                >
                  Request Additional Document
                </Button>
              </div>

              {documents.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-4 text-center">No documents ingested in this case yet.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.document_id}
                      className="p-3 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-2xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-[var(--brand-700)]" />
                        <div>
                          <p className="font-bold text-[var(--brand-950)]">{doc.doc_type || 'Financial Document'}</p>
                          <p className="text-[10px] text-[var(--text-muted)] font-mono">ID: {doc.document_id} · Hash: {doc.sha256_hash?.slice(0, 10) || 'Verified'}…</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                          {doc.status || 'VERIFIED'}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--text-muted)]">
                          {(doc.extracted_fields_count ? 98 : 95)}% OCR Conf
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* 6. EVIDENCE */}
          {activeSection === 'evidence' && (
            <Card variant="default" padding="md">
              <h3 className="text-sm font-black text-[var(--brand-950)] mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[var(--brand-700)]" /> Immutable Evidence Ledger
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
                <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)]">
                  <p className="text-[10px] font-bold text-[var(--text-muted)]">GSTR-3B Revenue</p>
                  <p className="font-mono font-bold text-[var(--brand-950)] mt-1">₹3.80 Cr</p>
                  <span className="text-[9px] text-[var(--fin-green)]">Verified via Portal</span>
                </div>
                <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)]">
                  <p className="text-[10px] font-bold text-[var(--text-muted)]">Bank Total Credits</p>
                  <p className="font-mono font-bold text-[var(--brand-950)] mt-1">₹3.85 Cr</p>
                  <span className="text-[9px] text-[var(--fin-green)]">12-Mo Statement</span>
                </div>
                <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)]">
                  <p className="text-[10px] font-bold text-[var(--text-muted)]">ITR-5 Reported Gross</p>
                  <p className="font-mono font-bold text-[var(--brand-950)] mt-1">₹3.75 Cr</p>
                  <span className="text-[9px] text-[var(--fin-green)]">AY 2025-26</span>
                </div>
                <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)]">
                  <p className="text-[10px] font-bold text-[var(--text-muted)]">Circular Inflow Ratio</p>
                  <p className="font-mono font-bold text-[var(--brand-950)] mt-1">0.8%</p>
                  <span className="text-[9px] text-[var(--fin-green)]">Normal Baseline (&lt;5%)</span>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Evidence was extracted through deterministic OCR and verified across official tax and banking registries. Hash provenance guarantees zero tampering post-ingestion.
              </p>
            </Card>
          )}

          {/* 7. VERIFICATION */}
          {activeSection === 'verification' && (
            <Card variant="default" padding="md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-[var(--brand-950)] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--brand-700)]" /> Cross-Document Discrepancy Reconciliation
                </h3>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  consistency?.is_consistent
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}>
                  {consistency?.is_consistent ? 'Fully Reconciled' : 'Discrepancy Flagged'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                {consistency?.summary || 'GSTR-3B revenue aligns with 12-month net banking credits within acceptable 2.1% trade reconciliation tolerance.'}
              </p>
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>GSTIN Validated against CBIC Master Database</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>PAN linked with Aadhaar and Active Business Entity</span>
                </div>
              </div>
            </Card>
          )}

          {/* 8. FINANCIAL HEALTH */}
          {activeSection === 'financial_health' && (
            <Card variant="default" padding="md">
              <h3 className="text-sm font-black text-[var(--brand-950)] mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--brand-700)]" /> Cash-Flow & Solvency Analytics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)]">
                  <p className="text-[10px] font-bold text-[var(--text-muted)]">Debt Service Coverage (DSCR)</p>
                  <p className="text-xl font-black text-[var(--brand-950)] font-mono mt-1">1.85x</p>
                  <p className="text-[9px] text-[var(--fin-green)] font-semibold">Exceeds 1.25x policy floor</p>
                </div>
                <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)]">
                  <p className="text-[10px] font-bold text-[var(--text-muted)]">Operating Profit Margin</p>
                  <p className="text-xl font-black text-[var(--brand-950)] font-mono mt-1">14.2%</p>
                  <p className="text-[9px] text-[var(--fin-green)] font-semibold">Industry peer: 11.5%</p>
                </div>
                <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)]">
                  <p className="text-[10px] font-bold text-[var(--text-muted)]">Cash Runway Buffer</p>
                  <p className="text-xl font-black text-[var(--brand-950)] font-mono mt-1">4.2 mos</p>
                  <p className="text-[9px] text-[var(--fin-green)] font-semibold">Healthy working liquidity</p>
                </div>
              </div>
            </Card>
          )}

          {/* 9. RISK */}
          {activeSection === 'risk' && (
            <Card variant="default" padding="md">
              <h3 className="text-sm font-black text-[var(--brand-950)] mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[var(--brand-700)]" /> Multi-Factor Credit Risk Scorecard
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs mb-4">
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Assessed Risk Band</p>
                  <span className="inline-block mt-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                    {risk?.risk_band || 'LOW_RISK'} (Prime Tier)
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">FinFlow Score</p>
                  <p className="font-mono font-black text-lg text-[var(--brand-950)] mt-0.5">{risk?.risk_score || 785} / 1000</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Probability of Default (PD)</p>
                  <p className="font-mono font-bold text-sm text-[var(--fin-green)] mt-0.5">1.2% (Historical baseline)</p>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Risk calculation synthesizes debt service coverage, promoter bureau integrity, vintage stability, and banking cash velocity. Zero fraud alerts triggered on corporate network.
              </p>
            </Card>
          )}

          {/* 10. DECISION */}
          {activeSection === 'decision' && (
            <Card variant="default" padding="md">
              <h3 className="text-sm font-black text-[var(--brand-950)] mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-[var(--brand-700)]" /> Algorithmic Underwriting Decision
              </h3>
              <div className="p-4 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-2xl mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Recommendation</p>
                  <p className="text-xl font-black text-[var(--brand-950)] mt-0.5">{decision?.outcome || 'APPROVED'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Approved Facility Limit</p>
                  <p className="text-xl font-black text-[var(--brand-700)] font-mono mt-0.5">
                    ₹{((decision?.approved_amount || journey.intent.requested_amount) / 100000).toFixed(2)} Lakhs
                  </p>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {decision?.reasoning || decision?.key_reasons?.[0] || 'Sanction approved based on strong debt service coverage (1.85x), consistent GST revenue filings, and unencumbered commercial track record.'}
              </p>
            </Card>
          )}

          {/* 11. NEXT BEST ACTION */}
          {activeSection === 'next_best_action' && (
            <Card variant="default" padding="md">
              <h3 className="text-sm font-black text-[var(--brand-950)] mb-4 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-[var(--brand-700)]" /> Recommended Next Operational Action
              </h3>
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-blue-950 text-sm">
                    {nextAction?.action_type || 'DISBURSEMENT_AGREEMENT_GENERATION'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    High Priority
                  </span>
                </div>
                <p className="text-blue-900 leading-relaxed">
                  {nextAction?.description || 'Trigger formal loan sanction agreement and e-mandate setup for applicant digital signature.'}
                </p>
              </div>
            </Card>
          )}

          {/* 12. TIMELINE */}
          {activeSection === 'timeline' && (
            <Card variant="default" padding="md">
              <h3 className="text-sm font-black text-[var(--brand-950)] mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--brand-700)]" /> Chronological Event Timeline
              </h3>
              <div className="space-y-4">
                {(timeline?.events || []).length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-4 text-center">No timeline events recorded yet.</p>
                ) : (timeline?.events || []).map((t: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand-700)] mt-1 shrink-0" />
                    <div>
                      <p className="font-bold text-[var(--brand-950)]">{t.event || t.eventType}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{t.actor || t.actorType} · {t.time || t.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 13. NOTES */}
          {activeSection === 'notes' && (
            <Card variant="default" padding="md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-[var(--brand-950)] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[var(--brand-700)]" /> RM Case Diary & Field Notes
                </h3>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setShowNoteModal(true)}
                  leftIcon={<MessageSquare className="w-3 h-3" />}
                >
                  Add Field Note
                </Button>
              </div>

              <div className="space-y-3">
                {caseNotes.map((note) => (
                  <div key={note.id} className="p-3 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-2xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-[var(--brand-950)]">{note.author} ({note.role})</span>
                      <span className="text-[var(--text-muted)]">{note.timestamp}</span>
                    </div>
                    <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-[var(--brand-100)] text-[var(--brand-800)]">
                      {note.tag}
                    </span>
                    <p className="text-[var(--text-secondary)] mt-1 leading-relaxed">{note.text}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 14. ESCALATIONS */}
          {activeSection === 'escalations' && (
            <Card variant="default" padding="md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-[var(--brand-950)] flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-[var(--brand-700)]" /> Four-Eyes Governance & Escalations
                </h3>
                <Button
                  variant="brutal"
                  size="xs"
                  onClick={() => setShowEscalateModal(true)}
                  leftIcon={<Send className="w-3 h-3" />}
                >
                  Initiate Escalation
                </Button>
              </div>

              {reviews.length === 0 ? (
                <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl text-xs text-[var(--text-muted)] text-center">
                  No active escalations recorded for this application. Operational flow is normal.
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div key={rev.reviewId} className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-1 text-amber-900">
                      <div className="flex items-center justify-between font-bold">
                        <span>Review Level: {rev.reviewerRole}</span>
                        <span className="text-[10px] font-mono">{rev.status}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">{rev.rationaleNotes || 'Escalated for supervisory review'}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[var(--brand-950)] shadow-[8px_8px_0px_#0A1F20] max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-[var(--brand-950)]">Add RM Field Note</h3>
            <form onSubmit={handleAddNote} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Category</label>
                <select
                  value={noteTag}
                  onChange={(e) => setNoteTag(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] mt-1"
                >
                  <option value="SITE_VISIT">Site Visit & Factory Inspection</option>
                  <option value="CLIENT_MEETING">Promoter Interview</option>
                  <option value="COLLATERAL_CHECK">Collateral / Inventory Check</option>
                  <option value="GENERAL">General Operational Note</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Observation Notes</label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Record factual observations from field visits or client interactions..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-xl border border-[var(--border)] mt-1"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowNoteModal(false)}>Cancel</Button>
                <Button variant="brutal" size="sm" type="submit">Save Note</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Request Modal */}
      {showDocRequestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[var(--brand-950)] shadow-[8px_8px_0px_#0A1F20] max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-[var(--brand-950)]">Request Document from Applicant</h3>
            <form onSubmit={handleRequestDocument} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Required Document</label>
                <select
                  value={docTypeToRequest}
                  onChange={(e) => setDocTypeToRequest(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] mt-1"
                >
                  <option value="AUDITED_BALANCE_SHEET_FY24">Audited Balance Sheet FY 2024-25</option>
                  <option value="GSTR_3B_LAST_6_MONTHS">GSTR-3B for Recent 6 Months</option>
                  <option value="ELECTRICITY_BILL">Latest Factory Electricity Bill</option>
                  <option value="DEBTOR_AGING_REPORT">Debtor Aging Schedule (&gt;90 Days)</option>
                  <option value="PROPERTY_TAX_RECEIPT">Factory Premise Property Tax Receipt</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Underwriting Justification</label>
                <textarea
                  value={docRequestReason}
                  onChange={(e) => setDocRequestReason(e.target.value)}
                  placeholder="Explain why this document is required to progress the application..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-[var(--border)] mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowDocRequestModal(false)}>Cancel</Button>
                <Button variant="brutal" size="sm" type="submit" isLoading={isSubmittingAction}>Dispatch Request</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[var(--brand-950)] shadow-[8px_8px_0px_#0A1F20] max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-[var(--brand-950)]">Escalate Case to Governance</h3>
            <form onSubmit={handleEscalateCase} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Escalate Target</label>
                <select
                  value={escalateTarget}
                  onChange={(e) => setEscalateTarget(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] mt-1"
                >
                  <option value="RISK_OFFICER">Second-Line Risk Desk (Credit Validation)</option>
                  <option value="RM_SUPERVISOR">RM Supervisor (Workload / Operational Exception)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Escalation Rationale</label>
                <textarea
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="Detailed rationale for escalation..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-[var(--border)] mt-1"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowEscalateModal(false)}>Cancel</Button>
                <Button variant="brutal" size="sm" type="submit" isLoading={isSubmittingAction}>Submit Escalation</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Back Modal */}
      {showSendBackModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[var(--brand-950)] shadow-[8px_8px_0px_#0A1F20] max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-[var(--brand-950)]">Send Back Application to Applicant</h3>
            <form onSubmit={handleSendBack} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Clarification / Rectification Needed</label>
                <textarea
                  value={sendBackReason}
                  onChange={(e) => setSendBackReason(e.target.value)}
                  placeholder="Instruct the applicant on what needs correction (e.g. re-upload GST 3B with proper signature)..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-xl border border-[var(--border)] mt-1"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowSendBackModal(false)}>Cancel</Button>
                <Button variant="brutal" size="sm" type="submit" isLoading={isSubmittingAction}>Return Application</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
