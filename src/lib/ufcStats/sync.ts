/**
 * Pulls live UFC data from ufcstats.com into the app's reference tables.
 * Scrapes every upcoming event (for future bouts) plus the most recent completed
 * events (for results), inserts any unseen fighters, and upserts events + bouts.
 * Idempotent — safe to run on a schedule or on demand.
 */
import { db } from "@/lib/db";
import { fighters, events, bouts } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { scrapeEventList, scrapeEvent, scrapeFighter, type ScrapedEvent } from "./scrape";
import { mapWeightClass, mapMethod, isWomensBout, type WeightClass } from "@/lib/ufcData/mapping";
import { computeDraftScore } from "@/lib/draft/score";

export type UfcStatsSyncResult = {
  eventsScraped: number;
  eventsUpserted: number;
  boutsUpserted: number;
  fightersAdded: number;
  skipped: number;
  errors: string[];
};

function eventDateUtc(dateStr: string | null): Date {
  // ufcstats prints e.g. "June 14, 2025"; treat as a 22:00 UTC fight night.
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 22, 0, 0));
}

export async function syncFromUfcStats(opts?: { recentCompleted?: number }): Promise<UfcStatsSyncResult> {
  const res: UfcStatsSyncResult = { eventsScraped: 0, eventsUpserted: 0, boutsUpserted: 0, fightersAdded: 0, skipped: 0, errors: [] };

  // 1. Which events to pull: all upcoming + the N most-recent completed.
  const [upcoming, completed] = await Promise.all([
    scrapeEventList("upcoming").catch((e) => { res.errors.push(`upcoming list: ${e.message}`); return []; }),
    scrapeEventList("completed").catch((e) => { res.errors.push(`completed list: ${e.message}`); return []; }),
  ]);
  const refs = [...upcoming, ...completed.slice(0, opts?.recentCompleted ?? 2)];

  // 2. Scrape each event page (tolerate individual failures).
  const scraped: ScrapedEvent[] = [];
  for (const ref of refs) {
    try {
      scraped.push(await scrapeEvent(ref.id));
      res.eventsScraped++;
    } catch (e: any) {
      res.errors.push(`event ${ref.id}: ${e.message}`);
    }
  }

  // 3. Collect every fighter referenced, find which we don't have, scrape them.
  const neededIds = new Set<string>();
  for (const ev of scraped) {
    for (const b of ev.bouts) {
      if (isWomensBout(b.weightClassText)) continue;
      neededIds.add(b.fighterAId);
      neededIds.add(b.fighterBId);
    }
  }
  const existing = neededIds.size
    ? await db.select({ id: fighters.id }).from(fighters).where(inArray(fighters.id, [...neededIds]))
    : [];
  const haveIds = new Set(existing.map((r) => r.id));
  const missing = [...neededIds].filter((id) => !haveIds.has(id));

  for (const id of missing) {
    try {
      const sf = await scrapeFighter(id);
      if (!sf) { res.skipped++; continue; }
      // Division comes from the fighter's bout; resolved below via boutWeightClass.
      const wc = boutWeightClassFor(id, scraped) ?? mapWeightClass(null, sf.weightLbs);
      if (!wc) { res.skipped++; continue; }
      const lastDate = lastBoutDateFor(id, scraped);
      const draftScore = computeDraftScore(
        { recordW: sf.recordW, recordL: sf.recordL, recordD: sf.recordD, isChampion: false, currentRanking: null },
        lastDate,
      );
      await db.insert(fighters).values({
        id: sf.id, externalId: sf.id, name: sf.name, weightClass: wc as WeightClass, gender: "male",
        recordW: sf.recordW, recordL: sf.recordL, recordD: sf.recordD, status: "active",
        heightIn: sf.heightIn, reachIn: sf.reachIn, weightLbs: sf.weightLbs, stance: sf.stance, dob: sf.dob,
        slpm: sf.slpm, sapm: sf.sapm, strAcc: sf.strAcc, strDef: sf.strDef,
        tdAvg: sf.tdAvg, tdAcc: sf.tdAcc, tdDef: sf.tdDef, subAvg: sf.subAvg,
        draftScore, lastFightAt: lastDate,
      }).onConflictDoNothing();
      haveIds.add(sf.id);
      res.fightersAdded++;
    } catch (e: any) {
      res.errors.push(`fighter ${id}: ${e.message}`);
    }
  }

  // 4. Upsert events + bouts.
  const now = Date.now();
  for (const ev of scraped) {
    const when = eventDateUtc(ev.date);
    const evStatus = when.getTime() > now ? "scheduled" : "completed";
    try {
      await db.insert(events).values({
        id: ev.id, externalId: ev.id, name: ev.name || "UFC Event",
        eventDate: when, location: ev.location, lockTime: when, status: evStatus as any, updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: events.externalId,
        set: { name: sql`excluded.name`, eventDate: sql`excluded.event_date`, location: sql`excluded.location`, lockTime: sql`excluded.lock_time`, status: sql`excluded.status`, updatedAt: sql`excluded.updated_at` },
      });
      res.eventsUpserted++;
    } catch (e: any) { res.errors.push(`upsert event ${ev.id}: ${e.message}`); continue; }

    for (const b of ev.bouts) {
      if (isWomensBout(b.weightClassText)) { res.skipped++; continue; }
      if (!haveIds.has(b.fighterAId) || !haveIds.has(b.fighterBId)) { res.skipped++; continue; }
      const wc = mapWeightClass(b.weightClassText);
      if (!wc) { res.skipped++; continue; }
      const isUpcoming = when.getTime() > now || !b.hasResult;
      const { method, isFinish } = b.hasResult ? mapMethod(b.method) : { method: null, isFinish: false };
      const winnerId = !isUpcoming && b.winner === "A" ? b.fighterAId : null;
      try {
        await db.insert(bouts).values({
          id: b.fightId, eventId: ev.id, fighterAId: b.fighterAId, fighterBId: b.fighterBId,
          weightClass: wc as WeightClass, cardSegment: "main", scheduledStart: when,
          status: isUpcoming ? "scheduled" : "completed",
          winnerId, method: method as any, isFinish, endRound: isUpcoming ? null : b.round,
        }).onConflictDoUpdate({
          target: bouts.id,
          set: { weightClass: sql`excluded.weight_class`, scheduledStart: sql`excluded.scheduled_start`, status: sql`excluded.status`, winnerId: sql`excluded.winner_id`, method: sql`excluded.method`, isFinish: sql`excluded.is_finish`, endRound: sql`excluded.end_round` },
        });
        res.boutsUpserted++;
      } catch (e: any) { res.errors.push(`upsert bout ${b.fightId}: ${e.message}`); }
    }
  }

  // 5. Refresh last_fight_at for fighters whose latest completed bout we just saw.
  await refreshLastFight([...neededIds]);

  return res;
}

function boutWeightClassFor(fid: string, scraped: ScrapedEvent[]): WeightClass | null {
  for (const ev of scraped)
    for (const b of ev.bouts)
      if ((b.fighterAId === fid || b.fighterBId === fid) && !isWomensBout(b.weightClassText)) {
        const wc = mapWeightClass(b.weightClassText);
        if (wc) return wc;
      }
  return null;
}

function lastBoutDateFor(fid: string, scraped: ScrapedEvent[]): string | null {
  let latest: string | null = null;
  for (const ev of scraped)
    for (const b of ev.bouts)
      if ((b.fighterAId === fid || b.fighterBId === fid) && b.hasResult && ev.date) {
        const d = new Date(ev.date);
        if (!isNaN(d.getTime())) { const iso = d.toISOString().slice(0, 10); if (!latest || iso > latest) latest = iso; }
      }
  return latest;
}

async function refreshLastFight(fighterIds: string[]) {
  if (!fighterIds.length) return;
  const idList = sql.join(fighterIds.map((i) => sql`${i}`), sql`, `);
  await db.execute(sql`
    UPDATE fighters f SET last_fight_at = lf.last_date::date
    FROM (
      SELECT x.fid, max(e.event_date) AS last_date
      FROM (SELECT id AS fid FROM fighters WHERE id IN (${idList})) x
      JOIN bouts b ON (b.fighter_a_id = x.fid OR b.fighter_b_id = x.fid)
      JOIN events e ON b.event_id = e.id
      WHERE b.status = 'completed'
      GROUP BY x.fid
    ) lf
    WHERE f.id = lf.fid AND (f.last_fight_at IS NULL OR lf.last_date::date > f.last_fight_at)
  `);
}
