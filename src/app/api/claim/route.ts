import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { leagues, leagueMemberships } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

async function publicLeague() {
  const [l] = await db.select().from(leagues)
    .where(and(eq(leagues.isPublic, true)))
    .orderBy(desc(leagues.createdAt)).limit(1);
  return l ?? null;
}

// GET: the public league + its unclaimed teams (and whether you're already in).
export async function GET() {
  try {
    const user = await requireUser();
    const league = await publicLeague();
    if (!league) return NextResponse.json({ league: null });

    const [mine] = await db.select().from(leagueMemberships)
      .where(and(eq(leagueMemberships.leagueId, league.id), eq(leagueMemberships.userId, user.id)));
    if (mine) return NextResponse.json({ alreadyMember: true, leagueId: league.id });

    const teams = await db.select({ id: leagueMemberships.id, teamName: leagueMemberships.teamName })
      .from(leagueMemberships)
      .where(and(eq(leagueMemberships.leagueId, league.id), eq(leagueMemberships.claimable, true)));

    return NextResponse.json({ leagueId: league.id, leagueName: league.name, teams });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST { membershipId }: claim a team — assigns it to you.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { membershipId } = await request.json();
    const league = await publicLeague();
    if (!league) return NextResponse.json({ error: "No league available" }, { status: 404 });

    // Don't let someone hold two teams.
    const [mine] = await db.select().from(leagueMemberships)
      .where(and(eq(leagueMemberships.leagueId, league.id), eq(leagueMemberships.userId, user.id)));
    if (mine) return NextResponse.json({ ok: true, leagueId: league.id });

    // Conditional update guards against two people grabbing the same team.
    const updated = await db.update(leagueMemberships)
      .set({ userId: user.id, claimable: false })
      .where(and(
        eq(leagueMemberships.id, membershipId),
        eq(leagueMemberships.leagueId, league.id),
        eq(leagueMemberships.claimable, true),
      ))
      .returning({ id: leagueMemberships.id });

    if (updated.length === 0) {
      return NextResponse.json({ error: "That team was just claimed — pick another." }, { status: 409 });
    }
    return NextResponse.json({ ok: true, leagueId: league.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
