'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { EventWithBouts, BoutWithFighters, Bout } from '@/lib/types';
import LiveMatchup from '@/components/LiveMatchup';
import EventDetailModal from '@/components/EventDetailModal';
import { CardSkeletonList } from '@/components/Skeleton';
import { useOwnership } from '@/lib/useOwnership';

interface FightsPageProps {
  params: Promise<{ id: string }>;
}

export default function FightsPage({ params }: FightsPageProps) {
  const { id: leagueId } = use(params);
  const { ownership } = useOwnership(leagueId);
  const [events, setEvents] = useState<EventWithBouts[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const supabase = createClient();

  const loadData = useCallback(async () => {
    // Fetch events with bouts
    const { data: eventsData } = await supabase
      .from('events')
      .select(`
        *,
        bouts(
          *,
          fighter_a:fighters!bouts_fighter_a_id_fkey(*),
          fighter_b:fighters!bouts_fighter_b_id_fkey(*)
        )
      `)
      .order('event_date', { ascending: false })
      .limit(10);

    const enrichedEvents: EventWithBouts[] = (eventsData ?? []).map((ev) => ({
      ...ev,
      bouts: (ev.bouts ?? []) as BoutWithFighters[],
    }));

    setEvents(enrichedEvents);
    setLoading(false);
  }, [leagueId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData();

    // Realtime subscription on bouts table
    const channel = supabase
      .channel('bouts-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bouts' },
        (payload) => {
          const updated = payload.new as Bout;
          setEvents((prev) =>
            prev.map((ev) => ({
              ...ev,
              bouts: ev.bouts.map((b) =>
                b.id === updated.id ? { ...b, ...updated } : b
              ),
            }))
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData]); // eslint-disable-line react-hooks/exhaustive-deps

  const liveEvents = events.filter((e) => e.status === 'live');
  const upcomingEvents = events.filter((e) => e.status === 'upcoming');
  const completedEvents = events.filter((e) => e.status === 'completed');

  const boutIsMine = (b: BoutWithFighters) =>
    ownership[b.fighter_a_id]?.is_mine || ownership[b.fighter_b_id]?.is_mine;

  function renderSection(title: string, evs: EventWithBouts[], colorClass: string) {
    // In "mine" mode, keep only events that contain at least one of your bouts.
    const shown = filter === 'mine'
      ? evs.filter((ev) => ev.bouts.some(boutIsMine))
      : evs;
    if (shown.length === 0) return null;
    return (
      <div className="mb-6">
        <h2 className={`text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${colorClass}`}>
          {title === 'Live' && <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />}
          {title}
        </h2>
        <div className="space-y-4">
          {shown.map((ev, i) => {
            const visibleBouts = filter === 'mine' ? ev.bouts.filter(boutIsMine) : ev.bouts;
            const fighterIds = ev.bouts.flatMap((b) => [b.fighter_a_id, b.fighter_b_id]);
            const rosteredInEvent = fighterIds.filter((fid) => ownership[fid]).length;
            const mineInEvent = fighterIds.filter((fid) => ownership[fid]?.is_mine).length;
            return (
            <div key={ev.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}>
              {/* Event header */}
              <button
                onClick={() => setSelectedEventId(ev.id)}
                className="w-full flex items-center justify-between mb-2 text-left group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-[12px] font-black uppercase tracking-tighter text-zinc-300 truncate group-hover:text-white transition-colors">
                    {ev.title}
                  </h3>
                  {mineInEvent > 0 && (
                    <span className="flex-shrink-0 text-[8px] font-black bg-emerald-500 text-black px-1.5 py-0.5 rounded uppercase tracking-widest">
                      {mineInEvent} You
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {rosteredInEvent > 0 && (
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                      {rosteredInEvent} Rostered
                    </span>
                  )}
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                    {new Date(ev.event_date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </span>
                </div>
              </button>
              <div className="space-y-2">
                {[...visibleBouts]
                  .sort((a, b) => (b.is_main_event ? 1 : 0) - (a.is_main_event ? 1 : 0))
                  .map((bout) => (
                    <LiveMatchup
                      key={bout.id}
                      bout={{ ...bout, event: ev }}
                      ownership={ownership}
                      onClick={() => setSelectedEventId(ev.id)}
                    />
                  ))}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">
            Fight Card
          </h1>
          {/* All / Mine segmented control */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            {(['all', 'mine'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded transition-all duration-150 ${
                  filter === f ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f === 'all' ? 'All' : 'My Fighters'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <CardSkeletonList count={5} />
        ) : (
          <>
            {renderSection('Live', liveEvents, 'text-purple-400')}
            {renderSection('Upcoming', upcomingEvents, 'text-blue-400')}
            {renderSection('Completed', completedEvents, 'text-zinc-500')}
            {events.length === 0 && (
              <p className="text-zinc-600 text-[12px] font-black uppercase tracking-widest text-center py-16">
                No events scheduled
              </p>
            )}
            {events.length > 0 && filter === 'mine' &&
              !events.some((e) => e.bouts.some(boutIsMine)) && (
                <p className="text-zinc-600 text-[12px] font-black uppercase tracking-widest text-center py-16">
                  None of your fighters are on these cards
                </p>
              )}
          </>
        )}
      </div>

      <EventDetailModal
        eventId={selectedEventId}
        leagueId={leagueId}
        isOpen={!!selectedEventId}
        onClose={() => setSelectedEventId(null)}
      />
    </>
  );
}
