/**
 * Server-side autopick engine — runs inside the request path (no always-on worker needed).
 *
 * Picks for the on-clock member when the clock has expired OR that member has
 * auto-draft enabled. Runs in a single row-locked transaction so concurrent
 * callers (every connected client pings this every ~2s) can't double-pick, and
 * advances through consecutive auto-draft members in one pass.
 */
import { db } from "@/lib/db";
import {
  drafts, draftPicks, rosters, transactions, leagues, leagueMemberships,
  fighters, draftQueues, bouts, events,
} from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getMemberForPick, getRound, getTotalPicks, resolveSlot } from "@/lib/draft/snake";
import { nanoid } from "@/lib/utils/nanoid";

export type AutopickResult = { changed: boolean; completed: boolean; picksMade: number };

export async function runAutopick(leagueId: string): Promise<AutopickResult> {
  let picksMade = 0;
  let completed = false;

  await db.transaction(async (tx) => {
    // Lock the draft row so concurrent ticks serialize on it.
    const [draft] = await tx.select().from(drafts)
      .where(eq(drafts.leagueId, leagueId)).for("update");
    if (!draft || draft.status !== "in_progress") return;

    const draftOrder = draft.draftOrder as string[];
    if (!draftOrder?.length) return;
    const totalPicks = getTotalPicks(draftOrder.length);
    const timerMs = (draft.pickTimerSeconds ?? 60) * 1000;

    // Preload candidate pool once (active male fighters, best first, upcoming preferred).
    const now = new Date();
    const in90 = new Date(now.getTime() + 90 * 86_400_000);
    const upcoming = await tx
      .select({ a: bouts.fighterAId, b: bouts.fighterBId })
      .from(bouts).innerJoin(events, eq(bouts.eventId, events.id))
      .where(and(
        eq(bouts.status, "scheduled"),
        sql`${events.eventDate} >= ${now.toISOString()}`,
        sql`${events.eventDate} <= ${in90.toISOString()}`,
      ));
    const upcomingSet = new Set<string>();
    for (const u of upcoming) { upcomingSet.add(u.a); upcomingSet.add(u.b); }

    const pool = await tx.select().from(fighters)
      .where(and(eq(fighters.status, "active"), eq(fighters.gender, "male")))
      .orderBy(desc(fighters.draftScore), fighters.name);
    const fallback = [...pool].sort((a, b) => {
      const d = (upcomingSet.has(b.id) ? 1 : 0) - (upcomingSet.has(a.id) ? 1 : 0);
      return d !== 0 ? d : (b.draftScore ?? 0) - (a.draftScore ?? 0);
    });
    const poolById = new Map(pool.map((f) => [f.id, f]));

    // In-memory mirrors of mutable state so we don't re-query each pick.
    const existing = await tx.select().from(draftPicks).where(eq(draftPicks.draftId, draft.id));
    const draftedIds = new Set(existing.filter((p) => p.fighterId).map((p) => p.fighterId!));
    const usedSlots = new Map<string, Set<string>>();
    for (const p of existing) {
      if (!usedSlots.has(p.membershipId)) usedSlots.set(p.membershipId, new Set());
      if (p.slot) usedSlots.get(p.membershipId)!.add(p.slot);
    }
    const queueCache = new Map<string, string[]>();
    const memberCache = new Map<string, typeof leagueMemberships.$inferSelect>();

    let currentPick = draft.currentPickNumber;
    let clockExpiresAt = draft.clockExpiresAt;

    for (let guard = 0; guard <= totalPicks && currentPick < totalPicks; guard++) {
      const membershipId = getMemberForPick(currentPick, draftOrder);
      let member = memberCache.get(membershipId);
      if (!member) {
        [member] = await tx.select().from(leagueMemberships).where(eq(leagueMemberships.id, membershipId));
        if (member) memberCache.set(membershipId, member);
      }

      const expired = clockExpiresAt ? new Date(clockExpiresAt) <= new Date() : false;
      if (!expired && !(member?.autodraftEnabled ?? false)) break;

      const used = usedSlots.get(membershipId) ?? new Set<string>();

      // 1) Honor the member's queue in priority order.
      let chosen: typeof pool[number] | undefined;
      let slot: string | null = null;
      if (!queueCache.has(membershipId)) {
        const q = await tx.select({ fid: draftQueues.fighterId }).from(draftQueues)
          .where(eq(draftQueues.membershipId, membershipId)).orderBy(draftQueues.priority);
        queueCache.set(membershipId, q.map((x) => x.fid));
      }
      for (const fid of queueCache.get(membershipId)!) {
        if (draftedIds.has(fid)) continue;
        const f = poolById.get(fid);
        if (!f) continue;
        const s = resolveSlot(f.weightClass, used);
        if (s) { chosen = f; slot = s; break; }
      }
      // 2) Fallback to best available.
      if (!chosen) {
        for (const f of fallback) {
          if (draftedIds.has(f.id)) continue;
          const s = resolveSlot(f.weightClass, used);
          if (s) { chosen = f; slot = s; break; }
        }
      }
      if (!chosen || !slot) break; // pool exhausted for this roster

      const round = getRound(currentPick, draftOrder.length);
      await tx.insert(draftPicks).values({
        id: nanoid(), draftId: draft.id, pickNumber: currentPick, round,
        membershipId, fighterId: chosen.id, slot: slot as any,
        pickedAt: new Date(), isAutopick: true,
      });
      await tx.insert(transactions).values({
        id: nanoid(), leagueId, membershipId, type: "draft_pick",
        fighterId: chosen.id, slot: slot as any, wasLockedFighter: false,
      });

      draftedIds.add(chosen.id);
      used.add(slot); usedSlots.set(membershipId, used);
      currentPick += 1;
      clockExpiresAt = new Date(Date.now() + timerMs);
      picksMade += 1;
    }

    if (picksMade === 0) return;

    if (currentPick >= totalPicks) {
      const finalPicks = await tx.select().from(draftPicks).where(eq(draftPicks.draftId, draft.id));
      for (const p of finalPicks) {
        if (!p.fighterId || !p.slot) continue;
        await tx.insert(rosters).values({
          id: nanoid(), membershipId: p.membershipId, leagueId,
          fighterId: p.fighterId, slot: p.slot, acquiredVia: "draft",
        }).onConflictDoNothing();
      }
      await tx.update(drafts).set({ status: "completed", currentPickNumber: currentPick }).where(eq(drafts.id, draft.id));
      await tx.update(leagues).set({ status: "active" }).where(eq(leagues.id, leagueId));
      completed = true;
    } else {
      await tx.update(drafts).set({ currentPickNumber: currentPick, clockExpiresAt }).where(eq(drafts.id, draft.id));
    }
  });

  return { changed: picksMade > 0, completed, picksMade };
}
