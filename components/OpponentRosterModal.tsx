'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RosterSlot, SLOT_DISPLAY } from '@/lib/types';
import SlideUpModal from './SlideUpModal';
import { FighterAvatar } from '@/components/FighterAvatar';

interface OpponentRosterModalProps {
  managerId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function OpponentRosterModal({ managerId, isOpen, onClose }: OpponentRosterModalProps) {
  const [teamName, setTeamName] = useState('');
  const [slots, setSlots] = useState<RosterSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!managerId || !isOpen) return;
    setLoading(true);

    async function load() {
      const [{ data: membership }, { data: rostersData }] = await Promise.all([
        supabase.from('league_memberships').select('team_name').eq('id', managerId).single(),
        supabase.from('rosters').select('*, fighter:fighters(*)').eq('membership_id', managerId),
      ]);

      const fighterIds = (rostersData ?? []).map((r) => r.fighter_id);

      type BoutRow = { id: string; fighter_a_id: string; fighter_b_id: string; event?: { event_date: string; status?: string; title?: string } | null };
      let allBouts: BoutRow[] = [];
      if (fighterIds.length > 0) {
        const { data } = await supabase
          .from('bouts')
          .select('*, event:events(*)')
          .or(fighterIds.map((id) => `fighter_a_id.eq.${id},fighter_b_id.eq.${id}`).join(','))
          .order('created_at', { ascending: false });
        allBouts = (data ?? []) as BoutRow[];
      }

      // Pick most recent bout per fighter
      const boutByFighter = new Map<string, BoutRow>();
      for (const bout of allBouts) {
        for (const fid of [bout.fighter_a_id, bout.fighter_b_id]) {
          if (fighterIds.includes(fid) && !boutByFighter.has(fid)) {
            boutByFighter.set(fid, bout);
          }
        }
      }

      const now = new Date();
      const enriched: RosterSlot[] = (rostersData ?? []).map((r) => {
        const boutData = boutByFighter.get(r.fighter_id) ?? null;
        const eventStart = boutData?.event?.event_date ? new Date(boutData.event.event_date) : null;
        return {
          ...r,
          slot_type: SLOT_DISPLAY[r.slot] ?? r.slot,
          next_bout: boutData ?? null,
          is_locked: !!eventStart && eventStart <= now,
        } as RosterSlot;
      });

      setTeamName(membership?.team_name ?? 'Roster');
      setSlots(enriched);
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
          <div className="mt-5 space-y-3">
            {slots.map((slot) => {
              const rank = rankLabel(slot.fighter.official_rank);
              return (
                <div key={slot.id} className="relative bg-[#050507] border-2 border-zinc-800 rounded-2xl p-4 flex items-center">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-zinc-900 border-x border-b border-zinc-700 px-3 py-0.5 rounded-b text-[10px] font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap">
                    {slot.slot_type}
                  </div>
                  <div className="flex items-center space-x-4 mt-3 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      <FighterAvatar fighter={slot.fighter} size={48} className="border-[3px] border-zinc-700" />
                      {rank && (
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 text-white text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {rank}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-[14px] font-black uppercase tracking-tighter text-white leading-none">
                        {slot.fighter.name}
                      </h4>
                      <span className="text-[10px] font-bold text-zinc-500 tracking-widest">
                        {slot.fighter.wins}-{slot.fighter.losses}-{slot.fighter.draws}
                      </span>
                    </div>
                  </div>
                  {slot.is_locked && (
                    <div className="bg-zinc-900 border border-zinc-800 text-zinc-500 rounded p-0.5 ml-2 flex-shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SlideUpModal>
  );
}
