import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { QueueItem } from '../../types';
import { Users, FileCheck, AlertTriangle, ArrowUpRight, Filter, Search, ShieldCheck } from 'lucide-react';

interface RMViewProps {
  onSelectJourney: (journeyId: string) => void;
}

export const RMQueueView: React.FC<RMViewProps> = ({ onSelectJourney }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchData = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  const filteredQueue = queue.filter(item =>
    item.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.journey_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#EEF8F7] text-[#237277] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#D9F0EE]">
              RM Console
            </span>
            <span className="text-xs text-[#687A75]">Persona: Rohan Mehta (Growth & Underwriting)</span>
          </div>
          <h1 className="text-2xl font-black text-[#123E40] mt-1">SME Loan Officer Pipeline & Case Queue</h1>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E3ECE9] shadow-xs">
          <p className="text-xs font-semibold text-[#687A75]">Active Pipeline Cases</p>
          <p className="text-2xl font-black text-[#123E40] mt-1">{metrics.total_journeys || queue.length}</p>
          <p className="text-[10px] text-[#237277] font-medium mt-0.5">Straight-through rate: {metrics.ai_straight_through_processing_pct || 66.7}%</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E3ECE9] shadow-xs">
          <p className="text-xs font-semibold text-[#687A75]">Total Sanctioned Volume</p>
          <p className="text-2xl font-black text-[#169C73] mt-1">
            ₹{((metrics.total_sanctioned_volume_inr || 3625000) / 100000).toFixed(1)} Lakhs
          </p>
          <p className="text-[10px] text-[#687A75] mt-0.5">Average turnaround: 1.8 mins</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E3ECE9] shadow-xs">
          <p className="text-xs font-semibold text-[#687A75]">Conditional Approvals</p>
          <p className="text-2xl font-black text-[#D89B22] mt-1">{metrics.conditional_cases || 1}</p>
          <p className="text-[10px] text-[#D89B22] font-medium mt-0.5">Tranche structuring active</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E3ECE9] shadow-xs">
          <p className="text-xs font-semibold text-[#687A75]">Underwriter Review Flags</p>
          <p className="text-2xl font-black text-[#D96559] mt-1">{metrics.needs_review_cases || 1}</p>
          <p className="text-[10px] text-[#D96559] font-medium mt-0.5">Consistency discrepancies</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3ECE9] shadow-xs flex flex-col sm:flex-row justify-between gap-3 items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#94A7A1] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by enterprise or Case ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#CBD9D5] bg-[#F7FAF9] text-[#172825] focus:outline-none focus:border-[#237277]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'APPROVED', 'CONDITIONAL_APPROVAL', 'NEEDS_REVIEW'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                filter === status
                  ? 'bg-[#237277] text-white shadow-xs font-semibold'
                  : 'bg-[#F7FAF9] text-[#687A75] hover:text-[#172825] border border-[#E3ECE9]'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Case Table */}
      <div className="bg-white rounded-2xl border border-[#E3ECE9] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7FAF9] text-[#687A75] border-b border-[#E3ECE9]">
              <tr>
                <th className="py-3 px-4 font-semibold">Enterprise Name</th>
                <th className="py-3 px-4 font-semibold">Requested Facility</th>
                <th className="py-3 px-4 font-semibold">Journey Stage</th>
                <th className="py-3 px-4 font-semibold">FinFlow Trust Score</th>
                <th className="py-3 px-4 font-semibold">Decision Outcome</th>
                <th className="py-3 px-4 font-semibold">Data Consistency</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3ECE9]">
              {filteredQueue.map((item) => (
                <tr key={item.journey_id} className="hover:bg-[#EEF8F7]/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#123E40]">
                    {item.business_name}
                    <p className="text-[10px] text-[#687A75] font-normal">{item.journey_id}</p>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#172825]">
                    ₹{item.requested_amount.toLocaleString('en-IN')}
                    {item.approved_amount && (
                      <p className="text-[10px] text-[#169C73]">
                        Sanctioned: ₹{item.approved_amount.toLocaleString('en-IN')}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-[#EFF5F3] text-[#40524E] px-2 py-0.5 rounded-full text-[10px] font-semibold border border-[#CBD9D5]">
                      {item.current_stage}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {item.trust_score ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-[#123E40]">{item.trust_score}</span>
                        <span className="text-[10px] text-[#687A75]">/1000</span>
                        <span className={`w-2 h-2 rounded-full ${item.trust_score > 850 ? 'bg-[#169C73]' : item.trust_score > 650 ? 'bg-[#D89B22]' : 'bg-[#D96559]'}`} />
                      </div>
                    ) : (
                      <span className="text-[#94A7A1]">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      item.decision_outcome === 'APPROVED'
                        ? 'bg-[#E8F7F1] text-[#169C73] border-[#169C73]/20'
                        : item.decision_outcome === 'CONDITIONAL_APPROVAL'
                        ? 'bg-[#FFF6DF] text-[#D89B22] border-[#D89B22]/20'
                        : item.decision_outcome === 'NEEDS_REVIEW'
                        ? 'bg-[#FDECEA] text-[#D96559] border-[#D96559]/20'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {item.decision_outcome.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {item.is_consistent ? (
                      <span className="text-[#169C73] text-[11px] font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Clean (0 Flags)
                      </span>
                    ) : (
                      <span className="text-[#D96559] text-[11px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> {item.discrepancy_count} Discrepancy
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onSelectJourney(item.journey_id)}
                      className="py-1.5 px-3 bg-[#EEF8F7] hover:bg-[#237277] text-[#237277] hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ml-auto border border-[#D9F0EE]"
                    >
                      <span>Drilldown</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
