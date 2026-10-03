import React, { useEffect, useRef, useState, useMemo } from 'react';
import { TrustGraph, TrustGraphNode, TrustGraphEdge } from '../../types';
import { api } from '../../api/client';
import {
  Network, AlertTriangle, ShieldCheck, Building2, User, CreditCard,
  FileText, Activity, CheckCircle2, ChevronRight, RefreshCw,
  Sparkles, Layers, Info, ArrowRight, Play, Eye, FileSpreadsheet,
  TrendingUp, ShieldAlert, Award, Circle
} from 'lucide-react';

interface TrustGraphProps {
  trustGraph?: TrustGraph;
  graph?: TrustGraph;
  journeyId?: string;
  applicationId?: string;
  title?: string;
}

// ── Node Color & Icon Mappings ────────────────────────────────────────────────
const NODE_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  customer:           { color: '#6A49C6', bg: '#EDE9FE', icon: User,             label: 'Customer' },
  business:           { color: '#237277', bg: '#CCFBF1', icon: Building2,        label: 'Business' },
  application:        { color: '#2563EB', bg: '#DBEAFE', icon: FileText,         label: 'Application' },
  GST:                { color: '#0284C7', bg: '#E0F2FE', icon: ShieldCheck,      label: 'GST Entity' },
  ITR:                { color: '#059669', bg: '#D1FAE5', icon: FileSpreadsheet,  label: 'ITR-V Filing' },
  'bank account':     { color: '#0D9488', bg: '#CCFBF1', icon: CreditCard,       label: 'Bank Account' },
  document:           { color: '#475569', bg: '#F1F5F9', icon: FileText,         label: 'Document' },
  revenue:            { color: '#D97706', bg: '#FEF3C7', icon: TrendingUp,       label: 'Revenue' },
  'cash-flow metric': { color: '#0891B2', bg: '#CFFAFE', icon: Activity,         label: 'Cash Flow' },
  risk:               { color: '#E11D48', bg: '#FFE4E6', icon: ShieldAlert,      label: 'Risk Assessment' },
  decision:           { color: '#7C3AED', bg: '#EDE9FE', icon: Award,            label: 'Sanction Decision' },
  // Backward compat for old capitalized node_types
  BUSINESS:           { color: '#237277', bg: '#CCFBF1', icon: Building2,        label: 'Business' },
  DIRECTOR:           { color: '#6A49C6', bg: '#EDE9FE', icon: User,             label: 'Customer' },
  GSTIN:              { color: '#0284C7', bg: '#E0F2FE', icon: ShieldCheck,      label: 'GST Entity' },
  BANK_ACCOUNT:       { color: '#0D9488', bg: '#CCFBF1', icon: CreditCard,       label: 'Bank Account' },
  SUPPLIER:           { color: '#D97706', bg: '#FEF3C7', icon: Building2,        label: 'Supplier' },
  BUYER:              { color: '#059669', bg: '#D1FAE5', icon: Building2,        label: 'Buyer' },
  RELATED_PARTY:      { color: '#DC2626', bg: '#FEE2E2', icon: AlertTriangle,    label: 'Related Party' },
};

const RISK_BORDER: Record<string, string> = {
  LOW:    '#059669',
  MEDIUM: '#D97706',
  HIGH:   '#DC2626',
};

// ── The Canonical 8-Step Judge Journey Traversal ──────────────────────────────
const JUDGE_STEPS = [
  { key: 'business',           label: '1. Business',   targetType: ['business', 'BUSINESS'],          hint: 'Verified SME borrower entity & vintage' },
  { key: 'GST',                label: '2. GST',        targetType: ['GST', 'GSTIN'],                  hint: 'Active GSTIN & monthly GSTR-3B filings' },
  { key: 'revenue',            label: '3. Revenue',    targetType: ['revenue'],                       hint: 'Tax-verified turnover run-rate' },
  { key: 'ITR',                label: '4. ITR',        targetType: ['ITR'],                           hint: 'Income Tax Return receipts & tax clearance' },
  { key: 'bank account',       label: '5. Bank',       targetType: ['bank account', 'BANK_ACCOUNT'],  hint: 'Primary operating account & banking discipline' },
  { key: 'cash-flow metric',   label: '6. Cash Flow',  targetType: ['cash-flow metric'],              hint: 'Debt service coverage (DSCR) & cash buffer' },
  { key: 'risk',               label: '7. Risk',       targetType: ['risk'],                          hint: 'Deterministic policy gate + ML probability of default' },
  { key: 'decision',           label: '8. Decision',   targetType: ['decision'],                      hint: 'Explainable sanction, terms & monitoring covenants' },
];

export const TrustGraphVisual: React.FC<TrustGraphProps> = ({
  trustGraph: propTrustGraph,
  graph: propGraph,
  journeyId,
  applicationId,
  title,
}) => {
  const [data, setData] = useState<TrustGraph | null>(propTrustGraph || propGraph || null);
  const [loading, setLoading] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<TrustGraphNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<TrustGraphEdge | null>(null);
  const [layoutMode, setLayoutMode] = useState<'pipeline' | 'radial'>('pipeline');
  const [activeTab, setActiveTab] = useState<'all' | 'flagged' | 'anomalies'>('all');
  const [dims, setDims] = useState({ w: 760, h: 440 });

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Sync prop updates
  useEffect(() => {
    if (propTrustGraph || propGraph) {
      setData(propTrustGraph || propGraph || null);
    }
  }, [propTrustGraph, propGraph]);

  // Dynamic fetch if journeyId is provided and no data supplied
  useEffect(() => {
    if (!data && journeyId) {
      setLoading(true);
      api.getTrustGraph(journeyId)
        .then(res => setData(res))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [journeyId, data]);

  // Responsive SVG dimension observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width } = e.contentRect;
        const w = Math.max(380, width);
        const h = Math.min(500, Math.max(340, w * 0.52));
        setDims({ w, h });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const nodes = data?.nodes || [];
  const edges = data?.edges || [];

  // Calculate Node Coordinates based on Layout Mode
  const positions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    if (!nodes.length) return pos;

    const { w, h } = dims;

    if (layoutMode === 'pipeline') {
      // Structured Left-to-Right Pipeline Layout
      // Col 1: Customer (y: 28%), Application (y: 72%)
      // Col 2: Business (y: 50%)
      // Col 3: GST (y: 30%), Documents (y: 72%)
      // Col 4: Revenue (y: 30%), ITR (y: 72%)
      // Col 5: Bank (y: 30%), Cash Flow (y: 72%)
      // Col 6: Risk (y: 50%)
      // Col 7: Decision (y: 50%)

      const colXs = {
        col1: w * 0.08,
        col2: w * 0.22,
        col3: w * 0.36,
        col4: w * 0.51,
        col5: w * 0.66,
        col6: w * 0.81,
        col7: w * 0.93,
      };

      let docCount = 0;

      nodes.forEach(node => {
        const t = node.node_type;
        if (t === 'customer' || t === 'DIRECTOR') {
          pos[node.id] = { x: colXs.col1, y: h * 0.30 };
        } else if (t === 'application') {
          pos[node.id] = { x: colXs.col1, y: h * 0.72 };
        } else if (t === 'business' || t === 'BUSINESS') {
          if (node.id.includes('shell')) {
            pos[node.id] = { x: colXs.col2, y: h * 0.82 };
          } else {
            pos[node.id] = { x: colXs.col2, y: h * 0.48 };
          }
        } else if (t === 'GST' || t === 'GSTIN') {
          pos[node.id] = { x: colXs.col3, y: h * 0.30 };
        } else if (t === 'document') {
          pos[node.id] = { x: colXs.col3, y: h * (0.62 + docCount * 0.20) };
          docCount++;
        } else if (t === 'revenue') {
          pos[node.id] = { x: colXs.col4, y: h * 0.30 };
        } else if (t === 'ITR') {
          pos[node.id] = { x: colXs.col4, y: h * 0.72 };
        } else if (t === 'bank account' || t === 'BANK_ACCOUNT') {
          pos[node.id] = { x: colXs.col5, y: h * 0.30 };
        } else if (t === 'cash-flow metric') {
          pos[node.id] = { x: colXs.col5, y: h * 0.72 };
        } else if (t === 'risk') {
          pos[node.id] = { x: colXs.col6, y: h * 0.50 };
        } else if (t === 'decision') {
          pos[node.id] = { x: colXs.col7, y: h * 0.50 };
        } else {
          // generic fallback
          pos[node.id] = { x: colXs.col4, y: h * 0.50 };
        }
      });
    } else {
      // Radial Network Layout
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(cx, cy) * 0.72;

      const bizNode = nodes.find(n => n.node_type === 'business' || n.node_type === 'BUSINESS') || nodes[0];
      if (bizNode) pos[bizNode.id] = { x: cx, y: cy };

      const others = nodes.filter(n => n.id !== bizNode?.id);
      others.forEach((n, i) => {
        const angle = (i / others.length) * 2 * Math.PI - Math.PI / 2;
        const dist = n.node_type === 'customer' || n.node_type === 'GST' ? r * 0.65 : r;
        pos[n.id] = {
          x: cx + dist * Math.cos(angle),
          y: cy + dist * Math.sin(angle),
        };
      });
    }

    return pos;
  }, [nodes, layoutMode, dims]);

  // Click on a Judge Guided Step
  const handleSelectJudgeStep = (index: number) => {
    setActiveStepIndex(index);
    const step = JUDGE_STEPS[index];
    const targetNode = nodes.find(n => step.targetType.includes(n.node_type));
    if (targetNode) {
      setSelectedNode(targetNode);
      setSelectedEdge(null);
    }
  };

  const handleNextStep = () => {
    const nextIdx = activeStepIndex === null || activeStepIndex >= JUDGE_STEPS.length - 1 ? 0 : activeStepIndex + 1;
    handleSelectJudgeStep(nextIdx);
  };

  // Filtered nodes
  const displayNodes = useMemo(() => {
    if (activeTab === 'flagged') {
      return nodes.filter(n => n.risk_level === 'HIGH' || n.risk_level === 'MEDIUM');
    }
    return nodes;
  }, [nodes, activeTab]);

  const flaggedEdgesCount = edges.filter(e => e.flagged).length;
  const anomaliesCount = (data as any)?.anomalies?.length || 0;

  if (loading) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-[var(--brand-700)] mb-3" />
        <p className="text-xs font-bold text-[var(--brand-900)]">Generating Financial Trust Graph...</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">Synthesizing entity relationships from Firestore</p>
      </div>
    );
  }

  if (!data || !nodes.length) {
    return (
      <div className="card p-6 text-center text-[var(--text-muted)]">
        <Network className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-xs font-semibold">No Trust Graph available for this application.</p>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4" ref={containerRef}>
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--fin-teal-bg)] flex items-center justify-center border border-[var(--brand-300)] shadow-sm">
            <Network className="w-5 h-5 text-[var(--brand-800)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {title || 'Financial Trust Graph'}
              </h3>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[var(--brand-100)] text-[var(--brand-800)]">
                Module 7
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Cross-entity evidence chain · {nodes.length} Nodes · {edges.length} Edges
            </p>
          </div>
        </div>

        {/* Status Pills & Layout Toggle */}
        <div className="flex items-center gap-2">
          {data.circular_trading_detected ? (
            <span className="badge badge-coral flex items-center gap-1 text-[10px] font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" /> Circular Trading Alert
            </span>
          ) : (
            <span className="badge badge-green flex items-center gap-1 text-[10px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified Entity Network
            </span>
          )}

          <div className="flex bg-[var(--surface-subtle)] p-0.5 rounded-lg border border-[var(--border)]">
            <button
              onClick={() => setLayoutMode('pipeline')}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                layoutMode === 'pipeline'
                  ? 'bg-white shadow-sm text-[var(--brand-900)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Pipeline Flow
            </button>
            <button
              onClick={() => setLayoutMode('radial')}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                layoutMode === 'radial'
                  ? 'bg-white shadow-sm text-[var(--brand-900)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Radial Map
            </button>
          </div>
        </div>
      </div>

      {/* ── Guided Judge Traversal Walkthrough Bar ────────────────────────────── */}
      <div className="bg-[var(--surface-subtle)] rounded-xl p-3 border border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--brand-700)]" />
            <span className="text-[11px] font-bold text-[var(--brand-950)]">
              Judge Traversal: Trace Evidence Flow
            </span>
          </div>
          <button
            onClick={handleNextStep}
            className="flex items-center gap-1 text-[11px] font-bold text-[var(--brand-700)] hover:text-[var(--brand-900)] bg-white px-2.5 py-0.5 rounded-md border border-[var(--border)] shadow-xs transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            {activeStepIndex === null ? 'Start Guided Tour' : 'Next Step →'}
          </button>
        </div>

        {/* 8-Step Breadcrumbs */}
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          {JUDGE_STEPS.map((step, idx) => {
            const isActive = activeStepIndex === idx;
            return (
              <React.Fragment key={step.key}>
                <button
                  onClick={() => handleSelectJudgeStep(idx)}
                  className={`px-2 py-1 rounded-md font-bold transition-all text-left flex items-center gap-1 ${
                    isActive
                      ? 'bg-[var(--brand-800)] text-white shadow-sm scale-105'
                      : 'bg-white text-[var(--text-secondary)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-900)] border border-[var(--border)]'
                  }`}
                  title={step.hint}
                >
                  <span>{step.label}</span>
                </button>
                {idx < JUDGE_STEPS.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Explanation Callout */}
        {activeStepIndex !== null && (
          <div className="mt-2.5 pt-2 border-t border-[var(--border)] flex items-start gap-2 text-xs">
            <Info className="w-3.5 h-3.5 text-[var(--brand-700)] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[var(--brand-900)] font-medium">
              <strong className="font-bold">{JUDGE_STEPS[activeStepIndex].label}:</strong> {JUDGE_STEPS[activeStepIndex].hint}.
              {selectedNode && ` Currently inspecting ${selectedNode.label} (Trust: ${selectedNode.trust_score}/1000).`}
            </p>
          </div>
        )}
      </div>

      {/* ── Main SVG Graph Canvas ────────────────────────────────────────────── */}
      <div className="relative w-full bg-[var(--surface-subtle)]/70 rounded-2xl border-2 border-[var(--brand-950)] shadow-[3px_3px_0px_#0A1F20] overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height={dims.h}
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          style={{ display: 'block' }}
        >
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#64748B" />
            </marker>
            <marker id="arrow-flagged" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#DC2626" />
            </marker>
            <marker id="arrow-active" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#237277" />
            </marker>
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => {
            const src = positions[edge.source];
            const tgt = positions[edge.target];
            if (!src || !tgt) return null;

            const isConnectedToSelected = selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);
            const isHovered = hoveredNodeId === edge.source || hoveredNodeId === edge.target;
            const isFlagged = edge.flagged;

            // Curved bezier path for natural visual hierarchy
            const dx = tgt.x - src.x;
            const dy = tgt.y - src.y;
            const cx1 = src.x + dx * 0.45;
            const cy1 = src.y;
            const cx2 = src.x + dx * 0.55;
            const cy2 = tgt.y;
            const pathData = `M ${src.x} ${src.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tgt.x} ${tgt.y}`;

            const strokeColor = isFlagged
              ? '#DC2626'
              : isConnectedToSelected
              ? '#237277'
              : isHovered
              ? '#3B82F6'
              : '#94A3B8';

            const strokeWidth = isFlagged ? 2.5 : isConnectedToSelected ? 2.2 : 1.3;

            return (
              <g
                key={`edge-${i}`}
                className="cursor-pointer transition-opacity"
                onClick={() => { setSelectedEdge(edge); setSelectedNode(null); }}
              >
                <path
                  d={pathData}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={isFlagged ? '6,3' : undefined}
                  markerEnd={`url(#${isFlagged ? 'arrow-flagged' : isConnectedToSelected ? 'arrow-active' : 'arrow'})`}
                  opacity={isConnectedToSelected || isHovered || isFlagged ? 0.95 : 0.45}
                />
                {/* Edge Label Pill */}
                <text
                  x={(src.x + tgt.x) / 2}
                  y={(src.y + tgt.y) / 2 - 4}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight={isFlagged || isConnectedToSelected ? '700' : '600'}
                  fill={isFlagged ? '#DC2626' : isConnectedToSelected ? '#1E293B' : '#64748B'}
                  style={{ fontFamily: 'Inter, sans-serif', userSelect: 'none' }}
                  opacity={isConnectedToSelected || isFlagged ? 1 : 0.75}
                >
                  {edge.relation}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {displayNodes.map(node => {
            const pos = positions[node.id];
            if (!pos) return null;

            const cfg = NODE_CONFIG[node.node_type] || { color: '#687A75', bg: '#F1F5F9', icon: Circle, label: node.node_type };
            const isSelected = selectedNode?.id === node.id;
            const isHovered = hoveredNodeId === node.id;
            const isMainBiz = node.node_type === 'business' || node.node_type === 'BUSINESS';
            const r = isMainBiz ? 25 : 19;
            const ringColor = RISK_BORDER[node.risk_level] || '#059669';

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x},${pos.y})`}
                onClick={() => { setSelectedNode(isSelected ? null : node); setSelectedEdge(null); }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Risk Ring */}
                <circle
                  r={r + 5}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth={node.risk_level === 'HIGH' ? 2.8 : 1.8}
                  strokeDasharray={node.risk_level !== 'LOW' ? '4,3' : undefined}
                  opacity={isSelected || isHovered ? 1 : 0.65}
                />

                {/* Node Body */}
                <circle
                  r={r}
                  fill={isSelected ? cfg.color : cfg.bg}
                  stroke={cfg.color}
                  strokeWidth={2}
                  filter={isSelected || isHovered ? 'url(#softGlow)' : undefined}
                  className="transition-all"
                />

                {/* Icon Placeholder Text / First Letter */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={isMainBiz ? 13 : 10}
                  fill={isSelected ? '#FFFFFF' : cfg.color}
                  fontWeight="900"
                  style={{ fontFamily: 'Outfit, sans-serif', pointerEvents: 'none', userSelect: 'none' }}
                >
                  {node.node_type === 'GST' ? 'GST' : node.node_type === 'ITR' ? 'ITR' : node.label[0]}
                </text>

                {/* Trust Score Pill for Main Nodes */}
                <g transform={`translate(${r - 3}, ${-r + 3})`}>
                  <circle r="9.5" fill="#FFFFFF" stroke={cfg.color} strokeWidth="1.5" />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="7"
                    fill={cfg.color}
                    fontWeight="800"
                    style={{ fontFamily: 'Outfit, sans-serif', pointerEvents: 'none' }}
                  >
                    {Math.round(node.trust_score / 10)}
                  </text>
                </g>

                {/* Node Label Text */}
                <text
                  y={r + 13}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill={isSelected || isHovered ? 'var(--brand-950)' : 'var(--text-secondary)'}
                  fontWeight={isSelected || isHovered ? '800' : '600'}
                  style={{ fontFamily: 'Inter, sans-serif', pointerEvents: 'none', userSelect: 'none' }}
                >
                  {node.label.length > 17 ? node.label.slice(0, 15) + '…' : node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* ── Node Inspection Floating Overlay ─────────────────────────────────── */}
        {selectedNode && (
          <div className="p-4 bg-white/95 backdrop-blur-md border-t-2 border-[var(--brand-950)] animate-fadeIn">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[var(--brand-100)] text-[var(--brand-800)]">
                    {selectedNode.node_type.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    selectedNode.risk_level === 'HIGH' ? 'bg-red-100 text-red-700' :
                    selectedNode.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {selectedNode.risk_level} RISK
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">ID: {selectedNode.id}</span>
                </div>
                <h4 className="text-sm font-black text-[var(--brand-950)]">{selectedNode.label}</h4>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">FinFlow Trust Score</p>
                  <p className="text-base font-black text-[var(--brand-900)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {selectedNode.trust_score} <span className="text-[11px] text-[var(--text-muted)] font-normal">/ 1000</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-xs px-2.5 py-1 rounded bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-black"
                >
                  Close ✕
                </button>
              </div>
            </div>

            {/* Extracted Entity Details Grid */}
            {selectedNode.details && Object.keys(selectedNode.details).length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {Object.entries(selectedNode.details).map(([k, v]) => (
                  <div key={k} className="p-2 rounded-lg bg-[var(--surface-subtle)]">
                    <p className="text-[9px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
                      {k.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[11px] font-extrabold text-[var(--brand-950)] truncate mt-0.5">
                      {typeof v === 'number' && v > 10000 ? `₹${(v / 100000).toFixed(1)}L` : String(v)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Edge Inspection Floating Overlay ─────────────────────────────────── */}
        {selectedEdge && (
          <div className="p-4 bg-white/95 backdrop-blur-md border-t-2 border-[var(--brand-950)] animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-700)]">
                  Relationship Edge
                </span>
                <h4 className="text-sm font-black text-[var(--brand-950)] mt-1">
                  {selectedEdge.relation}
                </h4>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Source: <span className="font-mono">{selectedEdge.source}</span> → Target: <span className="font-mono">{selectedEdge.target}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedEdge(null)}
                className="text-xs px-2.5 py-1 rounded bg-[var(--surface-subtle)]"
              >
                Close ✕
              </button>
            </div>
            {selectedEdge.flag_reason && (
              <div className="mt-2 p-2 rounded bg-red-50 border border-red-200 text-xs text-red-700 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{selectedEdge.flag_reason}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── System Detections: Duplicate Identity & Conflicting Financials ────── */}
      {(data.circular_trading_detected || (data.cross_app_duplicate_signals && data.cross_app_duplicate_signals.length > 0) || ((data as any).anomalies && (data as any).anomalies.length > 0)) && (
        <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20] space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Graph Intelligence Signals & Detected Inconsistencies
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
              {((data as any).anomalies?.length || 0) + (data.cross_app_duplicate_signals?.length || 0)} Signals
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {/* Cross-app duplicates */}
            {data.cross_app_duplicate_signals?.map((sig, i) => (
              <div key={`sig-${i}`} className="p-2.5 rounded-xl bg-white border border-amber-300">
                <p className="text-[10px] font-black uppercase text-amber-800">Duplicate Identity Signal</p>
                <p className="text-[11px] font-semibold text-slate-800 mt-0.5">{sig}</p>
              </div>
            ))}

            {/* Anomalies */}
            {(data as any).anomalies?.map((ano: any, idx: number) => (
              <div key={`ano-${idx}`} className="p-2.5 rounded-xl bg-white border border-red-300">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase text-red-700">{ano.anomaly_type}</p>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-red-100 text-red-800">{ano.severity}</span>
                </div>
                <p className="text-[11px] font-semibold text-slate-800 mt-0.5">{ano.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Legend ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[10px] text-[var(--text-muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-[var(--brand-950)]">Entity Types:</span>
          {Object.entries(NODE_CONFIG).slice(0, 11).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }} />
              <span className="font-semibold">{cfg.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-[var(--brand-950)]">Rings:</span>
          <span className="flex items-center gap-1 font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-600" /> Low Risk
          </span>
          <span className="flex items-center gap-1 font-semibold text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-600" /> Medium
          </span>
          <span className="flex items-center gap-1 font-semibold text-rose-700">
            <span className="w-2 h-2 rounded-full bg-rose-600" /> High Risk
          </span>
        </div>
      </div>
    </div>
  );
};
