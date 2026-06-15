import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { bouts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { scoreEvent } from "@/lib/scoring/orchestrator";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; eid: string }> }
) {
  try {
    const { id: leagueId, eid: eventId } = await params;
    const user = await requireUser();

    const membership = await getMembership(leagueId, user.id);
    if (!membership || membership.role !== "commissioner") {
      return NextResponse.json({ error: "Commissioner only" }, { status: 403 });
    }

    const { bonuses } = await request.json();
    // bonuses: [{ boutId, fotn, fighterAPotn, fighterBPotn, isTitleFight, isMainEvent }]

    for (const bonus of bonuses ?? []) {
      await db.update(bouts).set({
        fotn: !!bonus.fotn,
        fighterAPotn: !!bonus.fighterAPotn,
        fighterBPotn: !!bonus.fighterBPotn,
        isTitleFight: bonus.isTitleFight ?? undefined,
        isMainEvent: bonus.isMainEvent ?? undefined,
      }).where(eq(bouts.id, bonus.boutId));
    }

    // Re-score all bouts for this event
    await scoreEvent(eventId);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
