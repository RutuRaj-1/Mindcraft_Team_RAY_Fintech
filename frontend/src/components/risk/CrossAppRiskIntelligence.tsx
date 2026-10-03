import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import {
  FraudSignal, FraudNetworkResponse, FraudNetworkNode, FraudNetworkEdge,
  JourneyFraudSignalsResponse, LinkedApplicationInfo
} from '../../types';
import {
  ShieldAlert, AlertTriangle, Link2, CheckCircle2,
  FileCheck, Building2, Phone, CreditCard, Hash, MapPin,
  FileText, ShieldCheck, ArrowRight, X, ExternalLink,
  Search, Check, Eye
} from 'lucide-react';

interface CrossAppRiskIntelligenceProps {
  journeyId: string;
  onRefresh?: () => void;
}

export const CrossAppRiskIntelligence: React.FC<CrossAppRiskIntelligenceProps> = ({
  journeyId,
  onRefresh
}) => {
  const [signalsData, setSignalsData] = useState<JourneyFraudSignalsResponse | null>(null);
  const [networkData, setNetworkData] = useState<FraudNetworkResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'signals' | 'network'>('signals');
  const [selectedSignal, setSelectedSignal] = useState<FraudSignal | null>(null);

  // Resolution Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [actionTargetSignal, setActionTargetSignal] = useState<FraudSignal | null>(null);
  const [actionStatus, setActionStatus] = useState<'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_POSITIVE'>('ACKNOWLEDGED');
  const [actionNotes, setActionNotes] = useState<string>('');
  const [officerName, setOfficerName] = useState<string>('Ananya Iyer (Chief Risk Officer)');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Network filter & selection
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedNode, setSelectedNode] = useState<FraudNetworkNode | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sigRes, netRes] = await Promise.all([
        api.getFraudSignals(journeyId).catch(() => null),
        api.getFraudNetwork(journeyId).catch(() => null)
      ]);
      setSignalsData(sigRes);
      setNetworkData(netRes);
    } catch (err) {
      console.error('Error fetching cross-application risk intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [journeyId]);

  const handleOpenActionModal = (signal: FraudSignal, defaultStatus: 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_POSITIVE') => {
    setActionTargetSignal(signal);
    setActionStatus(defaultStatus);
    setActionNotes(
      defaultStatus === 'ACKNOWLEDGED'
        ? 'Acknowledged potential linked-case risk. Underwriter phone interview & verified GST filings initiated.'
        : defaultStatus === 'FALSE_POSITIVE'
        ? 'Verified borrower is an authorized sister subsidiary operating under shared treasury facility.'
        : 'Case reviewed and verified with satisfactory corporate cross-guarantee.'
    );
    setModalOpen(true);
  };

  const handleResolveSignalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTargetSignal) return;
    if (!actionNotes.trim()) {
      alert('Mandatory compliance notes are required for this action.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.resolveFraudSignal(
        actionTargetSignal.signalId,
        actionStatus,
        actionNotes,
        officerName
      );
      setModalOpen(false);
      await fetchData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Action failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSignalBadge = (type: string) => {
    switch (type) {
      case 'SHARED_BANK_ACCOUNT':
        return { label: 'Shared Bank Account', color: 'badge-coral', icon: CreditCard };
      case 'SHARED_GSTIN':
        return { label: 'GSTIN Collision', color: 'badge-coral', icon: Hash };
      case 'SHARED_PHONE':
        return { label: 'Repeated Phone', color: 'badge-amber', icon: Phone };
      case 'REPEATED_DOCUMENT_HASH':
        return { label: 'Recycled Doc Hash', color: 'badge-coral', icon: FileCheck };
      case 'SHARED_ADDRESS_CONFLICT':
        return { label: 'Facility Collision', color: 'badge-amber', icon: MapPin };
      case 'IDENTITY_CONFLICT':
        return { label: 'Tax ID Conflict', color: 'badge-coral', icon: ShieldAlert };
      default:
        return { label: type.replace(/_/g, ' '), color: 'badge-blue', icon: Link2 };
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'APPLICATION': return Building2;
      case 'BANK_ACCOUNT': return CreditCard;
      case 'GSTIN': return Hash;
      case 'PHONE': return Phone;
      case 'DOCUMENT_HASH': return FileText;
      case 'ADDRESS': return MapPin;
      case 'PAN': return ShieldAlert;
      default: return Link2;
    }
  };

  // Node positions in canvas
  const graphNodes = useMemo(() => {
    if (!networkData || !networkData.nodes) return [];
    const nodes = networkData.nodes;
    const count = nodes.length;
    if (count === 0) return [];

    const width = 800;
    const height = 440;
    const centerX = width / 2;
    const centerY = height / 2;

    // Put current app at center, surround with identifier nodes, then other apps
    return nodes.map((node, i) => {
      let x = centerX;
      let y = centerY;

      if (node.isCurrent) {
        x = centerX;
        y = centerY;
      } else {
        const radius = node.type === 'APPLICATION' ? 180 : 105;
        const angle = (i * (2 * Math.PI)) / (count - 1 || 1);
        x = centerX + radius * Math.cos(angle);
        y = centerY + radius * Math.sin(angle);
      }
      return { ...node, x, y };
    });
  }, [networkData]);

  const filteredGraphNodes = useMemo(() => {
    if (filterType === 'ALL') return graphNodes;
    return graphNodes.filter(n => n.isCurrent || n.type === filterType || n.type === 'APPLICATION');
  }, [graphNodes, filterType]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, typeof graphNodes[0]>();
    graphNodes.forEach(n => map.set(n.id, n));
    return map;
  }, [graphNodes]);

  const visibleEdges = useMemo(() => {
    if (!networkData || !networkData.edges) return [];
    const activeNodeIds = new Set(filteredGraphNodes.map(n => n.id));
    return networkData.edges.filter(
      e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target)
    );
  }, [networkData, filteredGraphNodes]);

  return (
    <div className="space-y-4">
      {/* ── Regulatory & Risk Intelligence Disclaimer Banner ── */}
      <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-teal-500/10 border border-amber-500/25 rounded-xl flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-amber-900 tracking-wide uppercase">
              Institutional Risk Intelligence Layer
            </h4>
            <span className="text-[10px] bg-amber-500/15 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
              Traceable Entity Graph
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
            This is a <strong>risk intelligence feature, not a fraud accusation system</strong>.
            Cross-application correlations (shared bank accounts, reused phone numbers, matching GSTINs, and document hashes)
            are synthesized to inform risk officer judgment.
          </p>
        </div>
      </div>

      {/* ── Navigation Strip & Stats ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('signals')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeView === 'signals'
                ? 'bg-[var(--brand-900)] text-white shadow-sm'
                : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--border)]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Cross-Application Signals ({signalsData?.signals?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveView('network')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeView === 'network'
                ? 'bg-[var(--brand-900)] text-white shadow-sm'
                : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--border)]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Entity Relationship Network ({networkData?.nodes?.length || 0} nodes)</span>
          </button>
        </div>

        {signalsData && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[var(--text-muted)]">
              Status:{' '}
              <strong className={signalsData.hasSignals ? 'text-amber-600' : 'text-emerald-600'}>
                {signalsData.hasSignals ? 'Potential linked-case risk detected.' : 'Clean / 0 links'}
              </strong>
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="card p-8 text-center text-xs text-[var(--text-muted)]">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--brand-700)] border-t-transparent rounded-full mx-auto mb-2" />
          Analyzing cross-application identifier correlations...
        </div>
      )}

      {/* ── VIEW 1: SIGNALS LIST ── */}
      {!loading && activeView === 'signals' && (
        <div className="space-y-3">
          {(!signalsData || signalsData.signals.length === 0) ? (
            <div className="card p-8 text-center bg-emerald-500/5 border-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-emerald-950">No Cross-Application Link Risks Detected</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto">
                No shared bank accounts, repeated contact identifiers, or duplicate document hashes were detected
                across enterprise portfolio records.
              </p>
            </div>
          ) : (
            signalsData.signals.map((sig, idx) => {
              const badge = getSignalBadge(sig.signalType);
              const Icon = badge.icon;
              const isResolved = sig.status === 'RESOLVED' || sig.status === 'FALSE_POSITIVE';
              const isAck = sig.status === 'ACKNOWLEDGED';

              return (
                <div
                  key={sig.signalId || idx}
                  className={`card p-4 transition-all border ${
                    isResolved
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : isAck
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-red-500/30 bg-white hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge ${badge.color} flex items-center gap-1 text-[11px]`}>
                        <Icon className="w-3 h-3" />
                        {badge.label}
                      </span>
                      <span className={`badge text-[10px] ${
                        sig.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                        sig.severity === 'HIGH' ? 'bg-rose-500 text-white' :
                        sig.severity === 'MEDIUM' ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'
                      }`}>
                        {sig.severity}
                      </span>
                      <span className={`badge text-[10px] ${
                        isResolved ? 'badge-green' : isAck ? 'badge-amber' : 'badge-coral'
                      }`}>
                        {sig.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      {!isResolved && (
                        <>
                          <button
                            onClick={() => handleOpenActionModal(sig, 'ACKNOWLEDGED')}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-500/20"
                          >
                            Acknowledge
                          </button>
                          <button
                            onClick={() => handleOpenActionModal(sig, 'RESOLVED')}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            Resolve Risk
                          </button>
                          <button
                            onClick={() => handleOpenActionModal(sig, 'FALSE_POSITIVE')}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border"
                          >
                            False Positive
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Phrasing Requirement: Potential linked-case risk detected. */}
                  <div className="text-xs font-semibold text-[var(--text-primary)] mb-3 bg-[var(--surface)] p-2.5 rounded-lg border border-[var(--border)]">
                    <span className="text-amber-700 font-bold block mb-0.5">
                      Potential linked-case risk detected.
                    </span>
                    <span className="text-[var(--text-secondary)] font-normal">
                      {sig.explanation.replace('Potential linked-case risk detected.', '').trim() || sig.explanation}
                    </span>
                  </div>

                  {/* Connected Cases & Shared Identifiers Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-3">
                    <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                      <p className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider mb-1">
                        Current Case Under Review
                      </p>
                      <p className="font-bold text-[var(--brand-950)]">
                        {sig.applicationId}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Journey ID: <span className="font-mono">{sig.journeyId || journeyId}</span>
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                      <p className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider mb-1">
                        Linked Case(s) ({sig.linkedApplications.length})
                      </p>
                      <div className="space-y-1.5">
                        {sig.linkedApplications.map((linked, lIdx) => (
                          <div key={lIdx} className="border-b border-[var(--border)] pb-1 last:border-b-0 last:pb-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[var(--brand-900)]">
                                {linked.businessName}
                              </span>
                              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                                {linked.applicationId}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-800 mt-0.5">
                              <span className="font-semibold">{linked.sharedField.replace(/_/g, ' ')}:</span>
                              <span className="font-mono bg-amber-500/10 px-1 rounded text-[10px]">
                                {linked.sharedValue}
                              </span>
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] italic mt-0.5">
                              Reason: {linked.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Evidence References */}
                  {sig.evidenceReferences && sig.evidenceReferences.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[var(--border)] text-[10px]">
                      <span className="font-semibold text-[var(--text-muted)]">Evidence Traces:</span>
                      {sig.evidenceReferences.map((ev, eIdx) => (
                        <span key={eIdx} className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border">
                          {ev}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Resolution Notes History */}
                  {sig.resolvedBy && (
                    <div className="mt-2.5 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-[11px] flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-emerald-950">
                          {sig.status === 'FALSE_POSITIVE' ? 'Marked False Positive' : 'Resolved'} by {sig.resolvedBy}
                        </span>
                        {sig.resolvedAt && (
                          <span className="text-[10px] text-[var(--text-muted)] ml-1">
                            ({new Date(sig.resolvedAt).toLocaleString()})
                          </span>
                        )}
                        <p className="text-[10px] text-emerald-900 mt-0.5">
                          Note: {sig.resolutionNotes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── VIEW 2: INTERACTIVE ENTITY NETWORK GRAPH ── */}
      {!loading && activeView === 'network' && (
        <div className="card p-4 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-sm font-bold text-[var(--brand-900)]">
                Cross-Application Entity Relationship Network
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Interactive topology showing shared bank accounts, phones, GSTINs, and document hashes.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 flex-wrap text-[11px]">
              {['ALL', 'BANK_ACCOUNT', 'GSTIN', 'PHONE', 'PAN', 'ADDRESS', 'DOCUMENT_HASH'].map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2 py-0.5 rounded transition-all ${
                    filterType === t
                      ? 'bg-[var(--brand-700)] text-white font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="relative border border-[var(--border)] rounded-xl bg-slate-900 overflow-hidden shadow-inner h-[460px]">
            <svg className="w-full h-full" viewBox="0 0 800 440">
              <defs>
                <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.8" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Grid */}
              <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#smallGrid)" />

              {/* Render Edges */}
              {visibleEdges.map((edge, i) => {
                const sourceNode = nodeMap.get(edge.source);
                const targetNode = nodeMap.get(edge.target);
                if (!sourceNode || !targetNode) return null;

                const midX = (sourceNode.x + targetNode.x) / 2;
                const midY = (sourceNode.y + targetNode.y) / 2;

                return (
                  <g key={edge.id || i}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={edge.isCrossApplication ? '#fb7185' : '#38bdf8'}
                      strokeWidth={edge.isCrossApplication ? 2 : 1.2}
                      strokeDasharray={edge.isCrossApplication ? '4 2' : 'none'}
                      opacity={0.7}
                    />
                    <text
                      x={midX}
                      y={midY - 4}
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="middle"
                      className="font-mono pointer-events-none select-none"
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })}

              {/* Render Nodes */}
              {filteredGraphNodes.map(node => {
                const isSelected = selectedNode?.id === node.id;
                const isApp = node.type === 'APPLICATION';
                const isCurrent = node.isCurrent;

                let fill = '#0ea5e9';
                if (isCurrent) fill = '#10b981';
                else if (isApp) fill = '#6366f1';
                else if (node.type === 'BANK_ACCOUNT') fill = '#f43f5e';
                else if (node.type === 'GSTIN') fill = '#eab308';
                else if (node.type === 'PHONE') fill = '#a855f7';
                else if (node.type === 'PAN') fill = '#f97316';
                else if (node.type === 'DOCUMENT_HASH') fill = '#ec4899';
                else if (node.type === 'ADDRESS') fill = '#14b8a6';

                const r = isCurrent ? 26 : isApp ? 20 : 16;

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer transition-transform hover:scale-110"
                    onClick={() => setSelectedNode(node)}
                  >
                    {isCurrent && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={r + 8}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        className="animate-spin"
                        style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                      />
                    )}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={r}
                      fill={fill}
                      stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.4)'}
                      strokeWidth={isSelected ? 3 : 1.5}
                      filter="url(#glow)"
                    />
                    <text
                      x={node.x}
                      y={node.y + 4}
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                    >
                      {isApp ? (isCurrent ? '★ Focus' : 'App') : node.type.substring(0, 3)}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + r + 13}
                      fill="#e2e8f0"
                      fontSize="10"
                      fontWeight="600"
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                    >
                      {node.label.length > 20 ? `${node.label.substring(0, 18)}...` : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Selected Node Inspector Overlay */}
            {selectedNode && (
              <div className="absolute top-3 right-3 w-72 bg-slate-800/95 border border-slate-700 backdrop-blur-md rounded-xl p-3 text-xs text-white shadow-xl animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                    <span className="font-bold uppercase tracking-wider text-[10px] text-teal-300">
                      {selectedNode.type}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="font-bold text-sm mb-1">{selectedNode.label}</p>
                <p className="font-mono text-[10px] text-slate-400 mb-2">ID: {selectedNode.id}</p>

                {selectedNode.isCurrent && (
                  <span className="badge badge-green text-[10px] mb-2 block text-center">
                    ✓ Current Journey Under Review
                  </span>
                )}

                <div className="space-y-1 bg-slate-900/60 p-2 rounded-lg border border-slate-700 text-[11px]">
                  {Object.entries(selectedNode.details || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">{k}:</span>
                      <span className="font-mono text-slate-200">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RESOLUTION / ACKNOWLEDGE MODAL ── */}
      {modalOpen && actionTargetSignal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-[var(--border)] animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="font-black text-base text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Risk Officer Action: {actionStatus.replace(/_/g, ' ')}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Signal: <span className="font-mono font-bold">{actionTargetSignal.signalId}</span>
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-[var(--text-muted)] hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSignalSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Target Disposition Status
                </label>
                <select
                  value={actionStatus}
                  onChange={(e: any) => setActionStatus(e.target.value)}
                  className="input-field text-xs font-semibold"
                >
                  <option value="ACKNOWLEDGED">ACKNOWLEDGED — Risk noted, field inquiry scheduled</option>
                  <option value="RESOLVED">RESOLVED — Satisfactory cross-guarantee / evidence verified</option>
                  <option value="FALSE_POSITIVE">FALSE_POSITIVE — Authorized subsidiary / common treasury</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Acting Risk Officer
                </label>
                <input
                  type="text"
                  value={officerName}
                  onChange={e => setOfficerName(e.target.value)}
                  className="input-field text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Mandatory Audit Justification & Notes *
                </label>
                <textarea
                  value={actionNotes}
                  onChange={e => setActionNotes(e.target.value)}
                  rows={3}
                  className="input-field text-xs"
                  placeholder="Provide precise regulatory rationale explaining the resolution..."
                  required
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  This action is appended to the immutable Decision Replay audit ledger.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs"
                  style={{ background: 'linear-gradient(135deg, #0F2220, #237277)' }}
                >
                  {isSubmitting ? 'Recording Action...' : 'Commit to Audit Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
