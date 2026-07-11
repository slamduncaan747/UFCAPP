'use client';

import { BoutWithFighters, Fighter } from '@/lib/types';
import { FighterAvatar } from '@/components/FighterAvatar';
import { isEventLocked, lastName, methodLabel, rankLabel } from '@/lib/helpers';

interface LiveMatchupProps {
  bout: BoutWithFighters;
  /** fighter_id → owning team name (league-wide) */
  owners?: Record<string, string>;
  currentManagerFighterIds?: string[];
  onClick: () => void;
}

function FighterColumn({
  fighter,
  owner,
  isMine,
  isWinner,
  isLoser,
  avatarClass,
  accent,
  size = 48,
}: {
  fighter: Fighter;
  owner?: string;
  isMine: boolean;
  isWinner: boolean;
  isLoser: boolean;
  avatarClass: string;
  accent: 'purple' | 'blue' | 'zinc';
  size?: 48 | 56;
}) {
  const rank = rankLabel(fighter);
  const ownerColor = isMine
    ? accent === 'purple' ? 'text-purple-400' : 'text-blue-400'
    : 'text-zinc-500';

  return (
    <div className="flex flex-col items-center w-[38%]">
      <div className="relative mb-1">
        <FighterAvatar fighter={fighter} size={size} className={avatarClass} />
        {rank && (
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 text-white text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
            {rank}
          </span>
        )}
      </div>
      <span
        className={`text-[12px] font-black uppercase tracking-tighter truncate w-full text-center mt-2 ${
          isLoser ? 'text-zinc-500' : 'text-white'
        }`}
      >
        {lastName(fighter.name)}
        {isWinner && <span className="text-emerald-400 ml-1">✓</span>}
      </span>
      {owner ? (
        <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${ownerColor}`}>
          {isMine ? 'YOU' : owner}
        </span>
      ) : (
        <span className="text-[9px] font-black uppercase tracking-widest mt-0.5 text-zinc-700">
          FA
        </span>
      )}
    </div>
  );
}

export default function LiveMatchup({
  bout,
  owners = {},
  currentManagerFighterIds = [],
  onClick,
}: LiveMatchupProps) {
  const { fighter_a, fighter_b } = bout;
  const isCompleted = bout.status === 'completed';
  // "Live" = the event is underway and this bout has no result yet.
  const isLive = !isCompleted && !!bout.event &&
    (bout.event.status === 'in_progress' ||
      (bout.event.status === 'scheduled' && isEventLocked(bout.event)));

  const aOwner = owners[fighter_a.id];
  const bOwner = owners[fighter_b.id];
  const aIsMine = currentManagerFighterIds.includes(fighter_a.id);
  const bIsMine = currentManagerFighterIds.includes(fighter_b.id);
  const aIsWinner = bout.winner_id === fighter_a.id;
  const bIsWinner = bout.winner_id === fighter_b.id;
  const rosteredCount = [aOwner, bOwner].filter(Boolean).length;

  const tags = (
    <div className="flex gap-1.5">
      {bout.is_main_event && (
        <span className="text-[8px] font-black bg-zinc-800 border border-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded uppercase tracking-widest">
          Main Event
        </span>
      )}
      {bout.is_title_fight && (
        <span className="text-[8px] font-black bg-amber-900/30 border border-amber-800/50 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-widest">
          Title
        </span>
      )}
    </div>
  );

  if (isLive) {
    return (
      <button
        onClick={onClick}
        className="w-full bg-[#120a1f] border-2 border-purple-600/50 rounded-xl p-3 shadow-[0_0_20px_rgba(168,85,247,0.1)] relative overflow-hidden active:scale-[0.98] transition-transform text-left"
      >
        <div className="flex justify-between items-center mb-4 relative z-10">
          <h4 className="text-[11px] font-black uppercase tracking-widest text-purple-300 flex items-center">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse mr-2 shadow-[0_0_5px_rgba(168,85,247,0.8)]" />
            LIVE
          </h4>
          {rosteredCount > 0 && (
            <div className="border-2 border-purple-500/40 bg-zinc-950 px-2 py-0.5 text-[10px] font-black text-purple-300 tracking-widest rounded">
              {rosteredCount} ROSTERED
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-1 relative z-10">
          <FighterColumn
            fighter={fighter_a}
            owner={aOwner}
            isMine={aIsMine}
            isWinner={false}
            isLoser={false}
            avatarClass="border-[3px] border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
            accent="purple"
            size={56}
          />
          <div className="flex flex-col items-center justify-center w-[24%] gap-1.5">
            <span className="text-2xl font-black italic text-zinc-500/80 leading-none drop-shadow-md">VS</span>
            {tags}
          </div>
          <FighterColumn
            fighter={fighter_b}
            owner={bOwner}
            isMine={bIsMine}
            isWinner={false}
            isLoser={false}
            avatarClass="border-[3px] border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
            accent="purple"
            size={56}
          />
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
          <FighterColumn
            fighter={fighter_a}
            owner={aOwner}
            isMine={aIsMine}
            isWinner={aIsWinner}
            isLoser={!!bout.winner_id && !aIsWinner}
            avatarClass={`border-[3px] ${aIsWinner ? 'border-emerald-500' : 'border-zinc-700'}`}
            accent="zinc"
          />
          <div className="flex flex-col items-center justify-center w-[24%] gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center leading-tight">
              {methodLabel(bout)}
            </span>
            {tags}
          </div>
          <FighterColumn
            fighter={fighter_b}
            owner={bOwner}
            isMine={bIsMine}
            isWinner={bIsWinner}
            isLoser={!!bout.winner_id && !bIsWinner}
            avatarClass={`border-[3px] ${bIsWinner ? 'border-emerald-500' : 'border-zinc-700'}`}
            accent="zinc"
          />
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
        <FighterColumn
          fighter={fighter_a}
          owner={aOwner}
          isMine={aIsMine}
          isWinner={false}
          isLoser={false}
          avatarClass={`border-[3px] ${aIsMine ? 'border-blue-500' : 'border-zinc-700'}`}
          accent="blue"
        />
        <div className="flex flex-col items-center justify-center w-[24%] gap-1.5">
          <span className="text-xl font-black italic text-zinc-600 leading-none">VS</span>
          {tags}
        </div>
        <FighterColumn
          fighter={fighter_b}
          owner={bOwner}
          isMine={bIsMine}
          isWinner={false}
          isLoser={false}
          avatarClass={`border-[3px] ${bIsMine ? 'border-blue-500' : 'border-zinc-700'}`}
          accent="blue"
        />
      </div>
    </button>
  );
}
