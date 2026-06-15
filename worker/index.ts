/**
 * Draft Worker — always-on Node.js process.
 * Monitors in-progress drafts, performs autopick on clock expiry, broadcasts.
 * Deploy to Render free tier or Fly.io.
 *
 * ENV: DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, CRON_SECRET
 */

import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getMemberForPick, getRound, getTotalPicks, resolveSlot } from "../src/lib/draft/snake";

const { DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

const sql = postgres(DATABASE_URL!);
const db = drizzle(sql, { schema });

const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY!
);

function nanoid(len = 21) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

async function performAutopick(draft: any, leagueId: string) {
  console.log(`[autopick] Draft ${draft.id}, pick ${draft.currentPickNumber}`);

  const draftOrder = draft.draftOrder as string[];
  const membershipId = getMemberForPick(draft.currentPickNumber, draftOrder);

  // Get used slots for this membership
  const existingPicks = await db.select().from(schema.draftPicks)
    .where(and(eq(schema.draftPicks.draftId, draft.id), eq(schema.draftPicks.membershipId, membershipId)));
  const usedSlots = new Set(existingPicks.map((p) => p.slot).filter(Boolean) as string[]);

  // Get already-drafted fighter IDs
  const allPicks = await db.select().from(schema.draftPicks).where(eq(schema.draftPicks.draftId, draft.id));
  const draftedIds = allPicks.filter((p) => p.fighterId).map((p) => p.fighterId!);

  // Get queue for this member
  const queue = await db.select({ queue: schema.draftQueues, fighter: schema.fighters })
    .from(schema.draftQueues)
    .innerJoin(schema.fighters, eq(schema.draftQueues.fighterId, schema.fighters.id))
    .where(eq(schema.draftQueues.membershipId, membershipId))
    .orderBy(schema.draftQueues.priority);

  let chosenFighter: any = null;
  let chosenSlot: string | null = null;

  // Try queue first
  for (const { fighter } of queue) {
    if (draftedIds.includes(fighter.id)) continue;
    const slot = resolveSlot(fighter.weightClass, usedSlots);
    if (slot) {
      chosenFighter = fighter;
      chosenSlot = slot;
      break;
    }
  }

  // Fallback: best available by ranking
  if (!chosenFighter) {
    const available = await db.select().from(schema.fighters)
      .where(and(eq(schema.fighters.status, "active"), eq(schema.fighters.gender, "male")))
      .orderBy(schema.fighters.currentRanking, schema.fighters.name);

    for (const f of available) {
      if (draftedIds.includes(f.id)) continue;
      const slot = resolveSlot(f.weightClass, usedSlots);
      if (slot) {
        chosenFighter = f;
        chosenSlot = slot;
        break;
      }
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

  // Record pick
  await db.insert(schema.draftPicks).values({
    id: nanoid(),
    draftId: draft.id,
    pickNumber: draft.currentPickNumber,
    round,
    membershipId,
    fighterId: chosenFighter.id,
    slot: chosenSlot as any,
    pickedAt: new Date(),
    isAutopick: true,
  });

  await db.insert(schema.transactions).values({
    id: nanoid(),
    leagueId,
    membershipId,
    type: "draft_pick",
    fighterId: chosenFighter.id,
    slot: chosenSlot as any,
    wasLockedFighter: false,
  });

  if (isDraftComplete) {
    // Populate rosters
    const finalPicks = await db.select().from(schema.draftPicks).where(eq(schema.draftPicks.draftId, draft.id));
    for (const pick of finalPicks) {
      if (!pick.fighterId || !pick.slot) continue;
      await db.insert(schema.rosters).values({
        id: nanoid(),
        membershipId: pick.membershipId,
        leagueId,
        fighterId: pick.fighterId,
        slot: pick.slot,
        acquiredVia: "draft",
      }).onConflictDoNothing();
    }
    await db.update(schema.drafts).set({ status: "completed", currentPickNumber: nextPickNumber }).where(eq(schema.drafts.id, draft.id));
    await db.update(schema.leagues).set({ status: "active" }).where(eq(schema.leagues.id, leagueId));
    await supabase.channel(`draft:${leagueId}`).send({ type: "broadcast", event: "draft:complete", payload: {} });
  } else {
    const nextExpiry = new Date(Date.now() + draft.pickTimerSeconds * 1000);
    await db.update(schema.drafts).set({ currentPickNumber: nextPickNumber, clockExpiresAt: nextExpiry }).where(eq(schema.drafts.id, draft.id));
    await supabase.channel(`draft:${leagueId}`).send({
      type: "broadcast",
      event: "draft:picked",
      payload: { pickNumber: draft.currentPickNumber, fighterId: chosenFighter.id, isAutopick: true, nextPick: nextPickNumber },
    });
  }
}

async function tick() {
  const now = new Date();

  // Find in-progress drafts with expired clocks
  const expiredDrafts = await db
    .select({ draft: schema.drafts, league: schema.leagues })
    .from(schema.drafts)
    .innerJoin(schema.leagues, eq(schema.drafts.leagueId, schema.leagues.id))
    .where(and(
      eq(schema.drafts.status, "in_progress"),
    ));

  for (const { draft, league } of expiredDrafts) {
    if (!draft.clockExpiresAt) continue;
    if (new Date(draft.clockExpiresAt) > now) continue;
    try {
      await performAutopick(draft, league.id);
    } catch (err) {
      console.error(`[autopick error] Draft ${draft.id}:`, err);
    }
  }
}

console.log("Draft worker started");
setInterval(tick, 2000); // check every 2 seconds
tick();
