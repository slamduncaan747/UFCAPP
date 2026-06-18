import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getMembership, getLeagueMembers, getDraftByLeagueId } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { drafts, leagues } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/push/send";

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
    if (!draft) return NextResponse.json({ error: "No draft configured" }, { status: 404 });
    if (draft.status === "in_progress") {
      return NextResponse.json({ error: "Draft already in progress" }, { status: 400 });
    }

    const members = await getLeagueMembers(leagueId);
    if (members.length < 2) {
      return NextResponse.json({ error: "Need at least 2 members to start draft" }, { status: 400 });
    }

    // Randomize draft order
    const membershipIds = members.map((m) => m.membership.id);
    const shuffled = [...membershipIds].sort(() => Math.random() - 0.5);

    const clockExpiry = new Date(Date.now() + draft.pickTimerSeconds * 1000);

    await db.update(drafts).set({
      status: "in_progress",
      draftOrder: shuffled,
      currentPickNumber: 0,
      clockExpiresAt: clockExpiry,
    }).where(eq(drafts.id, draft.id));

    await db.update(leagues).set({ status: "drafting" }).where(eq(leagues.id, leagueId));

    // Broadcast draft start
    const supabase = await createClient();
    await supabase.channel(`draft:${leagueId}`).send({
      type: "broadcast",
      event: "draft:started",
      payload: { draftOrder: shuffled, clockExpiresAt: clockExpiry.toISOString() },
    });

    // Notify all members
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const league = await import("@/lib/db/queries").then(m => m.getLeagueById(leagueId));
    const leagueName = league?.name ?? "your league";
    await Promise.allSettled(
      members.map(m =>
        notifyUser(m.membership.userId, "draft_starting", { leagueId }, {
          title: "Draft Starting!",
          body: `The snake draft for ${leagueName} is live. It's go time.`,
          url: `${appUrl}/leagues/${leagueId}/draft`,
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
