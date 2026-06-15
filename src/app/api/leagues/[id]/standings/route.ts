import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getMembership, getStandings } from "@/lib/db/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const user = await requireUser();
    const membership = await getMembership(leagueId, user.id);
    if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });
    const standings = await getStandings(leagueId);
    return NextResponse.json(standings);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
