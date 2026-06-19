import { NextResponse } from "next/server";
import { syncUfcData } from "@/lib/ufcData/sync";
import { isAuthorizedCron } from "@/lib/jobs/cron-auth";

// Mirrors the scraped UFC data project into the app's reference tables.
// Scheduled daily; also run after each scraper `update`.
async function run(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncUfcData();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("UFC data sync failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
