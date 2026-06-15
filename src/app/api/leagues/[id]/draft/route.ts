import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getMembership, getDraftByLeagueId, getDraftPicks, getLeagueMembers, getDraftQueue } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { fighters, rosters } from "@/lib/db/schema";
import { eq, and, notInArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const user = await requireUser();
    const membership = await getMembership(leagueId, user.id);
    if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    const draft = await getDraftByLeagueId(leagueId);
    if (!draft) return NextResponse.json({ error: "No draft found" }, { status: 404 });

    const picks = await getDraftPicks(draft.id);
    const members = await getLeagueMembers(leagueId);
    const queue = await getDraftQueue(membership.id);

    // Available fighters = all active male fighters NOT yet drafted
    const draftedIds = picks.filter(p => p.pick.fighterId).map(p => p.pick.fighterId!);
    const availableFighters = await db
      .select()
      .from(fighters)
      .where(
        and(
          eq(fighters.status, "active"),
          eq(fighters.gender, "male"),
          draftedIds.length > 0
            ? sql`${fighters.id} NOT IN (${sql.join(draftedIds.map(id => sql`${id}`), sql`,`)})`
            : sql`1=1`
        )
      )
      .orderBy(fighters.currentRanking, fighters.name);

    return NextResponse.json({ draft, picks, members, queue, availableFighters });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
