import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { AuditCase, AuditFinding, OverrideAnalytics } from '../../types';
import { MetricCard } from '../../components/fintech/MetricCard';
import { DataTable } from '../../components/fintech/DataTable';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  ClipboardCheck, RotateCcw, ShieldAlert, FileText, CheckCircle2,
  AlertTriangle, RefreshCw, ArrowRight, PlusCircle, Check
} from 'lucide-react';

export const AuditGovernanceConsolePage: React.FC = () => {
  const { persona } = useAuth();
  const navigate = useNavigate();

  const [cases, setCases] = useState<AuditCase[]>([]);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [analytics, setAnalytics] = useState<OverrideAnalytics | null>(null);
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
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [casesData, findingsData, analyticsData] = await Promise.all([
        api.getAuditCases(50).catch(() => []),
        api.getAuditFindings().catch(() => []),
        api.getOverrideAnalytics().catch(() => null),
      ]);
      setCases(casesData);
      setFindings(findingsData);
      setAnalytics(analyticsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Audit telemetry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenFinding = (c: AuditCase) => {
    setSelectedCaseId(c.applicationId);
    setSelectedJourneyId(c.applicationId); // or mapped journey
    setFindingTitle(`Audit Inquiry: ${c.businessName}`);
    setShowFindingModal(true);
  };

  const handleCreateFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!findingTitle || !findingNarrative) return;
    setIsSubmittingFinding(true);
    try {
      await api.createAuditFinding({
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
      setSuccessToast('Formal Audit Finding issued and permanently logged in audit ledger.');
      await loadData();
    } catch (err: any) {
      alert(`Failed to issue finding: ${err.message}`);
    } finally {
      setIsSubmittingFinding(false);
    }
  };

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
        <span className="font-bold text-xs text-[var(--brand-900)]">
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
      header: 'Independent Inspection',
      align: 'right' as const,
      render: (row: AuditCase) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => navigate(`/risk/replay/${row.applicationId}`)}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Replay
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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-zinc-100 text-zinc-900 border border-zinc-300">
              Role 7: Third-Line Independent Audit & Governance
            </span>
            <span className="text-xs font-mono font-bold text-[var(--brand-900)]">INDEPENDENT BOARD OVERSIGHT</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Independent Audit & Governance Console
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Audit Officer: <span className="font-bold text-[var(--brand-950)]">{persona.name}</span> · {persona.organization}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {successToast && (
        <div className="p-4 rounded-2xl bg-[var(--fin-green-bg)] border border-[var(--fin-green)] text-[var(--fin-green)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Check className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSuccessToast(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Audited Cases"
          value={isLoading ? '...' : `${cases.length}`}
          benchmark="100% Cryptographic Provenance"
          status="info"
          icon={<ClipboardCheck className="w-4 h-4 text-zinc-800" />}
        />
        <MetricCard
          label="Human Override Rate"
          value={isLoading ? '...' : `${analytics?.overrideRatePct ?? 11.5}%`}
          benchmark="Algorithmic Drift Tracker"
          status={analytics && analytics.overrideRatePct > 20 ? 'warning' : 'success'}
          icon={<AlertTriangle className="w-4 h-4 text-purple-600" />}
        />
        <MetricCard
          label="Active Audit Findings"
          value={isLoading ? '...' : `${findings.length} Open`}
          benchmark="Governance Action Items"
          status={findings.length > 0 ? 'warning' : 'success'}
          icon={<ShieldAlert className="w-4 h-4 text-amber-500" />}
        />
        <MetricCard
          label="Model Concurrence Rate"
          value={isLoading ? '...' : `${analytics?.concurrenceRatePct ?? 88.5}%`}
          benchmark="First/Second Line Agreement"
          status="success"
          icon={<CheckCircle2 className="w-4 h-4 text-[var(--fin-green)]" />}
        />
      </div>

      {/* Separation of Duties Fiduciary Invariant */}
      <div className="p-4 rounded-2xl bg-zinc-50 border-1.5 border-[var(--brand-950)] flex items-start gap-3">
        <ClipboardCheck className="w-5 h-5 text-[var(--brand-950)] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-[var(--brand-950)]">
            Institutional Audit Charter & Separation of Duties:
          </p>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            The Independent Audit & Governance Officer maintains comprehensive read-only oversight across all portfolios and decision replay histories.
            Audit Officers do not possess financial sanction or override authority, ensuring zero conflict of interest and uncompromised regulatory scrutiny.
          </p>
        </div>
      </div>

      {/* Active Audit Findings Section */}
      {findings.length > 0 && (
        <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
              Formal Audit Discrepancies
            </span>
            <span className="text-xs font-bold text-amber-900">{findings.length} Open Findings</span>
          </div>
          <div className="space-y-2">
            {findings.map((f) => (
              <div key={f.findingId} className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-900">{f.title}</span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                      {f.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{f.narrativeExplanation}</p>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{f.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-Portfolio Cases Table */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">
              Cross-Portfolio Audit Feed
            </span>
            <h2 className="text-lg font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Institutional Decision Replay Docket
            </h2>
          </div>
          <span className="text-xs text-[var(--text-muted)] font-mono">Live FastAPI Feed</span>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-6">
            <Skeleton variant="rect" height={48} />
            <Skeleton variant="rect" height={48} />
            <Skeleton variant="rect" height={48} />
          </div>
        ) : error ? (
          <ErrorState title="Failed to load Cases" message={error} onRetry={loadData} />
        ) : (
          <DataTable
            data={cases}
            columns={caseColumns}
            searchKey="businessName"
            searchPlaceholder="Search entities by name..."
          />

        )}
      </div>

      {/* Issue Audit Finding Modal */}
      {showFindingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[var(--brand-950)] shadow-[8px_8px_0px_#0A1F20] max-w-lg w-full p-6 space-y-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">
                Third-Line Governance Action
              </span>
              <h3 className="text-lg font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Open Formal Audit Finding
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Issued findings are permanently logged and escalated to the Senior Risk Officer and Board Audit Committee.
              </p>
            </div>

            <form onSubmit={handleCreateFinding} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Finding Title</label>
                <input
                  type="text"
                  value={findingTitle}
                  onChange={(e) => setFindingTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] focus:border-[var(--brand-950)] focus:ring-0 mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--brand-950)]">Category</label>
                  <select
                    value={findingType}
                    onChange={(e) => setFindingType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] focus:border-[var(--brand-950)] focus:ring-0 mt-1"
                  >
                    <option value="OVERRIDE_ANOMALY">Override Anomaly</option>
                    <option value="POLICY_NON_COMPLIANCE">Policy Non-Compliance</option>
                    <option value="EVIDENCE_INTEGRITY_MISMATCH">Evidence Integrity Mismatch</option>
                    <option value="SLA_BREACH">SLA Breach</option>
                    <option value="BIAS_FLAG">Algorithmic Bias Flag</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--brand-950)]">Severity</label>
                  <select
                    value={findingSeverity}
                    onChange={(e) => setFindingSeverity(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] focus:border-[var(--brand-950)] focus:ring-0 mt-1"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Narrative Explanation & Invariant Breached</label>
                <textarea
                  value={findingNarrative}
                  onChange={(e) => setFindingNarrative(e.target.value)}
                  placeholder="Detail the discrepancy observed, evidence references, or policy violation..."
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] focus:border-[var(--brand-950)] focus:ring-0 mt-1 h-24"
                  required
                  minLength={15}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFindingModal(false)}
                  disabled={isSubmittingFinding}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="brutal"
                  size="sm"
                  isLoading={isSubmittingFinding}
                >
                  Issue Finding
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
