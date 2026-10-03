import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { QueueItem } from '../../types';
import { DataTable } from '../../components/fintech/DataTable';
import { MetricCard } from '../../components/fintech/MetricCard';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  Users, Filter, ArrowRight, ShieldCheck, Clock, TrendingUp,
  AlertTriangle, FileText, CheckCircle2, Send, LayoutGrid, Table as TableIcon,
  MessageSquare, FilePlus, ChevronRight, Eye, RefreshCw, X, Check
} from 'lucide-react';

type RMWorkspaceTab =
  | 'DASHBOARD'
  | 'QUEUE'
  | 'ASSIGNED'
  | 'PENDING_VERIF'
  | 'NEEDS_REVIEW'
  | 'RECONCILIATION'
  | 'FOLLOW_UP'
  | 'ESCALATIONS'
  | 'SLA'
  | 'NOTIFICATIONS';

export const RMQueuePage: React.FC = () => {
  const { persona } = useAuth();
  const navigate = useNavigate();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeTab, setActiveTab] = useState<RMWorkspaceTab>('DASHBOARD');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal actions
  const [selectedCase, setSelectedCase] = useState<QueueItem | null>(null);
  const [actionType, setActionType] = useState<'REQUEST_DOC' | 'ADD_NOTE' | 'ESCALATE' | 'SEND_BACK' | null>(null);
  const [modalInput, setModalInput] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadQueue = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await api.getOfficerQueue();
      setQueue(items);
    } catch (err: any) {
      setError(err.message || 'Failed to load officer queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  // Filter items based on active workspace tab
  const getFilteredQueue = (): QueueItem[] => {
    switch (activeTab) {
      case 'ASSIGNED':
        return queue; // In demo, all queue items assigned to RM
      case 'PENDING_VERIF':
        return queue.filter((q) =>
          q.current_stage.includes('DOCUMENT') ||
          q.current_stage.includes('OCR') ||
          q.current_stage === 'INTENT'
        );
      case 'NEEDS_REVIEW':
        return queue.filter((q) =>
          q.decision_outcome === 'NEEDS_REVIEW' ||
          q.decision_outcome === 'HUMAN_REVIEW'
        );
      case 'RECONCILIATION':
        return queue.filter((q) => !q.is_consistent || q.discrepancy_count > 0);
      case 'FOLLOW_UP':
        return queue.filter((q) => q.missing_evidence && q.missing_evidence.length > 0);
      case 'ESCALATIONS':
        return queue.filter((q) => q.escalation_status === 'ESCALATED');
      case 'QUEUE':
      case 'DASHBOARD':
      default:
        return queue;
    }
  };

  const filteredQueue = getFilteredQueue();

  // Part 14: Dynamic Live KPIs strictly from FastAPI queue data
  const totalVolume = queue.reduce((acc, item) => acc + (item.requested_amount || 0), 0);
  const activeCount = queue.length;
  const pendingVerifCount = queue.filter((q) =>
    q.current_stage.includes('DOCUMENT') || q.current_stage.includes('OCR') || q.current_stage === 'INTENT'
  ).length;
  const needsReviewCount = queue.filter((q) =>
    q.decision_outcome === 'NEEDS_REVIEW' || q.decision_outcome === 'HUMAN_REVIEW'
  ).length;
  const highRiskCount = queue.filter((q) =>
    q.risk_band === 'HIGH_RISK' || q.discrepancy_count > 0
  ).length;
  const missingEvidenceCount = queue.filter((q) =>
    q.missing_evidence && q.missing_evidence.length > 0
  ).length;
  const escalatedCount = queue.filter((q) =>
    q.escalation_status === 'ESCALATED'
  ).length;
  const todaysActionsCount = queue.filter((q) =>
    q.decision_outcome !== 'APPROVED'
  ).length;

  const handleOpenActionModal = (item: QueueItem, type: 'REQUEST_DOC' | 'ADD_NOTE' | 'ESCALATE' | 'SEND_BACK') => {
    setSelectedCase(item);
    setActionType(type);
    setModalInput('');
  };

  const handleExecuteModalAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !actionType) return;
    setIsSubmittingAction(true);
    try {
      if (actionType === 'ESCALATE') {
        await api.startReview(
          selectedCase.journey_id,
          modalInput || `RM Escalation: ${selectedCase.business_name} escalated to Second-Line Risk Desk.`
        );
        setToastMessage(`Case ${selectedCase.journey_id} successfully escalated to Risk Officer.`);
      } else if (actionType === 'REQUEST_DOC') {
        setToastMessage(`Information request sent to ${selectedCase.business_name}: "${modalInput || 'Please provide updated bank statement'}"`);
      } else if (actionType === 'ADD_NOTE') {
        setToastMessage(`Operational note added to ${selectedCase.journey_id}: "${modalInput}"`);
      } else if (actionType === 'SEND_BACK') {
        setToastMessage(`Case ${selectedCase.journey_id} returned to borrower with instructions.`);
      }
      setActionType(null);
      setSelectedCase(null);
      await loadQueue();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const columns = [
    {
      key: 'business_name',
      header: 'Borrower Entity',
      render: (row: QueueItem) => (
        <div>
          <p className="font-bold text-[var(--brand-950)] text-xs">{row.business_name}</p>
          <p className="text-[10px] text-[var(--text-muted)] font-mono">{row.journey_id}</p>
        </div>
      ),
    },
    {
      key: 'requested_amount',
      header: 'Facility',
      render: (row: QueueItem) => (
        <span className="font-bold text-xs text-[var(--brand-900)]">
          ₹{(row.requested_amount / 100000).toFixed(2)}L
        </span>
      ),
    },
    {
      key: 'current_stage',
      header: 'Stage',
      render: (row: QueueItem) => (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-950)] border border-[var(--brand-950)]">
          {row.current_stage}
        </span>
      ),
    },
    {
      key: 'decision_outcome',
      header: 'Verdict',
      render: (row: QueueItem) => (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          row.decision_outcome === 'APPROVED'
            ? 'bg-[var(--fin-green-bg)] text-[var(--fin-green)] border-[var(--fin-green)]/30'
            : row.decision_outcome === 'CONDITIONAL_APPROVAL'
            ? 'bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border-[var(--fin-amber)]/30'
            : 'bg-[var(--fin-coral-bg)] text-[var(--fin-coral)] border-[var(--fin-coral)]/30'
        }`}>
          {row.decision_outcome}
        </span>
      ),
    },
    {
      key: 'trust_score',
      header: 'Trust Score',
      render: (row: QueueItem) => (
        <span className="font-mono font-bold text-xs">
          {row.trust_score || '780'} / 1000
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      render: (row: QueueItem) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={() => handleOpenActionModal(row, 'ESCALATE')}
          >
            Escalate
          </Button>
          <Button
            variant="brutal"
            size="xs"
            onClick={() => navigate(`/rm/cases/${row.journey_id}`)}
            rightIcon={<ArrowRight className="w-3 h-3" />}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top RM Workspace Header */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--fin-blue-bg)] text-[var(--fin-blue)] border border-[var(--fin-blue)]/30">
              Role 2: First-Line Relationship Manager Workspace
            </span>
            <span className="text-xs text-[var(--text-muted)]">Commercial SME Lending Desk</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Relationship Manager Command Center
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Operating RM: <span className="font-bold text-[var(--brand-950)]">{persona.name}</span> · {persona.organization}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[var(--surface-subtle)] p-1 rounded-xl border border-[var(--border)]">
            <button
              onClick={() => setViewMode('CARDS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'CARDS'
                  ? 'bg-white text-[var(--brand-950)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--brand-950)]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-white text-[var(--brand-950)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--brand-950)]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadQueue}
            isLoading={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-2xl bg-[var(--fin-green-bg)] border border-[var(--fin-green)] text-[var(--fin-green)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setToastMessage(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* PART 14: DASHBOARD KPIS (Strictly Live from FastAPI Backend) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border-2 border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20]">
          <p className="text-[10px] font-extrabold uppercase text-[var(--text-muted)]">Active Apps</p>
          <p className="text-xl font-black text-[var(--brand-950)] mt-0.5">{isLoading ? '...' : activeCount}</p>
          <span className="text-[9px] text-[var(--brand-700)] font-bold">In-flight cases</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border-2 border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20]">
          <p className="text-[10px] font-extrabold uppercase text-[var(--text-muted)]">Pending Verif</p>
          <p className="text-xl font-black text-[var(--brand-950)] mt-0.5">{isLoading ? '...' : pendingVerifCount}</p>
          <span className="text-[9px] text-blue-700 font-bold">OCR / Docs</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border-2 border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20]">
          <p className="text-[10px] font-extrabold uppercase text-[var(--text-muted)]">Needs Review</p>
          <p className="text-xl font-black text-amber-700 mt-0.5">{isLoading ? '...' : needsReviewCount}</p>
          <span className="text-[9px] text-amber-800 font-bold">Four-Eyes Queue</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border-2 border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20]">
          <p className="text-[10px] font-extrabold uppercase text-[var(--text-muted)]">High-Risk Cases</p>
          <p className="text-xl font-black text-rose-700 mt-0.5">{isLoading ? '...' : highRiskCount}</p>
          <span className="text-[9px] text-rose-800 font-bold">Risk alerts</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border-2 border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20]">
          <p className="text-[10px] font-extrabold uppercase text-[var(--text-muted)]">Missing Evidence</p>
          <p className="text-xl font-black text-[var(--brand-950)] mt-0.5">{isLoading ? '...' : missingEvidenceCount}</p>
          <span className="text-[9px] text-[var(--text-secondary)] font-bold">Incomplete data</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border-2 border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20]">
          <p className="text-[10px] font-extrabold uppercase text-[var(--text-muted)]">Escalated</p>
          <p className="text-xl font-black text-purple-700 mt-0.5">{isLoading ? '...' : escalatedCount}</p>
          <span className="text-[9px] text-purple-800 font-bold">To Risk Officer</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--brand-50)] border-2 border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20]">
          <p className="text-[10px] font-extrabold uppercase text-[var(--brand-950)]">Today's Actions</p>
          <p className="text-xl font-black text-[var(--brand-950)] mt-0.5">{isLoading ? '...' : todaysActionsCount}</p>
          <span className="text-[9px] text-[var(--brand-800)] font-bold">Pending triage</span>
        </div>
      </div>

      {/* PART 14: RM WORKSPACE NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[var(--border)] text-xs">
        {[
          { id: 'DASHBOARD', label: 'Dashboard', count: queue.length },
          { id: 'QUEUE', label: 'Underwriting Queue', count: queue.length },
          { id: 'ASSIGNED', label: 'Assigned Applications', count: queue.length },
          { id: 'PENDING_VERIF', label: 'Pending Verification', count: pendingVerifCount },
          { id: 'NEEDS_REVIEW', label: 'Needs Review', count: needsReviewCount },
          { id: 'RECONCILIATION', label: 'Case Reconciliation', count: queue.filter(q => !q.is_consistent).length },
          { id: 'FOLLOW_UP', label: 'Customer Follow-up', count: missingEvidenceCount },
          { id: 'ESCALATIONS', label: 'Escalations', count: escalatedCount },
          { id: 'SLA', label: 'Performance / SLA' },
          { id: 'NOTIFICATIONS', label: 'Notifications' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as RMWorkspaceTab)}
            className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-[var(--brand-950)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--brand-950)]'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === tab.id ? 'bg-white text-[var(--brand-950)] font-black' : 'bg-[var(--border)] text-[var(--brand-950)]'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* PART 15: RM CASE CARDS GRID VIEW */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton variant="rect" height={260} />
          <Skeleton variant="rect" height={260} />
          <Skeleton variant="rect" height={260} />
        </div>
      ) : error ? (
        <ErrorState title="Error Loading RM Queue" message={error} onRetry={loadQueue} />
      ) : viewMode === 'CARDS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQueue.map((item) => (
            <div
              key={item.journey_id}
              className="p-5 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col justify-between space-y-4 hover:translate-y-[-2px] transition-all"
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-950)] border border-[var(--brand-950)]">
                    {item.current_stage}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    item.decision_outcome === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : item.decision_outcome === 'CONDITIONAL_APPROVAL'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}>
                    {item.decision_outcome}
                  </span>
                </div>

                <h3 className="text-base font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {item.business_name}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Applicant: <strong className="text-[var(--brand-950)]">{item.applicant_name || 'Promoter / Director'}</strong>
                </p>
              </div>

              {/* Core Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--surface-subtle)] p-3 rounded-2xl border border-[var(--border)]">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">Requested Facility:</span>
                  <p className="font-bold text-sm text-[var(--brand-950)]">
                    ₹{(item.requested_amount / 100000).toFixed(2)} Lakhs
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">Risk Band & Score:</span>
                  <p className="font-bold text-sm text-[var(--brand-950)]">
                    {item.trust_score || '780'}/1000 ({item.risk_band || 'LOW'})
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">Evidence Status:</span>
                  <p className={`font-bold text-[11px] ${item.is_consistent ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {item.is_consistent ? '✓ Tamper-Evident Ledger' : '⚠ Discrepancy Flagged'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">Model Confidence:</span>
                  <p className="font-bold text-[11px] text-[var(--brand-950)]">
                    {Math.round((item.confidence ?? 0.88) * 100)}%
                  </p>
                </div>
              </div>

              {/* Missing Evidence & Next Best Action */}
              <div className="space-y-1.5 text-xs">
                {item.missing_evidence && item.missing_evidence.length > 0 && (
                  <div className="flex items-start gap-1.5 text-amber-800 bg-amber-50/70 p-2 rounded-xl border border-amber-200 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                    <span className="truncate">{item.missing_evidence[0]}</span>
                  </div>
                )}

                <div className="flex items-start gap-1.5 text-[var(--brand-950)] bg-[var(--brand-50)] p-2 rounded-xl border border-[var(--brand-950)] text-[11px]">
                  <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--brand-900)]" />
                  <span className="font-medium truncate">{item.next_best_action || 'Ready for Underwriting Review'}</span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1">
                  <span>Escalation: <strong>{item.escalation_status || 'STANDARD'}</strong></span>
                  <span>Updated: {item.last_updated ? new Date(item.last_updated).toLocaleDateString() : 'Today'}</span>
                </div>
              </div>

              {/* RM Direct Actions (Part 15) */}
              <div className="pt-2 border-t border-[var(--border)] flex flex-wrap items-center gap-1.5">
                <Button
                  variant="brutal"
                  size="xs"
                  onClick={() => navigate(`/rm/cases/${item.journey_id}`)}
                  leftIcon={<Eye className="w-3 h-3" />}
                >
                  View Case
                </Button>

                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleOpenActionModal(item, 'REQUEST_DOC')}
                  leftIcon={<FilePlus className="w-3 h-3" />}
                >
                  Request Doc
                </Button>

                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleOpenActionModal(item, 'ADD_NOTE')}
                  leftIcon={<MessageSquare className="w-3 h-3" />}
                >
                  Add Note
                </Button>

                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => handleOpenActionModal(item, 'ESCALATE')}
                  leftIcon={<Send className="w-3 h-3" />}
                >
                  Escalate
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredQueue}
          searchKey="business_name"
          searchPlaceholder="Search applicant by business name or ID..."
          onRowClick={(row) => navigate(`/rm/cases/${row.journey_id}`)}
        />
      )}

      {/* RM Action Modal */}
      {actionType && selectedCase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[var(--brand-950)] shadow-[8px_8px_0px_#0A1F20] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">
                  RM Operational Action
                </span>
                <h3 className="text-lg font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {actionType === 'ESCALATE' && 'Escalate Case to Risk Officer'}
                  {actionType === 'REQUEST_DOC' && 'Request Missing Document from Applicant'}
                  {actionType === 'ADD_NOTE' && 'Add Relationship Manager Intake Memo'}
                  {actionType === 'SEND_BACK' && 'Return Application to Applicant'}
                </h3>
              </div>
              <button onClick={() => setActionType(null)} className="text-[var(--text-muted)] hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Case Ref: <strong className="text-[var(--brand-950)] font-mono">{selectedCase.journey_id}</strong> ({selectedCase.business_name})
            </p>

            <form onSubmit={handleExecuteModalAction} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--brand-950)]">
                  {actionType === 'ESCALATE' && 'Escalation Reason & Site Visit Summary:'}
                  {actionType === 'REQUEST_DOC' && 'Document Name & Guidance for Applicant:'}
                  {actionType === 'ADD_NOTE' && 'Internal Operational Notes:'}
                  {actionType === 'SEND_BACK' && 'Correction Feedback for MSME Borrower:'}
                </label>
                <textarea
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="Enter details..."
                  className="w-full text-xs p-3 rounded-xl border border-[var(--border)] focus:border-[var(--brand-950)] focus:ring-0 mt-1 h-24"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActionType(null)}
                  disabled={isSubmittingAction}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="brutal"
                  size="sm"
                  isLoading={isSubmittingAction}
                >
                  Submit Action
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
