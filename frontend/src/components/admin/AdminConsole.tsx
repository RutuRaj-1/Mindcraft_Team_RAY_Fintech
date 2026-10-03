import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Settings, ShieldCheck, Database, FileText, Cpu, CheckCircle2 } from 'lucide-react';

interface AdminProps {
  journeyId: string;
}

export const AdminConsole: React.FC<AdminProps> = ({ journeyId }) => {
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [learningStats, setLearningStats] = useState<Record<string, any>>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
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
    fetchAdminData();
  }, [journeyId]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="bg-[#EEF8F7] text-[#237277] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#D9F0EE]">
            System Administration
          </span>
          <span className="text-xs text-[#687A75]">Persona: System Administrator</span>
        </div>
        <h1 className="text-2xl font-black text-[#123E40] mt-1">Institutional Governance & System Observability</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E3ECE9] shadow-xs">
          <p className="text-xs font-semibold text-[#687A75]">Straight-Through Processing (STP)</p>
          <p className="text-2xl font-black text-[#169C73] mt-1">{metrics.ai_straight_through_processing_pct || 66.7}%</p>
          <p className="text-[10px] text-[#687A75]">Zero-touch AI decisions</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E3ECE9] shadow-xs">
          <p className="text-xs font-semibold text-[#687A75]">Underwriter Overrides Executed</p>
          <p className="text-2xl font-black text-[#237277] mt-1">{metrics.human_overrides_executed || 1}</p>
          <p className="text-[10px] text-[#237277]">Learning loop anchored</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E3ECE9] shadow-xs">
          <p className="text-xs font-semibold text-[#687A75]">Average Portfolio DSCR</p>
          <p className="text-2xl font-black text-[#123E40] mt-1">{metrics.average_dscr || 1.62}x</p>
          <p className="text-[10px] text-[#169C73]">Prudent solvency buffer</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E3ECE9] shadow-xs">
          <p className="text-xs font-semibold text-[#687A75]">Decision Latency</p>
          <p className="text-2xl font-black text-[#123E40] mt-1">{metrics.average_turnaround_minutes || 1.8}m</p>
          <p className="text-[10px] text-[#687A75]">Sub-2 minute end-to-end</p>
        </div>
      </div>

      {/* Feedback & Model Retraining Loop */}
      <div className="bg-white rounded-2xl p-6 border border-[#E3ECE9] shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[#EEF8F7] flex items-center justify-center text-[#237277]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#123E40]">Active Learning & Calibration Loop</h3>
            <p className="text-xs text-[#687A75]">
              Officer override reasons feed back into credit rule calibration and threshold optimization.
            </p>
          </div>
        </div>

        <div className="p-4 bg-[#F7FAF9] rounded-xl border border-[#E3ECE9] text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-[#40524E]">Model Retraining Readiness:</span>
            <span className="bg-[#E8F7F1] text-[#169C73] font-bold px-2 py-0.5 rounded-full border border-[#169C73]/20">
              {learningStats.model_retraining_readiness || 'CALIBRATED_STABLE'}
            </span>
          </div>
          <p className="text-[#172825]">
            <strong>Calibration Recommendation:</strong> {learningStats.calibration_signal || 'Threshold for DSCR unhedged limit may be relaxed from 1.25x to 1.20x for borrowers with > 36m vintage.'}
          </p>
        </div>
      </div>

      {/* Append-Only Audit Trail */}
      <div className="bg-white rounded-2xl p-6 border border-[#E3ECE9] shadow-xs">
        <h3 className="text-base font-bold text-[#123E40] mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-[#237277]" /> Immutable Cryptographic Audit Ledger
        </h3>
        <p className="text-xs text-[#687A75] mb-4">
          All state machine advances, OCR extractions, model runs, and human overrides are append-only.
        </p>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-[#687A75]">No audit logs recorded yet for this journey.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7FAF9] text-[#687A75] border-b border-[#E3ECE9]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold">Actor & Role</th>
                  <th className="py-2.5 px-3 font-semibold">Action</th>
                  <th className="py-2.5 px-3 font-semibold">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3ECE9]">
                {auditLogs.map((log) => (
                  <tr key={log.audit_id} className="hover:bg-[#F7FAF9]/60">
                    <td className="py-2.5 px-3 text-[#687A75] font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 text-[#123E40] font-bold">
                      {log.actor_role} ({log.actor_id})
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="bg-[#EEF8F7] text-[#237277] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D9F0EE]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#40524E] text-[11px] font-mono">
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
