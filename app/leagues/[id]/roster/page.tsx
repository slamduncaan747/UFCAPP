'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/identity';
import { RosterSlot, SLOT_ORDER } from '@/lib/types';
import { fetchRosterSlots } from '@/lib/data';
import { RosterCardWithPoints, RosterCardSkeleton } from '@/components/RosterCard';
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
      const userId = getUserId();
      if (!userId) return;

      const [{ data: league }, { data: membership }] = await Promise.all([
        supabase.from('leagues').select('name').eq('id', leagueId).single(),
        supabase
          .from('league_memberships')
          .select('id')
          .eq('league_id', leagueId)
          .eq('user_id', userId)
          .single(),
      ]);

      setLeagueName(league?.name ?? '');
      if (!membership) { setLoading(false); return; }

      const enriched = await fetchRosterSlots(supabase, membership.id);

      // Season points per fighter
      const pMap: Record<string, number> = {};
      let total = 0;
      const { data: scoreRows } = await supabase
        .from('scores')
        .select('fighter_id, points')
        .eq('membership_id', membership.id);
      (scoreRows ?? []).forEach((s: { fighter_id: string; points: number }) => {
        pMap[s.fighter_id] = (pMap[s.fighter_id] ?? 0) + s.points;
        total += s.points;
      });

      setSlots(enriched);
      setPointsMap(pMap);
      setTotalPoints(total);
      setLoading(false);
    }

    load();
  }, [leagueId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = [...slots].sort(
    (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)
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
          <div className="space-y-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <RosterCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((slot) => (
              <RosterCardWithPoints
                key={slot.id}
                slot={slot}
                points={pointsMap[slot.fighter_id] ?? 0}
                onClick={() => setSelectedFighterId(slot.fighter_id)}
              />
            ))}
            {Array.from({ length: Math.max(0, 9 - sorted.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="relative bg-[#050507] border-2 border-dashed border-zinc-800 rounded-2xl p-4 h-[88px] flex items-center justify-center">
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
