import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/db/queries";
import { syncFromUfcStats } from "@/lib/ufcStats/sync";

// Commissioner-triggered, on-demand pull from ufcstats.com. Useful for "live"
// refreshes during/after an event since Hobby cron is only once per day.
export const maxDuration = 60;

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leagueId } = await params;
    const user = await requireUser();
    const membership = await getMembership(leagueId, user.id);
    if (!membership || membership.role !== "commissioner") {
      return NextResponse.json({ error: "Commissioner only" }, { status: 403 });
    }
    const result = await syncFromUfcStats({ recentCompleted: 3 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("manual ufcstats sync failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
