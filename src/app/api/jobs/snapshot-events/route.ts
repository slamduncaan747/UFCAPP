import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, bouts, fighters } from "@/lib/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { isAuthorizedCron } from "@/lib/jobs/cron-auth";

async function run(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find events crossing lock_time in the last ~10 minutes
  const eventsCrossingLock = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.status, "scheduled"),
        lte(events.lockTime, new Date())
      )
    );

  let snapshotted = 0;
  for (const event of eventsCrossingLock) {
    const eventBouts = await db.select().from(bouts).where(eq(bouts.eventId, event.id));

    for (const bout of eventBouts) {
      const [fighterA] = await db.select().from(fighters).where(eq(fighters.id, bout.fighterAId));
      const [fighterB] = await db.select().from(fighters).where(eq(fighters.id, bout.fighterBId));

      const aRanked = !!(fighterA && (fighterA.isChampion || (fighterA.currentRanking && fighterA.currentRanking <= 15)));
      const bRanked = !!(fighterB && (fighterB.isChampion || (fighterB.currentRanking && fighterB.currentRanking <= 15)));

      await db
        .update(bouts)
        .set({ fighterARanked: aRanked, fighterBRanked: bRanked })
        .where(eq(bouts.id, bout.id));

      snapshotted++;
    }

    // Flip event to in_progress
    await db
      .update(events)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(events.id, event.id));
  }

  return NextResponse.json({ ok: true, eventsProcessed: eventsCrossingLock.length, boutsSnapshotted: snapshotted });
}

export const GET = run;
export const POST = run;
