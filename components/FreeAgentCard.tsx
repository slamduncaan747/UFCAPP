'use client';

import { Fighter } from '@/lib/types';

interface FreeAgentCardProps {
  fighter: Fighter;
  nextBoutDate?: string | null;
  onAdd: () => void;
  onInfo?: () => void;
  disabled?: boolean;
}

function rankLabel(rank: number | null) {
  if (rank === null) return null;
  return rank === 0 ? 'C' : `#${rank}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'TBD';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function FreeAgentCard({ fighter, nextBoutDate, onAdd, onInfo, disabled = false }: FreeAgentCardProps) {
  const rank = rankLabel(fighter.official_rank);

  return (
    <div className="bg-[#050507] border-2 border-zinc-800 rounded-xl p-3 flex items-center justify-between hover:border-zinc-700 transition-colors duration-150">
      <button
        onClick={onInfo}
        disabled={!onInfo}
        className="flex items-center space-x-3 min-w-0 flex-1 text-left active:scale-[0.98] transition-transform disabled:active:scale-100"
      >
        <div className="relative w-11 h-11 rounded-full bg-zinc-900 border-[3px] border-zinc-700 flex-shrink-0 overflow-visible">
          {fighter.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fighter.image_url} alt={fighter.name} className="w-full h-full rounded-full object-cover" />
          )}
          {rank && (
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 text-white text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-wider whitespace-nowrap">
              {rank}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="text-[14px] font-black uppercase tracking-tighter text-white leading-none truncate">
            {fighter.name}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] font-bold text-zinc-500 tracking-widest">
              {fighter.wins}-{fighter.losses}-{fighter.draws}
            </span>
            {nextBoutDate && (
              <span className="text-[8px] font-black text-blue-400 bg-blue-900/20 border border-blue-800/40 px-1.5 py-0.5 rounded uppercase tracking-wider">
                {formatDate(nextBoutDate)}
              </span>
            )}
          </div>
        </div>
      </button>

      <button
        onClick={onAdd}
        disabled={disabled}
        aria-label={`Bid to add ${fighter.name}`}
        className="bg-emerald-600 border border-emerald-500 text-white rounded-lg p-2 hover:bg-emerald-500 active:scale-90 transition-all duration-150 flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-30 disabled:active:scale-100 disabled:hover:bg-emerald-600 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
