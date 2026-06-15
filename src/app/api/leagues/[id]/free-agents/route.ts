import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getMembership, getFreeAgents } from "@/lib/db/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const user = await requireUser();

    const membership = await getMembership(leagueId, user.id);
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this league" }, { status: 403 });
    }

    const url = new URL(request.url);
    const weightClass = url.searchParams.get("weightClass") ?? undefined;

    const fa = await getFreeAgents(leagueId, weightClass);
    return NextResponse.json({ fighters: fa });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
