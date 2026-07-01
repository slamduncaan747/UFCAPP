'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RosterSlot, FighterScore, SLOT_DISPLAY } from '@/lib/types';
import { RosterCardWithPoints } from '@/components/RosterCard';
import { CardSkeletonList } from '@/components/Skeleton';
import FighterDetailModal from '@/components/FighterDetailModal';

interface RosterPageProps {
  params: Promise<{ id: string }>;
}

export default function RosterPage({ params }: RosterPageProps) {
  const { id: leagueId } = use(params);
  const [slots, setSlots] = useState<RosterSlot[]>([]);
  const [pointsMap, setPointsMap] = useState<Record<string, number>>({});
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [leagueName, setLeagueName] = useState('');
  const [selectedFighterId, setSelectedFighterId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: league }, { data: membership }] = await Promise.all([
        supabase.from('leagues').select('name').eq('id', leagueId).single(),
        supabase
          .from('league_memberships')
          .select('id')
          .eq('league_id', leagueId)
          .eq('user_id', user.id)
          .eq('claimable', false)
          .single(),
      ]);

      setLeagueName(league?.name ?? '');
      if (!membership) { setLoading(false); return; }

      const membershipId = membership.id;

      // Fetch roster with fighters
      const { data: rostersData } = await supabase
        .from('rosters')
        .select('*, fighter:fighters(*)')
        .eq('membership_id', membershipId);

      const now = new Date();
      const enriched: RosterSlot[] = await Promise.all(
        (rostersData ?? []).map(async (r) => {
          const { data: boutData } = await supabase
            .from('bouts')
            .select('*, event:events(*)')
            .or(`fighter_a_id.eq.${r.fighter_id},fighter_b_id.eq.${r.fighter_id}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const eventStart = boutData?.event?.event_date
            ? new Date(boutData.event.event_date)
            : null;

          return {
            ...r,
            slot_type: SLOT_DISPLAY[r.slot] ?? r.slot,
            next_bout: boutData ?? null,
            is_locked: !!eventStart && eventStart <= now,
          } as RosterSlot;
        })
      );

      // Fetch total points from scores table
      const fighterIds = enriched.map((s) => s.fighter_id);
      const pMap: Record<string, number> = {};
      let total = 0;

      if (fighterIds.length > 0) {
        const { data: scoreRows } = await supabase
          .from('scores')
          .select('fighter_id, points')
          .eq('membership_id', membershipId)
          .in('fighter_id', fighterIds);

        (scoreRows ?? []).forEach((s: Pick<FighterScore, 'fighter_id' | 'points'>) => {
          pMap[s.fighter_id] = (pMap[s.fighter_id] ?? 0) + s.points;
          total += s.points;
        });
      }

      setSlots(enriched);
      setPointsMap(pMap);
      setTotalPoints(total);
      setLoading(false);
    }

    load();
  }, [leagueId]); // eslint-disable-line react-hooks/exhaustive-deps

  const SLOT_ORDER = [
    'Flyweight', 'Bantamweight', 'Featherweight',
    'Lightweight', 'Welterweight', 'Middleweight',
    'Light Heavyweight', 'Heavyweight', 'Wildcard',
  ];
  const sorted = [...slots].sort(
    (a, b) => SLOT_ORDER.indexOf(a.slot_type) - SLOT_ORDER.indexOf(b.slot_type)
  );

  return (
    <>
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{leagueName}</p>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-white leading-none mt-0.5">
              My Roster
            </h1>
          </div>
          <div className="text-right border-l-2 border-zinc-800 pl-4">
            <span className="block text-[28px] font-black text-white tracking-tighter leading-none font-mono tabular-nums">
              {totalPoints.toFixed(0)}
            </span>
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">Total PTS</span>
          </div>
        </div>

        {loading ? (
          <CardSkeletonList count={6} className="space-y-4" />
        ) : (
          <div className="space-y-4">
            {sorted.map((slot, i) => (
              <div
                key={slot.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
              >
                <RosterCardWithPoints
                  slot={slot}
                  points={pointsMap[slot.fighter_id] ?? 0}
                  onClick={() => setSelectedFighterId(slot.fighter_id)}
                />
              </div>
            ))}
            {Array.from({ length: Math.max(0, 9 - sorted.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="relative bg-[#050507] border-2 border-dashed border-zinc-800 rounded-2xl p-4 min-h-[96px] flex items-center justify-center">
                <span className="text-[11px] font-black uppercase tracking-widest text-zinc-700">Empty Slot</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <FighterDetailModal
        fighterId={selectedFighterId}
        isOpen={!!selectedFighterId}
        onClose={() => setSelectedFighterId(null)}
      />
    </>
  );
}
