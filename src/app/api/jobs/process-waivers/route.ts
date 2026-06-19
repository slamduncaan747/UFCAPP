import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/jobs/cron-auth";
import { processAllWaivers } from "@/lib/waivers/process";
import { notifyUser } from "@/lib/push/send";
import { db } from "@/lib/db";
import { leagueMemberships, fighters } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Runs Monday morning (Vercel Cron). Processes every league's pending waiver
// claims in reverse draft order; each team wins at most one.
async function run(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await processAllWaivers();

    // Notify winners (fire-and-forget).
    await Promise.allSettled(result.winners.map(async (w) => {
      const [m] = await db.select().from(leagueMemberships).where(eq(leagueMemberships.id, w.membershipId));
      const [f] = await db.select().from(fighters).where(eq(fighters.id, w.addFighterId));
      if (!m || !f) return;
      await notifyUser(m.userId, "results_posted", { leagueId: m.leagueId }, {
        title: "Waiver claim won!",
        body: `You picked up ${f.name}.`,
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/leagues/${m.leagueId}?tab=team`,
      });
    }));

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("waiver processing failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = run;   // Vercel Cron issues a GET
export const POST = run;  // manual trigger
