'use client';

import { ManagerWithRoster } from '@/lib/types';

interface StandingsRowProps {
  manager: ManagerWithRoster;
  rank: number;
  isCurrentUser: boolean;
  onClick: () => void;
}

export default function StandingsRow({ manager, rank, isCurrentUser, onClick }: StandingsRowProps) {
  const completed = manager.completed_fighters ?? 0;
  const rankColor =
    rank === 1 ? 'text-amber-400'
    : rank === 2 ? 'text-zinc-300'
    : rank === 3 ? 'text-orange-700'
    : 'text-zinc-600';

  return (
    <button
      onClick={onClick}
      className={`w-full bg-[#050507] border-2 rounded-xl p-3 flex items-center justify-between shadow-sm hover:border-zinc-600 active:scale-[0.98] active:brightness-110 transition-all duration-150 text-left ${
        isCurrentUser ? 'border-zinc-600' : 'border-zinc-800'
      }`}
    >
      <div className="flex items-center space-x-5">
        <span className={`text-[28px] font-black italic w-6 text-center leading-none tabular-nums ${rankColor}`}>
          {rank}
        </span>
        <div>
          <h3 className="text-[15px] font-black uppercase text-white tracking-tighter leading-none mb-1.5 flex items-center gap-2">
            {manager.display_name}
            {isCurrentUser && (
              <span className="text-[8px] font-black bg-zinc-800 border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded uppercase tracking-widest">
                YOU
              </span>
            )}
          </h3>
          <div className="text-[10px] text-zinc-400 flex items-center font-bold uppercase tracking-widest">
            Fighters:&nbsp;
            <span className="text-white ml-1.5 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
              {completed}/9
            </span>
          </div>
        </div>
      </div>

      <div className="border-l-2 border-zinc-800 pl-4 py-1 text-right flex-shrink-0">
        <span className="block text-[22px] font-black text-white tracking-tighter leading-none font-mono tabular-nums">
          {manager.total_points.toFixed(0)}
        </span>
        <span className="text-[8px] text-zinc-600 uppercase tracking-widest font-black">PTS</span>
      </div>
    </button>
  );
}
