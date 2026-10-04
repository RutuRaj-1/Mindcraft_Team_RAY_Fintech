import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { DecisionReplayResponse } from '../../types';
import { DecisionReplayViewer } from '../../components/replay/DecisionReplayViewer';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';
import { RotateCcw, ArrowLeft, ShieldAlert, Sparkles, Compass, CheckCircle2 } from 'lucide-react';

export const DecisionReplayPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentId = id || 'jrn_lifeline_002';

  const [replayData, setReplayData] = useState<DecisionReplayResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const benchmarkCases = [
    { id: 'jrn_skillbridge_001', name: 'SkillBridge Enterprises', badge: 'Prime Tier (Ruturaj)', color: 'var(--fin-green)' },
    { id: 'jrn_lifeline_002', name: 'Lifeline AI Healthcare', badge: 'Module 4 Explainable Decision (Rashi)', color: '#2563eb' },
    { id: 'jrn_safeera_003', name: 'SafeEra Industrial', badge: 'Underwriting Review (Aaditya)', color: '#d97706' },
  ];

  const fetchReplay = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.replayDecision(currentId);
      setReplayData(data);
    } catch (err: any) {
      console.error('Failed to load decision replay:', err);
      setError(err.message || 'Unable to reconstruct decision replay.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReplay();
  }, [currentId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Top Bar with Case Selector & Back Link ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white border border-[var(--border)] text-[var(--brand-900)] hover:bg-[var(--surface-subtle)] transition-colors shadow-xs"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]">
                Judges & Audit Review
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                GET /api/v1/journeys/{currentId}/replay
              </span>
            </div>
            <h1 className="text-xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Decision Replay Engine
            </h1>
          </div>
        </div>

        {/* Quick Benchmark Case Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[var(--text-muted)] mr-1">Benchmark Cases:</span>
          {benchmarkCases.map(bc => (
            <button
              key={bc.id}
              onClick={() => navigate(`/risk/replay/${bc.id}`)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                currentId === bc.id
                  ? 'bg-[var(--brand-950)] text-white border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20]'
                  : 'bg-white text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--brand-400)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bc.color }} />
                <span>{bc.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content View ── */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton variant="rect" height={140} />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-3">
              <Skeleton variant="rect" height={60} />
              <Skeleton variant="rect" height={100} />
              <Skeleton variant="rect" height={100} />
              <Skeleton variant="rect" height={100} />
            </div>
            <div className="lg:col-span-7">
              <Skeleton variant="rect" height={420} />
            </div>
          </div>
        </div>
      ) : error || !replayData ? (
        <ErrorState
          title="Replay Unavailable"
          message={error || 'Could not reconstruct decision replay for this journey.'}
          onRetry={fetchReplay}
        />
      ) : (
        <DecisionReplayViewer data={replayData} onRefresh={fetchReplay} />
      )}
    </div>
  );
};
