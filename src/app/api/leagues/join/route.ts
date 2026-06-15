import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { leagueMemberships } from "@/lib/db/schema";
import { getLeagueByInviteCode, getMembership } from "@/lib/db/queries";
import { nanoid } from "@/lib/utils/nanoid";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { inviteCode, teamName } = await request.json();

    if (!inviteCode || !teamName) {
      return NextResponse.json({ error: "Missing invite code or team name" }, { status: 400 });
    }

    const league = await getLeagueByInviteCode(inviteCode);
    if (!league) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    const existing = await getMembership(league.id, user.id);
    if (existing) {
      return NextResponse.json({ leagueId: league.id, leagueName: league.name });
    }

    if (league.status === "completed") {
      return NextResponse.json({ error: "This league season has ended" }, { status: 400 });
    }

    await db.insert(leagueMemberships).values({
      id: nanoid(),
      leagueId: league.id,
      userId: user.id,
      teamName,
      role: "member",
    });

    return NextResponse.json({ leagueId: league.id, leagueName: league.name });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
