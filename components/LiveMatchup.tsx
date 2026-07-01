'use client';

import { BoutWithFighters } from '@/lib/types';

interface LiveMatchupProps {
  bout: BoutWithFighters;
  rosteredCount?: number;
  currentManagerFighterIds?: string[];
  onClick: () => void;
}

function rankLabel(rank: number | null) {
  if (rank === null) return null;
  if (rank === 0) return 'C';
  return `#${rank}`;
}

export default function LiveMatchup({ bout, rosteredCount = 0, currentManagerFighterIds = [], onClick }: LiveMatchupProps) {
  const { fighter_a, fighter_b } = bout;
  const isLive = bout.status === 'live';
  const isCompleted = bout.status === 'completed';

  const aRank = rankLabel(fighter_a.official_rank);
  const bRank = rankLabel(fighter_b.official_rank);

  const aIsOwned = currentManagerFighterIds.includes(fighter_a.id);
  const bIsOwned = currentManagerFighterIds.includes(fighter_b.id);

  // For completed bouts
  const aIsWinner = bout.winner_id === fighter_a.id;
  const bIsWinner = bout.winner_id === fighter_b.id;

  if (isLive) {
    return (
      <button
        onClick={onClick}
        className="w-full bg-[#120a1f] border-2 border-purple-600/50 rounded-xl p-3 shadow-[0_0_20px_rgba(168,85,247,0.1)] relative overflow-hidden active:scale-[0.98] transition-transform text-left"
      >
        <div className="flex justify-between items-center mb-5 relative z-10">
          <h4 className="text-[11px] font-black uppercase tracking-widest text-purple-300 flex items-center">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse mr-2 shadow-[0_0_5px_rgba(168,85,247,0.8)]" />
            LIVE • {bout.event?.title ?? 'UFC Event'}
          </h4>
          {rosteredCount > 0 && (
            <div className="border-2 border-purple-500/40 bg-zinc-950 px-2 py-0.5 text-[9px] font-black text-purple-300 tracking-widest rounded">
              {rosteredCount} ROSTERED
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-1 relative z-10">
          <div className="flex flex-col items-center w-[38%]">
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
              {fighter_a.name.split(' ').pop()}
            </span>
            {aIsOwned && (
              <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest mt-0.5">YOU</span>
            )}
          </div>

          <div className="flex flex-col items-center justify-center w-[24%]">
            <span className="text-2xl font-black italic text-zinc-500/80 mb-1 leading-none drop-shadow-md">VS</span>
            <div className="bg-purple-600 text-white text-[11px] font-black px-3 py-1 rounded shadow-[0_0_10px_rgba(168,85,247,0.6)] uppercase tracking-widest animate-pulse border border-purple-400">
              R{bout.current_round ?? '?'}
            </div>
          </div>

          <div className="flex flex-col items-center w-[38%]">
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
              {fighter_b.name.split(' ').pop()}
            </span>
            {bIsOwned && (
              <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest mt-0.5">YOU</span>
            )}
          </div>
        </div>
      </button>
    );
  }

  if (isCompleted) {
    return (
      <button
        onClick={onClick}
        className="w-full bg-[#050507] border-2 border-zinc-800 rounded-xl p-3 active:scale-[0.98] transition-transform text-left"
      >
        <div className="flex items-center justify-between px-1">
          <div className="flex flex-col items-center w-[38%]">
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
            </div>
            <span className={`text-[12px] font-black uppercase tracking-tighter truncate w-full text-center mt-2 ${aIsWinner ? 'text-white' : 'text-zinc-500'}`}>
              {fighter_a.name.split(' ').pop()}
            </span>
            {aIsOwned && <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">YOU</span>}
          </div>

          <div className="flex flex-col items-center justify-center w-[24%]">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 text-center leading-tight">
              {bout.method_of_victory ?? 'DEC'}<br />R{bout.round_ended ?? '?'}
            </span>
          </div>

          <div className="flex flex-col items-center w-[38%]">
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
            </div>
            <span className={`text-[12px] font-black uppercase tracking-tighter truncate w-full text-center mt-2 ${bIsWinner ? 'text-white' : 'text-zinc-500'}`}>
              {fighter_b.name.split(' ').pop()}
            </span>
            {bIsOwned && <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">YOU</span>}
          </div>
        </div>
      </button>
    );
  }

  // Upcoming / scheduled
  return (
    <button
      onClick={onClick}
      className="w-full bg-[#050507] border-2 border-zinc-800 rounded-xl p-3 active:scale-[0.98] transition-transform text-left"
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col items-center w-[38%]">
          <div className={`relative w-12 h-12 rounded-full bg-zinc-900 border-[3px] mb-1 ${aIsOwned ? 'border-blue-500' : 'border-zinc-700'}`}>
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
            {fighter_a.name.split(' ').pop()}
          </span>
          {aIsOwned && <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-0.5">YOU</span>}
        </div>

        <div className="flex flex-col items-center justify-center w-[24%]">
          <span className="text-xl font-black italic text-zinc-600 leading-none">VS</span>
        </div>

        <div className="flex flex-col items-center w-[38%]">
          <div className={`relative w-12 h-12 rounded-full bg-zinc-900 border-[3px] mb-1 ${bIsOwned ? 'border-blue-500' : 'border-zinc-700'}`}>
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
            {fighter_b.name.split(' ').pop()}
          </span>
          {bIsOwned && <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-0.5">YOU</span>}
        </div>
      </div>
    </button>
  );
}
