/**
 * Draft Worker — always-on Node.js process.
 * Monitors in-progress drafts, performs autopick on clock expiry or when autodraft is on.
 * Deploy to Render free tier or Fly.io.
 *
 * ENV: DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, CRON_SECRET,
 *      VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 */

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql as drizzleSql, eq, and, desc } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { getMemberForPick, getRound, getTotalPicks, resolveSlot } from "../src/lib/draft/snake";

const { DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

const pgClient = postgres(DATABASE_URL!);
const db = drizzle(pgClient, { schema });

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT ?? "mailto:admin@fantasymma.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

function nanoid(len = 21) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

async function sendPush(userId: string, payload: { title: string; body: string; url?: string }) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  const subs = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.userId, userId));
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, sub.id));
      }
    }
  }
}

async function performAutopick(draft: any, leagueId: string) {
  console.log(`[autopick] Draft ${draft.id}, pick ${draft.currentPickNumber}`);

  const draftOrder = draft.draftOrder as string[];
  const membershipId = getMemberForPick(draft.currentPickNumber, draftOrder);

  const existingPicks = await db.select().from(schema.draftPicks)
    .where(and(eq(schema.draftPicks.draftId, draft.id), eq(schema.draftPicks.membershipId, membershipId)));
  const usedSlots = new Set(existingPicks.map((p) => p.slot).filter(Boolean) as string[]);

  const allPicks = await db.select().from(schema.draftPicks).where(eq(schema.draftPicks.draftId, draft.id));
  const draftedIds = allPicks.filter((p) => p.fighterId).map((p) => p.fighterId!);

  const queue = await db.select({ queue: schema.draftQueues, fighter: schema.fighters })
    .from(schema.draftQueues)
    .innerJoin(schema.fighters, eq(schema.draftQueues.fighterId, schema.fighters.id))
    .where(eq(schema.draftQueues.membershipId, membershipId))
    .orderBy(schema.draftQueues.priority);

  let chosenFighter: any = null;
  let chosenSlot: string | null = null;

  for (const { fighter } of queue) {
    if (draftedIds.includes(fighter.id)) continue;
    const slot = resolveSlot(fighter.weightClass, usedSlots);
    if (slot) { chosenFighter = fighter; chosenSlot = slot; break; }
  }

  // Fallback: best by draftScore DESC, prefer fighters with upcoming bout
  if (!chosenFighter) {
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const available = await db.select().from(schema.fighters)
      .where(and(eq(schema.fighters.status, "active"), eq(schema.fighters.gender, "male")))
      .orderBy(desc(schema.fighters.draftScore), schema.fighters.name);

    const upcomingBouts = await db
      .select({ fighterAId: schema.bouts.fighterAId, fighterBId: schema.bouts.fighterBId })
      .from(schema.bouts)
      .innerJoin(schema.events, eq(schema.bouts.eventId, schema.events.id))
      .where(and(
        eq(schema.bouts.status, "scheduled"),
        drizzleSql`${schema.events.eventDate} >= ${now.toISOString()}`,
        drizzleSql`${schema.events.eventDate} <= ${in90Days.toISOString()}`
      ));

    const upcomingSet = new Set([
      ...upcomingBouts.map(b => b.fighterAId),
      ...upcomingBouts.map(b => b.fighterBId),
    ]);

    // Stable sort: upcoming first within draftScore groups
    const sorted = [...available].sort((a, b) => {
      const diff = (upcomingSet.has(b.id) ? 1 : 0) - (upcomingSet.has(a.id) ? 1 : 0);
      return diff !== 0 ? diff : (b.draftScore ?? 0) - (a.draftScore ?? 0);
    });

    for (const f of sorted) {
      if (draftedIds.includes(f.id)) continue;
      const slot = resolveSlot(f.weightClass, usedSlots);
      if (slot) { chosenFighter = f; chosenSlot = slot; break; }
    }
  }

  if (!chosenFighter || !chosenSlot) {
    console.warn("[autopick] No eligible fighter found, completing draft");
    await db.update(schema.drafts).set({ status: "completed" }).where(eq(schema.drafts.id, draft.id));
    await supabase.channel(`draft:${leagueId}`).send({ type: "broadcast", event: "draft:complete", payload: {} });
    return;
  }

  const round = getRound(draft.currentPickNumber, draftOrder.length);
  const totalPicks = getTotalPicks(draftOrder.length);
  const nextPickNumber = draft.currentPickNumber + 1;
  const isDraftComplete = nextPickNumber >= totalPicks;

  await db.insert(schema.draftPicks).values({
    id: nanoid(), draftId: draft.id, pickNumber: draft.currentPickNumber, round, membershipId,
    fighterId: chosenFighter.id, slot: chosenSlot as any, pickedAt: new Date(), isAutopick: true,
  });

  await db.insert(schema.transactions).values({
    id: nanoid(), leagueId, membershipId, type: "draft_pick",
    fighterId: chosenFighter.id, slot: chosenSlot as any, wasLockedFighter: false,
  });

  if (isDraftComplete) {
    const finalPicks = await db.select().from(schema.draftPicks).where(eq(schema.draftPicks.draftId, draft.id));
    for (const pick of finalPicks) {
      if (!pick.fighterId || !pick.slot) continue;
      await db.insert(schema.rosters).values({
        id: nanoid(), membershipId: pick.membershipId, leagueId,
        fighterId: pick.fighterId, slot: pick.slot, acquiredVia: "draft",
      }).onConflictDoNothing();
    }
    await db.update(schema.drafts).set({ status: "completed", currentPickNumber: nextPickNumber }).where(eq(schema.drafts.id, draft.id));
    await db.update(schema.leagues).set({ status: "active" }).where(eq(schema.leagues.id, leagueId));
    await supabase.channel(`draft:${leagueId}`).send({ type: "broadcast", event: "draft:complete", payload: {} });

    const members = await db.select().from(schema.leagueMemberships).where(eq(schema.leagueMemberships.leagueId, leagueId));
    await Promise.allSettled(members.map(m =>
      sendPush(m.userId, { title: "Draft Complete!", body: "Rosters are set. Let the season begin." })
    ));
  } else {
    const nextExpiry = new Date(Date.now() + draft.pickTimerSeconds * 1000);
    await db.update(schema.drafts).set({ currentPickNumber: nextPickNumber, clockExpiresAt: nextExpiry }).where(eq(schema.drafts.id, draft.id));
    await supabase.channel(`draft:${leagueId}`).send({
      type: "broadcast",
      event: "draft:picked",
      payload: { pickNumber: draft.currentPickNumber, fighterId: chosenFighter.id, isAutopick: true, nextPick: nextPickNumber },
    });

    const nextMembershipId = getMemberForPick(nextPickNumber, draftOrder);
    const [nextMembership] = await db.select().from(schema.leagueMemberships).where(eq(schema.leagueMemberships.id, nextMembershipId));
    if (nextMembership && !nextMembership.autodraftEnabled) {
      await sendPush(nextMembership.userId, { title: "You're on the clock!", body: `Pick ${nextPickNumber + 1} — make your selection.` });
    }
  }
}

async function tick() {
  const now = new Date();

  const activeDrafts = await db
    .select({ draft: schema.drafts, league: schema.leagues })
    .from(schema.drafts)
    .innerJoin(schema.leagues, eq(schema.drafts.leagueId, schema.leagues.id))
    .where(eq(schema.drafts.status, "in_progress"));

  for (const { draft, league } of activeDrafts) {
    if (!draft.clockExpiresAt) continue;

    const draftOrder = draft.draftOrder as string[];
    const currentMembershipId = getMemberForPick(draft.currentPickNumber, draftOrder);

    const [currentMembership] = await db
      .select()
      .from(schema.leagueMemberships)
      .where(eq(schema.leagueMemberships.id, currentMembershipId));

    const clockExpired = new Date(draft.clockExpiresAt) <= now;
    const shouldAutopick = clockExpired || (currentMembership?.autodraftEnabled ?? false);

    if (!shouldAutopick) continue;

    try {
      await performAutopick(draft, league.id);
    } catch (err) {
      console.error(`[autopick error] Draft ${draft.id}:`, err);
    }
  }
}

console.log("Draft worker started");
setInterval(tick, 2000);
tick();
