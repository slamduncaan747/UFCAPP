'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Fighter, FighterScore, BoutWithFighters, Event } from '@/lib/types';
import {
  BOUT_WITH_FIGHTERS_SELECT,
  beatRankedOpponent,
  isEventLocked,
  methodLabel,
  rankLabel,
  recordString,
  weightClassName,
} from '@/lib/helpers';
import SlideUpModal from './SlideUpModal';
import { FighterAvatar } from '@/components/FighterAvatar';

interface FighterDetailModalProps {
  fighterId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface HistoricalBout extends BoutWithFighters {
  event: Event;
  score?: FighterScore;
  is_locked: boolean;
}

const HISTORY_LIMIT = 8;

function LockIcon() {
  return (
    <div
      className="w-8 h-8 flex items-center justify-center bg-zinc-900 rounded-lg border-2 border-zinc-800"
      role="img"
      aria-label="Locked — this fighter has a bout in progress"
      title="Locked — bout in progress"
    >
      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
  );
}

const BREAKDOWN_LABELS: Array<[keyof FighterScore['breakdown'] & string, string]> = [
  ['base_win_points', 'Win'],
  ['finish_bonus', 'Finish'],
  ['rank_bonus', 'Ranked'],
  ['performance_bonus', 'Bonus'],
  ['title_fight_bonus', 'Title'],
  ['main_event_bonus', 'Main'],
];

export default function FighterDetailModal({ fighterId, isOpen, onClose }: FighterDetailModalProps) {
  const [fighter, setFighter] = useState<Fighter | null>(null);
  const [bouts, setBouts] = useState<HistoricalBout[]>([]);
  // Loading is derived: done once the fetched fighter matches the requested id.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const loading = loadedId !== fighterId;
  const supabase = createClient();

  useEffect(() => {
    if (!fighterId || !isOpen) return;

    async function load() {
      const [{ data: f }, { data: allBouts }] = await Promise.all([
        supabase.from('fighters').select('*').eq('id', fighterId).single(),
        supabase
          .from('bouts')
          .select(`${BOUT_WITH_FIGHTERS_SELECT}, event:events(*)`)
          .or(`fighter_a_id.eq.${fighterId},fighter_b_id.eq.${fighterId}`)
          .neq('status', 'cancelled'),
      ]);

      const rows = ((allBouts as unknown as HistoricalBout[]) ?? []).filter((b) => b.event);
      rows.sort(
        (a, b) => new Date(b.event.event_date).getTime() - new Date(a.event.event_date).getTime()
      );
      // Upcoming first is handled by date sort (future dates are largest);
      // cap the history so the modal doesn't render a 30-fight career.
      const visible = rows.slice(0, HISTORY_LIMIT);

      const boutIds = visible.map((b) => b.id);
      const scoresMap: Record<string, FighterScore> = {};
      if (boutIds.length > 0) {
        const { data: scores } = await supabase
          .from('scores')
          .select('*')
          .eq('fighter_id', fighterId)
          .in('bout_id', boutIds);
        ((scores as FighterScore[]) ?? []).forEach((s) => {
          scoresMap[s.bout_id] = s;
        });
      }

      const now = new Date();
      const enriched = visible.map((b) => ({
        ...b,
        score: scoresMap[b.id],
        is_locked: b.status === 'scheduled' && isEventLocked(b.event, now),
      }));

      setFighter((f as Fighter) ?? null);
      setBouts(enriched);
      setLoadedId(fighterId!);
    }

    load();
  }, [fighterId, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const rank = rankLabel(fighter);

  return (
    <SlideUpModal isOpen={isOpen} onClose={onClose}>
      {loading || !fighter ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
        </div>
      ) : (
        <div className="px-5 pb-8">
          <div className="flex justify-center -mt-2 mb-6">
            <div className="bg-zinc-900 border-x border-b border-zinc-700 px-5 py-1.5 rounded-b-lg text-[10px] font-black uppercase tracking-widest text-zinc-300 shadow-md">
              {weightClassName(fighter.weight_class)}
            </div>
          </div>

          {bouts.some((b) => b.is_locked) && (
            <div className="absolute top-5 right-5">
              <LockIcon />
            </div>
          )}

          <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-5">
            <div className="w-[30%] text-left">
              <h3 className="text-xl font-black uppercase leading-none tracking-tighter">
                {fighter.name.split(' ')[0]}
                <br />
                {fighter.name.split(' ').slice(1).join(' ')}
              </h3>
              {fighter.nickname && (
                <span className="text-[12px] font-black italic text-zinc-500 uppercase mt-1.5 block">
                  &quot;{fighter.nickname}&quot;
                </span>
              )}
            </div>

            <div className="w-[40%] flex justify-center relative">
              <div className="relative">
                <FighterAvatar fighter={fighter} size={80} className="border-[4px] border-zinc-700 shadow-inner" />
                {rank && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black border-2 border-zinc-700 text-white text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    {rank}
                  </span>
                )}
              </div>
            </div>

            <div className="w-[30%] text-right">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-0.5">Record</span>
              <span className="text-base font-mono font-black text-white block tracking-tighter tabular-nums">
                {recordString(fighter)}
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {bouts.length === 0 && (
              <p className="text-zinc-600 text-[12px] font-black uppercase tracking-widest text-center py-4">
                No fights on record
              </p>
            )}
            {bouts.map((bout) => {
              const isWin = bout.winner_id === fighterId;
              const isLoss = bout.winner_id !== null && bout.winner_id !== fighterId;
              const isCompleted = bout.status === 'completed';
              const isLive = bout.is_locked;
              const isUpcoming = bout.status === 'scheduled' && !isLive;
              const opponent = bout.fighter_a_id === fighterId ? bout.fighter_b : bout.fighter_a;
              const score = bout.score;

              return (
                <div key={bout.id} className="bg-[#030303] border-2 border-zinc-800 rounded-xl p-3">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center space-x-2 min-w-0">
                      <FighterAvatar fighter={opponent ?? { name: 'TBD', photo_url: null }} size={24} className="border-[2px] border-zinc-700 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[13px] font-black text-white uppercase tracking-tighter block truncate">
                          vs {opponent?.name ?? 'TBD'}
                        </span>
                        <span className="text-[10px] font-black text-zinc-500 block mt-0.5 tracking-widest uppercase truncate">
                          {bout.event?.name} • {bout.event ? new Date(bout.event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : ''}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-2">
                      {isCompleted && (
                        <>
                          {score && (
                            <span className="text-sm font-mono font-black text-emerald-400 tabular-nums block">
                              +{score.points} PTS
                            </span>
                          )}
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase inline-block mt-1 tracking-widest text-center ${isWin ? 'bg-emerald-500 text-black' : isLoss ? 'bg-rose-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                            {isWin ? `WIN ${methodLabel(bout)}` : isLoss ? `LOSS ${methodLabel(bout)}` : methodLabel(bout)}
                          </span>
                        </>
                      )}
                      {isLive && (
                        <span className="text-[10px] bg-purple-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-widest animate-pulse">
                          LIVE
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="text-[10px] bg-blue-900/40 border border-blue-800/50 text-blue-400 font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
                          UPCOMING
                        </span>
                      )}
                    </div>
                  </div>

                  {isCompleted && score && (
                    <div className="flex flex-wrap gap-1.5 mt-2 border-t border-zinc-800 pt-2">
                      {BREAKDOWN_LABELS.map(([key, label]) =>
                        (score.breakdown?.[key] ?? 0) > 0 ? (
                          <span key={key} className="text-[10px] bg-zinc-900 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded uppercase font-black tracking-tight">
                            {label} +{score.breakdown[key]}
                          </span>
                        ) : null
                      )}
                    </div>
                  )}

                  {isUpcoming && (bout.is_main_event || bout.is_title_fight || beatRankedOpponent(bout, fighterId!)) && (
                    <div className="flex flex-wrap gap-1.5 mt-2 border-t border-zinc-800 pt-2">
                      {bout.is_main_event && (
                        <span className="text-[10px] bg-zinc-900 text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded uppercase font-black tracking-tight">
                          Main +25
                        </span>
                      )}
                      {bout.is_title_fight && (
                        <span className="text-[10px] bg-zinc-900 text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded uppercase font-black tracking-tight">
                          Title +25
                        </span>
                      )}
                      {beatRankedOpponent(bout, fighterId!) && (
                        <span className="text-[10px] bg-zinc-900 text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded uppercase font-black tracking-tight">
                          Ranked Opp +50
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SlideUpModal>
  );
}
