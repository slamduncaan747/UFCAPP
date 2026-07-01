'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ManagerWithRoster } from '@/lib/types';
import StandingsRow from '@/components/StandingsRow';
import { CardSkeletonList } from '@/components/Skeleton';
import OpponentRosterModal from '@/components/OpponentRosterModal';
import SeasonChartModal from '@/components/SeasonChartModal';
import ActivityModal from '@/components/ActivityModal';

interface StandingsPageProps {
  params: Promise<{ id: string }>;
}

export default function StandingsPage({ params }: StandingsPageProps) {
  const { id: leagueId } = use(params);
  const [managers, setManagers] = useState<ManagerWithRoster[]>([]);
  const [currentManagerId, setCurrentManagerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [snapshots, setSnapshots] = useState<{ eventTitle: string; managerPoints: Record<string, number> }[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current user's membership
      const { data: myMembership } = await supabase
        .from('league_memberships')
        .select('id')
        .eq('league_id', leagueId)
        .eq('user_id', user.id)
        .eq('claimable', false)
        .single();

      setCurrentManagerId(myMembership?.id ?? null);

      // Fetch all memberships for this league (including unclaimed)
      const { data: memberships } = await supabase
        .from('league_memberships')
        .select('id, league_id, user_id, team_name')
        .eq('league_id', leagueId);

      const enriched: ManagerWithRoster[] = await Promise.all(
        (memberships ?? []).map(async (m) => {
          // Compute total points from scores
          const { data: scoreRows } = await supabase
            .from('scores')
            .select('points')
            .eq('membership_id', m.id);

          const total = (scoreRows ?? []).reduce((sum: number, s: { points: number }) => sum + s.points, 0);

          // Count fighters with completed bouts
          const { data: rosters } = await supabase
            .from('rosters')
            .select('fighter_id')
            .eq('membership_id', m.id);

          const fighterIds = (rosters ?? []).map((r: { fighter_id: string }) => r.fighter_id);
          let completedCount = 0;

          if (fighterIds.length > 0) {
            const { data: completedBouts } = await supabase
              .from('bouts')
              .select('fighter_a_id, fighter_b_id')
              .eq('status', 'completed')
              .or(fighterIds.map((id) => `fighter_a_id.eq.${id},fighter_b_id.eq.${id}`).join(','));

            const completedFighterIds = new Set<string>();
            (completedBouts ?? []).forEach((b: { fighter_a_id: string; fighter_b_id: string }) => {
              if (fighterIds.includes(b.fighter_a_id)) completedFighterIds.add(b.fighter_a_id);
              if (fighterIds.includes(b.fighter_b_id)) completedFighterIds.add(b.fighter_b_id);
            });
            completedCount = completedFighterIds.size;
          }

          return {
            id: m.id,
            league_id: m.league_id,
            user_id: m.user_id,
            team_name: m.team_name,
            display_name: m.team_name,
            total_points: total,
            completed_fighters: completedCount,
          };
        })
      );

      // Sort by total points descending
      enriched.sort((a, b) => b.total_points - a.total_points);

      setManagers(enriched);
      setLoading(false);

      // Build season snapshots: cumulative points per team after each completed event.
      const membershipIds = (memberships ?? []).map((m: { id: string }) => m.id);
      if (membershipIds.length > 0) {
        const { data: scored } = await supabase
          .from('scores')
          .select('membership_id, points, bout:bouts(event:events(id, title, event_date, status))')
          .in('membership_id', membershipIds);

        // Points earned per event per membership.
        type Ev = { id: string; title: string; event_date: string; status: string };
        const perEvent: Record<string, { ev: Ev; pts: Record<string, number> }> = {};
        (scored ?? []).forEach((row: { membership_id: string; points: number; bout: { event: Ev | Ev[] | null } | { event: Ev | Ev[] | null }[] | null }) => {
          const bout = Array.isArray(row.bout) ? row.bout[0] : row.bout;
          const ev = bout && (Array.isArray(bout.event) ? bout.event[0] : bout.event);
          if (!ev || ev.status !== 'completed') return;
          if (!perEvent[ev.id]) perEvent[ev.id] = { ev, pts: {} };
          perEvent[ev.id].pts[row.membership_id] = (perEvent[ev.id].pts[row.membership_id] ?? 0) + row.points;
        });

        const orderedEvents = Object.values(perEvent).sort(
          (a, b) => new Date(a.ev.event_date).getTime() - new Date(b.ev.event_date).getTime()
        );

        const cumulative: Record<string, number> = {};
        membershipIds.forEach((id) => { cumulative[id] = 0; });
        const snaps = orderedEvents.map(({ ev, pts }) => {
          Object.entries(pts).forEach(([mid, p]) => {
            cumulative[mid] = (cumulative[mid] ?? 0) + p;
          });
          return { eventTitle: ev.title, managerPoints: { ...cumulative } };
        });
        setSnapshots(snaps);
      }
    }

    load();
  }, [leagueId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">Standings</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowActivity(true)}
              aria-label="League activity"
              className="w-10 h-10 bg-zinc-900 border-2 border-zinc-800 rounded-xl flex items-center justify-center hover:border-zinc-700 hover:text-white active:scale-90 transition-all duration-150"
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114-4m2 10a8 8 0 01-14 4" />
              </svg>
            </button>
            <button
              onClick={() => setShowChart(true)}
              aria-label="Season chart"
              className="w-10 h-10 bg-zinc-900 border-2 border-zinc-800 rounded-xl flex items-center justify-center hover:border-zinc-700 hover:text-white active:scale-90 transition-all duration-150"
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <CardSkeletonList count={6} className="space-y-2" />
        ) : (
          <div className="space-y-2">
            {managers.map((manager, i) => (
              <div
                key={manager.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
              >
                <StandingsRow
                  manager={manager}
                  rank={i + 1}
                  isCurrentUser={manager.id === currentManagerId}
                  onClick={() => setSelectedManagerId(manager.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <OpponentRosterModal
        managerId={selectedManagerId}
        isOpen={!!selectedManagerId}
        onClose={() => setSelectedManagerId(null)}
      />

      <SeasonChartModal
        isOpen={showChart}
        onClose={() => setShowChart(false)}
        managers={managers}
        snapshots={snapshots}
      />

      <ActivityModal
        leagueId={leagueId}
        isOpen={showActivity}
        onClose={() => setShowActivity(false)}
      />
    </>
  );
}
