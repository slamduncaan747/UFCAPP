'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BoutWithFighters, CardSegment, Event } from '@/lib/types';
import { BOUT_WITH_FIGHTERS_SELECT, cardOrder, isEventLocked, methodLabel, segmentLabel } from '@/lib/helpers';
import { fetchOwnershipMap } from '@/lib/data';
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
  const [ownership, setOwnership] = useState<Record<string, string>>({});
  // Loading is derived: we've loaded when the fetched event matches the requested id.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const loading = loadedId !== eventId;
  const supabase = createClient();

  useEffect(() => {
    if (!eventId || !isOpen) return;

    async function load() {
      const [{ data: ev }, { data: boutsData }, { owners }] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase
          .from('bouts')
          .select(BOUT_WITH_FIGHTERS_SELECT)
          .eq('event_id', eventId)
          .neq('status', 'cancelled'),
        fetchOwnershipMap(supabase, leagueId),
      ]);

      setEvent((ev as Event) ?? null);
      setBouts((((boutsData as unknown as BoutWithFighters[]) ?? [])).sort(cardOrder));
      setOwnership(owners);
      setLoadedId(eventId!);
    }

    load();
  }, [eventId, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLive = !!event && (event.status === 'in_progress' || (event.status === 'scheduled' && isEventLocked(event)));
  const statusColor = isLive
    ? 'text-purple-300'
    : event?.status === 'completed'
    ? 'text-zinc-500'
    : 'text-blue-300';

  // Group bouts by card segment, preserving cardOrder within each.
  const segments: CardSegment[] = ['main', 'prelim', 'early_prelim'];
  const boutsBySegment = segments
    .map((seg) => ({ seg, list: bouts.filter((b) => b.card_segment === seg) }))
    .filter((g) => g.list.length > 0);

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
                {event.name}
              </h2>
              <span className={`text-[10px] font-black uppercase tracking-widest flex-shrink-0 ml-3 ${statusColor}`}>
                {isLive ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    LIVE
                  </span>
                ) : event.status === 'completed' ? 'COMPLETED' : 'UPCOMING'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-black uppercase tracking-widest mt-1">
              {new Date(event.event_date).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
              }).toUpperCase()}
              {event.location ? ` • ${event.location.toUpperCase()}` : ''}
            </p>
          </div>

          {/* Bout list, grouped by card segment */}
          {boutsBySegment.map(({ seg, list }) => (
            <div key={seg} className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                {segmentLabel(seg)}
              </p>
              <div className="space-y-3">
                {list.map((bout) => {
                  const aOwner = ownership[bout.fighter_a_id];
                  const bOwner = ownership[bout.fighter_b_id];
                  const aWon = bout.winner_id === bout.fighter_a_id;
                  const bWon = bout.winner_id === bout.fighter_b_id;
                  const completed = bout.status === 'completed';

                  return (
                    <div
                      key={bout.id}
                      className={`bg-[#030303] border-2 rounded-xl p-3 ${bout.is_main_event ? 'border-zinc-600' : 'border-zinc-800'}`}
                    >
                      {/* Tags */}
                      {(bout.is_main_event || bout.is_title_fight || bout.fotn) && (
                        <div className="flex gap-1.5 mb-2">
                          {bout.is_main_event && (
                            <span className="text-[8px] font-black bg-zinc-800 border border-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded uppercase tracking-widest">
                              Main Event
                            </span>
                          )}
                          {bout.is_title_fight && (
                            <span className="text-[8px] font-black bg-amber-900/30 border border-amber-800/50 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-widest">
                              Title Fight
                            </span>
                          )}
                          {bout.fotn && (
                            <span className="text-[8px] font-black bg-purple-900/30 border border-purple-800/50 text-purple-400 px-1.5 py-0.5 rounded uppercase tracking-widest">
                              FOTN
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        {/* Fighter A */}
                        <div className={`flex-1 min-w-0 ${completed && !aWon ? 'text-zinc-500' : 'text-white'}`}>
                          <span className="text-[14px] font-black uppercase tracking-tighter block leading-none truncate">
                            {bout.fighter_a.name}
                            {aWon && <span className="text-emerald-400 ml-1">✓</span>}
                          </span>
                          <span className={`text-[8px] font-black uppercase tracking-widest mt-0.5 block ${aOwner ? 'text-emerald-400' : 'text-zinc-700'}`}>
                            {aOwner ?? 'Free Agent'}
                            {bout.fighter_a_potn ? ' • POTN' : ''}
                          </span>
                        </div>

                        {/* Center */}
                        <div className="px-3 text-center flex-shrink-0">
                          {completed ? (
                            <span className="text-[9px] font-black text-zinc-500 uppercase block tracking-widest">
                              {methodLabel(bout)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-zinc-600">VS</span>
                          )}
                        </div>

                        {/* Fighter B */}
                        <div className={`flex-1 min-w-0 text-right ${completed && !bWon ? 'text-zinc-500' : 'text-white'}`}>
                          <span className="text-[14px] font-black uppercase tracking-tighter block leading-none truncate">
                            {bWon && <span className="text-emerald-400 mr-1">✓</span>}
                            {bout.fighter_b.name}
                          </span>
                          <span className={`text-[8px] font-black uppercase tracking-widest mt-0.5 block ${bOwner ? 'text-emerald-400' : 'text-zinc-700'}`}>
                            {bOwner ?? 'Free Agent'}
                            {bout.fighter_b_potn ? ' • POTN' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </SlideUpModal>
  );
}
