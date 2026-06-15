import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { draftQueues } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "@/lib/utils/nanoid";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const user = await requireUser();
    const { queue } = await request.json(); // [{ fighterId, priority }]

    const membership = await getMembership(leagueId, user.id);
    if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    // Replace entire queue
    await db.delete(draftQueues).where(eq(draftQueues.membershipId, membership.id));

    if (queue?.length > 0) {
      await db.insert(draftQueues).values(
        queue.map((q: { fighterId: string; priority: number }) => ({
          id: nanoid(),
          membershipId: membership.id,
          fighterId: q.fighterId,
          priority: q.priority,
        }))
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
