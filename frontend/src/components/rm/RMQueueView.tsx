import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { QueueItem } from '../../types';
import {
  Users, TrendingUp, AlertTriangle, ArrowUpRight, Search,
  ShieldCheck, Clock, CheckCircle2, XCircle, Minus,
  BarChart2, Zap, RefreshCw, Filter
} from 'lucide-react';

interface RMViewProps {
  onSelectJourney: (journeyId: string) => void;
}

const OUTCOME_CONFIG: Record<string, { label: string; class: string; dot: string }> = {
  APPROVED:             { label: 'Approved',     class: 'badge-green',  dot: 'bg-[var(--fin-green)]'  },
  CONDITIONAL_APPROVAL: { label: 'Conditional',  class: 'badge-amber',  dot: 'bg-[var(--fin-amber)]'  },
  NEEDS_REVIEW:         { label: 'Review',       class: 'badge-coral',  dot: 'bg-[var(--fin-coral)]'  },
  REJECTED:             { label: 'Rejected',     class: 'badge-coral',  dot: 'bg-[var(--fin-coral)]'  },
  PENDING:              { label: 'Pending',      class: 'badge-teal',   dot: 'bg-[var(--brand-400)]'  },
};

const FILTERS = ['ALL', 'APPROVED', 'CONDITIONAL_APPROVAL', 'NEEDS_REVIEW'];

export const RMQueueView: React.FC<RMViewProps> = ({ onSelectJourney }) => {
  const [queue,       setQueue]       = useState<QueueItem[]>([]);
  const [metrics,     setMetrics]     = useState<Record<string, any>>({});
  const [filter,      setFilter]      = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading,   setIsLoading]   = useState<boolean>(true);
  const [isRefreshing,setIsRefreshing]= useState<boolean>(false);

  const fetchData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true); else setIsLoading(true);
    try {
      const [qData, mData] = await Promise.all([
        api.getOfficerQueue(filter !== 'ALL' ? filter : undefined),
        api.getPortfolioMetrics().catch(() => ({}))
      ]);
      setQueue(qData);
      setMetrics(mData);
    } catch (err) {
      console.error('Error fetching RM queue:', err);
    } finally {
      setIsLoading(false); setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  const filteredQueue = queue.filter(item =>
    item.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.journey_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const approvedCount = queue.filter(q => q.decision_outcome === 'APPROVED').length;
  const conditionalCount = queue.filter(q => q.decision_outcome === 'CONDITIONAL_APPROVAL').length;
  const reviewCount = queue.filter(q => q.decision_outcome === 'NEEDS_REVIEW').length;
  const totalSanctioned = queue
    .filter(q => q.approved_amount)
    .reduce((s, q) => s + (q.approved_amount || 0), 0);

  const KPI_CARDS = [
    {
      label: 'Active Pipeline',
      value: metrics.total_journeys || queue.length,
      sub: `${(metrics.ai_straight_through_processing_pct || 66.7)}% STP rate`,
      icon: Users, color: 'var(--brand-700)', bg: 'var(--brand-50)', border: 'var(--brand-200)'
    },
    {
      label: 'Total Sanctioned',
      value: `₹${((totalSanctioned || metrics.total_sanctioned_volume_inr || 3625000) / 100000).toFixed(1)}L`,
      sub: `${approvedCount} approvals issued`,
      icon: TrendingUp, color: 'var(--fin-green)', bg: 'var(--fin-green-bg)', border: 'rgba(14,155,109,0.2)'
    },
    {
      label: 'Conditional',
      value: conditionalCount || metrics.conditional_cases || 1,
      sub: 'Tranche structuring',
      icon: BarChart2, color: 'var(--fin-amber)', bg: 'var(--fin-amber-bg)', border: 'rgba(201,138,16,0.2)'
    },
    {
      label: 'Review Flags',
      value: reviewCount || metrics.needs_review_cases || 1,
      sub: 'Discrepancy cases',
      icon: AlertTriangle, color: 'var(--fin-coral)', bg: 'var(--fin-coral-bg)', border: 'rgba(204,75,62,0.2)'
    },
    {
      label: 'Avg Turnaround',
      value: `${metrics.average_turnaround_minutes || 1.8}m`,
      sub: 'End-to-end AI decision',
      icon: Clock, color: 'var(--fin-violet)', bg: 'var(--fin-violet-bg)', border: 'rgba(106,73,198,0.2)'
    },
    {
      label: 'Avg DSCR',
      value: `${metrics.average_dscr || 1.62}x`,
      sub: 'Portfolio solvency',
      icon: Zap, color: 'var(--fin-blue)', bg: 'var(--fin-blue-bg)', border: 'rgba(36,96,220,0.2)'
    },
  ];

  return (
    <div className="page-container space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 animate-fadeInUp">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-violet">RM Console</span>
            <span className="text-[11px] text-[var(--text-muted)]">
              Rohan Mehta · Growth & Underwriting
            </span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            SME Loan Officer Pipeline
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Real-time AI-orchestrated case queue — click any case to open the full journey
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="btn-secondary text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Queue
        </button>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-fadeInUp stagger-1">
        {KPI_CARDS.map((kpi, i) => (
          <div
            key={i}
            className="card p-4 flex flex-col gap-1.5"
            style={{ borderColor: kpi.border }}
          >
            <div className="flex items-center justify-between">
              <p className="metric-label">{kpi.label}</p>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: kpi.bg }}
              >
                <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              </div>
            </div>
            <p className="metric-value text-2xl" style={{ color: kpi.color }}>
              {kpi.value}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filter & Search ── */}
      <div className="card p-4 flex flex-col sm:flex-row justify-between gap-3 items-center animate-fadeInUp stagger-2">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search enterprise or Case ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="fin-input pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
          <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
          {FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                filter === status
                  ? 'bg-[var(--brand-700)] text-white shadow-xs'
                  : 'bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)]'
              }`}
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Case Table ── */}
      <div className="card overflow-hidden animate-fadeInUp stagger-3">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center gap-3 text-[var(--text-muted)]">
            <div className="w-8 h-8 border-3 border-[var(--brand-200)] border-t-[var(--brand-600)] rounded-full animate-spin" />
            <p className="text-xs font-semibold">Loading pipeline...</p>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-[var(--border-strong)] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[var(--text-secondary)]">No cases match your filter</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Try changing the filter or re-seeding demo data</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--surface-subtle)] border-b border-[var(--border)]">
                  {['Enterprise', 'Requested / Sanctioned', 'Journey Stage', 'Trust Score', 'Decision', 'Consistency', ''].map((h) => (
                    <th key={h} className="py-3 px-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredQueue.map((item, idx) => {
                  const outConf = OUTCOME_CONFIG[item.decision_outcome] || OUTCOME_CONFIG.PENDING;
                  return (
                    <tr
                      key={item.journey_id}
                      className="hover:bg-[var(--brand-50)]/50 transition-colors group"
                      style={{ animationDelay: `${idx * 0.04}s` }}
                    >
                      {/* Enterprise */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-black shrink-0"
                            style={{ background: `linear-gradient(135deg, var(--brand-700), var(--brand-400))` }}
                          >
                            {item.business_name[0]}
                          </div>
                          <div>
                            <p className="text-[12px] font-bold text-[var(--brand-950)]">{item.business_name}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-mono">{item.journey_id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Amounts */}
                      <td className="py-3.5 px-4">
                        <p className="text-[12px] font-bold text-[var(--text-primary)]">
                          ₹{(item.requested_amount / 100000).toFixed(1)}L
                        </p>
                        {item.approved_amount ? (
                          <p className="text-[10px] font-semibold text-[var(--fin-green)]">
                            ✓ ₹{(item.approved_amount / 100000).toFixed(1)}L sanctioned
                          </p>
                        ) : (
                          <p className="text-[10px] text-[var(--text-muted)]">—</p>
                        )}
                      </td>

                      {/* Stage */}
                      <td className="py-3.5 px-4">
                        <span className="badge badge-teal text-[10px]">
                          {item.current_stage.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Trust Score */}
                      <td className="py-3.5 px-4">
                        {item.trust_score ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16">
                              <div className="progress-bar-track">
                                <div
                                  className="progress-bar-fill"
                                  style={{
                                    width: `${item.trust_score / 10}%`,
                                    background: item.trust_score > 850 ? 'var(--fin-green)' : item.trust_score > 650 ? 'var(--fin-amber)' : 'var(--fin-coral)'
                                  }}
                                />
                              </div>
                            </div>
                            <span className="text-[11px] font-extrabold text-[var(--text-primary)]">{item.trust_score}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">/1K</span>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)] text-xs">—</span>
                        )}
                      </td>

                      {/* Decision */}
                      <td className="py-3.5 px-4">
                        <span className={`badge ${outConf.class}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${outConf.dot}`} />
                          {outConf.label}
                        </span>
                      </td>

                      {/* Consistency */}
                      <td className="py-3.5 px-4">
                        {item.is_consistent ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--fin-green)]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Clean
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--fin-coral)]">
                            <AlertTriangle className="w-3.5 h-3.5" /> {item.discrepancy_count} Flag{item.discrepancy_count > 1 ? 's' : ''}
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onSelectJourney(item.journey_id)}
                          className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--brand-700)] hover:bg-[var(--brand-700)] hover:text-white hover:border-[var(--brand-700)] transition-all whitespace-nowrap ml-auto"
                        >
                          Open Case
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        {filteredQueue.length > 0 && (
          <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface-subtle)] flex items-center justify-between">
            <p className="text-[10px] text-[var(--text-muted)]">
              Showing {filteredQueue.length} of {queue.length} cases
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              AI Decision Engine: <span className="text-[var(--fin-green)] font-bold">Active</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
