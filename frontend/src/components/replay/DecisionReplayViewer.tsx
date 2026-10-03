import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  RotateCcw, Play, Pause, SkipForward, SkipBack, Search, Filter,
  ShieldCheck, AlertTriangle, FileText, CheckCircle2, Award, Scale,
  Activity, BarChart3, BookOpen, Send, UserCheck, Lock, Sparkles,
  Layers, Hash, Eye, Copy, Check, ExternalLink, ArrowRight, Zap,
  ScanLine, Compass, TrendingUp, AlertCircle, Clock
} from 'lucide-react';
import { DecisionReplayResponse, DecisionReplayEvent } from '../../types';

interface DecisionReplayViewerProps {
  data: DecisionReplayResponse;
  onRefresh?: () => void;
  className?: string;
}

type EventCategory = 'ALL' | 'DOCS_OCR' | 'RISK_ML' | 'POLICY_DECISION' | 'GOVERNANCE';

export const DecisionReplayViewer: React.FC<DecisionReplayViewerProps> = ({
  data,
  onRefresh,
  className = '',
}) => {
  const timeline = useMemo(() => data.timeline || [], [data]);
  
  const [selectedEventId, setSelectedEventId] = useState<string>(
    timeline[0]?.eventId || ''
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1); // 1x, 2x, 4x
  const [activeCategory, setActiveCategory] = useState<EventCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'INPUT' | 'OUTPUT' | 'EVIDENCE' | 'ALL'>('ALL');

  const playbackTimerRef = useRef<any>(null);


  // Keep selected event synced if data changes
  useEffect(() => {
    if (timeline.length > 0 && !timeline.some(e => e.eventId === selectedEventId)) {
      setSelectedEventId(timeline[0].eventId);
    }
  }, [timeline, selectedEventId]);

  // Filtered timeline
  const filteredEvents = useMemo(() => {
    return timeline.filter(ev => {
      // Category filter
      if (activeCategory === 'DOCS_OCR') {
        if (!['DOCUMENT_UPLOADED', 'OCR_STARTED', 'OCR_COMPLETED', 'EVIDENCE_CREATED', 'EVIDENCE_VERIFIED'].includes(ev.eventType)) {
          return false;
        }
      } else if (activeCategory === 'RISK_ML') {
        if (!['CASHFLOW_CALCULATED', 'RISK_ASSESSED', 'SHAP_GENERATED'].includes(ev.eventType)) {
          return false;
        }
      } else if (activeCategory === 'POLICY_DECISION') {
        if (!['POLICY_RETRIEVED', 'DECISION_GENERATED'].includes(ev.eventType)) {
          return false;
        }
      } else if (activeCategory === 'GOVERNANCE') {
        if (!['NEXT_ACTION_GENERATED', 'HUMAN_REVIEW_STARTED', 'HUMAN_OVERRIDE', 'ACTION_EXECUTED', 'JOURNEY_RESOLVED', 'INCONSISTENCY_DETECTED'].includes(ev.eventType)) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSummary = (ev.payloadSummary || '').toLowerCase().includes(q);
        const matchesType = ev.eventType.toLowerCase().includes(q);
        const matchesActor = ev.actorId.toLowerCase().includes(q) || ev.actorType.toLowerCase().includes(q);
        const matchesStage = ev.stage.toLowerCase().includes(q);
        if (!matchesSummary && !matchesType && !matchesActor && !matchesStage) {
          return false;
        }
      }

      return true;
    });
  }, [timeline, activeCategory, searchQuery]);

  const selectedIndex = useMemo(() => {
    return timeline.findIndex(e => e.eventId === selectedEventId);
  }, [timeline, selectedEventId]);

  const selectedEvent = useMemo(() => {
    return timeline.find(e => e.eventId === selectedEventId) || timeline[0] || null;
  }, [timeline, selectedEventId]);

  // Auto-Replay Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      return;
    }

    const intervalMs = Math.max(800, 2400 / playSpeed);
    playbackTimerRef.current = setInterval(() => {
      setSelectedEventId(currentId => {
        const currentIndex = timeline.findIndex(e => e.eventId === currentId);
        if (currentIndex < 0 || currentIndex >= timeline.length - 1) {
          setIsPlaying(false);
          return currentId;
        }
        return timeline[currentIndex + 1].eventId;
      });
    }, intervalMs);

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, playSpeed, timeline]);

  const handleStepPrev = () => {
    if (selectedIndex > 0) {
      setSelectedEventId(timeline[selectedIndex - 1].eventId);
    }
  };

  const handleStepNext = () => {
    if (selectedIndex < timeline.length - 1) {
      setSelectedEventId(timeline[selectedIndex + 1].eventId);
    }
  };

  const handleJumpToStart = () => {
    if (timeline.length > 0) {
      setSelectedEventId(timeline[0].eventId);
    }
  };

  const handleJumpToDecision = () => {
    const dec = timeline.find(e => e.eventType === 'DECISION_GENERATED') || timeline[timeline.length - 1];
    if (dec) setSelectedEventId(dec.eventId);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Helper for event styling
  const getEventMeta = (type: string) => {
    switch (type) {
      case 'INTENT_RECEIVED':
      case 'JOURNEY_CREATED':
        return {
          icon: Compass,
          color: 'var(--brand-700)',
          bg: 'var(--brand-50)',
          borderColor: 'var(--brand-200)',
          label: 'Intent & Setup',
        };
      case 'DOCUMENT_UPLOADED':
      case 'OCR_STARTED':
      case 'OCR_COMPLETED':
        return {
          icon: ScanLine,
          color: '#0284c7',
          bg: '#e0f2fe',
          borderColor: '#bae6fd',
          label: 'Document Intelligence',
        };
      case 'EVIDENCE_CREATED':
      case 'EVIDENCE_VERIFIED':
        return {
          icon: ShieldCheck,
          color: 'var(--fin-green)',
          bg: 'var(--fin-green-bg)',
          borderColor: 'rgba(16, 185, 129, 0.3)',
          label: 'Evidence Verified',
        };
      case 'INCONSISTENCY_DETECTED':
        return {
          icon: AlertTriangle,
          color: 'var(--fin-coral)',
          bg: 'var(--fin-coral-bg)',
          borderColor: 'rgba(239, 68, 68, 0.4)',
          label: 'Discrepancy Flag',
        };
      case 'CASHFLOW_CALCULATED':
        return {
          icon: TrendingUp,
          color: '#0d9488',
          bg: '#ccfbf1',
          borderColor: '#99f6e4',
          label: 'Cash Flow Analysis',
        };
      case 'RISK_ASSESSED':
      case 'SHAP_GENERATED':
        return {
          icon: Activity,
          color: '#d97706',
          bg: '#fef3c7',
          borderColor: '#fde68a',
          label: 'Risk & SHAP ML',
        };
      case 'POLICY_RETRIEVED':
        return {
          icon: BookOpen,
          color: '#7c3aed',
          bg: '#ede9fe',
          borderColor: '#ddd6fe',
          label: 'Policy RAG',
        };
      case 'DECISION_GENERATED':
        return {
          icon: Award,
          color: 'var(--brand-950)',
          bg: '#e2e8f0',
          borderColor: 'var(--brand-950)',
          label: 'Credit Decision',
        };
      case 'NEXT_ACTION_GENERATED':
      case 'ACTION_EXECUTED':
        return {
          icon: Zap,
          color: '#0284c7',
          bg: '#e0f2fe',
          borderColor: '#bae6fd',
          label: 'Safe Execution',
        };
      case 'HUMAN_REVIEW_STARTED':
      case 'HUMAN_OVERRIDE':
        return {
          icon: UserCheck,
          color: '#e11d48',
          bg: '#ffe4e6',
          borderColor: '#fecdd3',
          label: 'Underwriter Override',
        };
      case 'JOURNEY_RESOLVED':
        return {
          icon: Lock,
          color: 'var(--brand-900)',
          bg: 'var(--surface-subtle)',
          borderColor: 'var(--border)',
          label: 'Archival & Seal',
        };
      default:
        return {
          icon: Layers,
          color: 'var(--text-secondary)',
          bg: 'var(--surface-subtle)',
          borderColor: 'var(--border)',
          label: 'System Milestone',
        };
    }
  };

  const formatTime = (tsStr: string) => {
    try {
      const d = new Date(tsStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return tsStr.slice(11, 19) || tsStr;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ── Top Header & Executive Replay Banner ── */}
      <div className="card p-6 border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] bg-white rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--brand-900)] text-white">
                Deterministic Decision Replay
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--fin-green-bg)] text-[var(--fin-green)] border border-[var(--fin-green)]/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Append-Only Tamper-Evident Ledger
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-subtle)] px-2 py-0.5 rounded border border-[var(--border)]">
                {data.snapshot_version}
              </span>
            </div>

            <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {data.declared_intent?.business_name || 'MSME Enterprise Loan'} · Replay Console
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Application ID: <span className="font-mono font-bold text-[var(--brand-900)]">{data.application_id}</span> · Journey ID: <span className="font-mono">{data.journey_id}</span> · Final Outcome: <span className="font-bold text-[var(--brand-950)]">{data.summary?.final_decision_outcome || data.decision_record?.outcome || 'PENDING'}</span>
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-3">
            <div className="bg-[var(--surface-subtle)] p-3 rounded-xl border border-[var(--border)] text-center min-w-[90px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Events</span>
              <span className="text-lg font-black text-[var(--brand-950)] font-mono">{timeline.length}</span>
            </div>

            <div className="bg-[var(--surface-subtle)] p-3 rounded-xl border border-[var(--border)] text-center min-w-[90px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Trust Score</span>
              <span className="text-lg font-black text-[var(--brand-700)] font-mono">
                {data.risk_snapshot?.finflow_trust_score ?? data.summary?.trust_score ?? '—'}
                <span className="text-[10px] text-[var(--text-muted)] font-normal">/1000</span>
              </span>
            </div>

            <div className="bg-[var(--surface-subtle)] p-3 rounded-xl border border-[var(--border)] text-center min-w-[110px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Decision</span>
              <span className={`text-xs font-black px-2 py-1 rounded inline-block mt-0.5 ${
                data.decision_record?.outcome === 'APPROVED' ? 'bg-[var(--fin-green-bg)] text-[var(--fin-green)]' :
                data.decision_record?.outcome === 'CONDITIONAL_APPROVAL' ? 'bg-[#fef3c7] text-[#b45309]' :
                'bg-[var(--fin-coral-bg)] text-[var(--fin-coral)]'
              }`}>
                {data.decision_record?.outcome || 'REVISE'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Playback Scrubber & Navigation Controls ── */}
        <div className="mt-5 pt-4 border-t border-[var(--border)] flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Controls Button Group */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleJumpToStart}
              className="p-2 rounded-xl bg-white border border-[var(--border)] text-[var(--brand-900)] hover:bg-[var(--surface-subtle)] transition-colors shadow-xs"
              title="Jump to Start"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={handleStepPrev}
              disabled={selectedIndex <= 0}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white border border-[var(--border)] text-[var(--brand-900)] hover:bg-[var(--surface-subtle)] disabled:opacity-40 transition-colors shadow-xs"
            >
              Previous
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 text-xs font-black rounded-xl bg-[var(--brand-950)] text-white hover:bg-[var(--brand-900)] transition-all shadow-[2px_2px_0px_#0A1F20] flex items-center gap-1.5 active:translate-y-0.5"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 text-[var(--fin-coral)]" /> Pause Replay
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-[var(--fin-green)] fill-current" /> Play Replay
                </>
              )}
            </button>

            <button
              onClick={handleStepNext}
              disabled={selectedIndex >= timeline.length - 1}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white border border-[var(--border)] text-[var(--brand-900)] hover:bg-[var(--surface-subtle)] disabled:opacity-40 transition-colors shadow-xs"
            >
              Next
            </button>

            <button
              onClick={handleJumpToDecision}
              className="p-2 rounded-xl bg-white border border-[var(--border)] text-[var(--brand-900)] hover:bg-[var(--surface-subtle)] transition-colors shadow-xs"
              title="Jump to Credit Decision"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Speed toggle */}
            <div className="flex items-center ml-2 bg-[var(--surface-subtle)] rounded-xl p-1 border border-[var(--border)] text-[10px] font-bold">
              {[1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setPlaySpeed(s)}
                  className={`px-2 py-0.5 rounded-lg transition-all ${
                    playSpeed === s ? 'bg-white text-[var(--brand-950)] font-black shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Scrubber Progress Bar */}
          <div className="flex-1 w-full max-w-md">
            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)] mb-1 font-mono">
              <span>Step {selectedIndex + 1} of {timeline.length}</span>
              <span className="text-[var(--brand-900)]">{selectedEvent?.eventType || 'READY'}</span>
            </div>
            <div className="w-full h-2.5 bg-[var(--surface-subtle)] rounded-full border border-[var(--border)] overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-[var(--brand-700)] to-[var(--fin-green)] rounded-full transition-all duration-300"
                style={{
                  width: `${timeline.length > 0 ? ((selectedIndex + 1) / timeline.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column (5 cols): Chronological Timeline Stream ── */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card p-4 border border-[var(--border)] bg-white rounded-2xl shadow-xs">
            {/* Search & Category Filter */}
            <div className="space-y-3 mb-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Filter events by keyword, stage, actor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] focus:bg-white focus:outline-none focus:border-[var(--brand-700)]"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ALL', label: 'All Events' },
                  { id: 'DOCS_OCR', label: 'Docs & OCR' },
                  { id: 'RISK_ML', label: 'Risk & ML' },
                  { id: 'POLICY_DECISION', label: 'Policy & Decision' },
                  { id: 'GOVERNANCE', label: 'Governance' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id as EventCategory)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                      activeCategory === tab.id
                        ? 'bg-[var(--brand-950)] text-white shadow-xs'
                        : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline Stream Scrollable Container */}
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {filteredEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  No events match the selected filter.
                </div>
              ) : (
                filteredEvents.map((ev, idx) => {
                  const meta = getEventMeta(ev.eventType);
                  const isSelected = ev.eventId === selectedEventId;
                  const Icon = meta.icon;

                  return (
                    <div
                      key={ev.eventId || idx}
                      onClick={() => {
                        setSelectedEventId(ev.eventId);
                        setIsPlaying(false);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative ${
                        isSelected
                          ? 'border-[var(--brand-950)] bg-white shadow-[3px_3px_0px_#0A1F20] translate-x-1 ring-1 ring-[var(--brand-950)]'
                          : 'border-[var(--border)] bg-white hover:border-[var(--brand-400)] hover:bg-[var(--surface-subtle)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: meta.bg, color: meta.color }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-black text-[var(--brand-950)] tracking-tight">
                            {ev.eventType.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Clock Badge */}
                        <div className="flex items-center gap-1 font-mono text-[10px] text-[var(--text-muted)]">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formatTime(ev.timestamp)}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-2 font-medium">
                        {ev.payloadSummary}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)] uppercase">
                          {ev.stage}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]">
                          {ev.actorType}: {ev.actorId}
                        </span>
                        {ev.modelVersion && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
                            {ev.modelVersion}
                          </span>
                        )}
                        {ev.eventType === 'INCONSISTENCY_DETECTED' && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[var(--fin-coral-bg)] text-[var(--fin-coral)] border border-[var(--fin-coral)]/30 animate-pulse">
                            DISCREPANCY
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Right Column (7 cols): Event Deep-Dive Inspector ── */}
        <div className="lg:col-span-7 space-y-4">
          {selectedEvent ? (
            <div className="card p-6 border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] bg-white rounded-2xl space-y-6">
              {/* Event Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-[var(--brand-950)] text-white">
                      Event Deep Dive
                    </span>
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      {selectedEvent.eventId}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {selectedEvent.eventType.replace(/_/g, ' ')}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">
                    {selectedEvent.payloadSummary}
                  </p>
                </div>

                <div className="flex sm:flex-col items-end gap-1 text-right">
                  <span className="text-xs font-mono font-bold text-[var(--brand-900)]">
                    {new Date(selectedEvent.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    {new Date(selectedEvent.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Event Metadata Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[var(--surface-subtle)] p-3 rounded-xl border border-[var(--border)] text-[11px]">
                <div>
                  <span className="text-[9px] font-bold uppercase text-[var(--text-muted)] block">Stage</span>
                  <span className="font-bold text-[var(--brand-950)]">{selectedEvent.stage}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-[var(--text-muted)] block">Actor Type</span>
                  <span className="font-bold text-[var(--brand-950)]">{selectedEvent.actorType}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-[var(--text-muted)] block">Service Subsystem</span>
                  <span className="font-mono font-bold text-[var(--brand-900)] truncate block">{selectedEvent.service}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-[var(--text-muted)] block">Model / Version</span>
                  <span className="font-mono font-bold text-[var(--fin-green)] truncate block">
                    {selectedEvent.modelVersion || 'Deterministic Logic'}
                  </span>
                </div>
              </div>

              {/* Inspector Section Switcher */}
              <div className="flex border-b border-[var(--border)] text-xs font-bold gap-4">
                {[
                  { id: 'ALL', label: 'Full Traceability (All 3 Views)' },
                  { id: 'INPUT', label: '1. Input Entered' },
                  { id: 'OUTPUT', label: '2. Output Generated' },
                  { id: 'EVIDENCE', label: '3. Evidence Used' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveInspectorTab(t.id as any)}
                    className={`pb-2.5 transition-all relative ${
                      activeInspectorTab === t.id
                        ? 'text-[var(--brand-950)] font-black border-b-2 border-[var(--brand-950)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── 1. WHAT INPUT ENTERED THE SYSTEM ── */}
              {(activeInspectorTab === 'ALL' || activeInspectorTab === 'INPUT') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[var(--brand-950)] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-[var(--brand-50)] text-[var(--brand-800)] flex items-center justify-center font-bold text-[10px]">
                        1
                      </span>
                      What Input Entered the System
                    </h3>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedEvent.input, null, 2), 'input')}
                      className="text-[10px] font-bold text-[var(--brand-700)] hover:text-[var(--brand-900)] flex items-center gap-1"
                    >
                      {copiedKey === 'input' ? <Check className="w-3 h-3 text-[var(--fin-green)]" /> : <Copy className="w-3 h-3" />}
                      Copy JSON
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0f172a] text-[#f8fafc] font-mono text-[11px] overflow-x-auto border border-[#334155] shadow-inner max-h-[220px]">
                    {Object.keys(selectedEvent.input || {}).length > 0 ? (
                      <pre className="leading-relaxed">
                        {JSON.stringify(selectedEvent.input, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-[#64748b] italic">// Initial trigger event — no external input payload required.</span>
                    )}
                  </div>
                </div>
              )}

              {/* ── 2. WHAT OUTPUT WAS GENERATED ── */}
              {(activeInspectorTab === 'ALL' || activeInspectorTab === 'OUTPUT') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[var(--brand-950)] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-[var(--fin-green-bg)] text-[var(--fin-green)] flex items-center justify-center font-bold text-[10px]">
                        2
                      </span>
                      What Output Was Generated
                    </h3>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedEvent.output, null, 2), 'output')}
                      className="text-[10px] font-bold text-[var(--brand-700)] hover:text-[var(--brand-900)] flex items-center gap-1"
                    >
                      {copiedKey === 'output' ? <Check className="w-3 h-3 text-[var(--fin-green)]" /> : <Copy className="w-3 h-3" />}
                      Copy JSON
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0f172a] text-[#38bdf8] font-mono text-[11px] overflow-x-auto border border-[#334155] shadow-inner max-h-[220px]">
                    {Object.keys(selectedEvent.output || {}).length > 0 ? (
                      <pre className="leading-relaxed text-[#a5f3fc]">
                        {JSON.stringify(selectedEvent.output, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-[#64748b] italic">// State transition verified — output recorded in journey status.</span>
                    )}
                  </div>
                </div>
              )}

              {/* ── 3. WHAT EVIDENCE WAS USED ── */}
              {(activeInspectorTab === 'ALL' || activeInspectorTab === 'EVIDENCE') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[var(--brand-950)] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-[#ede9fe] text-[#7c3aed] flex items-center justify-center font-bold text-[10px]">
                        3
                      </span>
                      What Evidence Was Used & Provenance Lineage
                    </h3>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      {selectedEvent.evidenceUsed?.length || 0} cited evidence items
                    </span>
                  </div>

                  {selectedEvent.evidenceUsed && selectedEvent.evidenceUsed.length > 0 ? (
                    <div className="space-y-2">
                      {selectedEvent.evidenceUsed.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs font-medium flex items-start gap-2.5"
                        >
                          <ShieldCheck className="w-4 h-4 text-[var(--fin-green)] flex-shrink-0 mt-0.5" />
                          <div className="flex-1 overflow-hidden">
                            {typeof item === 'string' ? (
                              <p className="font-mono text-[11px] text-[var(--brand-950)] font-bold">{item}</p>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-[var(--brand-950)]">
                                    {item.field || item.rule_name || item.field_name || item.document_id || 'Evidence Artifact'}
                                  </span>
                                  {item.confidence && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--fin-green-bg)] text-[var(--fin-green)] font-bold">
                                      Confidence: {(item.confidence * 100).toFixed(0)}%
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[var(--text-secondary)] font-mono break-all">
                                  {JSON.stringify(item)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
                      No external evidence dependencies required at this orchestration checkpoint.
                    </div>
                  )}
                </div>
              )}

              {/* Cryptographic Proof Footer */}
              <div className="pt-3 border-t border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] text-[var(--text-muted)] font-mono">
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-[var(--brand-600)]" />
                  <span>Ledger Verification: <strong className="text-[var(--fin-green)]">IMMUTABLE_APPEND_ONLY_SEALED</strong></span>
                </div>
                <span>Actor ID: {selectedEvent.actorId}</span>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center border border-[var(--border)] bg-white rounded-2xl">
              <RotateCcw className="w-8 h-8 text-[var(--border-strong)] mx-auto mb-2" />
              <p className="text-xs font-bold text-[var(--text-secondary)]">Select an event from the timeline to inspect details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
