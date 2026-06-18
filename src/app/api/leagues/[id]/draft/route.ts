import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getMembership, getDraftByLeagueId, getDraftPicks, getLeagueMembers, getDraftQueue } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { fighters, bouts, events } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
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

    const members = await getLeagueMembers(leagueId);

    const draft = await getDraftByLeagueId(leagueId);
    // No draft row yet (or not configured): return a usable shell so the room
    // renders the pre-draft lobby instead of getting stuck loading.
    if (!draft) {
      return NextResponse.json({ draft: null, picks: [], members, queue: [], availableFighters: [] });
    }

    const picks = await getDraftPicks(draft.id);
    const queue = await getDraftQueue(membership.id);

    // Available fighters = all active male fighters NOT yet drafted, enriched with upcoming bout info
    const draftedIds = picks.filter(p => p.pick.fighterId).map(p => p.pick.fighterId!);
    const rawFighters = await db
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
      .orderBy(desc(fighters.draftScore), fighters.name);

    // Attach upcoming bout data (next 90 days)
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const upcomingBouts = await db
      .select({ fighterAId: bouts.fighterAId, fighterBId: bouts.fighterBId, eventDate: events.eventDate })
      .from(bouts)
      .innerJoin(events, eq(bouts.eventId, events.id))
      .where(
        and(
          eq(bouts.status, "scheduled"),
          sql`${events.eventDate} >= ${now.toISOString()}`,
          sql`${events.eventDate} <= ${in90Days.toISOString()}`
        )
      );

    const upcomingMap = new Map<string, Date>();
    for (const b of upcomingBouts) {
      for (const fid of [b.fighterAId, b.fighterBId]) {
        if (!upcomingMap.has(fid) || b.eventDate < upcomingMap.get(fid)!) {
          upcomingMap.set(fid, b.eventDate);
        }
      }
    }

    const availableFighters = rawFighters.map(f => {
      const nextBoutDate = upcomingMap.get(f.id) ?? null;
      const daysSinceLastFight = f.lastFightAt
        ? Math.floor((now.getTime() - new Date(f.lastFightAt + "T12:00:00Z").getTime()) / 86_400_000)
        : null;
      return { ...f, hasUpcomingBout: !!nextBoutDate, nextBoutDate, daysSinceLastFight };
    });

    return NextResponse.json({ draft, picks, members, queue, availableFighters });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
