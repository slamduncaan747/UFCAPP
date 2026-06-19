import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getMembership, getDraftByLeagueId } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { drafts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

/** Commissioner adjusts the pick timer before the draft starts. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const user = await requireUser();
    const membership = await getMembership(leagueId, user.id);
    if (!membership || membership.role !== "commissioner") {
      return NextResponse.json({ error: "Commissioner only" }, { status: 403 });
    }

    const draft = await getDraftByLeagueId(leagueId);
    if (!draft) return NextResponse.json({ error: "No draft" }, { status: 404 });
    if (draft.status === "in_progress" || draft.status === "completed") {
      return NextResponse.json({ error: "Can't change timer once the draft is live" }, { status: 400 });
    }

    const { pickTimerSeconds } = await request.json();
    const secs = Math.max(15, Math.min(600, Number(pickTimerSeconds) || 60));

    await db.update(drafts).set({ pickTimerSeconds: secs }).where(eq(drafts.id, draft.id));

    const supabase = await createClient();
    await supabase.channel(`draft:${leagueId}`).send({
      type: "broadcast", event: "draft:config", payload: { pickTimerSeconds: secs },
    });

    return NextResponse.json({ ok: true, pickTimerSeconds: secs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
