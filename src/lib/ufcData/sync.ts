import { db } from "@/lib/db";
import { fighters, events, bouts } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { fetchAll } from "./client";
import { mapWeightClass, mapMethod, isWomensBout, type WeightClass } from "./mapping";
import type { DataEvent, DataFighter, DataFight } from "./types";

// Status envelope: a fighter is "active" if they fought recently, else inactive/retired.
const ACTIVE_DAYS = 540; // ~18 months
const INACTIVE_DAYS = 365 * 4;

function daysAgo(dateStr: string, now: number): number {
  const t = new Date(dateStr + "T12:00:00Z").getTime();
  return (now - t) / 86_400_000;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export type SyncResult = {
  fightersRead: number;
  fightsRead: number;
  eventsRead: number;
  fightersMirrored: number;
  eventsMirrored: number;
  boutsMirrored: number;
  skippedWomensOrUnmapped: number;
};

/**
 * Mirrors the scraped UFC data project into the app's reference tables
 * (fighters/events/bouts), keyed by the ufcstats hex IDs. Idempotent: safe to
 * re-run after each scraper `update`. Replaces the old API-Sports sync.
 *
 * The app is men's-only (8 weight classes); women's and unmappable bouts are
 * skipped, along with fighters that have no qualifying bout.
 */
export async function syncUfcData(): Promise<SyncResult> {
  const now = Date.now();

  const [dEvents, dFighters, dFights] = await Promise.all([
    fetchAll<DataEvent>("events"),
    fetchAll<DataFighter>("fighters"),
    fetchAll<DataFight>("fights"),
  ]);

  const eventById = new Map(dEvents.map((e) => [e.id, e]));
  const fighterById = new Map(dFighters.map((f) => [f.id, f]));

  // ── Pass 1: determine each fighter's division + most-recent-fight date ──────
  // A fighter's division comes from their latest men's bout's weight class
  // (fallback to listed weight). Track latest fight date for status.
  const latestFightDate = new Map<string, string>();
  const divisionVote = new Map<string, WeightClass>();

  // Iterate fights newest-first so the first division we see per fighter is latest.
  const datedFights = dFights
    .map((f) => ({ f, date: eventById.get(f.event_id)?.date ?? null }))
    .filter((x) => x.date)
    .sort((a, b) => (a.date! < b.date! ? 1 : -1));

  for (const { f, date } of datedFights) {
    if (isWomensBout(f.weight_class)) continue;
    for (const fid of [f.fighter1_id, f.fighter2_id]) {
      if (!latestFightDate.has(fid)) latestFightDate.set(fid, date!);
      if (!divisionVote.has(fid)) {
        const wc = mapWeightClass(f.weight_class, fighterById.get(fid)?.weight_lbs);
        if (wc) divisionVote.set(fid, wc);
      }
    }
  }

  // ── Build qualifying fighter rows ──────────────────────────────────────────
  let skipped = 0;
  const fighterRows = [];
  const qualifyingFighterIds = new Set<string>();
  const fighterDivision = new Map<string, WeightClass>();

  for (const f of dFighters) {
    const wc = divisionVote.get(f.id) ?? mapWeightClass(null, f.weight_lbs);
    const last = latestFightDate.get(f.id);
    if (!wc || !last) {
      skipped++;
      continue;
    }
    const age = daysAgo(last, now);
    const status = age <= ACTIVE_DAYS ? "active" : age <= INACTIVE_DAYS ? "inactive" : "retired";

    qualifyingFighterIds.add(f.id);
    fighterDivision.set(f.id, wc);
    fighterRows.push({
      id: f.id,
      externalId: f.id,
      name: f.name,
      nickname: f.nickname,
      weightClass: wc as WeightClass,
      gender: "male",
      photoUrl: f.photo_url,
      recordW: f.wins ?? 0,
      recordL: f.losses ?? 0,
      recordD: f.draws ?? 0,
      status: status as "active" | "inactive" | "retired",
      heightIn: f.height_in,
      reachIn: f.reach_in,
      weightLbs: f.weight_lbs,
      stance: f.stance,
      dob: f.dob,
      slpm: f.slpm,
      sapm: f.sapm,
      strAcc: f.str_acc,
      strDef: f.str_def,
      tdAvg: f.td_avg,
      tdAcc: f.td_acc,
      tdDef: f.td_def,
      subAvg: f.sub_avg,
      photoLicense: f.photo_license,
      photoAttribution: f.photo_attribution,
      photoSource: f.photo_source,
      updatedAt: new Date(),
    });
  }

  // ── Build bout rows (both fighters must qualify) ───────────────────────────
  const boutRows = [];
  const usedEventIds = new Set<string>();
  for (const f of dFights) {
    if (!qualifyingFighterIds.has(f.fighter1_id) || !qualifyingFighterIds.has(f.fighter2_id))
      continue;
    const ev = eventById.get(f.event_id);
    if (!ev) continue;

    const wc =
      mapWeightClass(f.weight_class, fighterById.get(f.fighter1_id)?.weight_lbs) ??
      fighterDivision.get(f.fighter1_id)!;
    const { method, isFinish } = mapMethod(f.method);
    const start = new Date(ev.date + "T12:00:00Z");

    usedEventIds.add(f.event_id);
    boutRows.push({
      id: f.id,
      eventId: f.event_id,
      fighterAId: f.fighter1_id,
      fighterBId: f.fighter2_id,
      weightClass: wc as WeightClass,
      isTitleFight: !!f.is_title_fight,
      isMainEvent: false, // no source in scraped data
      cardSegment: "main" as const,
      boutOrder: 0,
      scheduledStart: start,
      status: "completed" as const,
      winnerId: f.winner_id && qualifyingFighterIds.has(f.winner_id) ? f.winner_id : null,
      method: method as any,
      isFinish,
      endRound: f.round ?? null,
    });
  }

  // ── Build event rows (only those hosting a mirrored bout) ──────────────────
  const eventRows = dEvents
    .filter((e) => usedEventIds.has(e.id))
    .map((e) => {
      const when = new Date(e.date + "T12:00:00Z");
      return {
        id: e.id,
        externalId: e.id,
        name: e.name,
        eventDate: when,
        location: e.location,
        lockTime: when, // scraped data has no per-bout start; lock at event date
        status: (when.getTime() <= now ? "completed" : "scheduled") as
          | "completed"
          | "scheduled",
        updatedAt: new Date(),
      };
    });

  // ── Write: events → fighters → bouts (FK order) ────────────────────────────
  for (const part of chunk(eventRows, 500)) {
    await db
      .insert(events)
      .values(part)
      .onConflictDoUpdate({
        target: events.externalId,
        set: {
          name: sql`excluded.name`,
          eventDate: sql`excluded.event_date`,
          location: sql`excluded.location`,
          lockTime: sql`excluded.lock_time`,
          status: sql`excluded.status`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  for (const part of chunk(fighterRows, 500)) {
    await db
      .insert(fighters)
      .values(part as any)
      .onConflictDoUpdate({
        target: fighters.externalId,
        set: {
          name: sql`excluded.name`,
          nickname: sql`excluded.nickname`,
          weightClass: sql`excluded.weight_class`,
          photoUrl: sql`excluded.photo_url`,
          recordW: sql`excluded.record_w`,
          recordL: sql`excluded.record_l`,
          recordD: sql`excluded.record_d`,
          status: sql`excluded.status`,
          heightIn: sql`excluded.height_in`,
          reachIn: sql`excluded.reach_in`,
          weightLbs: sql`excluded.weight_lbs`,
          stance: sql`excluded.stance`,
          dob: sql`excluded.dob`,
          slpm: sql`excluded.slpm`,
          sapm: sql`excluded.sapm`,
          strAcc: sql`excluded.str_acc`,
          strDef: sql`excluded.str_def`,
          tdAvg: sql`excluded.td_avg`,
          tdAcc: sql`excluded.td_acc`,
          tdDef: sql`excluded.td_def`,
          subAvg: sql`excluded.sub_avg`,
          photoLicense: sql`excluded.photo_license`,
          photoAttribution: sql`excluded.photo_attribution`,
          photoSource: sql`excluded.photo_source`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  for (const part of chunk(boutRows, 500)) {
    await db
      .insert(bouts)
      .values(part as any)
      .onConflictDoUpdate({
        target: bouts.id,
        set: {
          weightClass: sql`excluded.weight_class`,
          isTitleFight: sql`excluded.is_title_fight`,
          scheduledStart: sql`excluded.scheduled_start`,
          status: sql`excluded.status`,
          winnerId: sql`excluded.winner_id`,
          method: sql`excluded.method`,
          isFinish: sql`excluded.is_finish`,
          endRound: sql`excluded.end_round`,
        },
      });
  }

  return {
    fightersRead: dFighters.length,
    fightsRead: dFights.length,
    eventsRead: dEvents.length,
    fightersMirrored: fighterRows.length,
    eventsMirrored: eventRows.length,
    boutsMirrored: boutRows.length,
    skippedWomensOrUnmapped: skipped,
  };
}
