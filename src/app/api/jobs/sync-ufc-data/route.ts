import { NextResponse } from "next/server";
import { syncUfcData } from "@/lib/ufcData/sync";

function verifyCronSecret(request: Request) {
  return request.headers.get("x-cron-secret") === process.env.CRON_SECRET;
}

// Mirrors the scraped UFC data project into the app's reference tables.
// Run after each scraper `update` (a few times a week). Replaces the old
// sync-reference / sync-rankings / poll-results jobs.
export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
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
