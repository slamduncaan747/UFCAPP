import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getMembership, getLeagueById, getFighterLockState } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { waiverClaims, rosters, fighters } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "@/lib/utils/nanoid";
import { currentWaiverPeriod } from "@/lib/waivers/period";

// GET: my pending claims for the current period + the fighters I'm allowed to
// drop (those who have already fought).
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leagueId } = await params;
    const user = await requireUser();
    const membership = await getMembership(leagueId, user.id);
    if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    const period = currentWaiverPeriod();
    const claims = await db.select({ claim: waiverClaims, add: fighters })
      .from(waiverClaims)
      .innerJoin(fighters, eq(waiverClaims.addFighterId, fighters.id))
      .where(and(
        eq(waiverClaims.membershipId, membership.id),
        eq(waiverClaims.period, period),
        eq(waiverClaims.status, "pending"),
      ));

    // Droppable = my roster fighters who have already fought this season.
    const myRoster = await db.select({ roster: rosters, fighter: fighters })
      .from(rosters).innerJoin(fighters, eq(rosters.fighterId, fighters.id))
      .where(eq(rosters.membershipId, membership.id));
    const droppable: any[] = [];
    for (const { roster, fighter } of myRoster) {
      const lock = await getFighterLockState(fighter.id, leagueId);
      if (lock === "LOCKED") droppable.push({ id: fighter.id, name: fighter.name, weightClass: fighter.weightClass, slot: roster.slot, photoUrl: fighter.photoUrl });
    }

    return NextResponse.json({ period, claims, droppable });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: submit / replace a bid. Body: { addFighterId, dropFighterId, bidPriority }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leagueId } = await params;
    const user = await requireUser();
    const { addFighterId, dropFighterId, bidPriority } = await request.json();

    const priority = Number(bidPriority);
    if (![1, 2].includes(priority)) return NextResponse.json({ error: "bidPriority must be 1 or 2" }, { status: 400 });
    if (!addFighterId || !dropFighterId) return NextResponse.json({ error: "Add and drop fighters are required" }, { status: 400 });

    const [membership, league] = await Promise.all([getMembership(leagueId, user.id), getLeagueById(leagueId)]);
    if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });
    if (!league || league.status !== "active") return NextResponse.json({ error: "Waivers open once the season is active" }, { status: 400 });

    // Add fighter must be a free agent in this league.
    const [add] = await db.select().from(fighters).where(eq(fighters.id, addFighterId));
    if (!add) return NextResponse.json({ error: "Add fighter not found" }, { status: 404 });
    const [addRostered] = await db.select().from(rosters).where(and(eq(rosters.leagueId, leagueId), eq(rosters.fighterId, addFighterId)));
    if (addRostered) return NextResponse.json({ error: `${add.name} is already on a roster` }, { status: 409 });

    // Drop fighter must be on MY roster and have already fought.
    const [dropRoster] = await db.select().from(rosters).where(and(eq(rosters.membershipId, membership.id), eq(rosters.fighterId, dropFighterId)));
    if (!dropRoster) return NextResponse.json({ error: "Drop fighter is not on your roster" }, { status: 400 });
    const lock = await getFighterLockState(dropFighterId, leagueId);
    if (lock !== "LOCKED") return NextResponse.json({ error: "You can only drop a fighter who has already fought" }, { status: 400 });

    const period = currentWaiverPeriod();

    // Enforce max 2 distinct bids per period (the unique index also guards priority).
    const existing = await db.select().from(waiverClaims).where(and(
      eq(waiverClaims.membershipId, membership.id), eq(waiverClaims.period, period), eq(waiverClaims.status, "pending"),
    ));
    const other = existing.find((c) => c.bidPriority !== priority);
    if (other && other.addFighterId === addFighterId) {
      return NextResponse.json({ error: "You already have a bid on that fighter" }, { status: 400 });
    }

    // Upsert this priority slot.
    const current = existing.find((c) => c.bidPriority === priority);
    if (current) {
      await db.update(waiverClaims).set({ addFighterId, dropFighterId, createdAt: new Date() }).where(eq(waiverClaims.id, current.id));
    } else {
      await db.insert(waiverClaims).values({
        id: nanoid(), leagueId, membershipId: membership.id, addFighterId, dropFighterId,
        bidPriority: priority, status: "pending", period,
      });
    }

    return NextResponse.json({ ok: true, period });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE ?priority=1  — cancel a pending bid.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leagueId } = await params;
    const user = await requireUser();
    const priority = Number(new URL(request.url).searchParams.get("priority"));
    const membership = await getMembership(leagueId, user.id);
    if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    await db.delete(waiverClaims).where(and(
      eq(waiverClaims.membershipId, membership.id),
      eq(waiverClaims.period, currentWaiverPeriod()),
      eq(waiverClaims.bidPriority, priority),
      eq(waiverClaims.status, "pending"),
    ));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
