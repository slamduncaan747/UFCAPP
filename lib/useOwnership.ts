'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { OwnershipMap } from '@/lib/types';
import { addOwner } from '@/lib/ownership';

/**
 * Builds a league-wide map of fighter_id → owning team for the given league,
 * flagging the current user's own fighters. One shared source of truth so
 * ownership reads identically everywhere it's shown.
 */
export function useOwnership(leagueId: string) {
  const [ownership, setOwnership] = useState<OwnershipMap>({});
  const [myMembershipId, setMyMembershipId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: memberships } = await supabase
      .from('league_memberships')
      .select('id, team_name, user_id')
      .eq('league_id', leagueId);

    const mine = (memberships ?? []).find(
      (m: { user_id: string | null }) => user && m.user_id === user.id
    );
    const mineId = mine?.id ?? null;

    const membershipIds = (memberships ?? []).map((m: { id: string }) => m.id);
    const map: OwnershipMap = {};

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
        const fighter = Array.isArray(r.fighter) ? r.fighter[0] : r.fighter;
        addOwner(map, r.fighter_id, fighter?.name, {
          membership_id: r.membership_id,
          team_name: nameById[r.membership_id] ?? 'Unknown',
          is_mine: r.membership_id === mineId,
        });
      });
    }

    setMyMembershipId(mineId);
    setOwnership(map);
    setReady(true);
  }, [leagueId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return { ownership, myMembershipId, ready, refresh: load };
}
