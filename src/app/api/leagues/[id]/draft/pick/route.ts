import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getMembership, getLeagueMembers } from "@/lib/db/queries";
import { db } from "@/lib/db";
import {
  drafts, draftPicks, rosters, transactions, leagues, leagueMemberships, fighters,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getMemberForPick, getRound, getTotalPicks, resolveSlot } from "@/lib/draft/snake";
import { nanoid } from "@/lib/utils/nanoid";
import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/push/send";

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const user = await requireUser();
    const { fighterId } = await request.json();

    const membership = await getMembership(leagueId, user.id);
    if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    // Everything happens under a row lock on the draft so a manual pick can never
    // race the autopick tick (which also locks the draft row). We re-read and
    // re-validate the current pick number *inside* the lock.
    const result = await db.transaction(async (tx) => {
      const [draft] = await tx.select().from(drafts)
        .where(eq(drafts.leagueId, leagueId)).for("update");

      if (!draft || draft.status !== "in_progress") {
        throw new HttpError(400, "Draft is not in progress");
      }

      const draftOrder = draft.draftOrder as string[];
      const pickNumber = draft.currentPickNumber;
      const expectedMembershipId = getMemberForPick(pickNumber, draftOrder);
      if (expectedMembershipId !== membership.id) {
        throw new HttpError(400, "Not your turn");
      }
      if (draft.clockExpiresAt && new Date() > new Date(draft.clockExpiresAt)) {
        throw new HttpError(400, "Clock expired — autopick in progress");
      }

      const [fighter] = await tx.select().from(fighters).where(eq(fighters.id, fighterId));
      if (!fighter) throw new HttpError(404, "Fighter not found");

      const [alreadyPicked] = await tx.select().from(draftPicks)
        .where(and(eq(draftPicks.draftId, draft.id), eq(draftPicks.fighterId, fighterId)));
      if (alreadyPicked) throw new HttpError(409, "Fighter already drafted");

      const existingPicks = await tx.select().from(draftPicks)
        .where(and(eq(draftPicks.draftId, draft.id), eq(draftPicks.membershipId, membership.id)));
      const usedSlots = new Set(existingPicks.map(p => p.slot).filter(Boolean) as string[]);
      const slot = resolveSlot(fighter.weightClass, usedSlots);
      if (!slot) throw new HttpError(400, "No eligible slot for this fighter on your roster");

      const round = getRound(pickNumber, draftOrder.length);
      const totalPicks = getTotalPicks(draftOrder.length);
      const nextPickNumber = pickNumber + 1;
      const isDraftComplete = nextPickNumber >= totalPicks;

      await tx.insert(draftPicks).values({
        id: nanoid(), draftId: draft.id, pickNumber, round,
        membershipId: membership.id, fighterId, slot: slot as any,
        pickedAt: new Date(), isAutopick: false,
      });
      await tx.insert(transactions).values({
        id: nanoid(), leagueId, membershipId: membership.id, type: "draft_pick",
        fighterId, slot: slot as any, wasLockedFighter: false,
      });

      if (isDraftComplete) {
        const allPicks = await tx.select().from(draftPicks).where(eq(draftPicks.draftId, draft.id));
        for (const pick of allPicks) {
          if (!pick.fighterId || !pick.slot) continue;
          await tx.insert(rosters).values({
            id: nanoid(), membershipId: pick.membershipId, leagueId,
            fighterId: pick.fighterId, slot: pick.slot, acquiredVia: "draft",
          }).onConflictDoNothing();
        }
        await tx.update(drafts).set({ status: "completed", currentPickNumber: nextPickNumber }).where(eq(drafts.id, draft.id));
        await tx.update(leagues).set({ status: "active" }).where(eq(leagues.id, leagueId));
      } else {
        const nextExpiry = new Date(Date.now() + draft.pickTimerSeconds * 1000);
        await tx.update(drafts).set({ currentPickNumber: nextPickNumber, clockExpiresAt: nextExpiry }).where(eq(drafts.id, draft.id));
      }

      return { pickNumber, slot, nextPickNumber, isDraftComplete, draftOrder };
    });

    const { pickNumber, slot, nextPickNumber, isDraftComplete, draftOrder } = result;

    // ── Post-commit side-effects. These must NEVER fail the pick: the draft state
    //    is already durably committed above. Wrap so a flaky socket/push can't 500. ──
    try {
      const supabase = await createClient();
      await supabase.channel(`draft:${leagueId}`).send({
        type: "broadcast",
        event: isDraftComplete ? "draft:complete" : "draft:picked",
        payload: { pickNumber, fighterId, slot, membershipId: membership.id, nextPick: nextPickNumber },
      });
    } catch (e) { console.error("draft broadcast failed", e); }

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      if (isDraftComplete) {
        const members = await getLeagueMembers(leagueId);
        await Promise.allSettled(members.map(m =>
          notifyUser(m.membership.userId, "results_posted", { leagueId }, {
            title: "Draft Complete!", body: "Rosters are set. Let the season begin.",
            url: `${appUrl}/leagues/${leagueId}?tab=team`,
          })
        ));
      } else {
        const [nextMembership] = await db.select().from(leagueMemberships)
          .where(eq(leagueMemberships.id, getMemberForPick(nextPickNumber, draftOrder)));
        if (nextMembership && !nextMembership.autodraftEnabled) {
          await notifyUser(nextMembership.userId, "pick_on_clock", { leagueId, pickNumber: nextPickNumber }, {
            title: "You're on the clock!", body: `Pick ${nextPickNumber + 1} — make your selection.`,
            url: `${appUrl}/leagues/${leagueId}/draft`,
          });
        }
      }
    } catch (e) { console.error("draft notify failed", e); }

    return NextResponse.json({ ok: true, isDraftComplete });
  } catch (err: any) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: err.message ?? "Pick failed" }, { status: 500 });
  }
}
