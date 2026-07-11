'use client';

import { RosterSlot } from '@/lib/types';
import { FighterAvatar } from '@/components/FighterAvatar';
import { isEventLocked, rankLabel } from '@/lib/helpers';

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
  const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (isEventLocked(event, now)) {
    return { label: `LIVE • ${event.name}`, color: 'bg-purple-900/20 border-purple-800/50 text-purple-400' };
  }
  const dayLabel = diffDays <= 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `In ${diffDays} Days`;
  return { label: `${event.name} • ${dayLabel}`, color: 'bg-blue-900/20 border-blue-800/50 text-blue-400' };
}

interface RosterCardWithPointsProps extends RosterCardProps {
  points?: number;
}

export function RosterCardWithPoints({ slot, onClick, points }: RosterCardWithPointsProps) {
  const fighter = slot.fighter;
  const badge = formatEventBadge(slot);
  const rank = rankLabel(fighter);

  return (
    <button
      onClick={onClick}
      className="relative w-full bg-[#050507] border-2 border-zinc-800 rounded-2xl p-4 flex items-center shadow-lg active:scale-[0.98] transition-transform text-left"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-zinc-900 border-x border-b border-zinc-700 px-4 py-1 rounded-b text-[10px] font-black uppercase tracking-widest text-zinc-300 whitespace-nowrap">
        {slot.slot_type}
      </div>

      <div className="flex items-center space-x-4 mt-3 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <FighterAvatar fighter={fighter} size={56} className="border-[3px] border-zinc-700 shadow-inner" />
          {rank && (
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 text-white text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap">
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
              <span className={`border text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest w-max truncate max-w-[180px] ${badge.color}`}>
                {badge.label}
              </span>
            )}
            {slot.is_locked && <LockIcon />}
          </div>
        </div>
      </div>

      <div className="mt-3 border-l-2 border-zinc-800 pl-4 py-1 text-right flex-shrink-0 ml-2">
        <span className={`block text-[28px] font-black tracking-tighter leading-none font-mono tabular-nums ${points === undefined ? 'text-zinc-600' : 'text-white'}`}>
          {points === undefined ? '—' : points}
        </span>
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">PTS</span>
      </div>
    </button>
  );
}

export default function RosterCard(props: RosterCardProps) {
  return <RosterCardWithPoints {...props} />;
}

export function RosterCardSkeleton() {
  return (
    <div className="relative w-full bg-[#050507] border-2 border-zinc-800 rounded-2xl p-4 flex items-center shadow-lg animate-pulse">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-24 bg-zinc-800 rounded-b" />
      <div className="w-14 h-14 rounded-full bg-zinc-800 flex-shrink-0 mt-3" />
      <div className="flex flex-col gap-2 ml-4 flex-1 mt-3">
        <div className="h-4 bg-zinc-800 rounded w-36" />
        <div className="h-3 bg-zinc-800 rounded w-20" />
      </div>
      <div className="mt-3 border-l-2 border-zinc-800 pl-4 ml-2">
        <div className="h-8 w-12 bg-zinc-800 rounded" />
      </div>
    </div>
  );
}
