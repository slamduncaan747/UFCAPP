'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RosterSlot, SLOT_DISPLAY } from '@/lib/types';
import SlideUpModal from './SlideUpModal';

interface OpponentRosterModalProps {
  managerId: string | null;  // membership id
  isOpen: boolean;
  onClose: () => void;
}

export default function OpponentRosterModal({ managerId, isOpen, onClose }: OpponentRosterModalProps) {
  const [teamName, setTeamName] = useState('');
  const [slots, setSlots] = useState<RosterSlot[]>([]);
  const [pointsMap, setPointsMap] = useState<Record<string, number>>({});
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!managerId || !isOpen) return;
    setLoading(true);

    async function load() {
      const { data: membership } = await supabase
        .from('league_memberships')
        .select('team_name')
        .eq('id', managerId)
        .single();

      const { data: rostersData } = await supabase
        .from('rosters')
        .select('*, fighter:fighters(*)')
        .eq('membership_id', managerId);

      const now = new Date();
      const enriched: RosterSlot[] = await Promise.all(
        (rostersData ?? []).map(async (r) => {
          const { data: boutData } = await supabase
            .from('bouts')
            .select('*, event:events(*)')
            .or(`fighter_a_id.eq.${r.fighter_id},fighter_b_id.eq.${r.fighter_id}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const eventStart = boutData?.event?.event_date
            ? new Date(boutData.event.event_date)
            : null;

          return {
            ...r,
            slot_type: SLOT_DISPLAY[r.slot] ?? r.slot,
            next_bout: boutData ?? null,
            is_locked: !!eventStart && eventStart <= now,
          } as RosterSlot;
        })
      );

      // Fantasy points earned by each fighter for this team.
      const fighterIds = enriched.map((s) => s.fighter_id);
      const pMap: Record<string, number> = {};
      let total = 0;
      if (fighterIds.length > 0) {
        const { data: scoreRows } = await supabase
          .from('scores')
          .select('fighter_id, points')
          .eq('membership_id', managerId)
          .in('fighter_id', fighterIds);
        (scoreRows ?? []).forEach((s: { fighter_id: string; points: number }) => {
          pMap[s.fighter_id] = (pMap[s.fighter_id] ?? 0) + s.points;
          total += s.points;
        });
      }

      setTeamName(membership?.team_name ?? 'Roster');
      setSlots(enriched);
      setPointsMap(pMap);
      setTotalPoints(total);
      setLoading(false);
    }

    load();
  }, [managerId, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  function rankLabel(rank: number | null) {
    if (rank === null) return null;
    return rank === 0 ? 'C' : `#${rank}`;
  }

  return (
    <SlideUpModal isOpen={isOpen} onClose={onClose}>
      <div className="px-5 pb-8">
        <div className="flex justify-center -mt-2 mb-1">
          <div className="bg-zinc-900 border-x border-b border-zinc-700 px-5 py-1.5 rounded-b-lg text-[10px] font-black uppercase tracking-widest text-zinc-300">
            {teamName}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32 mt-4">
            <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
          </div>
        ) : (
          <>
          {/* Team summary */}
          <div className="grid grid-cols-2 gap-2 mt-5">
            <div className="bg-[#030303] border border-zinc-800 rounded-lg py-2.5 text-center">
              <span className="block text-[20px] font-black text-white tabular-nums leading-none font-mono">{totalPoints.toFixed(0)}</span>
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Total Points</span>
            </div>
            <div className="bg-[#030303] border border-zinc-800 rounded-lg py-2.5 text-center">
              <span className="block text-[20px] font-black text-white tabular-nums leading-none font-mono">{slots.length}/9</span>
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Fighters</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {slots.map((slot) => {
              const rank = rankLabel(slot.fighter.official_rank);
              const pts = pointsMap[slot.fighter_id] ?? 0;
              return (
                <div key={slot.id} className="relative bg-[#050507] border-2 border-zinc-800 rounded-2xl p-4 flex items-center">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-zinc-900 border-x border-b border-zinc-700 px-3 py-0.5 rounded-b text-[9px] font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap">
                    {slot.slot_type}
                  </div>
                  <div className="flex items-center space-x-4 mt-3 flex-1 min-w-0">
                    <div className="relative w-12 h-12 rounded-full bg-zinc-900 border-[3px] border-zinc-700 flex-shrink-0 overflow-visible">
                      {slot.fighter.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={slot.fighter.image_url} alt={slot.fighter.name} className="w-full h-full rounded-full object-cover" />
                      )}
                      {rank && (
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {rank}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-[14px] font-black uppercase tracking-tighter text-white leading-none">
                        {slot.fighter.name}
                      </h4>
                      <span className="text-[9px] font-bold text-zinc-500 tracking-widest">
                        {slot.fighter.wins}-{slot.fighter.losses}-{slot.fighter.draws}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    {slot.is_locked && (
                      <div className="bg-zinc-900 border border-zinc-800 text-zinc-500 rounded p-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    )}
                    <div className="border-l-2 border-zinc-800 pl-3 text-right">
                      <span className="block text-[20px] font-black text-white tracking-tighter leading-none font-mono tabular-nums">
                        {pts}
                      </span>
                      <span className="text-[8px] text-zinc-600 uppercase tracking-widest font-black">PTS</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>
    </SlideUpModal>
  );
}
