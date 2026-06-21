/**
 * ufcstats.com scraper. Parses the public HTML pages (no API exists) into typed
 * structures. SERVER-ONLY. Production (Vercel) can reach ufcstats.com directly;
 * the Claude web sandbox blocks it via egress allow-list, so this isn't run from
 * there.
 *
 * Page shapes (as of 2025):
 *  - /statistics/events/{upcoming|completed}?page=all  → event list
 *  - /event-details/{id}                                → event meta + bout table
 *  - /fighter-details/{id}                              → record + career stats
 */
import * as cheerio from "cheerio";

const BASE = "http://ufcstats.com";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

async function getHtml(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  return cheerio.load(await res.text());
}

function idFromHref(href?: string | null): string | null {
  const m = href?.match(/(?:event|fighter|fight)-details\/([a-f0-9]+)/i);
  return m ? m[1] : null;
}

const num = (s?: string | null): number | null => {
  if (!s) return null;
  const m = s.replace(",", "").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};
const pct = (s?: string | null): number | null => {
  const n = num(s);
  return n == null ? null : n;
};

// ── Event list ───────────────────────────────────────────────────────────────

export type EventRef = { id: string; name: string; date: string | null };

export async function scrapeEventList(kind: "upcoming" | "completed"): Promise<EventRef[]> {
  const $ = await getHtml(`${BASE}/statistics/events/${kind}?page=all`);
  const out: EventRef[] = [];
  const seen = new Set<string>();
  $("a.b-link.b-link_style_black[href*='event-details']").each((_i, el) => {
    const a = $(el);
    const id = idFromHref(a.attr("href"));
    if (!id || seen.has(id)) return;
    seen.add(id);
    const date = a.closest("i").find("span.b-statistics__date").text().trim() || null;
    out.push({ id, name: a.text().trim(), date });
  });
  return out;
}

// ── Event details ────────────────────────────────────────────────────────────

export type ScrapedBout = {
  fightId: string;
  fighterAId: string; fighterAName: string;
  fighterBId: string; fighterBName: string;
  weightClassText: string | null;
  method: string | null;
  round: number | null;
  winner: "A" | "B" | null; // ufcstats lists the winner first
  hasResult: boolean;
};

export type ScrapedEvent = {
  id: string; name: string; date: string | null; location: string | null;
  bouts: ScrapedBout[];
};

export async function scrapeEvent(eventId: string): Promise<ScrapedEvent> {
  const $ = await getHtml(`${BASE}/event-details/${eventId}`);
  const name = $("span.b-content__title-highlight").first().text().trim();

  let date: string | null = null;
  let location: string | null = null;
  $("li.b-list__box-list-item").each((_i, el) => {
    const label = $(el).find("i.b-list__box-item-title").text().trim().toLowerCase();
    const val = $(el).clone().children("i").remove().end().text().replace(/\s+/g, " ").trim();
    if (label.startsWith("date")) date = val || null;
    else if (label.startsWith("location")) location = val || null;
  });

  const bouts: ScrapedBout[] = [];
  $("tr.b-fight-details__table-row[data-link]").each((_i, row) => {
    const $row = $(row);
    const fightId = idFromHref($row.attr("data-link"));
    const links = $row.find("a.b-link[href*='fighter-details']");
    if (!fightId || links.length < 2) return;
    const aEl = $(links[0]);
    const bEl = $(links[1]);
    const fighterAId = idFromHref(aEl.attr("href"));
    const fighterBId = idFromHref(bEl.attr("href"));
    if (!fighterAId || !fighterBId) return;

    const texts = $row.find("p.b-fight-details__table-text").map((_j, p) => $(p).text().trim()).get();
    const weightClassText =
      texts.find((t) => /weight|catch ?weight/i.test(t) && t.length < 40) ?? null;
    const method =
      texts.find((t) => /^(KO\/TKO|SUB|U-DEC|S-DEC|M-DEC|DQ|CNC|Overturned|Could Not Continue|DEC)$/i.test(t)) ?? null;
    const round = (() => {
      const r = texts.find((t) => /^[1-5]$/.test(t));
      return r ? parseInt(r, 10) : null;
    })();

    const flagText = $row.find("i.b-flag").text().toLowerCase();
    const winner: "A" | "B" | null = flagText.includes("win") ? "A" : null;

    bouts.push({
      fightId, fighterAId, fighterAName: aEl.text().trim(),
      fighterBId, fighterBName: bEl.text().trim(),
      weightClassText, method, round, winner, hasResult: !!method,
    });
  });

  return { id: eventId, name, date, location, bouts };
}

// ── Fighter details ──────────────────────────────────────────────────────────

export type ScrapedFighter = {
  id: string; name: string;
  recordW: number; recordL: number; recordD: number;
  heightIn: number | null; reachIn: number | null; weightLbs: number | null;
  stance: string | null; dob: string | null;
  slpm: number | null; sapm: number | null; strAcc: number | null; strDef: number | null;
  tdAvg: number | null; tdAcc: number | null; tdDef: number | null; subAvg: number | null;
};

function heightToInches(s?: string): number | null {
  const m = s?.match(/(\d+)'\s*(\d+)/);
  return m ? parseInt(m[1], 10) * 12 + parseInt(m[2], 10) : null;
}
function dobToDate(s?: string): string | null {
  if (!s || s.includes("--")) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export async function scrapeFighter(id: string): Promise<ScrapedFighter | null> {
  const $ = await getHtml(`${BASE}/fighter-details/${id}`);
  const name = $("span.b-content__title-highlight").first().text().trim();
  if (!name) return null;

  const recText = $("span.b-content__title-record").text();
  const rec = recText.match(/(\d+)-(\d+)-(\d+)/);

  const f: Record<string, string> = {};
  $("li.b-list__box-list-item").each((_i, el) => {
    const label = $(el).find("i.b-list__box-item-title").text().trim().replace(/:$/, "").toLowerCase();
    const val = $(el).clone().children("i").remove().end().text().replace(/\s+/g, " ").trim();
    if (label) f[label] = val;
  });

  return {
    id, name,
    recordW: rec ? +rec[1] : 0, recordL: rec ? +rec[2] : 0, recordD: rec ? +rec[3] : 0,
    heightIn: heightToInches(f["height"]),
    reachIn: num(f["reach"]),
    weightLbs: num(f["weight"]),
    stance: f["stance"] && !f["stance"].includes("--") ? f["stance"] : null,
    dob: dobToDate(f["dob"]),
    slpm: num(f["slpm"]), sapm: num(f["sapm"]),
    strAcc: pct(f["str. acc."]), strDef: pct(f["str. def"]),
    tdAvg: num(f["td avg."]), tdAcc: pct(f["td acc."]), tdDef: pct(f["td def."]),
    subAvg: num(f["sub. avg."]),
  };
}
