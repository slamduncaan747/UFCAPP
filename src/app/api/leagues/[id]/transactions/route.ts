import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { rosters, transactions, leagueMemberships, fighters } from "@/lib/db/schema";
import { getMembership, getFighterLockState } from "@/lib/db/queries";
import { eq, and } from "drizzle-orm";
import { nanoid } from "@/lib/utils/nanoid";

const WEIGHT_CLASS_TO_SLOT: Record<string, string> = {
  FLW: "FLW", BW: "BW", FW: "FW", LW: "LW",
  WW: "WW", MW: "MW", LHW: "LHW", HW: "HW",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const user = await requireUser();
    const { type, fighterId, slot } = await request.json();

    if (!type || !fighterId || !slot) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const membership = await getMembership(leagueId, user.id);
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this league" }, { status: 403 });
    }

    if (type === "add") {
      return await handleAdd({ leagueId, membership, fighterId, slot });
    }
    if (type === "drop") {
      return await handleDrop({ leagueId, membership, fighterId, slot });
    }

    return NextResponse.json({ error: "Unknown transaction type" }, { status: 400 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function handleAdd({ leagueId, membership, fighterId, slot }: any) {
  // Validate slot eligibility
  const [fighter] = await db.select().from(fighters).where(eq(fighters.id, fighterId));
  if (!fighter) return NextResponse.json({ error: "Fighter not found" }, { status: 404 });

  if (slot !== "WILDCARD" && fighter.weightClass !== slot) {
    return NextResponse.json({ error: `${fighter.name} is ${fighter.weightClass}, not eligible for ${slot}` }, { status: 400 });
  }

  // Check slot not already filled
  const [existingSlot] = await db.select().from(rosters)
    .where(and(eq(rosters.membershipId, membership.id), eq(rosters.slot, slot as any)));
  if (existingSlot) {
    return NextResponse.json({ error: `Slot ${slot} is already filled. Drop the current fighter first.` }, { status: 400 });
  }

  // Check FCFS — fighter not on any other roster in this league
  const [alreadyRostered] = await db.select().from(rosters)
    .where(and(eq(rosters.leagueId, leagueId), eq(rosters.fighterId, fighterId)));
  if (alreadyRostered) {
    return NextResponse.json({ error: `${fighter.name} was just claimed by another team.` }, { status: 409 });
  }

  await db.transaction(async (tx) => {
    await tx.insert(rosters).values({
      id: nanoid(),
      membershipId: membership.id,
      leagueId,
      fighterId,
      slot: slot as any,
      acquiredVia: "free_agent",
    });

    await tx.insert(transactions).values({
      id: nanoid(),
      leagueId,
      membershipId: membership.id,
      type: "add",
      fighterId,
      slot: slot as any,
      wasLockedFighter: false,
    });
  });

  return NextResponse.json({ ok: true });
}

async function handleDrop({ leagueId, membership, fighterId, slot }: any) {
  const lockState = await getFighterLockState(fighterId, leagueId);
  const isLocked = lockState === "LOCKED";

  if (isLocked) {
    if (membership.foughtDropUsed) {
      return NextResponse.json({ error: "Season Burn already used. You cannot drop locked fighters." }, { status: 400 });
    }
  }

  // Check fighter is actually on this roster
  const [rosterEntry] = await db.select().from(rosters)
    .where(and(eq(rosters.membershipId, membership.id), eq(rosters.fighterId, fighterId)));
  if (!rosterEntry) {
    return NextResponse.json({ error: "Fighter not on your roster" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await tx.delete(rosters).where(and(
      eq(rosters.membershipId, membership.id),
      eq(rosters.fighterId, fighterId)
    ));

    await tx.insert(transactions).values({
      id: nanoid(),
      leagueId,
      membershipId: membership.id,
      type: "drop",
      fighterId,
      slot: slot as any,
      wasLockedFighter: isLocked,
    });

    if (isLocked) {
      await tx.update(leagueMemberships)
        .set({ foughtDropUsed: true })
        .where(eq(leagueMemberships.id, membership.id));
    }
  });

  return NextResponse.json({ ok: true });
}
