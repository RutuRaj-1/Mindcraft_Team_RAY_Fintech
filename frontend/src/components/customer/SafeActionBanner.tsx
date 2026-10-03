import React from 'react';
import { NextBestActionsResponse } from '../../types';
import { Compass, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface ActionProps {
  nba?: NextBestActionsResponse;
  onExecuteAction: (actionType: string) => void;
}

export const SafeActionBanner: React.FC<ActionProps> = ({ nba, onExecuteAction }) => {
  if (!nba || !nba.primary_action) return null;

  const act = nba.primary_action;
  const isSafe = act.safe_guardrail_status === 'SAFE';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--brand-800)] via-[var(--brand-700)] to-[var(--brand-600)] text-white p-6 shadow-lg mb-6 border border-white/10">
      {/* Background glow circle */}
      <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/5 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-white/15 backdrop-blur-md text-[var(--brand-100)] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 border border-white/20">
              <Compass className="w-3.5 h-3.5 text-[var(--brand-300)]" /> Autonomous Next-Best-Action
            </span>
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-md ${
              isSafe ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30' : 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" /> Guardrail Verified ({(act.safety_confidence * 100).toFixed(0)}%)
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {act.title}
          </h3>
          <p className="text-xs sm:text-sm text-[var(--brand-100)] leading-relaxed">
            {act.description}
          </p>
        </div>

        <button
          onClick={() => onExecuteAction(act.action_type)}
          className="shrink-0 py-3 px-6 bg-[var(--brand-300)] hover:bg-[var(--brand-200)] text-[var(--brand-900)] text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 hover:scale-[1.03] active:scale-[0.98]"
        >
          <span>{act.cta_label}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
