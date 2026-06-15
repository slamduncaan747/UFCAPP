import { db } from "@/lib/db";
import {
  bouts, rosters, scores, leagueMemberships, leagues, events,
} from "@/lib/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { computeBoutPoints } from "./engine";
import { nanoid } from "@/lib/utils/nanoid";

/**
 * Idempotent: computes fantasy points for a bout and upserts into scores.
 * Safe to re-run — corrects totals when bout data changes.
 */
export async function scoreBout(boutId: string) {
  const [bout] = await db.select().from(bouts).where(eq(bouts.id, boutId));
  if (!bout || bout.status !== "completed" || !bout.winnerId) return;

  // Find all active leagues whose season contains this event
  const [event] = await db.select().from(events).where(eq(events.id, bout.eventId));
  if (!event) return;

  const activeLeagues = await db
    .select()
    .from(leagues)
    .where(
      and(
        sql`${leagues.seasonStartDate} <= ${event.eventDate}`,
        sql`${leagues.status} IN ('active', 'drafting')`
      )
    );

  const boutInput = {
    fighterAId: bout.fighterAId,
    fighterBId: bout.fighterBId,
    winnerId: bout.winnerId,
    method: bout.method as any,
    isFinish: bout.isFinish,
    isTitleFight: bout.isTitleFight,
    isMainEvent: bout.isMainEvent,
    fotn: bout.fotn,
    fighterAPotn: bout.fighterAPotn,
    fighterBPotn: bout.fighterBPotn,
    fighterARanked: bout.fighterARanked,
    fighterBRanked: bout.fighterBRanked,
  };

  for (const league of activeLeagues) {
    // Find all rosters in this league that hold fighter A or B
    const relevantRosters = await db
      .select({ roster: rosters, membership: leagueMemberships })
      .from(rosters)
      .innerJoin(leagueMemberships, eq(rosters.membershipId, leagueMemberships.id))
      .where(
        and(
          eq(rosters.leagueId, league.id),
          or(
            eq(rosters.fighterId, bout.fighterAId),
            eq(rosters.fighterId, bout.fighterBId)
          )
        )
      );

    for (const { roster, membership } of relevantRosters) {
      const { total, breakdown } = computeBoutPoints(boutInput, roster.fighterId);

      await db
        .insert(scores)
        .values({
          id: nanoid(),
          membershipId: membership.id,
          boutId: bout.id,
          fighterId: roster.fighterId,
          points: total,
          breakdown,
        })
        .onConflictDoUpdate({
          target: [scores.membershipId, scores.boutId],
          set: { points: total, breakdown },
        });
    }
  }
}

/**
 * Re-score all bouts for an event (used after bonus confirmation).
 */
export async function scoreEvent(eventId: string) {
  const eventBouts = await db.select().from(bouts).where(eq(bouts.eventId, eventId));
  await Promise.all(eventBouts.map((b) => scoreBout(b.id)));
}
