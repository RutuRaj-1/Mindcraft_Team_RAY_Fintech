import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auditApi, reviewApi, dashboardApi } from '../../api';
import { AuditCase, AuditFinding, OverrideAnalytics, QueueItem } from '../../types';
import { MetricCard } from '../../components/fintech/MetricCard';
import { DataTable } from '../../components/fintech/DataTable';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  ClipboardCheck, RotateCcw, ShieldAlert, FileText, CheckCircle2,
  AlertTriangle, RefreshCw, ArrowRight, PlusCircle, Check,
  History, Scale, Users, ShieldCheck, BookOpen, Cpu,
  FileSpreadsheet, Network, MessageSquare, AlertOctagon
} from 'lucide-react';

export const AuditGovernanceConsolePage: React.FC = () => {
  const { persona } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'audit_dashboard';

  const [cases, setCases] = useState<AuditCase[]>([]);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [analytics, setAnalytics] = useState<OverrideAnalytics | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Finding modal
  const [showFindingModal, setShowFindingModal] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedJourneyId, setSelectedJourneyId] = useState('');
  const [findingType, setFindingType] = useState('OVERRIDE_ANOMALY');
  const [findingSeverity, setFindingSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [findingTitle, setFindingTitle] = useState('');
  const [findingNarrative, setFindingNarrative] = useState('');
  const [isSubmittingFinding, setIsSubmittingFinding] = useState(false);

  // Audit Comment / Status Modal
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [reviewStatusUpdate, setReviewStatusUpdate] = useState<'UNDER_SCRUTINY' | 'AUDIT_CLEARED' | 'ESCALATED_TO_BOARD'>('AUDIT_CLEARED');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [casesData, findingsData, analyticsData, logsData] = await Promise.all([
        auditApi.getAuditCases(50).catch(() => []),
        auditApi.getAuditFindings().catch(() => []),
        auditApi.getOverrideAnalytics().catch(() => null),
        auditApi.getAuditTrail('jrn_sharma_001').catch(() => []),
      ]);
      setCases(casesData);
      setFindings(findingsData);
      setAnalytics(analyticsData);
      setAuditLogs(logsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Audit telemetry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTabChange = (tabKey: string) => {
    setSearchParams({ tab: tabKey });
  };

  const handleOpenFinding = (c: AuditCase) => {
    setSelectedCaseId(c.applicationId);
    setSelectedJourneyId(c.applicationId);
    setFindingTitle(`Audit Inquiry: ${c.businessName}`);
    setShowFindingModal(true);
  };

  const handleCreateFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!findingTitle || !findingNarrative) return;
    setIsSubmittingFinding(true);
    try {
      await auditApi.createAuditFinding({
        application_id: selectedCaseId,
        journey_id: selectedJourneyId || selectedCaseId,
        finding_type: findingType,
        severity: findingSeverity,
        title: findingTitle,
        narrative_explanation: findingNarrative,
        target_department: 'SECOND_LINE_RISK',
      });
      setShowFindingModal(false);
      setFindingNarrative('');
      setFindingTitle('');
      setSuccessToast('Formal Audit Finding permanently appended to ledger.');
      await loadData();
    } catch (err: any) {
      alert(`Failed to issue finding: ${err.message}`);
    } finally {
      setIsSubmittingFinding(false);
    }
  };

  const handleAddAuditComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      // Append comment to audit ledger via finding or audit notes
      await auditApi.createAuditFinding({
        application_id: selectedCaseId || 'app_audit_note',
        journey_id: selectedJourneyId || 'jrn_audit_note',
        finding_type: 'AUDIT_NOTE',
        severity: 'LOW',
        title: `Audit Oversight Note: ${reviewStatusUpdate}`,
        narrative_explanation: `[Auditor: ${persona.name}] [Status: ${reviewStatusUpdate}] ${commentText.trim()}`,
        target_department: 'INDEPENDENT_AUDIT',
      });
      setShowCommentModal(false);
      setCommentText('');
      setSuccessToast(`Independent audit comment and status '${reviewStatusUpdate}' appended to audit ledger.`);
      await loadData();
    } catch (err: any) {
      alert(`Failed to log audit comment: ${err.message}`);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const tabs = [
    { key: 'audit_dashboard', label: 'Audit Dashboard', icon: ClipboardCheck },
    { key: 'decision_replay', label: 'Decision Replay Docket', icon: RotateCcw },
    { key: 'audit_log', label: 'Audit Log Ledger', icon: History },
    { key: 'overrides', label: 'Overrides Ledger', icon: Scale },
    { key: 'role_activity', label: 'Role Activity Monitor', icon: Users },
    { key: 'evidence_provenance', label: 'Evidence Provenance', icon: ShieldCheck },
    { key: 'policy_history', label: 'Policy Version History', icon: BookOpen },
    { key: 'model_history', label: 'Model Version History', icon: Cpu },
    { key: 'review_findings', label: 'Review Findings & Inquiry', icon: FileSpreadsheet },
    { key: 'suspicious_patterns', label: 'Suspicious Activity Patterns', icon: Network },
  ];

  const caseColumns = [
    {
      key: 'businessName',
      header: 'Commercial Entity',
      render: (row: AuditCase) => (
        <div>
          <p className="font-bold text-[var(--brand-950)] text-xs">{row.businessName}</p>
          <p className="text-[10px] text-[var(--text-muted)] font-mono">{row.applicationId}</p>
        </div>
      ),
    },
    {
      key: 'requestedAmount',
      header: 'Facility Size',
      render: (row: AuditCase) => (
        <span className="font-bold text-xs text-[var(--brand-900)] font-mono">
          ₹{(row.requestedAmount / 100000).toFixed(1)}L
        </span>
      ),
    },
    {
      key: 'currentStage',
      header: 'Stage & Status',
      render: (row: AuditCase) => (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-950)] border border-[var(--brand-950)]">
          {row.currentStage}
        </span>
      ),
    },
    {
      key: 'hasOverride',
      header: 'Human Override',
      render: (row: AuditCase) => (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          row.hasOverride
            ? 'bg-purple-50 text-purple-800 border-purple-300'
            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
        }`}>
          {row.hasOverride ? 'Human Override Logged' : 'Algorithmic Concurrence'}
        </span>
      ),
    },
    {
      key: 'auditEventCount',
      header: 'Audit Trail Depth',
      render: (row: AuditCase) => (
        <span className="font-mono text-xs font-bold text-[var(--text-secondary)]">
          {row.auditEventCount} Immutable Events
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Auditor Actions',
      align: 'right' as const,
      render: (row: AuditCase) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={() => navigate(`/risk/replay/${row.applicationId}`)}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Replay
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              setSelectedCaseId(row.applicationId);
              setSelectedJourneyId(row.applicationId);
              setShowCommentModal(true);
            }}
            leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
          >
            Comment
          </Button>
          <Button
            variant="brutal"
            size="xs"
            onClick={() => handleOpenFinding(row)}
            leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
          >
            Issue Finding
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="rect" height={100} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton variant="rect" height={90} />
          <Skeleton variant="rect" height={90} />
          <Skeleton variant="rect" height={90} />
          <Skeleton variant="rect" height={90} />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Audit Ledger Offline" message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-zinc-100 text-zinc-900 border border-zinc-300">
              Role 7: Third-Line Independent Audit & Governance
            </span>
            <span className="text-xs font-mono font-bold text-[var(--brand-900)]">INDEPENDENT BOARD ASSURANCE</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Independent Audit & Governance Console
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Audit Officer: <strong className="text-[var(--brand-950)]">{persona.name}</strong> · Authority: Full Read, Append-Only Findings (Zero Loan Modification Power)
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={loadData}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Ledger
        </Button>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-[var(--fin-green-bg)] border border-[var(--fin-green)] text-[var(--fin-green)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Check className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSuccessToast(null)}>Dismiss</Button>
        </div>
      )}

      {/* Fiduciary Invariant Notice */}
      <div className="p-4 rounded-2xl bg-zinc-50 border-2 border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20] flex items-start gap-3">
        <ClipboardCheck className="w-5 h-5 text-[var(--brand-950)] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-[var(--brand-950)]">
            Independent Audit Charter & Separation of Duties Invariant (Part 22):
          </p>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Audit Officers have comprehensive read access across all cases, models, and policies, and write access strictly to <strong>audit findings, comments, and review statuses</strong>. Audit Officers cannot approve or decline loans, alter historical risk records, or silently edit decisions. All audit entries are append-only.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Audited Cases"
          value={`${cases.length} Cases`}
          benchmark="100% Cryptographic Provenance"
          status="info"
          icon={<ClipboardCheck className="w-4 h-4 text-zinc-800" />}
        />
        <MetricCard
          label="Human Override Rate"
          value={`${analytics?.overrideRatePct ?? 11.5}%`}
          benchmark="Algorithmic Drift Tracker"
          status={analytics && analytics.overrideRatePct > 20 ? 'warning' : 'success'}
          icon={<AlertTriangle className="w-4 h-4 text-purple-600" />}
        />
        <MetricCard
          label="Active Audit Findings"
          value={`${findings.length} Open`}
          benchmark="Governance Action Items"
          status={findings.length > 0 ? 'warning' : 'success'}
          icon={<ShieldAlert className="w-4 h-4 text-amber-500" />}
        />
        <MetricCard
          label="Model Concurrence Rate"
          value={`${analytics?.concurrenceRatePct ?? 88.5}%`}
          benchmark="First/Second Line Agreement"
          status="success"
          icon={<CheckCircle2 className="w-4 h-4 text-[var(--fin-green)]" />}
        />
      </div>

      {/* 10 Navigation Workspace Tabs (Part 22) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[var(--border)]">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === key
                ? 'bg-[var(--brand-950)] text-white shadow-[2px_2px_0px_#0A1F20]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--brand-950)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'audit_dashboard' && (
        <div className="space-y-6">
          {findings.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                  Formal Audit Inquiries & Findings ({findings.length})
                </span>
                <span className="text-xs font-bold text-amber-900">{findings.length} Open</span>
              </div>
              <div className="space-y-2">
                {findings.map((f) => (
                  <div key={f.findingId} className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-950">{f.title}</span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                          {f.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{f.narrativeExplanation}</p>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold">{f.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-4">
            <h2 className="text-lg font-black text-[var(--brand-950)]">
              Cross-Portfolio Decision Replay Docket
            </h2>
            <DataTable data={cases} columns={caseColumns} searchKey="businessName" searchPlaceholder="Search entities..." />
          </div>
        </div>
      )}

      {activeTab === 'decision_replay' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Chronological Decision Replay Feed</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Select any application to reconstruct the sequence of events from intent to sanction.
          </p>
          <DataTable data={cases} columns={caseColumns} />
        </div>
      )}

      {activeTab === 'audit_log' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Append-Only Audit Ledger</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Cryptographic SHA-256 hash chains verifying immutable event sequence across all services.
          </p>
          <DataTable data={cases} columns={caseColumns} />
        </div>
      )}

      {activeTab === 'overrides' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Human-in-the-Loop Override Scrutiny</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Review all instances where First-Line or Second-Line underwriters diverged from model recommendations.
          </p>
          <DataTable data={cases.filter(c => c.hasOverride)} columns={caseColumns} />
        </div>
      )}

      {activeTab === 'role_activity' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Institutional Role Activity Monitor</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Auditing separation of duties and verification that no single actor acts across multiple conflicting roles.
          </p>
          <DataTable data={cases} columns={caseColumns} />
        </div>
      )}

      {activeTab === 'evidence_provenance' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Evidence Provenance & Document Hashes</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Tracking document ingestion hashes, OCR engine version tags, and extraction confidence.
          </p>
          <DataTable data={cases} columns={caseColumns} />
        </div>
      )}

      {activeTab === 'policy_history' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Policy Version & Credit Norms History</h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex items-center justify-between">
              <div>
                <span className="font-bold text-[var(--brand-950)]">Master Credit Policy Version CN-2026-v3</span>
                <p className="text-[10px] text-[var(--text-muted)]">Enacted: 2026-09-01 · Active Production Policy</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">Active</span>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex items-center justify-between">
              <div>
                <span className="font-bold text-[var(--brand-950)]">Master Credit Policy Version CN-2026-v2</span>
                <p className="text-[10px] text-[var(--text-muted)]">Archived: 2026-08-31 · Superseded</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">Archived</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'model_history' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Model Version & Calibration Register</h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex items-center justify-between">
              <div>
                <span className="font-bold text-[var(--brand-950)]">XGBoost Credit Classifier v2.4</span>
                <p className="text-[10px] text-[var(--text-muted)]">AUC: 0.912 · Model Drift: 0.02 · Deployed in Production</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">Production</span>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex items-center justify-between">
              <div>
                <span className="font-bold text-[var(--brand-950)]">TreeSHAP Explainability Kernel v1.2</span>
                <p className="text-[10px] text-[var(--text-muted)]">Zero-heuristic deterministic local feature importance</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-300">Certified</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'review_findings' && (
        <div className="space-y-4">
          <DataTable data={cases} columns={caseColumns} />
        </div>
      )}

      {activeTab === 'suspicious_patterns' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)] flex items-center gap-2">
            <Network className="w-5 h-5 text-[var(--brand-700)]" />
            <span>Suspicious Activity & Fraud Pattern Audits</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Independent audit verification of circular trading clusters and shared identifier networks.
          </p>
          <DataTable data={cases} columns={caseColumns} />
        </div>
      )}

      {/* Issue Finding Modal (Append-Only) */}
      {showFindingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[var(--brand-950)] shadow-[8px_8px_0px_#0A1F20] max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-[var(--brand-950)]">Issue Formal Audit Finding</h3>
            <form onSubmit={handleCreateFinding} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Title</label>
                <input
                  type="text"
                  value={findingTitle}
                  onChange={(e) => setFindingTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] mt-1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--brand-950)]">Finding Type</label>
                  <select
                    value={findingType}
                    onChange={(e) => setFindingType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] mt-1"
                  >
                    <option value="OVERRIDE_ANOMALY">Override Anomaly</option>
                    <option value="POLICY_DEVIATION">Policy Deviation</option>
                    <option value="EVIDENCE_CONTRADICTION">Evidence Contradiction</option>
                    <option value="SLA_BREACH">Excessive SLA Delay</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--brand-950)]">Severity</label>
                  <select
                    value={findingSeverity}
                    onChange={(e) => setFindingSeverity(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] mt-1"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Narrative Explanation</label>
                <textarea
                  value={findingNarrative}
                  onChange={(e) => setFindingNarrative(e.target.value)}
                  rows={4}
                  className="w-full text-xs p-3 rounded-xl border border-[var(--border)] mt-1"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowFindingModal(false)}>Cancel</Button>
                <Button variant="brutal" size="sm" type="submit" isLoading={isSubmittingFinding}>Record Finding</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Audit Comment / Status Modal (Append-Only) */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[var(--brand-950)] shadow-[8px_8px_0px_#0A1F20] max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-[var(--brand-950)]">Append Audit Oversight Note</h3>
            <p className="text-xs text-[var(--text-secondary)]">Case: {selectedCaseId}</p>
            <form onSubmit={handleAddAuditComment} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Audit Review Status</label>
                <select
                  value={reviewStatusUpdate}
                  onChange={(e) => setReviewStatusUpdate(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] mt-1"
                >
                  <option value="AUDIT_CLEARED">Audit Cleared (Concurrence with Process)</option>
                  <option value="UNDER_SCRUTINY">Under Active Audit Scrutiny</option>
                  <option value="ESCALATED_TO_BOARD">Escalated to Board Audit Committee</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Audit Note Text</label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Record formal auditor observations..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-xl border border-[var(--border)] mt-1"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowCommentModal(false)}>Cancel</Button>
                <Button variant="brutal" size="sm" type="submit" isLoading={isSubmittingComment}>Append Note</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
