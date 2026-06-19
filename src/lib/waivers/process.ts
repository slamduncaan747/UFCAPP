/**
 * Waiver-wire processing. Runs Monday morning (cron). For each league with
 * pending claims:
 *  - Order teams by REVERSE draft order (last drafter gets first preference).
 *  - Each team may win at most ONE claim. We try their priority-1 bid, then
 *    priority-2 if the first is no longer possible.
 *  - A claim is valid only if the add fighter is still a free agent, the drop
 *    fighter is still on the team's roster AND has already fought this season,
 *    and the resulting fighter has an open roster slot.
 * Everything for a league runs in one transaction so concurrent free-agent
 * adds can't interleave.
 */
import { db } from "@/lib/db";
import {
  drafts, rosters, transactions, waiverClaims, fighters, leagues, bouts, events,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { resolveSlot } from "@/lib/draft/snake";
import { nanoid } from "@/lib/utils/nanoid";

export type WaiverRunResult = { leaguesProcessed: number; claimsAwarded: number; winners: { membershipId: string; addFighterId: string }[] };

export async function processAllWaivers(now = new Date()): Promise<WaiverRunResult> {
  const leagueRows = await db
    .selectDistinct({ leagueId: waiverClaims.leagueId })
    .from(waiverClaims)
    .where(eq(waiverClaims.status, "pending"));

  let claimsAwarded = 0;
  const winners: { membershipId: string; addFighterId: string }[] = [];
  for (const { leagueId } of leagueRows) {
    const r = await processLeagueWaivers(leagueId, now);
    claimsAwarded += r.awarded;
    winners.push(...r.winners);
  }
  return { leaguesProcessed: leagueRows.length, claimsAwarded, winners };
}

export async function processLeagueWaivers(leagueId: string, now = new Date()) {
  return db.transaction(async (tx) => {
    const [league] = await tx.select().from(leagues).where(eq(leagues.id, leagueId));
    const [draft] = await tx.select().from(drafts).where(eq(drafts.leagueId, leagueId));
    const order = ((draft?.draftOrder as string[]) ?? []);
    // Reverse draft order = waiver priority (last pick gets first preference).
    const waiverOrder = [...order].reverse();

    const claims = await tx.select().from(waiverClaims)
      .where(and(eq(waiverClaims.leagueId, leagueId), eq(waiverClaims.status, "pending")));
    if (claims.length === 0) return { awarded: 0, winners: [] as { membershipId: string; addFighterId: string }[] };

    const byMember = new Map<string, typeof claims>();
    for (const c of claims) {
      if (!byMember.has(c.membershipId)) byMember.set(c.membershipId, [] as any);
      (byMember.get(c.membershipId) as any).push(c);
    }

    // Live league state we mutate as we award claims.
    const rosterRows = await tx.select().from(rosters).where(eq(rosters.leagueId, leagueId));
    const rosteredFighterIds = new Set(rosterRows.map((r) => r.fighterId));
    const usedSlots = new Map<string, Set<string>>();
    const ownedFighterSlot = new Map<string, Map<string, string>>(); // membership -> fighterId -> slot
    for (const r of rosterRows) {
      if (!usedSlots.has(r.membershipId)) usedSlots.set(r.membershipId, new Set());
      usedSlots.get(r.membershipId)!.add(r.slot);
      if (!ownedFighterSlot.has(r.membershipId)) ownedFighterSlot.set(r.membershipId, new Map());
      ownedFighterSlot.get(r.membershipId)!.set(r.fighterId, r.slot);
    }

    // Has this fighter already fought this season? (lock check)
    const fought = async (fighterId: string): Promise<boolean> => {
      const hit = await tx.select({ id: bouts.id }).from(bouts)
        .innerJoin(events, eq(bouts.eventId, events.id))
        .where(and(
          sql`(${bouts.fighterAId} = ${fighterId} OR ${bouts.fighterBId} = ${fighterId})`,
          sql`${events.lockTime} <= ${now.toISOString()}`,
          league?.seasonStartDate ? sql`${events.eventDate} >= ${league.seasonStartDate}` : sql`1=1`,
        )).limit(1);
      return hit.length > 0;
    };

    const mark = async (id: string, status: "won" | "lost" | "invalid", reason: string | null, slot: string | null) => {
      await tx.update(waiverClaims).set({ status, failureReason: reason, slot: slot as any, processedAt: now })
        .where(eq(waiverClaims.id, id));
    };

    const wonMembers = new Set<string>();
    const winners: { membershipId: string; addFighterId: string }[] = [];
    let awarded = 0;

    // Members in waiver priority order, then any stragglers not in the draft order.
    const ordered = [...waiverOrder, ...[...byMember.keys()].filter((m) => !waiverOrder.includes(m))];

    for (const membershipId of ordered) {
      const memberClaims = (byMember.get(membershipId) as any as typeof claims | undefined);
      if (!memberClaims) continue;
      memberClaims.sort((a, b) => a.bidPriority - b.bidPriority);

      for (const claim of memberClaims) {
        if (wonMembers.has(membershipId)) { await mark(claim.id, "lost", "Won a higher-priority bid", null); continue; }

        // Validate
        const owned = ownedFighterSlot.get(membershipId);
        const dropSlot = owned?.get(claim.dropFighterId);
        if (!dropSlot) { await mark(claim.id, "invalid", "Drop fighter no longer on your roster", null); continue; }
        if (rosteredFighterIds.has(claim.addFighterId)) { await mark(claim.id, "invalid", "Fighter was claimed by another team", null); continue; }
        const [addFighter] = await tx.select().from(fighters).where(eq(fighters.id, claim.addFighterId));
        if (!addFighter) { await mark(claim.id, "invalid", "Fighter unavailable", null); continue; }
        if (!(await fought(claim.dropFighterId))) { await mark(claim.id, "invalid", "You can only drop a fighter who has already fought", null); continue; }

        const used = new Set(usedSlots.get(membershipId) ?? []);
        used.delete(dropSlot);
        const slot = resolveSlot(addFighter.weightClass, used);
        if (!slot) { await mark(claim.id, "invalid", "No open roster slot for that fighter after the drop", null); continue; }

        // Execute the swap
        await tx.delete(rosters).where(and(eq(rosters.membershipId, membershipId), eq(rosters.fighterId, claim.dropFighterId)));
        await tx.insert(rosters).values({
          id: nanoid(), membershipId, leagueId, fighterId: claim.addFighterId, slot: slot as any, acquiredVia: "free_agent",
        });
        await tx.insert(transactions).values([
          { id: nanoid(), leagueId, membershipId, type: "drop", fighterId: claim.dropFighterId, slot: dropSlot as any, wasLockedFighter: true },
          { id: nanoid(), leagueId, membershipId, type: "add", fighterId: claim.addFighterId, slot: slot as any, wasLockedFighter: false },
        ]);
        await mark(claim.id, "won", null, slot);

        // Update live state
        rosteredFighterIds.delete(claim.dropFighterId);
        rosteredFighterIds.add(claim.addFighterId);
        const us = usedSlots.get(membershipId)!; us.delete(dropSlot); us.add(slot);
        owned!.delete(claim.dropFighterId); owned!.set(claim.addFighterId, slot);
        wonMembers.add(membershipId);
        winners.push({ membershipId, addFighterId: claim.addFighterId });
        awarded++;
      }
    }

    return { awarded, winners };
  });
}
