'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { EventWithBouts, BoutWithFighters, Bout } from '@/lib/types';
import LiveMatchup from '@/components/LiveMatchup';
import EventDetailModal from '@/components/EventDetailModal';
import { CardSkeletonList } from '@/components/Skeleton';

interface FightsPageProps {
  params: Promise<{ id: string }>;
}

export default function FightsPage({ params }: FightsPageProps) {
  const { id: leagueId } = use(params);
  const [events, setEvents] = useState<EventWithBouts[]>([]);
  const [myFighterIds, setMyFighterIds] = useState<string[]>([]);
  const [allRosteredIds, setAllRosteredIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const supabase = createClient();

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // My fighter IDs
    const { data: myMembership } = await supabase
      .from('league_memberships')
      .select('id')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('claimable', false)
      .single();

    let myIds: string[] = [];
    if (myMembership) {
      const { data: myRoster } = await supabase
        .from('rosters')
        .select('fighter_id')
        .eq('membership_id', myMembership.id);
      myIds = (myRoster ?? []).map((r: { fighter_id: string }) => r.fighter_id);
    }

    // All league rostered IDs
    const { data: allMemberships } = await supabase
      .from('league_memberships')
      .select('id')
      .eq('league_id', leagueId);

    const membershipIds = (allMemberships ?? []).map((m: { id: string }) => m.id);
    let allIds: string[] = [];
    if (membershipIds.length > 0) {
      const { data: allRosters } = await supabase
        .from('rosters')
        .select('fighter_id')
        .in('membership_id', membershipIds);
      allIds = (allRosters ?? []).map((r: { fighter_id: string }) => r.fighter_id);
    }

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

    const enrichedEvents: EventWithBouts[] = (eventsData ?? []).map((ev) => {
      const bouts = (ev.bouts ?? []) as BoutWithFighters[];
      const rosteredCount = bouts.filter(
        (b) => allIds.includes(b.fighter_a_id) || allIds.includes(b.fighter_b_id)
      ).length;
      return { ...ev, bouts, rostered_count: rosteredCount };
    });

    setMyFighterIds(myIds);
    setAllRosteredIds(allIds);
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

  function renderSection(title: string, evs: EventWithBouts[], colorClass: string) {
    if (evs.length === 0) return null;
    return (
      <div className="mb-6">
        <h2 className={`text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${colorClass}`}>
          {title === 'Live' && <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />}
          {title}
        </h2>
        <div className="space-y-4">
          {evs.map((ev, i) => (
            <div key={ev.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}>
              {/* Event header */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[12px] font-black uppercase tracking-tighter text-zinc-400">
                  {ev.title}
                </h3>
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                  {new Date(ev.event_date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                  })}
                </span>
              </div>
              <div className="space-y-2">
                {[...ev.bouts]
                  .sort((a, b) => (b.is_main_event ? 1 : 0) - (a.is_main_event ? 1 : 0))
                  .map((bout) => (
                    <LiveMatchup
                      key={bout.id}
                      bout={{ ...bout, event: ev }}
                      rosteredCount={
                        [bout.fighter_a_id, bout.fighter_b_id].filter((fid) =>
                          allRosteredIds.includes(fid)
                        ).length
                      }
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
