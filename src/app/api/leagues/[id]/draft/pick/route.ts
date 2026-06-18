import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getMembership, getDraftByLeagueId, getLeagueMembers } from "@/lib/db/queries";
import { db } from "@/lib/db";
import {
  drafts, draftPicks, rosters, transactions, leagues, leagueMemberships, fighters,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getMemberForPick, getRound, getTotalPicks, resolveSlot } from "@/lib/draft/snake";
import { nanoid } from "@/lib/utils/nanoid";
import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/push/send";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const user = await requireUser();
    const { fighterId } = await request.json();

    const [membership, draft] = await Promise.all([
      getMembership(leagueId, user.id),
      getDraftByLeagueId(leagueId),
    ]);

    if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });
    if (!draft || draft.status !== "in_progress") {
      return NextResponse.json({ error: "Draft is not in progress" }, { status: 400 });
    }

    const draftOrder = draft.draftOrder as string[];
    const expectedMembershipId = getMemberForPick(draft.currentPickNumber, draftOrder);

    if (expectedMembershipId !== membership.id) {
      return NextResponse.json({ error: "Not your turn" }, { status: 400 });
    }

    if (draft.clockExpiresAt && new Date() > new Date(draft.clockExpiresAt)) {
      return NextResponse.json({ error: "Clock expired — autopick in progress" }, { status: 400 });
    }

    // Validate fighter availability
    const [fighter] = await db.select().from(fighters).where(eq(fighters.id, fighterId));
    if (!fighter) return NextResponse.json({ error: "Fighter not found" }, { status: 404 });

    const [alreadyPicked] = await db.select().from(draftPicks)
      .where(and(eq(draftPicks.draftId, draft.id), eq(draftPicks.fighterId, fighterId)));
    if (alreadyPicked) return NextResponse.json({ error: "Fighter already drafted" }, { status: 409 });

    // Resolve slot
    const existingPicks = await db.select().from(draftPicks)
      .where(and(eq(draftPicks.draftId, draft.id), eq(draftPicks.membershipId, membership.id)));
    const usedSlots = new Set(existingPicks.map(p => p.slot).filter(Boolean) as string[]);
    const slot = resolveSlot(fighter.weightClass, usedSlots);
    if (!slot) {
      return NextResponse.json({ error: "No eligible slot for this fighter on your roster" }, { status: 400 });
    }

    const pickNumber = draft.currentPickNumber;
    const round = getRound(pickNumber, draftOrder.length);
    const totalPicks = getTotalPicks(draftOrder.length);
    const nextPickNumber = pickNumber + 1;
    const isDraftComplete = nextPickNumber >= totalPicks;

    await db.transaction(async (tx) => {
      // Record pick
      await tx.insert(draftPicks).values({
        id: nanoid(),
        draftId: draft.id,
        pickNumber,
        round,
        membershipId: membership.id,
        fighterId,
        slot: slot as any,
        pickedAt: new Date(),
        isAutopick: false,
      });

      await tx.insert(transactions).values({
        id: nanoid(),
        leagueId,
        membershipId: membership.id,
        type: "draft_pick",
        fighterId,
        slot: slot as any,
        wasLockedFighter: false,
      });

      if (isDraftComplete) {
        // Populate rosters from all draft picks
        const allPicks = await tx.select().from(draftPicks)
          .where(eq(draftPicks.draftId, draft.id));

        for (const pick of allPicks) {
          if (!pick.fighterId || !pick.slot) continue;
          await tx.insert(rosters).values({
            id: nanoid(),
            membershipId: pick.membershipId,
            leagueId,
            fighterId: pick.fighterId,
            slot: pick.slot,
            acquiredVia: "draft",
          }).onConflictDoNothing();
        }

        // Also add the current pick we just made
        await tx.insert(rosters).values({
          id: nanoid(),
          membershipId: membership.id,
          leagueId,
          fighterId,
          slot: slot as any,
          acquiredVia: "draft",
        }).onConflictDoNothing();

        await tx.update(drafts).set({ status: "completed", currentPickNumber: nextPickNumber }).where(eq(drafts.id, draft.id));
        await tx.update(leagues).set({ status: "active" }).where(eq(leagues.id, leagueId));
      } else {
        const nextExpiry = new Date(Date.now() + (draft.pickTimerSeconds * 1000));
        await tx.update(drafts).set({
          currentPickNumber: nextPickNumber,
          clockExpiresAt: nextExpiry,
        }).where(eq(drafts.id, draft.id));
      }
    });

    // Broadcast via Supabase Realtime
    const supabase = await createClient();
    await supabase.channel(`draft:${leagueId}`).send({
      type: "broadcast",
      event: isDraftComplete ? "draft:complete" : "draft:picked",
      payload: { pickNumber, fighterId, slot, membershipId: membership.id, nextPick: nextPickNumber },
    });

    // Push notifications (fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const draftUrl = `${appUrl}/leagues/${leagueId}/draft`;
    if (isDraftComplete) {
      const members = await getLeagueMembers(leagueId);
      await Promise.allSettled(
        members.map(m =>
          notifyUser(m.membership.userId, "results_posted", { leagueId }, {
            title: "Draft Complete!",
            body: "Rosters are set. Let the season begin.",
            url: `${appUrl}/leagues/${leagueId}?tab=team`,
          })
        )
      );
    } else {
      // Notify only the next on-clock member (skip if they have autodraft on)
      const [nextMembership] = await db
        .select()
        .from(leagueMemberships)
        .where(eq(leagueMemberships.id, getMemberForPick(nextPickNumber, draft.draftOrder as string[])));
      if (nextMembership && !nextMembership.autodraftEnabled) {
        await notifyUser(nextMembership.userId, "pick_on_clock", { leagueId, pickNumber: nextPickNumber }, {
          title: "You're on the clock!",
          body: `Pick ${nextPickNumber + 1} — make your selection.`,
          url: draftUrl,
        });
      }
    }

    return NextResponse.json({ ok: true, isDraftComplete });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
