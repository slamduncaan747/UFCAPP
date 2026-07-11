'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/identity';
import { ManagerWithRoster } from '@/lib/types';
import StandingsRow from '@/components/StandingsRow';
import OpponentRosterModal from '@/components/OpponentRosterModal';
import SeasonChartModal, { EventSnapshot } from '@/components/SeasonChartModal';

interface StandingsPageProps {
  params: Promise<{ id: string }>;
}

interface ScoreRow {
  membership_id: string;
  fighter_id: string;
  points: number;
  bout: {
    event: { id: string; name: string; event_date: string } | null;
  } | null;
}

function StandingsRowSkeleton() {
  return (
    <div className="w-full bg-[#050507] border-2 border-zinc-800 rounded-xl p-3 flex items-center justify-between animate-pulse">
      <div className="flex items-center space-x-5">
        <div className="w-6 h-8 bg-zinc-800 rounded" />
        <div className="flex flex-col gap-2">
          <div className="h-4 bg-zinc-800 rounded w-28" />
          <div className="h-3 bg-zinc-800 rounded w-20" />
        </div>
      </div>
      <div className="h-8 w-16 bg-zinc-800 rounded" />
    </div>
  );
}

export default function StandingsPage({ params }: StandingsPageProps) {
  const { id: leagueId } = use(params);
  const [managers, setManagers] = useState<ManagerWithRoster[]>([]);
  const [snapshots, setSnapshots] = useState<EventSnapshot[]>([]);
  const [currentManagerId, setCurrentManagerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const userId = getUserId();
      if (!userId) return;

      const { data: memberships } = await supabase
        .from('league_memberships')
        .select('id, league_id, user_id, team_name')
        .eq('league_id', leagueId);

      const rows = memberships ?? [];
      setCurrentManagerId(rows.find((m) => m.user_id === userId)?.id ?? null);

      const membershipIds = rows.map((m) => m.id);
      const { data: allScores } = await supabase
        .from('scores')
        .select('membership_id, fighter_id, points, bout:bouts(event:events(id, name, event_date))')
        .in('membership_id', membershipIds);

      const scores = ((allScores as unknown as ScoreRow[]) ?? []);

      // Totals + how many roster fighters have fought this season
      const totals = new Map<string, number>();
      const foughtFighters = new Map<string, Set<string>>();
      scores.forEach((s) => {
        totals.set(s.membership_id, (totals.get(s.membership_id) ?? 0) + s.points);
        if (!foughtFighters.has(s.membership_id)) foughtFighters.set(s.membership_id, new Set());
        foughtFighters.get(s.membership_id)!.add(s.fighter_id);
      });

      const enriched: ManagerWithRoster[] = rows.map((m) => ({
        id: m.id,
        league_id: m.league_id,
        user_id: m.user_id,
        team_name: m.team_name,
        display_name: m.team_name,
        total_points: totals.get(m.id) ?? 0,
        completed_fighters: foughtFighters.get(m.id)?.size ?? 0,
      }));
      enriched.sort((a, b) => b.total_points - a.total_points);

      // Season chart: cumulative points per manager after each scored event
      const eventMap = new Map<string, { name: string; date: string; points: Map<string, number> }>();
      scores.forEach((s) => {
        const ev = s.bout?.event;
        if (!ev) return;
        if (!eventMap.has(ev.id)) {
          eventMap.set(ev.id, { name: ev.name, date: ev.event_date, points: new Map() });
        }
        const bucket = eventMap.get(ev.id)!;
        bucket.points.set(s.membership_id, (bucket.points.get(s.membership_id) ?? 0) + s.points);
      });

      const orderedEvents = [...eventMap.values()].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const running = new Map<string, number>();
      const snaps: EventSnapshot[] = orderedEvents.map((ev) => {
        rows.forEach((m) => {
          running.set(m.id, (running.get(m.id) ?? 0) + (ev.points.get(m.id) ?? 0));
        });
        const managerPoints: Record<string, number> = {};
        rows.forEach((m) => { managerPoints[m.id] = running.get(m.id) ?? 0; });
        return { eventTitle: ev.name, managerPoints };
      });

      setManagers(enriched);
      setSnapshots(snaps);
      setLoading(false);
    }

    load();
  }, [leagueId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">Standings</h1>
          <button
            onClick={() => setShowChart(true)}
            aria-label="Season chart"
            className="w-9 h-9 bg-zinc-900 border-2 border-zinc-800 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <StandingsRowSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {managers.map((manager, i) => (
              <StandingsRow
                key={manager.id}
                manager={manager}
                rank={i + 1}
                isCurrentUser={manager.id === currentManagerId}
                onClick={() => setSelectedManagerId(manager.id)}
              />
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
    </>
  );
}
