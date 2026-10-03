import React from 'react';
import { NextBestActionsResponse } from '../../types';
import { Compass, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

interface ActionProps {
  nba?: NextBestActionsResponse;
  onExecuteAction: (actionType: string) => void;
}

export const SafeActionBanner: React.FC<ActionProps> = ({ nba, onExecuteAction }) => {
  if (!nba || !nba.primary_action) return null;

  const act = nba.primary_action;
  const isSafe = act.safe_guardrail_status === 'SAFE';

  return (
    <div className="bg-gradient-to-r from-[#123E40] to-[#18575A] text-white rounded-2xl p-6 shadow-md mb-6 relative overflow-hidden">
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 backdrop-blur-xs text-[#D9F0EE] text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Compass className="w-3 h-3 text-[#3DA5A6]" /> Safe Action Agent
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isSafe ? 'bg-[#169C73]/30 text-[#D9F0EE]' : 'bg-[#D89B22]/30 text-[#FFF6DF]'
            }`}>
              <ShieldCheck className="w-3 h-3" /> {act.safe_guardrail_status} ({(act.safety_confidence * 100).toFixed(0)}% Confidence)
            </span>
          </div>
          <h3 className="text-lg font-bold text-white">{act.title}</h3>
          <p className="text-xs text-[#D9F0EE]/90 leading-relaxed">{act.description}</p>
        </div>

        <button
          onClick={() => onExecuteAction(act.action_type)}
          className="shrink-0 py-3 px-5 bg-[#3DA5A6] hover:bg-[#2D8E92] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 hover:scale-[1.02]"
        >
          <span>{act.cta_label}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
