'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RosterSlot, SLOT_ORDER } from '@/lib/types';
import { rankLabel, recordString } from '@/lib/helpers';
import { fetchRosterSlots } from '@/lib/data';
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
  const [pointsMap, setPointsMap] = useState<Record<string, number>>({});
  // Loading is derived: done once the fetched roster matches the requested manager.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const loading = loadedId !== managerId;
  const supabase = createClient();

  useEffect(() => {
    if (!managerId || !isOpen) return;

    async function load() {
      const [{ data: membership }, enriched, { data: scoreRows }] = await Promise.all([
        supabase.from('league_memberships').select('team_name').eq('id', managerId).single(),
        fetchRosterSlots(supabase, managerId!),
        supabase.from('scores').select('fighter_id, points').eq('membership_id', managerId),
      ]);

      const pMap: Record<string, number> = {};
      ((scoreRows as Array<{ fighter_id: string; points: number }>) ?? []).forEach((s) => {
        pMap[s.fighter_id] = (pMap[s.fighter_id] ?? 0) + s.points;
      });

      setTeamName(membership?.team_name ?? 'Roster');
      setSlots(enriched.sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)));
      setPointsMap(pMap);
      setLoadedId(managerId!);
    }

    load();
  }, [managerId, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

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
              const rank = rankLabel(slot.fighter);
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
                    <div className="min-w-0">
                      <h4 className="text-[14px] font-black uppercase tracking-tighter text-white leading-none truncate">
                        {slot.fighter.name}
                      </h4>
                      <span className="text-[10px] font-bold text-zinc-500 tracking-widest">
                        {recordString(slot.fighter)}
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
                    <div className="text-right border-l-2 border-zinc-800 pl-3">
                      <span className="block text-[18px] font-black text-white tracking-tighter leading-none font-mono tabular-nums">
                        {pointsMap[slot.fighter_id] ?? 0}
                      </span>
                      <span className="text-[8px] text-zinc-600 uppercase tracking-widest font-black">PTS</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SlideUpModal>
  );
}
