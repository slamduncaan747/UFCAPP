'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BoutWithFighters, Event, OwnershipMap } from '@/lib/types';
import { addOwner, ownerFor } from '@/lib/ownership';
import SlideUpModal from './SlideUpModal';

interface EventDetailModalProps {
  eventId: string | null;
  leagueId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function EventDetailModal({ eventId, leagueId, isOpen, onClose }: EventDetailModalProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [bouts, setBouts] = useState<BoutWithFighters[]>([]);
  const [ownership, setOwnership] = useState<OwnershipMap>({});
  const [points, setPoints] = useState<Record<string, number>>({}); // `${boutId}:${fighterId}` → pts
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!eventId || !isOpen) return;
    setLoading(true);

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: ev } = await supabase.from('events').select('*').eq('id', eventId).single();

      const { data: boutsData } = await supabase
        .from('bouts')
        .select('*, fighter_a:fighters!bouts_fighter_a_id_fkey(*), fighter_b:fighters!bouts_fighter_b_id_fkey(*)')
        .eq('event_id', eventId)
        .order('is_main_event', { ascending: false });

      const boutList = (boutsData as BoutWithFighters[]) ?? [];

      // Ownership across the whole league. NOTE: do NOT filter by `claimable` —
      // unclaimed teams still hold rosters and must show as owners.
      const { data: memberships } = await supabase
        .from('league_memberships')
        .select('id, team_name, user_id')
        .eq('league_id', leagueId);

      const myMembership = (memberships ?? []).find(
        (m: { user_id: string | null }) => user && m.user_id === user.id
      );

      const membershipIds = (memberships ?? []).map((m: { id: string }) => m.id);
      const ownerMap: OwnershipMap = {};

      if (membershipIds.length > 0) {
        const nameById: Record<string, string> = {};
        (memberships ?? []).forEach((m: { id: string; team_name: string }) => {
          nameById[m.id] = m.team_name;
        });

        const { data: rosters } = await supabase
          .from('rosters')
          .select('fighter_id, membership_id, fighter:fighters(name)')
          .in('membership_id', membershipIds);

        (rosters ?? []).forEach((r: { fighter_id: string; membership_id: string; fighter: { name: string } | { name: string }[] | null }) => {
          const rf = Array.isArray(r.fighter) ? r.fighter[0] : r.fighter;
          addOwner(ownerMap, r.fighter_id, rf?.name, {
            membership_id: r.membership_id,
            team_name: nameById[r.membership_id] ?? 'Unknown',
            is_mine: r.membership_id === myMembership?.id,
          });
        });
      }

      // Fantasy points earned in this event's bouts.
      const boutIds = boutList.map((b) => b.id);
      const ptsMap: Record<string, number> = {};
      if (boutIds.length > 0) {
        const { data: scores } = await supabase
          .from('scores')
          .select('bout_id, fighter_id, points')
          .in('bout_id', boutIds);
        (scores ?? []).forEach((s: { bout_id: string; fighter_id: string; points: number }) => {
          ptsMap[`${s.bout_id}:${s.fighter_id}`] = s.points;
        });
      }

      setEvent(ev ?? null);
      setBouts(boutList);
      setOwnership(ownerMap);
      setPoints(ptsMap);
      setLoading(false);
    }

    load();
  }, [eventId, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusColor = event?.status === 'live'
    ? 'text-purple-300'
    : event?.status === 'completed'
    ? 'text-zinc-500'
    : 'text-blue-300';

  const allFighters = bouts.flatMap((b) => [b.fighter_a, b.fighter_b]);
  const rosteredCount = allFighters.filter((f) => ownerFor(ownership, f)).length;
  const mineCount = allFighters.filter((f) => ownerFor(ownership, f)?.is_mine).length;

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

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-[#050507] border border-zinc-800 rounded-lg py-2 text-center">
                <span className="block text-[18px] font-black text-white tabular-nums leading-none">{bouts.length}</span>
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Bouts</span>
              </div>
              <div className="bg-[#050507] border border-zinc-800 rounded-lg py-2 text-center">
                <span className="block text-[18px] font-black text-white tabular-nums leading-none">{rosteredCount}</span>
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Rostered</span>
              </div>
              <div className="bg-[#050507] border border-emerald-800/40 rounded-lg py-2 text-center">
                <span className="block text-[18px] font-black text-emerald-400 tabular-nums leading-none">{mineCount}</span>
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Yours</span>
              </div>
            </div>
          </div>

          {/* Bout list */}
          <div className="space-y-3">
            {bouts.map((bout) => {
              const aOwner = ownerFor(ownership, bout.fighter_a);
              const bOwner = ownerFor(ownership, bout.fighter_b);
              const isMain = bout.is_main_event;
              const isTitle = bout.is_title_fight;

              const aWon = bout.winner_id === bout.fighter_a_id;
              const bWon = bout.winner_id === bout.fighter_b_id;

              const aPts = points[`${bout.id}:${bout.fighter_a_id}`];
              const bPts = points[`${bout.id}:${bout.fighter_b_id}`];

              const involvesMine = aOwner?.is_mine || bOwner?.is_mine;

              return (
                <div
                  key={bout.id}
                  className={`bg-[#030303] border-2 rounded-xl p-3 ${
                    involvesMine ? 'border-emerald-800/50' : isMain ? 'border-zinc-600' : 'border-zinc-800'
                  }`}
                >
                  {/* Tags */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-1.5">
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
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">
                      {bout.fighter_a.weight_class}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Fighter A */}
                    <div className={`flex-1 min-w-0 ${aWon || bout.status !== 'completed' ? 'text-white' : 'text-zinc-500'}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-black uppercase tracking-tighter block leading-none truncate">
                          {bout.fighter_a.name}
                        </span>
                        {aWon && <span className="text-[8px] font-black bg-emerald-500 text-black px-1 rounded uppercase flex-shrink-0">W</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {aOwner ? (
                          <span className={`text-[8px] font-black uppercase tracking-widest truncate ${aOwner.is_mine ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {aOwner.is_mine ? 'You' : aOwner.team_name}
                          </span>
                        ) : (
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">Free Agent</span>
                        )}
                        {aPts !== undefined && aOwner && (
                          <span className="text-[8px] font-mono font-black text-emerald-400 tabular-nums flex-shrink-0">+{aPts}</span>
                        )}
                      </div>
                    </div>

                    {/* Center */}
                    <div className="px-3 text-center flex-shrink-0">
                      {bout.status === 'completed' && (
                        <div className="text-center">
                          <span className="text-[9px] font-black text-zinc-400 uppercase block tracking-widest">
                            {bout.method_of_victory ?? 'DEC'}
                          </span>
                          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">
                            R{bout.round_ended}{bout.time_ended ? ` ${bout.time_ended}` : ''}
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
                    <div className={`flex-1 min-w-0 text-right ${bWon || bout.status !== 'completed' ? 'text-white' : 'text-zinc-500'}`}>
                      <div className="flex items-center gap-1.5 justify-end">
                        {bWon && <span className="text-[8px] font-black bg-emerald-500 text-black px-1 rounded uppercase flex-shrink-0">W</span>}
                        <span className="text-[14px] font-black uppercase tracking-tighter block leading-none truncate">
                          {bout.fighter_b.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 justify-end">
                        {bPts !== undefined && bOwner && (
                          <span className="text-[8px] font-mono font-black text-emerald-400 tabular-nums flex-shrink-0">+{bPts}</span>
                        )}
                        {bOwner ? (
                          <span className={`text-[8px] font-black uppercase tracking-widest truncate ${bOwner.is_mine ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {bOwner.is_mine ? 'You' : bOwner.team_name}
                          </span>
                        ) : (
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">Free Agent</span>
                        )}
                      </div>
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
