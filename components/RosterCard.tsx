'use client';

import { RosterSlot } from '@/lib/types';

interface RosterCardProps {
  slot: RosterSlot;
  onClick: () => void;
}

function LockIcon() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 text-zinc-500 rounded p-0.5 flex items-center justify-center">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
  );
}

function formatEventBadge(slot: RosterSlot): { label: string; color: string } | null {
  if (!slot.next_bout) return null;
  const event = slot.next_bout.event;
  if (!event) return null;

  const now = new Date();
  const start = new Date(event.event_date);
  const diffMs = start.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (event.status === 'live') {
    return { label: `LIVE • ${event.title}`, color: 'bg-purple-900/20 border-purple-800/50 text-purple-400' };
  }
  if (event.status === 'completed') {
    return { label: `COMPLETED • ${event.title}`, color: 'bg-zinc-900/60 border-zinc-700/50 text-zinc-500' };
  }
  const dayLabel = diffDays <= 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `In ${diffDays} Days`;
  return { label: `${event.title} • ${dayLabel}`, color: 'bg-blue-900/20 border-blue-800/50 text-blue-400' };
}

function rankLabel(rank: number | null) {
  if (rank === null) return null;
  if (rank === 0) return 'C';
  return `#${rank}`;
}

export default function RosterCard({ slot, onClick }: RosterCardProps) {
  const fighter = slot.fighter;
  const badge = formatEventBadge(slot);
  const rank = rankLabel(fighter.official_rank);

  return (
    <button
      onClick={onClick}
      className="relative w-full bg-[#050507] border-2 border-zinc-800 rounded-2xl p-4 flex items-center shadow-lg hover:border-zinc-700 active:scale-[0.98] active:brightness-110 transition-all duration-150 text-left"
    >
      {/* Hanging weight-class tag */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-zinc-900 border-x border-b border-zinc-700 px-4 py-1 rounded-b text-[9px] font-black uppercase tracking-widest text-zinc-300 whitespace-nowrap">
        {slot.slot_type}
      </div>

      <div className="flex items-center space-x-4 mt-3 flex-1 min-w-0">
        {/* Avatar */}
        <div className="relative w-14 h-14 rounded-full bg-zinc-900 border-[3px] border-zinc-700 shadow-inner flex-shrink-0 overflow-visible">
          {fighter.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fighter.image_url} alt={fighter.name} className="w-full h-full rounded-full object-cover" />
          )}
          {rank && (
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap">
              {rank}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col min-w-0">
          <h3 className="font-black tracking-tighter text-[15px] text-white uppercase leading-none mt-1 truncate">
            {fighter.name}
          </h3>
          {fighter.nickname && (
            <span className="text-[10px] font-black italic text-zinc-500 uppercase mt-0.5 truncate">
              &quot;{fighter.nickname}&quot;
            </span>
          )}
          <div className="mt-1.5 flex items-center space-x-1.5">
            {badge && (
              <span className={`border text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest w-max ${badge.color}`}>
                {badge.label}
              </span>
            )}
            {slot.is_locked && <LockIcon />}
          </div>
        </div>
      </div>

      {/* Points block */}
      <div className="mt-3 border-l-2 border-zinc-800 pl-4 py-1 text-right flex-shrink-0 ml-2">
        <span className="block text-[28px] font-black text-zinc-600 tracking-tighter leading-none font-mono tabular-nums">
          —
        </span>
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">PTS</span>
      </div>
    </button>
  );
}

// Variant that accepts a points value explicitly (used in Roster page)
interface RosterCardWithPointsProps extends RosterCardProps {
  points: number;
}

export function RosterCardWithPoints({ slot, onClick, points }: RosterCardWithPointsProps) {
  const fighter = slot.fighter;
  const badge = formatEventBadge(slot);
  const rank = rankLabel(fighter.official_rank);

  return (
    <button
      onClick={onClick}
      className="relative w-full bg-[#050507] border-2 border-zinc-800 rounded-2xl p-4 flex items-center shadow-lg hover:border-zinc-700 active:scale-[0.98] active:brightness-110 transition-all duration-150 text-left"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-zinc-900 border-x border-b border-zinc-700 px-4 py-1 rounded-b text-[9px] font-black uppercase tracking-widest text-zinc-300 whitespace-nowrap">
        {slot.slot_type}
      </div>

      <div className="flex items-center space-x-4 mt-3 flex-1 min-w-0">
        <div className="relative w-14 h-14 rounded-full bg-zinc-900 border-[3px] border-zinc-700 shadow-inner flex-shrink-0 overflow-visible">
          {fighter.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fighter.image_url} alt={fighter.name} className="w-full h-full rounded-full object-cover" />
          )}
          {rank && (
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap">
              {rank}
            </span>
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <h3 className="font-black tracking-tighter text-[15px] text-white uppercase leading-none mt-1 truncate">
            {fighter.name}
          </h3>
          {fighter.nickname && (
            <span className="text-[10px] font-black italic text-zinc-500 uppercase mt-0.5 truncate">
              &quot;{fighter.nickname}&quot;
            </span>
          )}
          <div className="mt-1.5 flex items-center space-x-1.5">
            {badge && (
              <span className={`border text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest w-max ${badge.color}`}>
                {badge.label}
              </span>
            )}
            {slot.is_locked && <LockIcon />}
          </div>
        </div>
      </div>

      <div className="mt-3 border-l-2 border-zinc-800 pl-4 py-1 text-right flex-shrink-0 ml-2">
        <span className="block text-[28px] font-black text-white tracking-tighter leading-none font-mono tabular-nums">
          {points}
        </span>
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">PTS</span>
      </div>
    </button>
  );
}
