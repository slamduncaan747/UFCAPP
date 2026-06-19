import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getMembership, getDraftByLeagueId } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { drafts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

/**
 * Commissioner pause / resume. Pausing freezes the clock (autopick checks for
 * status === "in_progress" and stops). Resuming hands the on-clock member a
 * fresh full timer so nobody loses their pick to a pause.
 */
export async function POST(
  _: Request,
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
    if (draft.status !== "in_progress" && draft.status !== "paused") {
      return NextResponse.json({ error: "Draft is not active" }, { status: 400 });
    }

    const pausing = draft.status === "in_progress";
    const nextStatus = pausing ? "paused" : "in_progress";
    const clockExpiresAt = pausing ? null : new Date(Date.now() + draft.pickTimerSeconds * 1000);

    await db.update(drafts)
      .set({ status: nextStatus, clockExpiresAt })
      .where(eq(drafts.id, draft.id));

    const supabase = await createClient();
    await supabase.channel(`draft:${leagueId}`).send({
      type: "broadcast",
      event: pausing ? "draft:paused" : "draft:resumed",
      payload: {},
    });

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
