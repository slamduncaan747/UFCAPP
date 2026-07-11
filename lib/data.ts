import type { SupabaseClient } from '@supabase/supabase-js';
import { Bout, Event, Fighter, Roster, RosterSlot, SLOT_DISPLAY } from './types';
import { FK_BOUT_FIGHTER_A, FK_BOUT_FIGHTER_B, isEventLocked } from './helpers';

export type BoutWithEvent = Bout & { event: Event };

export interface UpcomingBoutInfo {
  event_date: string;
  event_name: string;
  opponent_name: string | null;
}

type RosterRow = Roster & { fighter: Fighter };

/**
 * Bouts (with their event) that are still relevant for roster state:
 * anything from the last week onward. Used to derive both the next
 * scheduled bout and whether a fighter is currently locked.
 */
export async function fetchRelevantBouts(
  supabase: SupabaseClient,
  fighterIds: string[]
): Promise<BoutWithEvent[]> {
  if (fighterIds.length === 0) return [];
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data } = await supabase
    .from('bouts')
    .select('*, event:events!inner(*)')
    .or(fighterIds.map((id) => `fighter_a_id.eq.${id},fighter_b_id.eq.${id}`).join(','))
    .neq('status', 'cancelled')
    .gte('event.event_date', since);
  return (data as BoutWithEvent[]) ?? [];
}

export function enrichRosterSlots(rosters: RosterRow[], bouts: BoutWithEvent[]): RosterSlot[] {
  const now = new Date();
  return rosters.map((r) => {
    const mine = bouts.filter(
      (b) => b.fighter_a_id === r.fighter_id || b.fighter_b_id === r.fighter_id
    );
    const upcoming = mine
      .filter((b) => b.status === 'scheduled' && b.event.status !== 'completed')
      .sort(
        (a, b) => new Date(a.event.event_date).getTime() - new Date(b.event.event_date).getTime()
      );
    const isLocked = mine.some(
      (b) => b.status === 'scheduled' && isEventLocked(b.event, now)
    );
    return {
      ...r,
      slot_type: SLOT_DISPLAY[r.slot] ?? r.slot,
      next_bout: upcoming[0] ?? null,
      is_locked: isLocked,
    };
  });
}

/** Full enriched roster (fighter + next bout + lock state) for one membership. */
export async function fetchRosterSlots(
  supabase: SupabaseClient,
  membershipId: string
): Promise<RosterSlot[]> {
  const { data } = await supabase
    .from('rosters')
    .select('*, fighter:fighters(*)')
    .eq('membership_id', membershipId);
  const rosters = (data as RosterRow[]) ?? [];
  const bouts = await fetchRelevantBouts(supabase, rosters.map((r) => r.fighter_id));
  return enrichRosterSlots(rosters, bouts);
}

/**
 * fighter_id → next scheduled bout info (date, event, opponent) across all
 * future events. Drives the market page "fights soon" sorting and cards.
 */
export async function fetchUpcomingBoutMap(
  supabase: SupabaseClient
): Promise<Record<string, UpcomingBoutInfo>> {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from('bouts')
    .select(
      `fighter_a_id, fighter_b_id,
       fighter_a:${FK_BOUT_FIGHTER_A}(name),
       fighter_b:${FK_BOUT_FIGHTER_B}(name),
       event:events!inner(name, event_date)`
    )
    .eq('status', 'scheduled')
    .gte('event.event_date', nowIso);

  type Row = {
    fighter_a_id: string;
    fighter_b_id: string;
    fighter_a: { name: string } | null;
    fighter_b: { name: string } | null;
    event: { name: string; event_date: string } | null;
  };

  const map: Record<string, UpcomingBoutInfo> = {};
  ((data as unknown as Row[]) ?? []).forEach((b) => {
    if (!b.event) return;
    const entries: Array<[string, string | null]> = [
      [b.fighter_a_id, b.fighter_b?.name ?? null],
      [b.fighter_b_id, b.fighter_a?.name ?? null],
    ];
    for (const [fid, opponent] of entries) {
      const existing = map[fid];
      if (!existing || new Date(b.event.event_date) < new Date(existing.event_date)) {
        map[fid] = {
          event_date: b.event.event_date,
          event_name: b.event.name,
          opponent_name: opponent,
        };
      }
    }
  });
  return map;
}

/** fighter_id → owning team name for every rostered fighter in a league. */
export async function fetchOwnershipMap(
  supabase: SupabaseClient,
  leagueId: string
): Promise<{ owners: Record<string, string>; membershipIds: string[] }> {
  const { data: memberships } = await supabase
    .from('league_memberships')
    .select('id, team_name')
    .eq('league_id', leagueId);

  const rows = (memberships as Array<{ id: string; team_name: string }>) ?? [];
  const nameById: Record<string, string> = {};
  rows.forEach((m) => { nameById[m.id] = m.team_name; });

  const owners: Record<string, string> = {};
  if (rows.length > 0) {
    const { data: rosters } = await supabase
      .from('rosters')
      .select('fighter_id, membership_id')
      .in('membership_id', rows.map((m) => m.id));
    ((rosters as Array<{ fighter_id: string; membership_id: string }>) ?? []).forEach((r) => {
      owners[r.fighter_id] = nameById[r.membership_id] ?? 'Unknown';
    });
  }
  return { owners, membershipIds: rows.map((m) => m.id) };
}
