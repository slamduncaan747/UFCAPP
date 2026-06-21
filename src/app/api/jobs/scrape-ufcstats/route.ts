import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/jobs/cron-auth";
import { syncFromUfcStats } from "@/lib/ufcStats/sync";

// Scrapes ufcstats.com for upcoming cards + recent results and mirrors them into
// the app DB. Scheduled daily (Vercel Cron). Scraping several pages takes time.
export const maxDuration = 60;

async function run(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncFromUfcStats({ recentCompleted: 3 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("ufcstats scrape failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
