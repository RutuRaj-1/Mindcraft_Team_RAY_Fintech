import React, { useState } from 'react';
import { NextBestActionItem, NextBestActionsResponse } from '../../types';
import {
  Compass,
  ShieldCheck,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertTriangle,
  FileUp,
  RefreshCw,
  Eye,
  PhoneCall,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Layers,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Button } from '../ui/Button';

export interface NextActionCardProps {
  action?: NextBestActionItem;
  response?: NextBestActionsResponse;
  onExecute?: (action: NextBestActionItem) => void;
  className?: string;
  isExecuting?: boolean;
}

export const NextActionCard: React.FC<NextActionCardProps> = ({
  action,
  response,
  onExecute,
  className = '',
  isExecuting = false,
}) => {
  const [showAlternatives, setShowAlternatives] = useState(false);

  // Fallback to response.primary_action if action prop is omitted
  const activeAction: NextBestActionItem | undefined = action || response?.primary_action;
  const alternatives: NextBestActionItem[] = response?.alternative_actions || [];

  if (!activeAction) {
    return (
      <div className={`p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs ${className}`}>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Compass className="w-4 h-4 text-[var(--brand-600)] animate-spin" />
          <span>Evaluating journey state for next best action...</span>
        </div>
      </div>
    );
  }

  const isSafe = activeAction.safe_guardrail_status === 'SAFE';
  const priority = activeAction.priority || 1;

  // Icon mapping for action types
  const getActionIcon = (actionType: string = '') => {
    const act = actionType.toLowerCase();
    if (act.includes('upload') || act.includes('document')) return <FileUp className="w-4 h-4 text-emerald-600" />;
    if (act.includes('resolve') || act.includes('inconsistency')) return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    if (act.includes('explanation')) return <Eye className="w-4 h-4 text-indigo-600" />;
    if (act.includes('manager') || act.includes('contact')) return <PhoneCall className="w-4 h-4 text-blue-600" />;
    if (act.includes('officer') || act.includes('review')) return <UserCheck className="w-4 h-4 text-purple-600" />;
    if (act.includes('accept') || act.includes('complete')) return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    return <Zap className="w-4 h-4 text-[var(--brand-600)]" />;
  };

  return (
    <div
      className={`p-6 rounded-2xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] transition-all ${className}`}
    >
      {/* Top Tag Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority Badge */}
          <span
            className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
              priority === 1
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : priority === 2
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-slate-50 text-slate-700 border-slate-300'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${priority === 1 ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'}`} />
            Priority {priority} • {priority === 1 ? 'Immediate Action' : priority === 2 ? 'Next Milestone' : 'Advisory'}
          </span>

          {/* Actor Role Badge */}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)]">
            Actor: <strong>{activeAction.actor || activeAction.target_persona || 'CUSTOMER'}</strong>
          </span>

          {/* Guardrail Invariant Status */}
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
              isSafe
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            {isSafe ? 'Guardrail Verified: SAFE' : 'Supervisory Review Required'}
          </span>
        </div>

        {/* Engine Origin */}
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-mono">
          <Compass className="w-3.5 h-3.5 text-[var(--brand-700)]" />
          <span>Next Best Action Engine</span>
        </div>
      </div>

      {/* Main Title & Narrative Reason */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-50)] border border-[var(--brand-200)] flex items-center justify-center shrink-0">
              {getActionIcon(activeAction.recommendedAction || activeAction.action_type as string)}
            </div>
            <h3
              className="text-lg font-black text-[var(--brand-950)] tracking-tight"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {activeAction.title}
            </h3>
          </div>

          <p className="text-xs text-[var(--text-default)] leading-relaxed bg-[var(--surface-subtle)] p-3.5 rounded-xl border border-[var(--border)]">
            <strong>Rationale: </strong>
            {activeAction.reason || activeAction.description}
          </p>

          {/* 8-Dimension Structured Breakdown per Part 33 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border)] text-xs">
            <div className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)]">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">1. Priority</span>
              <span className="font-black text-[var(--brand-950)]">P{priority} • {priority === 1 ? 'Immediate' : priority === 2 ? 'Next Milestone' : 'Advisory'}</span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)]">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">2. Actor</span>
              <span className="font-black text-[var(--brand-950)]">{activeAction.actor || activeAction.target_persona || 'CUSTOMER'}</span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)]">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">3. Action Type</span>
              <span className="font-black text-[var(--brand-950)] truncate block">{activeAction.action_type || activeAction.recommendedAction || 'GOVERNED_TRANSITION'}</span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)]">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">4. Status</span>
              <span className="font-black text-emerald-700">{activeAction.status || 'RECOMMENDED'}</span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] col-span-2">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">5. Required Evidence</span>
              <span className="font-semibold text-[var(--brand-950)] truncate block">{activeAction.requiredInput || 'Foundational verification records'}</span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] col-span-2">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">6. Expected Impact</span>
              <span className="font-semibold text-emerald-800 truncate block">{activeAction.estimatedImpact || 'Advances journey to next underwriting milestone'}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">7. Safety / Guardrail:</span>
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {isSafe ? 'Guardrail Enforced: Autonomous financial disbursal strictly blocked' : 'Human underwriter concurrence required'}
            </span>
          </div>
        </div>

        {/* Primary Safe CTA Button */}
        <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-1.5">
          <Button
            variant="brutal"
            size="md"
            onClick={() => onExecute && onExecute(activeAction)}
            disabled={isExecuting}
            rightIcon={
              isExecuting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )
            }
            className="w-full sm:w-auto shadow-[3px_3px_0px_#0A1F20] hover:translate-x-0.5 hover:translate-y-0.5 font-black text-sm"
          >
            {isExecuting
              ? 'Executing Action...'
              : (activeAction.cta_label && !activeAction.cta_label.toLowerCase().includes('disburse'))
              ? activeAction.cta_label
              : 'Continue to governed approval'}
          </Button>

          <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 justify-center sm:justify-end">
            <Lock className="w-3 h-3 text-slate-400" /> Autonomous financial disbursal impossible
          </span>
        </div>
      </div>

      {/* Alternative Next Actions Accordion */}
      {alternatives.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-[var(--border)]">
          <button
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="flex items-center justify-between w-full text-xs font-bold text-[var(--brand-700)] hover:text-[var(--brand-950)] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              {alternatives.length} Alternative Candidate Action{alternatives.length > 1 ? 's' : ''} Evaluated
            </span>
            {showAlternatives ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAlternatives && (
            <div className="mt-3 space-y-2">
              {alternatives.map((alt, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                      P{alt.priority || 2}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-[var(--brand-950)] truncate">{alt.title}</div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">{alt.description}</div>
                    </div>
                  </div>

                  {onExecute && (
                    <button
                      onClick={() => onExecute(alt)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-[var(--brand-50)] border border-[var(--border)] text-[var(--brand-950)] shrink-0 transition-colors"
                    >
                      {alt.cta_label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
