import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { leagues, leagueMemberships, drafts } from "@/lib/db/schema";
import { nanoid, nanoidUpper } from "@/lib/utils/nanoid";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json({ userId: user.id });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { name, teamName, seasonStartDate, pickTimerSeconds, isPublic } = await request.json();

    if (!name || !teamName || !seasonStartDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const inviteCode = nanoidUpper(8);

    const [league] = await db.insert(leagues).values({
      id: nanoid(),
      name,
      commissionerId: user.id,
      isPublic: !!isPublic,
      inviteCode,
      seasonStartDate,
      status: "setup",
    }).returning();

    const [membership] = await db.insert(leagueMemberships).values({
      id: nanoid(),
      leagueId: league.id,
      userId: user.id,
      teamName,
      role: "commissioner",
    }).returning();

    await db.insert(drafts).values({
      id: nanoid(),
      leagueId: league.id,
      status: "scheduled",
      pickTimerSeconds: parseInt(pickTimerSeconds ?? "60"),
      draftOrder: [],
    });

    return NextResponse.json({ id: league.id, inviteCode });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
