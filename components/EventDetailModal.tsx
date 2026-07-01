'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BoutWithFighters, Event } from '@/lib/types';
import SlideUpModal from './SlideUpModal';

interface EventDetailModalProps {
  eventId: string | null;
  leagueId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface OwnershipMap {
  [fighterId: string]: string; // fighter_id → manager display_name
}

export default function EventDetailModal({ eventId, leagueId, isOpen, onClose }: EventDetailModalProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [bouts, setBouts] = useState<BoutWithFighters[]>([]);
  const [ownership, setOwnership] = useState<OwnershipMap>({});
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!eventId || !isOpen) return;
    setLoading(true);

    async function load() {
      // Fetch event
      const { data: ev } = await supabase.from('events').select('*').eq('id', eventId).single();

      // Fetch bouts with fighters
      const { data: boutsData } = await supabase
        .from('bouts')
        .select('*, fighter_a:fighters!bouts_fighter_a_id_fkey(*), fighter_b:fighters!bouts_fighter_b_id_fkey(*)')
        .eq('event_id', eventId)
        .order('is_main_event', { ascending: false });

      // Build ownership map: fetch all memberships + rosters in this league
      const { data: memberships } = await supabase
        .from('league_memberships')
        .select('id, team_name')
        .eq('league_id', leagueId)
        .eq('claimable', false);

      const membershipIds = (memberships ?? []).map((m: { id: string; team_name: string }) => m.id);
      let ownerMap: OwnershipMap = {};

      if (membershipIds.length > 0) {
        const { data: rosters } = await supabase
          .from('rosters')
          .select('fighter_id, membership_id')
          .in('membership_id', membershipIds);

        const membershipNameMap: Record<string, string> = {};
        (memberships ?? []).forEach((m: { id: string; team_name: string }) => {
          membershipNameMap[m.id] = m.team_name;
        });

        (rosters ?? []).forEach((r: { fighter_id: string; membership_id: string }) => {
          ownerMap[r.fighter_id] = membershipNameMap[r.membership_id] ?? 'Unknown';
        });
      }

      setEvent(ev ?? null);
      setBouts((boutsData as BoutWithFighters[]) ?? []);
      setOwnership(ownerMap);
      setLoading(false);
    }

    load();
  }, [eventId, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusColor = event?.status === 'live'
    ? 'text-purple-300'
    : event?.status === 'completed'
    ? 'text-zinc-500'
    : 'text-blue-300';

  return (
    <SlideUpModal isOpen={isOpen} onClose={onClose}>
      {loading || !event ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
        </div>
      ) : (
        <div className="px-5 pb-8">
          {/* Event header */}
          <div className="border-b-2 border-zinc-800 pb-4 mb-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-tighter text-white leading-none">
                {event.title}
              </h2>
              <span className={`text-[10px] font-black uppercase tracking-widest ${statusColor}`}>
                {event.status === 'live' && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    LIVE
                  </span>
                )}
                {event.status === 'upcoming' && 'UPCOMING'}
                {event.status === 'completed' && 'COMPLETED'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-black uppercase tracking-widest mt-1">
              {new Date(event.event_date).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
              }).toUpperCase()}
            </p>
          </div>

          {/* Bout list */}
          <div className="space-y-3">
            {bouts.map((bout) => {
              const aOwner = ownership[bout.fighter_a_id];
              const bOwner = ownership[bout.fighter_b_id];
              const isMain = bout.is_main_event;
              const isTitle = bout.is_title_fight;

              const aWon = bout.winner_id === bout.fighter_a_id;
              const bWon = bout.winner_id === bout.fighter_b_id;

              return (
                <div key={bout.id} className={`bg-[#030303] border-2 rounded-xl p-3 ${isMain ? 'border-zinc-600' : 'border-zinc-800'}`}>
                  {/* Tags */}
                  <div className="flex gap-1.5 mb-2">
                    {isMain && (
                      <span className="text-[8px] font-black bg-zinc-800 border border-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded uppercase tracking-widest">
                        Main Event
                      </span>
                    )}
                    {isTitle && (
                      <span className="text-[8px] font-black bg-amber-900/30 border border-amber-800/50 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-widest">
                        Title Fight
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Fighter A */}
                    <div className={`flex-1 ${aWon ? 'text-white' : bout.status === 'completed' ? 'text-zinc-500' : 'text-white'}`}>
                      <span className="text-[14px] font-black uppercase tracking-tighter block leading-none">
                        {bout.fighter_a.name}
                      </span>
                      {aOwner && (
                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mt-0.5 block">
                          {aOwner}
                        </span>
                      )}
                    </div>

                    {/* Center */}
                    <div className="px-3 text-center flex-shrink-0">
                      {bout.status === 'completed' && (
                        <div className="text-center">
                          <span className="text-[9px] font-black text-zinc-500 uppercase block tracking-widest">
                            {bout.method_of_victory}
                          </span>
                          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">
                            R{bout.round_ended}
                          </span>
                        </div>
                      )}
                      {bout.status === 'live' && (
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest animate-pulse">
                          R{bout.current_round}
                        </span>
                      )}
                      {bout.status === 'scheduled' && (
                        <span className="text-[10px] font-black text-zinc-600">VS</span>
                      )}
                    </div>

                    {/* Fighter B */}
                    <div className={`flex-1 text-right ${bWon ? 'text-white' : bout.status === 'completed' ? 'text-zinc-500' : 'text-white'}`}>
                      <span className="text-[14px] font-black uppercase tracking-tighter block leading-none">
                        {bout.fighter_b.name}
                      </span>
                      {bOwner && (
                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mt-0.5 block">
                          {bOwner}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SlideUpModal>
  );
}
