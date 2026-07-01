'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Fighter, FighterScore, BoutWithFighters, Event } from '@/lib/types';
import SlideUpModal from './SlideUpModal';

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

export default function FighterDetailModal({ fighterId, isOpen, onClose }: FighterDetailModalProps) {
  const [fighter, setFighter] = useState<Fighter | null>(null);
  const [bouts, setBouts] = useState<HistoricalBout[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!fighterId || !isOpen) return;
    setLoading(true);

    async function load() {
      // Fetch fighter
      const { data: f } = await supabase
        .from('fighters')
        .select('*')
        .eq('id', fighterId)
        .single();

      // Fetch bouts involving this fighter
      const { data: boutsA } = await supabase
        .from('bouts')
        .select('*, fighter_a:fighters!bouts_fighter_a_id_fkey(*), fighter_b:fighters!bouts_fighter_b_id_fkey(*), event:events(*)')
        .eq('fighter_a_id', fighterId);

      const { data: boutsB } = await supabase
        .from('bouts')
        .select('*, fighter_a:fighters!bouts_fighter_a_id_fkey(*), fighter_b:fighters!bouts_fighter_b_id_fkey(*), event:events(*)')
        .eq('fighter_b_id', fighterId);

      const allBouts = [...(boutsA ?? []), ...(boutsB ?? [])];

      const boutIds = allBouts.map((b) => b.id);
      let scoresMap: Record<string, FighterScore> = {};
      if (boutIds.length > 0) {
        const { data: scores } = await supabase
          .from('scores')
          .select('*')
          .eq('fighter_id', fighterId)
          .in('bout_id', boutIds);
        (scores ?? []).forEach((s: FighterScore) => {
          scoresMap[s.bout_id] = s;
        });
      }

      const now = new Date();
      const enriched: HistoricalBout[] = allBouts.map((b) => {
        const eventStart = b.event ? new Date(b.event.event_date) : null;
        return {
          ...b,
          score: scoresMap[b.id],
          is_locked: !!eventStart && eventStart <= now,
        };
      });

      // Sort by event date desc
      enriched.sort((a, b) => {
        const aDate = a.event ? new Date(a.event.event_date).getTime() : 0;
        const bDate = b.event ? new Date(b.event.event_date).getTime() : 0;
        return bDate - aDate;
      });

      setFighter(f ?? null);
      setBouts(enriched);
      setLoading(false);
    }

    load();
  }, [fighterId, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const rankLabel = fighter?.official_rank === 0 ? 'C' : fighter?.official_rank ? `#${fighter.official_rank}` : null;

  return (
    <SlideUpModal isOpen={isOpen} onClose={onClose}>
      {loading || !fighter ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
        </div>
      ) : (
        <div className="px-5 pb-8">
          {/* Weight class hanging tag */}
          <div className="flex justify-center -mt-2 mb-6">
            <div className="bg-zinc-900 border-x border-b border-zinc-700 px-5 py-1.5 rounded-b-lg text-[10px] font-black uppercase tracking-widest text-zinc-300 shadow-md">
              {fighter.weight_class}
            </div>
          </div>

          {/* Lock indicator (top right) — only when a bout is actually locked */}
          {bouts.some((b) => b.is_locked && b.status !== 'completed') && (
            <div className="absolute top-5 right-5">
              <LockIcon />
            </div>
          )}

          {/* Header */}
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
              <div className="relative w-20 h-20 rounded-full bg-zinc-900 border-[4px] border-zinc-700 shadow-inner overflow-visible">
                {fighter.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fighter.image_url} alt={fighter.name} className="w-full h-full rounded-full object-cover" />
                )}
                {rankLabel && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black border-2 border-zinc-700 text-white text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    {rankLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="w-[30%] text-right">
              <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block mb-0.5">Record</span>
              <span className="text-base font-mono font-black text-white block tracking-tighter tabular-nums">
                {fighter.wins}-{fighter.losses}-{fighter.draws}
              </span>
            </div>
          </div>

          {/* Fight Timeline */}
          <div className="mt-5 space-y-3">
            {bouts.length === 0 && (
              <p className="text-zinc-600 text-[12px] font-black uppercase tracking-widest text-center py-4">
                No scheduled fights
              </p>
            )}
            {bouts.map((bout) => {
              const isWin = bout.winner_id === fighterId;
              const isLoss = bout.winner_id !== null && bout.winner_id !== fighterId;
              const isCompleted = bout.status === 'completed';
              const isUpcoming = bout.status === 'scheduled';
              const isLive = bout.status === 'live';
              const opponent = bout.fighter_a_id === fighterId ? bout.fighter_b : bout.fighter_a;
              const score = bout.score;

              return (
                <div key={bout.id} className="bg-[#030303] border-2 border-zinc-800 rounded-xl p-3">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-900 border-2 border-zinc-700 shadow-sm flex-shrink-0 overflow-hidden">
                        {opponent?.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={opponent.image_url} alt={opponent.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div>
                        <span className="text-[13px] font-black text-white uppercase tracking-tighter">
                          vs {opponent?.name ?? 'TBD'}
                        </span>
                        <span className="text-[9px] font-black text-zinc-500 block mt-0.5 tracking-widest uppercase">
                          {bout.event?.title} • {bout.event ? new Date(bout.event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : ''}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-2">
                      {isCompleted && score && (
                        <>
                          <span className="text-sm font-mono font-black text-emerald-400 tabular-nums">+{score.points} PTS</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase block mt-1 tracking-widest text-center ${isWin ? 'bg-emerald-500 text-black' : isLoss ? 'bg-rose-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                            {isWin ? `WIN ${bout.method_of_victory ?? ''} R${bout.round_ended ?? ''}` : isLoss ? `LOSS ${bout.method_of_victory ?? ''} R${bout.round_ended ?? ''}` : 'DRAW'}
                          </span>
                        </>
                      )}
                      {isLive && (
                        <span className="text-[9px] bg-purple-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-widest animate-pulse">
                          LIVE R{bout.current_round}
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="text-[9px] bg-blue-900/40 border border-blue-800/50 text-blue-400 font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
                          UPCOMING
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score breakdown for completed fights */}
                  {isCompleted && score && (
                    <div className="flex flex-wrap gap-1.5 mt-2 border-t border-zinc-800 pt-2">
                      {(score.breakdown?.base_win_points ?? 0) > 0 && (
                        <span className="text-[9px] bg-zinc-900 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded uppercase font-black tracking-tight">
                          Win +{score.breakdown.base_win_points}
                        </span>
                      )}
                      {(score.breakdown?.finish_bonus ?? 0) > 0 && (
                        <span className="text-[9px] bg-zinc-900 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded uppercase font-black tracking-tight">
                          Finish +{score.breakdown.finish_bonus}
                        </span>
                      )}
                      {(score.breakdown?.rank_bonus ?? 0) > 0 && (
                        <span className="text-[9px] bg-zinc-900 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded uppercase font-black tracking-tight">
                          Ranked +{score.breakdown.rank_bonus}
                        </span>
                      )}
                      {(score.breakdown?.performance_bonus ?? 0) > 0 && (
                        <span className="text-[9px] bg-zinc-900 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded uppercase font-black tracking-tight">
                          POTN +{score.breakdown.performance_bonus}
                        </span>
                      )}
                      {(score.breakdown?.title_fight_bonus ?? 0) > 0 && (
                        <span className="text-[9px] bg-zinc-900 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded uppercase font-black tracking-tight">
                          Title +{score.breakdown.title_fight_bonus}
                        </span>
                      )}
                      {(score.breakdown?.main_event_bonus ?? 0) > 0 && (
                        <span className="text-[9px] bg-zinc-900 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded uppercase font-black tracking-tight">
                          Main +{score.breakdown.main_event_bonus}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Potential bonuses for upcoming */}
                  {isUpcoming && (
                    <div className="flex flex-wrap gap-1.5 mt-2 border-t border-zinc-800 pt-2">
                      {bout.is_main_event && (
                        <span className="text-[9px] bg-zinc-900 text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded uppercase font-black tracking-tight">
                          Main +25
                        </span>
                      )}
                      {bout.is_title_fight && (
                        <span className="text-[9px] bg-zinc-900 text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded uppercase font-black tracking-tight">
                          Title +25
                        </span>
                      )}
                      {fighter.official_rank !== null && fighter.official_rank <= 15 && (
                        <span className="text-[9px] bg-zinc-900 text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded uppercase font-black tracking-tight">
                          Ranked +50
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
