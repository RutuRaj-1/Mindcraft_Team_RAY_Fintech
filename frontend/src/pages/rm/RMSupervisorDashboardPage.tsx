import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi, analyticsApi, reviewApi, actionsApi } from '../../api';
import { QueueItem, HumanReview } from '../../types';
import { MetricCard } from '../../components/fintech/MetricCard';
import { DataTable } from '../../components/fintech/DataTable';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  Building2, Users, Clock, AlertTriangle, CheckCircle2,
  ArrowRight, RefreshCw, Filter, ShieldCheck, Compass,
  ArrowRightLeft, PhoneCall, Layers, ShieldAlert, Activity,
  Send, Check, X, FileText, UserCheck, AlertOctagon
} from 'lucide-react';

export const RMSupervisorDashboardPage: React.FC = () => {
  const { persona } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'team_overview';

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [reviews, setReviews] = useState<HumanReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supervisor Action Modals
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedCaseForReassign, setSelectedCaseForReassign] = useState<QueueItem | null>(null);
  const [targetRM, setTargetRM] = useState('Rohan Mehta (West Zone)');
  const [reassignReason, setReassignReason] = useState('');

  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [selectedCaseForException, setSelectedCaseForException] = useState<QueueItem | null>(null);
  const [exceptionType, setExceptionType] = useState('SLA_EXTENSION_48H');
  const [exceptionJustification, setExceptionJustification] = useState('');

  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [selectedCaseForEscalate, setSelectedCaseForEscalate] = useState<QueueItem | null>(null);
  const [escalateNotes, setEscalateNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [queueItems, portfolioMetrics, reviewList] = await Promise.all([
        dashboardApi.getOfficerQueue(),
        dashboardApi.getPortfolioMetrics().catch(() => ({})),
        reviewApi.listReviews(undefined, 'RM_SUPERVISOR').catch(() => []),
      ]);
      setQueue(queueItems);
      setMetrics(portfolioMetrics);
      setReviews(reviewList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Operations telemetry');
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

  // Supervisor Operational Actions
  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForReassign) return;
    setIsSubmitting(true);
    try {
      await actionsApi.executeSafeAction(selectedCaseForReassign.journey_id, {
        action_type: 'REASSIGN_APPLICATION',
        audit_notes: `Reassigned from original underwriter to ${targetRM}. Justification: ${reassignReason}`,
        reviewer_role: 'RM_SUPERVISOR',
      });
      setShowReassignModal(false);
      setReassignReason('');
      setSuccessToast(`Case ${selectedCaseForReassign.journey_id} successfully reassigned to ${targetRM}.`);
      await loadData();
    } catch (err: any) {
      alert(`Reassignment failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForException) return;
    setIsSubmitting(true);
    try {
      await actionsApi.executeSafeAction(selectedCaseForException.journey_id, {
        action_type: 'APPROVE_OPERATIONAL_EXCEPTION',
        audit_notes: `Supervisor approved exception: ${exceptionType}. Justification: ${exceptionJustification}`,
        reviewer_role: 'RM_SUPERVISOR',
      });
      setShowExceptionModal(false);
      setExceptionJustification('');
      setSuccessToast(`Operational exception (${exceptionType}) sanctioned under supervisor authority.`);
      await loadData();
    } catch (err: any) {
      alert(`Exception approval failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalateToRiskManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForEscalate) return;
    setIsSubmitting(true);
    try {
      await reviewApi.startReview(
        selectedCaseForEscalate.journey_id,
        escalateNotes || 'Supervisor escalation to Senior Risk Manager for credit limit enhancement.'
      );
      setShowEscalateModal(false);
      setEscalateNotes('');
      setSuccessToast(`Case ${selectedCaseForEscalate.journey_id} escalated to Second-Line Risk Manager.`);
      await loadData();
    } catch (err: any) {
      alert(`Escalation failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { key: 'team_overview', label: 'Team Overview', icon: Building2 },
    { key: 'rm_workload', label: 'RM Workload', icon: Users },
    { key: 'active_cases', label: 'Active Cases', icon: Activity },
    { key: 'sla_breaches', label: 'SLA Breaches', icon: Clock },
    { key: 'escalations', label: 'Escalations', icon: AlertTriangle },
    { key: 'reassignment', label: 'Reassignment Desk', icon: ArrowRightLeft },
    { key: 'customer_followup', label: 'Customer Follow-up', icon: PhoneCall },
    { key: 'override_patterns', label: 'Override Patterns', icon: Layers },
    { key: 'exceptions', label: 'Operational Exceptions', icon: ShieldAlert },
    { key: 'team_activity', label: 'Team Activity Feed', icon: Compass },
  ];

  const columns = [
    {
      key: 'business_name',
      header: 'Applicant Business',
      render: (row: QueueItem) => (
        <div>
          <p className="font-bold text-[var(--brand-950)] text-xs">{row.business_name}</p>
          <p className="text-[10px] text-[var(--text-muted)] font-mono">{row.journey_id}</p>
        </div>
      ),
    },
    {
      key: 'assigned_rm',
      header: 'Assigned RM',
      render: (_: QueueItem) => (
        <span className="text-xs font-semibold text-[var(--brand-900)]">
          Rohan Mehta (RM-Mum-01)
        </span>
      ),
    },
    {
      key: 'requested_amount',
      header: 'Facility (INR)',
      render: (row: QueueItem) => (
        <span className="font-bold text-xs text-[var(--brand-900)] font-mono">
          ₹{(row.requested_amount / 100000).toFixed(1)}L
        </span>
      ),
    },
    {
      key: 'current_stage',
      header: 'Pipeline Stage',
      render: (row: QueueItem) => (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-950)] border border-[var(--brand-950)]">
          {row.current_stage || 'UNDERWRITING'}
        </span>
      ),
    },
    {
      key: 'sla_status',
      header: 'SLA Aging',
      render: (row: QueueItem) => {
        const isWarning = (row.requested_amount || 0) > 2000000;
        return (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            isWarning
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : 'bg-[var(--fin-green-bg)] text-[var(--fin-green)] border-[var(--fin-green)]/30'
          }`}>
            {isWarning ? '36h · Priority SLA' : '14h · On Track'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Supervisor Control',
      align: 'right' as const,
      render: (row: QueueItem) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              setSelectedCaseForReassign(row);
              setShowReassignModal(true);
            }}
          >
            Reassign
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              setSelectedCaseForException(row);
              setShowExceptionModal(true);
            }}
          >
            Exception
          </Button>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => navigate(`/rm/cases/${row.journey_id}`)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Inspect
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
    return <ErrorState title="Command Center Offline" message={error} onRetry={loadData} />;
  }

  const activeCasesCount = queue.length;
  const pendingCasesCount = queue.filter((q) => q.decision_outcome !== 'APPROVED').length;
  const slaBreachesCount = queue.filter((q) => (q.requested_amount || 0) > 2500000).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
              Role 3: First-Line Operations & RM Supervisory Desk
            </span>
            <span className="text-xs text-[var(--text-muted)] font-mono">FIN-OPS-CTRL</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Credit Operations Command Center
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Supervising Officer: <strong className="text-[var(--brand-950)]">{persona.name}</strong> · Operations Scope: Western Region Commercial Hub
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={loadData}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Live Workload
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

      {/* Supervisor KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Active RM Pipeline"
          value={`${activeCasesCount} Applications`}
          benchmark="100% Assigned"
          status="info"
          icon={<Building2 className="w-4 h-4 text-[var(--brand-700)]" />}
        />
        <MetricCard
          label="Pending Review"
          value={`${pendingCasesCount} Cases`}
          benchmark="Requires RM Action"
          status="warning"
          icon={<Clock className="w-4 h-4 text-amber-600" />}
        />
        <MetricCard
          label="SLA Breaches (>24h)"
          value={`${slaBreachesCount} Breaches`}
          benchmark="Priority Intervention"
          status={slaBreachesCount > 0 ? 'danger' : 'success'}
          icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
        />
        <MetricCard
          label="Operational Exceptions"
          value="2 Approved"
          benchmark="Sanctioned by Supervisor"
          status="success"
          icon={<ShieldCheck className="w-4 h-4 text-[var(--fin-green)]" />}
        />
      </div>

      {/* 10 Navigation Workspace Tabs (Part 19) */}
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
      {activeTab === 'team_overview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-[var(--brand-950)]">Active Operations Underwriting Queue</h3>
            <span className="text-xs text-[var(--text-muted)]">Real-time telemetry across Mumbai SME Hub</span>
          </div>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'rm_workload' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-[var(--brand-950)]">Rohan Mehta</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">Active</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Assigned: {queue.length} Cases · Exposure: ₹1.45 Cr</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-[var(--brand-700)] h-2 rounded-full" style={{ width: '75%' }} />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] font-semibold">Capacity Utilization: 75%</p>
          </div>
          <div className="p-5 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-[var(--brand-950)]">Neha Gupta</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-300">Available</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Assigned: 2 Cases · Exposure: ₹60 Lakhs</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '40%' }} />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] font-semibold">Capacity Utilization: 40% (Target for Reassignments)</p>
          </div>
          <div className="p-5 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-[var(--brand-950)]">Ankit Sharma</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300">Near Limit</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Assigned: 5 Cases · Exposure: ₹2.10 Cr</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-amber-600 h-2 rounded-full" style={{ width: '90%' }} />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] font-semibold">Capacity Utilization: 90%</p>
          </div>
        </div>
      )}

      {activeTab === 'active_cases' && (
        <div className="space-y-4">
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'sla_breaches' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)] flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-600" />
            <span>Aging & SLA Breach Interventions</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Applications exceeding 24h intake without RM site report or document reconciliation are flagged for supervisor reallocation.
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'escalations' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>Operations to Risk Escalations</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Supervisors can escalate complex cases or facilities exceeding first-line authority directly to Meera Krishnan (Senior Risk Manager).
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'reassignment' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)] flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-[var(--brand-700)]" />
            <span>Case Reassignment Desk</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Balance workload across relationship managers to eliminate underwriting bottlenecks. Select any case below to reassign.
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'customer_followup' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Customer Follow-up Log</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Audit of all RM document requests, applicant clarifications, and field inspection calls.
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'override_patterns' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Operational Override Patterns</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Tracking team frequency of covenant adjustments and turnover waivers to preserve risk hygiene.
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'exceptions' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Authorized Operational Exceptions</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Supervisors may approve temporary SLA waivers, provisional site verification windows, or interim document deferrals.
          </p>
          <DataTable data={queue} columns={columns} />
        </div>
      )}

      {activeTab === 'team_activity' && (
      <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Live Team Activity Feed</h3>
          <div className="space-y-2 text-xs">
            {queue.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">No recent team activity. Activity will appear here as cases are processed.</p>
            ) : queue.slice(0, 5).map((item) => (
              <div key={item.journey_id} className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex items-center justify-between">
                <div>
                  <span className="font-bold text-[var(--brand-950)]">{item.business_name} — Stage: {item.current_stage?.replace(/_/g, ' ')}</span>
                  <p className="text-[10px] text-[var(--text-muted)]">Journey: {item.journey_id} · Amount: ₹{((item.requested_amount || 0) / 100000).toFixed(1)}L</p>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">{item.risk_band || 'ACTIVE'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {showReassignModal && selectedCaseForReassign && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[var(--brand-950)] shadow-[8px_8px_0px_#0A1F20] max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-[var(--brand-950)]">Reassign Application</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Case: <strong>{selectedCaseForReassign.business_name}</strong> ({selectedCaseForReassign.journey_id})
            </p>
            <form onSubmit={handleReassign} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Assign Target Relationship Manager</label>
                <select
                  value={targetRM}
                  onChange={(e) => setTargetRM(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] mt-1"
                >
                  <option value="Neha Gupta (West Zone - 40% Load)">Neha Gupta (Available - 40% Load)</option>
                  <option value="Rohan Mehta (West Zone - 75% Load)">Rohan Mehta (Current - 75% Load)</option>
                  <option value="Ankit Sharma (South Zone - 90% Load)">Ankit Sharma (Near Limit - 90% Load)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Operational Reason</label>
                <textarea
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="Justification for workload rebalancing or regional expertise..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-[var(--border)] mt-1"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowReassignModal(false)}>Cancel</Button>
                <Button variant="brutal" size="sm" type="submit" isLoading={isSubmitting}>Confirm Reassignment</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exception Modal */}
      {showExceptionModal && selectedCaseForException && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[var(--brand-950)] shadow-[8px_8px_0px_#0A1F20] max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-[var(--brand-950)]">Sanction Operational Exception</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Case: <strong>{selectedCaseForException.business_name}</strong> ({selectedCaseForException.journey_id})
            </p>
            <form onSubmit={handleApproveException} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Exception Class</label>
                <select
                  value={exceptionType}
                  onChange={(e) => setExceptionType(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[var(--border)] mt-1"
                >
                  <option value="SLA_EXTENSION_48H">SLA Extension +48h (Awaiting Auditor Sign-off)</option>
                  <option value="DEFERRED_FACTORY_BILL">Deferred Factory Electricity Bill (Allowed Pre-Disbursal)</option>
                  <option value="PROVISIONAL_SITE_VISIT">Provisional Digital Geo-Tagged Site Verification</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">Supervisor Rationale</label>
                <textarea
                  value={exceptionJustification}
                  onChange={(e) => setExceptionJustification(e.target.value)}
                  placeholder="Record formal reasons for operational exception..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-[var(--border)] mt-1"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowExceptionModal(false)}>Cancel</Button>
                <Button variant="brutal" size="sm" type="submit" isLoading={isSubmitting}>Sanction Exception</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
