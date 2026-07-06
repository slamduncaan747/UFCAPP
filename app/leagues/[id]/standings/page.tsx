'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ManagerWithRoster } from '@/lib/types';
import StandingsRow from '@/components/StandingsRow';
import OpponentRosterModal from '@/components/OpponentRosterModal';
import SeasonChartModal from '@/components/SeasonChartModal';

interface StandingsPageProps {
  params: Promise<{ id: string }>;
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
  const [currentManagerId, setCurrentManagerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: myMembership } = await supabase
        .from('league_memberships')
        .select('id')
        .eq('league_id', leagueId)
        .eq('user_id', user.id)
        .eq('claimable', false)
        .single();

      setCurrentManagerId(myMembership?.id ?? null);

      const { data: memberships } = await supabase
        .from('league_memberships')
        .select('id, league_id, user_id, team_name')
        .eq('league_id', leagueId);

      const membershipIds = (memberships ?? []).map((m) => m.id);

      // Batch queries — 3 round trips instead of 3N
      const [{ data: allScores }, { data: allRosters }] = await Promise.all([
        supabase.from('scores').select('membership_id, points').in('membership_id', membershipIds),
        supabase.from('rosters').select('membership_id, fighter_id').in('membership_id', membershipIds),
      ]);

      const allFighterIds = [...new Set((allRosters ?? []).map((r) => r.fighter_id))];

      let completedBouts: Array<{ fighter_a_id: string; fighter_b_id: string }> = [];
      if (allFighterIds.length > 0) {
        const { data } = await supabase
          .from('bouts')
          .select('fighter_a_id, fighter_b_id')
          .eq('status', 'completed')
          .or(allFighterIds.map((id) => `fighter_a_id.eq.${id},fighter_b_id.eq.${id}`).join(','));
        completedBouts = data ?? [];
      }

      // Build lookup maps
      const scoresByMembership = new Map<string, number>();
      (allScores ?? []).forEach((s: { membership_id: string; points: number }) => {
        scoresByMembership.set(s.membership_id, (scoresByMembership.get(s.membership_id) ?? 0) + s.points);
      });

      const rostersByMembership = new Map<string, string[]>();
      (allRosters ?? []).forEach((r: { membership_id: string; fighter_id: string }) => {
        if (!rostersByMembership.has(r.membership_id)) rostersByMembership.set(r.membership_id, []);
        rostersByMembership.get(r.membership_id)!.push(r.fighter_id);
      });

      const completedFighterSet = new Set<string>();
      completedBouts.forEach((b) => {
        completedFighterSet.add(b.fighter_a_id);
        completedFighterSet.add(b.fighter_b_id);
      });

      const enriched: ManagerWithRoster[] = (memberships ?? []).map((m) => {
        const total = scoresByMembership.get(m.id) ?? 0;
        const fighterIds = rostersByMembership.get(m.id) ?? [];
        const completedCount = fighterIds.filter((id) => completedFighterSet.has(id)).length;
        return {
          id: m.id,
          league_id: m.league_id,
          user_id: m.user_id,
          team_name: m.team_name,
          display_name: m.team_name,
          total_points: total,
          completed_fighters: completedCount,
        };
      });

      enriched.sort((a, b) => b.total_points - a.total_points);
      setManagers(enriched);
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
        snapshots={[]}
      />
    </>
  );
}
