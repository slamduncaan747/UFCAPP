'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/identity';
import { EventWithBouts, BoutWithFighters, Bout } from '@/lib/types';
import { BOUT_WITH_FIGHTERS_SELECT, cardOrder, formatEventDate } from '@/lib/helpers';
import { fetchOwnershipMap } from '@/lib/data';
import LiveMatchup from '@/components/LiveMatchup';
import EventDetailModal from '@/components/EventDetailModal';

interface FightsPageProps {
  params: Promise<{ id: string }>;
}

const EVENT_SELECT = `*, bouts(${BOUT_WITH_FIGHTERS_SELECT})`;

export default function FightsPage({ params }: FightsPageProps) {
  const { id: leagueId } = use(params);
  const [events, setEvents] = useState<EventWithBouts[]>([]);
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [myFighterIds, setMyFighterIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const userId = getUserId();
      if (!userId) return;

      const yesterday = new Date(Date.now() - 86400000).toISOString();

      const [{ owners: ownerMap }, myMembershipRes, liveRes, upcomingRes, recentRes] =
        await Promise.all([
          fetchOwnershipMap(supabase, leagueId),
          supabase
            .from('league_memberships')
            .select('id')
            .eq('league_id', leagueId)
            .eq('user_id', userId)
            .single(),
          supabase
            .from('events')
            .select(EVENT_SELECT)
            .eq('status', 'in_progress')
            .order('event_date', { ascending: true }),
          supabase
            .from('events')
            .select(EVENT_SELECT)
            .eq('status', 'scheduled')
            .gte('event_date', yesterday)
            .order('event_date', { ascending: true })
            .limit(5),
          supabase
            .from('events')
            .select(EVENT_SELECT)
            .eq('status', 'completed')
            .order('event_date', { ascending: false })
            .limit(6),
        ]);

      let myIds: string[] = [];
      if (myMembershipRes.data) {
        const { data: myRoster } = await supabase
          .from('rosters')
          .select('fighter_id')
          .eq('membership_id', myMembershipRes.data.id);
        myIds = (myRoster ?? []).map((r: { fighter_id: string }) => r.fighter_id);
      }

      const enrich = (rows: unknown): EventWithBouts[] =>
        ((rows as EventWithBouts[]) ?? []).map((ev) => {
          const bouts = ((ev.bouts ?? []) as BoutWithFighters[])
            .filter((b) => b.status !== 'cancelled')
            .sort(cardOrder);
          const rosteredCount = bouts.filter(
            (b) => ownerMap[b.fighter_a_id] || ownerMap[b.fighter_b_id]
          ).length;
          return { ...ev, bouts, rostered_count: rosteredCount };
        });

      setOwners(ownerMap);
      setMyFighterIds(myIds);
      setEvents([
        ...enrich(liveRes.data),
        ...enrich(upcomingRes.data),
        ...enrich(recentRes.data),
      ]);
      setLoading(false);
    }

    loadData();

    // Live updates: refresh bout rows in place as results land.
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
  }, [leagueId]); // eslint-disable-line react-hooks/exhaustive-deps

  const liveEvents = events.filter((e) => e.status === 'in_progress');
  const upcomingEvents = events.filter((e) => e.status === 'scheduled');
  const completedEvents = events.filter((e) => e.status === 'completed');

  function renderSection(title: string, evs: EventWithBouts[], colorClass: string) {
    if (evs.length === 0) return null;
    return (
      <div className="mb-6">
        <h2 className={`text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${colorClass}`}>
          {title === 'Live' && <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />}
          {title}
        </h2>
        <div className="space-y-4">
          {evs.map((ev) => (
            <div key={ev.id}>
              {/* Event header */}
              <button
                onClick={() => setSelectedEventId(ev.id)}
                className="w-full flex items-center justify-between mb-2 text-left"
              >
                <div className="min-w-0">
                  <h3 className="text-[12px] font-black uppercase tracking-tighter text-zinc-300 truncate">
                    {ev.name}
                  </h3>
                  {ev.location && (
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                      {ev.location}
                    </span>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">
                    {formatEventDate(ev.event_date)}
                  </span>
                  {(ev.rostered_count ?? 0) > 0 && (
                    <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">
                      {ev.rostered_count} league {ev.rostered_count === 1 ? 'fight' : 'fights'}
                    </span>
                  )}
                </div>
              </button>
              <div className="space-y-2">
                {ev.bouts.map((bout) => (
                  <LiveMatchup
                    key={bout.id}
                    bout={{ ...bout, event: ev }}
                    owners={owners}
                    currentManagerFighterIds={myFighterIds}
                    onClick={() => setSelectedEventId(ev.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white leading-none mb-6">
          Fight Card
        </h1>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
          </div>
        ) : (
          <>
            {renderSection('Live', liveEvents, 'text-purple-400')}
            {renderSection('Upcoming', upcomingEvents, 'text-blue-400')}
            {renderSection('Recent Results', completedEvents, 'text-zinc-500')}
            {events.length === 0 && (
              <p className="text-zinc-600 text-[12px] font-black uppercase tracking-widest text-center py-16">
                No events scheduled
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
