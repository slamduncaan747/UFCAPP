'use client';

import { BoutWithFighters, OwnershipMap, Fighter } from '@/lib/types';
import { ownerFor } from '@/lib/ownership';

interface LiveMatchupProps {
  bout: BoutWithFighters;
  ownership?: OwnershipMap;
  onClick: () => void;
}

function rankLabel(rank: number | null) {
  if (rank === null) return null;
  if (rank === 0) return 'C';
  return `#${rank}`;
}

type Tone = 'live' | 'upcoming' | 'completed';

/** Small owner tag shown under a fighter so you always know who holds them. */
function OwnerTag({ owner, tone }: { owner?: { team_name: string; is_mine: boolean }; tone: Tone }) {
  if (!owner) {
    return <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mt-1">Free Agent</span>;
  }
  if (owner.is_mine) {
    const color =
      tone === 'live' ? 'bg-purple-500 text-black'
      : tone === 'upcoming' ? 'bg-blue-500 text-black'
      : 'bg-zinc-200 text-black';
    return (
      <span className={`text-[8px] font-black uppercase tracking-widest mt-1 px-1.5 py-0.5 rounded ${color}`}>
        You
      </span>
    );
  }
  return (
    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1 truncate max-w-full px-1">
      {owner.team_name}
    </span>
  );
}

export default function LiveMatchup({ bout, ownership = {}, onClick }: LiveMatchupProps) {
  const { fighter_a, fighter_b } = bout;
  const isLive = bout.status === 'live';
  const isCompleted = bout.status === 'completed';

  const aRank = rankLabel(fighter_a.official_rank);
  const bRank = rankLabel(fighter_b.official_rank);

  const aOwner = ownerFor(ownership, fighter_a);
  const bOwner = ownerFor(ownership, fighter_b);
  const rosteredCount = [aOwner, bOwner].filter(Boolean).length;

  // For completed bouts
  const aIsWinner = bout.winner_id === fighter_a.id;
  const bIsWinner = bout.winner_id === fighter_b.id;

  const lastName = (f: Fighter) => f.name.split(' ').pop();

  if (isLive) {
    return (
      <button
        onClick={onClick}
        className="w-full bg-[#120a1f] border-2 border-purple-600/50 rounded-xl p-3 shadow-[0_0_20px_rgba(168,85,247,0.1)] relative overflow-hidden hover:border-purple-500/70 active:scale-[0.98] transition-all duration-150 text-left"
      >
        <div className="flex justify-between items-center mb-5 relative z-10">
          <h4 className="text-[11px] font-black uppercase tracking-widest text-purple-300 flex items-center min-w-0">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse mr-2 shadow-[0_0_5px_rgba(168,85,247,0.8)] flex-shrink-0" />
            <span className="truncate">LIVE • {bout.event?.title ?? 'UFC Event'}</span>
          </h4>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {bout.is_title_fight && (
              <span className="border border-amber-700/50 bg-amber-900/20 px-1.5 py-0.5 text-[8px] font-black text-amber-400 tracking-widest rounded uppercase">
                Title
              </span>
            )}
            {rosteredCount > 0 && (
              <span className="border border-purple-500/40 bg-zinc-950 px-2 py-0.5 text-[9px] font-black text-purple-300 tracking-widest rounded">
                {rosteredCount} ROSTERED
              </span>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between px-1 relative z-10">
          <div className="flex flex-col items-center w-[38%] min-w-0">
            <div className="relative w-14 h-14 rounded-full bg-zinc-900 border-[3px] border-purple-500 mb-1 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              {fighter_a.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fighter_a.image_url} alt={fighter_a.name} className="w-full h-full rounded-full object-cover" />
              )}
              {aRank && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                  {aRank}
                </span>
              )}
            </div>
            <span className="text-[13px] font-black uppercase tracking-tighter text-white truncate w-full text-center mt-2">
              {lastName(fighter_a)}
            </span>
            <OwnerTag owner={aOwner} tone="live" />
          </div>

          <div className="flex flex-col items-center justify-center w-[24%] pt-3">
            <span className="text-2xl font-black italic text-zinc-500/80 mb-1 leading-none drop-shadow-md">VS</span>
            <div className="bg-purple-600 text-white text-[11px] font-black px-3 py-1 rounded shadow-[0_0_10px_rgba(168,85,247,0.6)] uppercase tracking-widest animate-pulse border border-purple-400">
              R{bout.current_round ?? '?'}
            </div>
          </div>

          <div className="flex flex-col items-center w-[38%] min-w-0">
            <div className="relative w-14 h-14 rounded-full bg-zinc-900 border-[3px] border-zinc-700 mb-1">
              {fighter_b.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fighter_b.image_url} alt={fighter_b.name} className="w-full h-full rounded-full object-cover" />
              )}
              {bRank && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                  {bRank}
                </span>
              )}
            </div>
            <span className="text-[13px] font-black uppercase tracking-tighter text-white truncate w-full text-center mt-2">
              {lastName(fighter_b)}
            </span>
            <OwnerTag owner={bOwner} tone="live" />
          </div>
        </div>
      </button>
    );
  }

  if (isCompleted) {
    return (
      <button
        onClick={onClick}
        className="w-full bg-[#050507] border-2 border-zinc-800 rounded-xl p-3 hover:border-zinc-700 active:scale-[0.98] active:brightness-110 transition-all duration-150 text-left"
      >
        <div className="flex items-start justify-between px-1">
          <div className="flex flex-col items-center w-[38%] min-w-0">
            <div className={`relative w-12 h-12 rounded-full bg-zinc-900 border-[3px] mb-1 ${aIsWinner ? 'border-emerald-500' : 'border-zinc-700'}`}>
              {fighter_a.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fighter_a.image_url} alt={fighter_a.name} className="w-full h-full rounded-full object-cover" />
              )}
              {aRank && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                  {aRank}
                </span>
              )}
              {aIsWinner && (
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-black text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-wider shadow">W</span>
              )}
            </div>
            <span className={`text-[12px] font-black uppercase tracking-tighter truncate w-full text-center mt-2 ${aIsWinner ? 'text-white' : 'text-zinc-500'}`}>
              {lastName(fighter_a)}
            </span>
            <OwnerTag owner={aOwner} tone="completed" />
          </div>

          <div className="flex flex-col items-center justify-center w-[24%] pt-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 text-center leading-tight">
              {bout.method_of_victory ?? 'DEC'}
            </span>
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mt-0.5">
              R{bout.round_ended ?? '?'}{bout.time_ended ? ` ${bout.time_ended}` : ''}
            </span>
          </div>

          <div className="flex flex-col items-center w-[38%] min-w-0">
            <div className={`relative w-12 h-12 rounded-full bg-zinc-900 border-[3px] mb-1 ${bIsWinner ? 'border-emerald-500' : 'border-zinc-700'}`}>
              {fighter_b.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fighter_b.image_url} alt={fighter_b.name} className="w-full h-full rounded-full object-cover" />
              )}
              {bRank && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                  {bRank}
                </span>
              )}
              {bIsWinner && (
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-black text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-wider shadow">W</span>
              )}
            </div>
            <span className={`text-[12px] font-black uppercase tracking-tighter truncate w-full text-center mt-2 ${bIsWinner ? 'text-white' : 'text-zinc-500'}`}>
              {lastName(fighter_b)}
            </span>
            <OwnerTag owner={bOwner} tone="completed" />
          </div>
        </div>
      </button>
    );
  }

  // Upcoming / scheduled
  return (
    <button
      onClick={onClick}
      className="w-full bg-[#050507] border-2 border-zinc-800 rounded-xl p-3 hover:border-zinc-700 active:scale-[0.98] active:brightness-110 transition-all duration-150 text-left"
    >
      {(bout.is_main_event || bout.is_title_fight) && (
        <div className="flex justify-center gap-1.5 mb-2">
          {bout.is_main_event && (
            <span className="text-[8px] font-black bg-zinc-800 border border-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded uppercase tracking-widest">Main Event</span>
          )}
          {bout.is_title_fight && (
            <span className="text-[8px] font-black bg-amber-900/30 border border-amber-800/50 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-widest">Title Fight</span>
          )}
        </div>
      )}
      <div className="flex items-start justify-between px-1">
        <div className="flex flex-col items-center w-[38%] min-w-0">
          <div className={`relative w-12 h-12 rounded-full bg-zinc-900 border-[3px] mb-1 ${aOwner?.is_mine ? 'border-blue-500' : aOwner ? 'border-zinc-500' : 'border-zinc-700'}`}>
            {fighter_a.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fighter_a.image_url} alt={fighter_a.name} className="w-full h-full rounded-full object-cover" />
            )}
            {aRank && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                {aRank}
              </span>
            )}
          </div>
          <span className="text-[12px] font-black uppercase tracking-tighter text-white truncate w-full text-center mt-2">
            {lastName(fighter_a)}
          </span>
          <OwnerTag owner={aOwner} tone="upcoming" />
        </div>

        <div className="flex flex-col items-center justify-center w-[24%] pt-2">
          <span className="text-xl font-black italic text-zinc-600 leading-none">VS</span>
        </div>

        <div className="flex flex-col items-center w-[38%] min-w-0">
          <div className={`relative w-12 h-12 rounded-full bg-zinc-900 border-[3px] mb-1 ${bOwner?.is_mine ? 'border-blue-500' : bOwner ? 'border-zinc-500' : 'border-zinc-700'}`}>
            {fighter_b.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fighter_b.image_url} alt={fighter_b.name} className="w-full h-full rounded-full object-cover" />
            )}
            {bRank && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                {bRank}
              </span>
            )}
          </div>
          <span className="text-[12px] font-black uppercase tracking-tighter text-white truncate w-full text-center mt-2">
            {lastName(fighter_b)}
          </span>
          <OwnerTag owner={bOwner} tone="upcoming" />
        </div>
      </div>
    </button>
  );
}
