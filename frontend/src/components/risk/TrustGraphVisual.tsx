import React, { useEffect, useRef, useState } from 'react';
import { TrustGraph, TrustGraphNode } from '../../types';
import { Network, AlertTriangle, ShieldCheck, Building2, User, CreditCard, Package } from 'lucide-react';

interface TrustGraphProps {
  trustGraph?: TrustGraph;
  graph?: TrustGraph;
}

const NODE_COLORS: Record<string, string> = {
  BUSINESS:     '#237277',
  DIRECTOR:     '#6A49C6',
  GSTIN:        '#2460DC',
  BANK_ACCOUNT: '#0E9B6D',
  SUPPLIER:     '#C98A10',
  BUYER:        '#CC4B3E',
};

const NODE_ICONS: Record<string, React.ElementType> = {
  BUSINESS:     Building2,
  DIRECTOR:     User,
  GSTIN:        Package,
  BANK_ACCOUNT: CreditCard,
  SUPPLIER:     Package,
  BUYER:        User,
};

const RISK_RING: Record<string, string> = {
  LOW:    '#0E9B6D',
  MEDIUM: '#C98A10',
  HIGH:   '#CC4B3E',
};

// Simple force-directed-like layout using fixed positions
const getNodePositions = (nodes: TrustGraphNode[], width: number, height: number) => {
  const positions: Record<string, { x: number; y: number }> = {};
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(cx, cy) * 0.68;

  // Central business node
  const bizNode = nodes.find(n => n.node_type === 'BUSINESS') || nodes[0];
  if (bizNode) positions[bizNode.id] = { x: cx, y: cy };

  const others = nodes.filter(n => n.id !== bizNode?.id);
  others.forEach((n, i) => {
    const angle = (i / others.length) * 2 * Math.PI - Math.PI / 2;
    const dist = n.node_type === 'DIRECTOR' ? r * 0.6 : r;
    positions[n.id] = {
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
    };
  });

  return positions;
};

export const TrustGraphVisual: React.FC<TrustGraphProps> = ({ trustGraph: propTrustGraph, graph }) => {
  const trustGraph = propTrustGraph || graph;
  if (!trustGraph) return null;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<TrustGraphNode | null>(null);
  const [dims, setDims] = useState({ w: 600, h: 380 });

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width } = e.contentRect;
        setDims({ w: Math.max(320, width), h: Math.min(400, Math.max(280, width * 0.62)) });
      }
    });
    if (svgRef.current?.parentElement) obs.observe(svgRef.current.parentElement);
    return () => obs.disconnect();
  }, []);

  const positions = getNodePositions(trustGraph.nodes, dims.w, dims.h);

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--fin-violet-bg)] flex items-center justify-center">
            <Network className="w-4 h-4 text-[var(--fin-violet)]" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[var(--brand-900)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Financial Trust Graph
            </h3>
            <p className="text-[10px] text-[var(--text-muted)]">Cross-application entity relationship network</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {trustGraph.circular_trading_detected ? (
            <span className="badge badge-coral flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Circular Trading
            </span>
          ) : (
            <span className="badge badge-green flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Clean Network
            </span>
          )}
        </div>
      </div>

      {/* Network Risk Bar */}
      <div className="mb-4 px-1">
        <div className="flex justify-between text-[10px] font-semibold text-[var(--text-muted)] mb-1">
          <span>Network Risk Score</span>
          <span className={trustGraph.network_risk_score > 0.5 ? 'text-[var(--fin-coral)]' : trustGraph.network_risk_score > 0.25 ? 'text-[var(--fin-amber)]' : 'text-[var(--fin-green)]'}>
            {(trustGraph.network_risk_score * 100).toFixed(0)}%
          </span>
        </div>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{
              width: `${trustGraph.network_risk_score * 100}%`,
              background: trustGraph.network_risk_score > 0.5
                ? 'var(--fin-coral)'
                : trustGraph.network_risk_score > 0.25
                ? 'var(--fin-amber)'
                : 'var(--fin-green)',
            }}
          />
        </div>
      </div>

      {/* SVG Graph */}
      <div className="relative w-full bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height={dims.h}
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          style={{ display: 'block' }}
        >
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="var(--border-strong)" />
            </marker>
            <marker id="arrow-flagged" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="var(--fin-coral)" />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {trustGraph.edges.map((edge, i) => {
            const src = positions[edge.source];
            const tgt = positions[edge.target];
            if (!src || !tgt) return null;
            const isHovered = hovered === edge.source || hovered === edge.target;
            return (
              <g key={i}>
                <line
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={edge.flagged ? 'var(--fin-coral)' : isHovered ? 'var(--brand-400)' : 'var(--border-strong)'}
                  strokeWidth={edge.flagged ? 2 : isHovered ? 1.5 : 1}
                  strokeDasharray={edge.flagged ? '5,3' : undefined}
                  markerEnd={`url(#${edge.flagged ? 'arrow-flagged' : 'arrow'})`}
                  opacity={0.7}
                />
                {/* Edge label */}
                <text
                  x={(src.x + tgt.x) / 2}
                  y={(src.y + tgt.y) / 2 - 5}
                  textAnchor="middle"
                  fontSize="9"
                  fill={edge.flagged ? 'var(--fin-coral)' : 'var(--text-muted)'}
                  fontWeight={edge.flagged ? '700' : '500'}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                  opacity={isHovered || edge.flagged ? 1 : 0.6}
                >
                  {edge.relation}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {trustGraph.nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;
            const color = NODE_COLORS[node.node_type] || '#687A75';
            const ringColor = RISK_RING[node.risk_level] || '#687A75';
            const isSelected = selected?.id === node.id;
            const isHov = hovered === node.id;
            const isBiz = node.node_type === 'BUSINESS';
            const r = isBiz ? 28 : 20;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x},${pos.y})`}
                onClick={() => setSelected(isSelected ? null : node)}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Risk ring */}
                <circle
                  r={r + 5}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth={node.risk_level === 'HIGH' ? 2.5 : 1.5}
                  strokeDasharray={node.risk_level !== 'LOW' ? '4,3' : undefined}
                  opacity={isHov || isSelected ? 0.9 : 0.4}
                />
                {/* Node background */}
                <circle
                  r={r}
                  fill={isSelected ? color : `${color}22`}
                  stroke={color}
                  strokeWidth={isBiz ? 2.5 : 2}
                  filter={isHov || isSelected ? 'url(#glow)' : undefined}
                />
                {/* Icon (text fallback) */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={isBiz ? 14 : 11}
                  fill={isSelected ? 'white' : color}
                  fontWeight="700"
                  style={{ fontFamily: 'Inter, sans-serif', pointerEvents: 'none', userSelect: 'none' }}
                >
                  {node.node_type[0]}
                </text>
                {/* Trust score badge */}
                {isBiz && (
                  <g transform={`translate(${r - 4}, ${-r + 4})`}>
                    <circle r="12" fill="white" stroke={color} strokeWidth="1.5" />
                    <text textAnchor="middle" dominantBaseline="central" fontSize="8" fill={color} fontWeight="900" style={{ fontFamily: 'Outfit, sans-serif', pointerEvents: 'none' }}>
                      {Math.round(node.trust_score / 10)}
                    </text>
                  </g>
                )}
                {/* Node label */}
                <text
                  y={r + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill={isHov ? 'var(--text-primary)' : 'var(--text-secondary)'}
                  fontWeight={isHov || isSelected ? '700' : '500'}
                  style={{ fontFamily: 'Inter, sans-serif', pointerEvents: 'none', userSelect: 'none' }}
                >
                  {node.label.length > 14 ? node.label.slice(0, 12) + '…' : node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected node detail overlay */}
        {selected && (
          <div className="absolute bottom-3 left-3 right-3 animate-fadeIn">
            <div className="glass-card rounded-xl p-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[var(--brand-900)]">{selected.label}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{selected.node_type.replace('_', ' ')}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selected.risk_level === 'HIGH' ? 'badge badge-coral' :
                    selected.risk_level === 'MEDIUM' ? 'badge badge-amber' : 'badge badge-green'
                  }`}>
                    {selected.risk_level} RISK
                  </span>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Trust: {selected.trust_score}/1000</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-[10px] text-[var(--text-muted)] font-medium">{type.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Cross-app signals */}
      {trustGraph.cross_app_duplicate_signals.length > 0 && (
        <div className="mt-3 alert-panel warning">
          <p className="text-[11px] font-bold text-[var(--fin-amber)] flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Cross-Application Duplicate Signals
          </p>
          <div className="flex flex-wrap gap-2">
            {trustGraph.cross_app_duplicate_signals.map((sig, i) => (
              <span key={i} className="text-[10px] font-mono bg-[var(--fin-amber)]/10 text-[var(--fin-amber)] px-2 py-0.5 rounded border border-[var(--fin-amber)]/20">
                {sig}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
