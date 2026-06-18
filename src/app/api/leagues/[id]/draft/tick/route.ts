import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/db/queries";
import { runAutopick } from "@/lib/draft/autopick";
import { createClient } from "@/lib/supabase/server";

/**
 * Drives the draft clock from the request path. Connected clients ping this
 * every couple seconds; it auto-picks for the on-clock member if their clock
 * expired or they have auto-draft on. Idempotent + row-locked, so duplicate
 * pings from multiple clients are safe.
 */
export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const user = await requireUser();
    const membership = await getMembership(leagueId, user.id);
    if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    const result = await runAutopick(leagueId);

    if (result.changed) {
      const supabase = await createClient();
      await supabase.channel(`draft:${leagueId}`).send({
        type: "broadcast",
        event: result.completed ? "draft:complete" : "draft:picked",
        payload: { autopick: true },
      });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
