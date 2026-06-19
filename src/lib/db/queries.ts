import { db, withDbRetry } from "./index";
import {
  leagues, leagueMemberships, rosters, fighters, events, bouts,
  scores, transactions, drafts, draftPicks, draftQueues, notifications, profiles,
} from "./schema";
import { eq, and, inArray, sql, desc, asc, lte, isNull } from "drizzle-orm";

// ─── Profiles ──────────────────────────────────────────────────────────────

export async function getProfileById(userId: string) {
  const [p] = await withDbRetry(() => db.select().from(profiles).where(eq(profiles.id, userId)));
  return p ?? null;
}

// ─── Leagues ───────────────────────────────────────────────────────────────

export async function getLeagueById(leagueId: string) {
  const [l] = await withDbRetry(() => db.select().from(leagues).where(eq(leagues.id, leagueId)));
  return l ?? null;
}

export async function getLeagueByInviteCode(code: string) {
  const [l] = await db.select().from(leagues).where(eq(leagues.inviteCode, code));
  return l ?? null;
}

export async function getUserLeagues(userId: string) {
  return db
    .select({
      league: leagues,
      membership: leagueMemberships,
    })
    .from(leagueMemberships)
    .innerJoin(leagues, eq(leagueMemberships.leagueId, leagues.id))
    .where(eq(leagueMemberships.userId, userId))
    .orderBy(desc(leagues.createdAt));
}

export async function getMembership(leagueId: string, userId: string) {
  const [m] = await withDbRetry(() => db
    .select()
    .from(leagueMemberships)
    .where(and(eq(leagueMemberships.leagueId, leagueId), eq(leagueMemberships.userId, userId))));
  return m ?? null;
}

export async function getLeagueMembers(leagueId: string) {
  return db
    .select({ membership: leagueMemberships, profile: profiles })
    .from(leagueMemberships)
    .innerJoin(profiles, eq(leagueMemberships.userId, profiles.id))
    .where(eq(leagueMemberships.leagueId, leagueId))
    .orderBy(asc(leagueMemberships.joinedAt));
}

// ─── Rosters ──────────────────────────────────────────────────────────────

export async function getRoster(membershipId: string) {
  return db
    .select({ roster: rosters, fighter: fighters })
    .from(rosters)
    .innerJoin(fighters, eq(rosters.fighterId, fighters.id))
    .where(eq(rosters.membershipId, membershipId));
}

export async function getRosterByMembershipId(membershipId: string) {
  return getRoster(membershipId);
}

export async function getAllRostersForLeague(leagueId: string) {
  return db
    .select({ roster: rosters, fighter: fighters, membership: leagueMemberships })
    .from(rosters)
    .innerJoin(fighters, eq(rosters.fighterId, fighters.id))
    .innerJoin(leagueMemberships, eq(rosters.membershipId, leagueMemberships.id))
    .where(eq(rosters.leagueId, leagueId));
}

// ─── Free agents ──────────────────────────────────────────────────────────

export async function getFreeAgents(leagueId: string, weightClass?: string) {
  // Get all rostered fighter IDs in this league
  const rostered = await db
    .select({ fighterId: rosters.fighterId })
    .from(rosters)
    .where(eq(rosters.leagueId, leagueId));

  const rosteredIds = rostered.map((r) => r.fighterId);

  const query = db
    .select()
    .from(fighters)
    .where(
      and(
        eq(fighters.status, "active"),
        eq(fighters.gender, "male"),
        rosteredIds.length > 0 ? sql`${fighters.id} NOT IN (${sql.join(rosteredIds.map(id => sql`${id}`), sql`, `)})` : sql`1=1`,
        weightClass ? eq(fighters.weightClass, weightClass as any) : sql`1=1`
      )
    )
    .orderBy(desc(fighters.draftScore), asc(fighters.name));

  return query;
}

// ─── Fighter lock state ───────────────────────────────────────────────────

export async function getFighterLockState(
  fighterId: string,
  leagueId: string
): Promise<"LOCKED" | "UNLOCKED"> {
  // A fighter is locked if any of their bouts in the league's season has event.lock_time <= now()
  const league = await getLeagueById(leagueId);
  if (!league) return "UNLOCKED";

  const fightedBout = await db
    .select({ boutId: bouts.id })
    .from(bouts)
    .innerJoin(events, eq(bouts.eventId, events.id))
    .where(
      and(
        sql`(${bouts.fighterAId} = ${fighterId} OR ${bouts.fighterBId} = ${fighterId})`,
        lte(events.lockTime, sql`NOW()`),
        sql`${events.eventDate} >= ${league.seasonStartDate}`
      )
    )
    .limit(1);

  return fightedBout.length > 0 ? "LOCKED" : "UNLOCKED";
}

// ─── Scores / standings ───────────────────────────────────────────────────

export async function getStandings(leagueId: string) {
  return db
    .select({
      membershipId: leagueMemberships.id,
      teamName: leagueMemberships.teamName,
      userId: leagueMemberships.userId,
      displayName: profiles.displayName,
      totalPoints: sql<number>`COALESCE(SUM(${scores.points}), 0)`.as("total_points"),
    })
    .from(leagueMemberships)
    .innerJoin(profiles, eq(leagueMemberships.userId, profiles.id))
    .leftJoin(scores, eq(scores.membershipId, leagueMemberships.id))
    .where(eq(leagueMemberships.leagueId, leagueId))
    .groupBy(leagueMemberships.id, leagueMemberships.teamName, leagueMemberships.userId, profiles.displayName)
    .orderBy(sql`total_points DESC`);
}

export async function getTeamScoreBreakdown(membershipId: string) {
  return db
    .select({ score: scores, fighter: fighters, bout: bouts, event: events })
    .from(scores)
    .innerJoin(fighters, eq(scores.fighterId, fighters.id))
    .innerJoin(bouts, eq(scores.boutId, bouts.id))
    .innerJoin(events, eq(bouts.eventId, events.id))
    .where(eq(scores.membershipId, membershipId))
    .orderBy(desc(events.eventDate));
}

// ─── Transactions ─────────────────────────────────────────────────────────

export async function getLeagueTransactions(leagueId: string, limit = 50) {
  return db
    .select({ tx: transactions, fighter: fighters, membership: leagueMemberships, profile: profiles })
    .from(transactions)
    .innerJoin(fighters, eq(transactions.fighterId, fighters.id))
    .innerJoin(leagueMemberships, eq(transactions.membershipId, leagueMemberships.id))
    .innerJoin(profiles, eq(leagueMemberships.userId, profiles.id))
    .where(eq(transactions.leagueId, leagueId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}

// ─── Events ───────────────────────────────────────────────────────────────

export async function getUpcomingEvents(limit = 5) {
  return db
    .select()
    .from(events)
    .where(sql`${events.status} != 'completed'`)
    .orderBy(asc(events.eventDate))
    .limit(limit);
}

export async function getEventWithBouts(eventId: string) {
  const event = await db.select().from(events).where(eq(events.id, eventId)).then((r) => r[0]);
  if (!event) return null;

  const boutList = await db
    .select({ bout: bouts, fighterA: fighters, fighterB: fighters })
    .from(bouts)
    .where(eq(bouts.eventId, eventId))
    .orderBy(desc(bouts.isMainEvent), desc(bouts.boutOrder));

  return { event, bouts: boutList };
}

// ─── Draft ────────────────────────────────────────────────────────────────

export async function getDraftByLeagueId(leagueId: string) {
  const [d] = await withDbRetry(() => db.select().from(drafts).where(eq(drafts.leagueId, leagueId)));
  return d ?? null;
}

export async function getDraftPicks(draftId: string) {
  return db
    .select({ pick: draftPicks, fighter: fighters, membership: leagueMemberships })
    .from(draftPicks)
    .leftJoin(fighters, eq(draftPicks.fighterId, fighters.id))
    .innerJoin(leagueMemberships, eq(draftPicks.membershipId, leagueMemberships.id))
    .where(eq(draftPicks.draftId, draftId))
    .orderBy(asc(draftPicks.pickNumber));
}

export async function getDraftQueue(membershipId: string) {
  return db
    .select({ queue: draftQueues, fighter: fighters })
    .from(draftQueues)
    .innerJoin(fighters, eq(draftQueues.fighterId, fighters.id))
    .where(eq(draftQueues.membershipId, membershipId))
    .orderBy(asc(draftQueues.priority));
}

// ─── Notifications ────────────────────────────────────────────────────────

export async function getUserNotifications(userId: string, unreadOnly = false) {
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        unreadOnly ? isNull(notifications.readAt) : sql`1=1`
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}
