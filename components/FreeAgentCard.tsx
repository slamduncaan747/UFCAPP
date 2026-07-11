'use client';

import { Fighter } from '@/lib/types';
import { FighterAvatar } from '@/components/FighterAvatar';
import { formatEventDate, lastName, rankLabel, recordString, weightClassName } from '@/lib/helpers';
import type { UpcomingBoutInfo } from '@/lib/data';

interface FreeAgentCardProps {
  fighter: Fighter;
  nextBout?: UpcomingBoutInfo | null;
  onAdd: () => void;
  disabled?: boolean;
}

export default function FreeAgentCard({ fighter, nextBout, onAdd, disabled = false }: FreeAgentCardProps) {
  const rank = rankLabel(fighter);

  return (
    <div className="bg-[#050507] border-2 border-zinc-800 rounded-xl p-3 flex items-center justify-between">
      <div className="flex items-center space-x-3 min-w-0">
        <div className="relative flex-shrink-0">
          <FighterAvatar fighter={fighter} size={44} className="border-[3px] border-zinc-700" />
          {rank && (
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 text-white text-[10px] font-black px-1 py-0.5 rounded uppercase tracking-wider whitespace-nowrap">
              {rank}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="text-[14px] font-black uppercase tracking-tighter text-white leading-none truncate">
            {fighter.name}
          </h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-bold text-zinc-500 tracking-widest whitespace-nowrap">
              {recordString(fighter)}
            </span>
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap">
              {weightClassName(fighter.weight_class)}
            </span>
          </div>
          {nextBout && (
            <span className="inline-block text-[10px] font-black text-blue-400 bg-blue-900/20 border border-blue-800/40 px-1.5 py-0.5 rounded uppercase tracking-wider mt-1 truncate max-w-full">
              {formatEventDate(nextBout.event_date)}
              {nextBout.opponent_name ? ` vs ${lastName(nextBout.opponent_name)}` : ''}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onAdd}
        disabled={disabled}
        aria-label={`Bid to add ${fighter.name}`}
        className="bg-emerald-600 border border-emerald-500 text-white rounded-lg p-2 active:scale-95 transition-transform flex-shrink-0 ml-2 min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-30 disabled:active:scale-100 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}

export function FreeAgentCardSkeleton() {
  return (
    <div className="bg-[#050507] border-2 border-zinc-800 rounded-xl p-3 flex items-center justify-between animate-pulse">
      <div className="flex items-center space-x-3">
        <div className="w-11 h-11 rounded-full bg-zinc-800 flex-shrink-0" />
        <div className="flex flex-col gap-2">
          <div className="h-4 bg-zinc-800 rounded w-32" />
          <div className="h-3 bg-zinc-800 rounded w-16" />
        </div>
      </div>
      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex-shrink-0" />
    </div>
  );
}
