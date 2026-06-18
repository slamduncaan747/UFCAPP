import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { leagueMemberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const user = await requireUser();
    const { enabled } = await request.json();

    const membership = await getMembership(leagueId, user.id);
    if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    await db
      .update(leagueMemberships)
      .set({ autodraftEnabled: !!enabled })
      .where(eq(leagueMemberships.id, membership.id));

    return NextResponse.json({ ok: true, autodraftEnabled: !!enabled });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
