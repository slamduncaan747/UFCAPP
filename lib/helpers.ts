import { Bout, CardSegment, Event, Fighter, SLOT_DISPLAY } from './types';

// PostgREST embedded-resource hints. The bouts→fighters FKs were created by
// drizzle with `_fighters_id_fk` suffixes, so the shorthand `!bouts_fighter_a_id_fkey`
// does NOT resolve — always use these exact constraint names.
export const FK_BOUT_FIGHTER_A = 'fighters!bouts_fighter_a_id_fighters_id_fk';
export const FK_BOUT_FIGHTER_B = 'fighters!bouts_fighter_b_id_fighters_id_fk';

export const BOUT_WITH_FIGHTERS_SELECT = `*, fighter_a:${FK_BOUT_FIGHTER_A}(*), fighter_b:${FK_BOUT_FIGHTER_B}(*)`;

// ─── Fighter display helpers ─────────────────────────────────────────────────

export function rankLabel(f: Pick<Fighter, 'current_ranking' | 'is_champion'> | null | undefined): string | null {
  if (!f) return null;
  if (f.is_champion) return 'C';
  if (f.current_ranking === null || f.current_ranking === undefined) return null;
  if (f.current_ranking === 0) return 'C';
  return `#${f.current_ranking}`;
}

export function recordString(f: Pick<Fighter, 'record_w' | 'record_l' | 'record_d'>): string {
  return `${f.record_w}-${f.record_l}-${f.record_d}`;
}

export function weightClassName(code: string): string {
  return SLOT_DISPLAY[code] ?? code;
}

export function lastName(name: string): string {
  return name.trim().split(' ').pop() ?? name;
}

/** True when the fighter beat a Top-15 opponent in this bout (used for bonus chips). */
export function beatRankedOpponent(bout: Bout, fighterId: string): boolean {
  return bout.fighter_a_id === fighterId ? bout.fighter_b_ranked : bout.fighter_a_ranked;
}

export function wasPerformanceBonus(bout: Bout, fighterId: string): boolean {
  if (bout.fotn) return true;
  return bout.fighter_a_id === fighterId ? bout.fighter_a_potn : bout.fighter_b_potn;
}

// ─── Bout / event ordering & state ───────────────────────────────────────────

const SEGMENT_RANK: Record<CardSegment, number> = { main: 2, prelim: 1, early_prelim: 0 };

/** Sort bouts as they appear on a fight card: main event → main card → prelims. */
export function cardOrder(a: Bout, b: Bout): number {
  if (a.is_main_event !== b.is_main_event) return a.is_main_event ? -1 : 1;
  const seg = (SEGMENT_RANK[b.card_segment] ?? 0) - (SEGMENT_RANK[a.card_segment] ?? 0);
  if (seg !== 0) return seg;
  return (b.bout_order ?? 0) - (a.bout_order ?? 0);
}

export function segmentLabel(segment: CardSegment): string {
  if (segment === 'main') return 'Main Card';
  if (segment === 'prelim') return 'Prelims';
  return 'Early Prelims';
}

/** An event locks rosters once its lock time passes (until results are final). */
export function isEventLocked(event: Pick<Event, 'lock_time' | 'event_date' | 'status'>, now = new Date()): boolean {
  if (event.status === 'in_progress') return true;
  if (event.status === 'completed') return false;
  const lock = new Date(event.lock_time ?? event.event_date);
  return lock <= now;
}

export function methodLabel(bout: Pick<Bout, 'method' | 'end_round'>): string {
  if (!bout.method) return '—';
  if (bout.method === 'DEC') return 'DEC';
  return bout.end_round ? `${bout.method} R${bout.end_round}` : bout.method;
}

export function formatEventDate(dateStr: string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  if (!dateStr) return 'TBD';
  return new Date(dateStr).toLocaleDateString('en-US', opts);
}

/** ISO-week identifier (e.g. "2026-W28") tagging which waiver run a claim belongs to. */
export function currentWaiverPeriod(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
