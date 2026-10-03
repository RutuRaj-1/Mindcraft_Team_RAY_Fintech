import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Settings, ShieldCheck, Database, FileText, Cpu, CheckCircle2, RefreshCw, Activity, ArrowUpRight, Lock } from 'lucide-react';

interface AdminProps {
  journeyId: string;
}

export const AdminConsole: React.FC<AdminProps> = ({ journeyId }) => {
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [learningStats, setLearningStats] = useState<Record<string, any>>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [m, l, a] = await Promise.all([
        api.getPortfolioMetrics().catch(() => ({})),
        api.getLearningStats().catch(() => ({})),
        api.getAuditTrail(journeyId).catch(() => [])
      ]);
      setMetrics(m);
      setLearningStats(l);
      setAuditLogs(a);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [journeyId]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-purple text-xs font-bold px-3 py-1">
              System Administration
            </span>
            <span className="text-xs text-[var(--neutral-500)]">Persona: System Administrator / Compliance Officer</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--neutral-900)] tracking-tight">
            Institutional Governance & System Observability
          </h1>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={isLoading}
          className="btn-secondary py-2 px-4 text-xs font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="flex items-center justify-between text-xs text-[var(--neutral-500)] font-semibold">
            <span>Straight-Through Processing</span>
            <Activity className="w-4 h-4 text-[var(--fin-green)]" />
          </div>
          <div className="metric-card-value text-[var(--fin-green)] mt-2">
            {metrics.ai_straight_through_processing_pct || 66.7}%
          </div>
          <p className="text-[11px] text-[var(--neutral-500)] mt-1">Zero-touch AI decisions</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between text-xs text-[var(--neutral-500)] font-semibold">
            <span>Underwriter Overrides</span>
            <ShieldCheck className="w-4 h-4 text-[var(--brand-600)]" />
          </div>
          <div className="metric-card-value text-[var(--brand-700)] mt-2">
            {metrics.human_overrides_executed || 1}
          </div>
          <p className="text-[11px] text-[var(--neutral-500)] mt-1">Active learning loop anchored</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between text-xs text-[var(--neutral-500)] font-semibold">
            <span>Portfolio Avg DSCR</span>
            <ArrowUpRight className="w-4 h-4 text-[var(--fin-blue)]" />
          </div>
          <div className="metric-card-value text-[var(--neutral-900)] mt-2">
            {metrics.average_dscr || 1.62}x
          </div>
          <p className="text-[11px] text-[var(--fin-green)] font-semibold mt-1">Prudent solvency buffer</p>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between text-xs text-[var(--neutral-500)] font-semibold">
            <span>Decision Latency</span>
            <Lock className="w-4 h-4 text-[var(--fin-violet)]" />
          </div>
          <div className="metric-card-value text-[var(--neutral-900)] mt-2">
            {metrics.average_turnaround_minutes || 1.8}m
          </div>
          <p className="text-[11px] text-[var(--neutral-500)] mt-1">Sub-2 minute turnaround</p>
        </div>
      </div>

      {/* Feedback & Model Retraining Loop */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--fin-violet-soft)] flex items-center justify-center text-[var(--fin-violet)]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--neutral-900)] tracking-tight">
                Active Learning & Calibration Loop
              </h3>
              <span className="badge badge-purple text-[10px]">Continuous Feedback</span>
            </div>
            <p className="text-xs text-[var(--neutral-500)] mt-0.5">
              Officer override rationale and credit committee verdicts feed back into policy rule weights.
            </p>
          </div>
        </div>

        <div className="p-4 bg-[var(--neutral-50)] rounded-xl border border-[var(--border-subtle)] text-xs space-y-2.5">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span className="font-semibold text-[var(--neutral-700)]">Model Retraining Readiness:</span>
            <span className="badge badge-success text-xs font-bold px-3 py-1">
              {learningStats.model_retraining_readiness || 'CALIBRATED_STABLE'}
            </span>
          </div>
          <p className="text-[var(--neutral-800)] leading-relaxed">
            <strong className="text-[var(--brand-700)]">Calibration Recommendation:</strong> {learningStats.calibration_signal || 'Threshold for DSCR unhedged limit may be relaxed from 1.25x to 1.20x for borrowers with > 36m vintage.'}
          </p>
        </div>
      </div>

      {/* Append-Only Audit Trail */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[var(--brand-700)]" />
            <h3 className="text-base font-bold text-[var(--neutral-900)] tracking-tight">
              Cryptographic Audit Ledger & Event Log
            </h3>
          </div>
          <span className="badge badge-primary text-[10px]">Append-Only SHA-256</span>
        </div>
        <p className="text-xs text-[var(--neutral-500)] mb-4">
          All state machine advances, OCR extractions, model runs, and human overrides are hashed and immutable.
        </p>

        {auditLogs.length === 0 ? (
          <div className="p-8 text-center text-[var(--neutral-500)] bg-[var(--neutral-50)] rounded-xl border border-dashed border-[var(--border-subtle)]">
            <p className="text-xs">No audit logs recorded yet for this journey.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--neutral-50)] text-[var(--neutral-500)] border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="py-3 px-3.5 font-semibold">Timestamp</th>
                  <th className="py-3 px-3.5 font-semibold">Actor & Role</th>
                  <th className="py-3 px-3.5 font-semibold">Action</th>
                  <th className="py-3 px-3.5 font-semibold">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {auditLogs.map((log) => (
                  <tr key={log.audit_id} className="hover:bg-[var(--neutral-50)] transition-colors">
                    <td className="py-3 px-3.5 text-[var(--neutral-500)] font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3.5 text-[var(--neutral-900)] font-bold whitespace-nowrap">
                      {log.actor_role} <span className="text-[var(--neutral-500)] font-normal text-[11px]">({log.actor_id})</span>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="badge badge-primary text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-[var(--neutral-600)] text-[11px] font-mono max-w-md truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
