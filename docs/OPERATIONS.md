# Operations: data pipeline, crons, waivers

## Live data: direct ufcstats.com scraper (`src/lib/ufcStats`)

`syncFromUfcStats()` scrapes ufcstats.com HTML directly (cheerio) and upserts into
the app's `events` / `bouts` / `fighters` tables — no separate data project needed.

- Pulls **every upcoming event** (future bouts → `status = scheduled`) plus the
  **most recent completed events** (results → winner/method/round). Any fighter
  not yet in the DB is scraped and inserted (men's only; women's bouts skipped).
- Triggers:
  - **Cron**: `/api/jobs/scrape-ufcstats` daily (Vercel Cron, secured by `CRON_SECRET`).
  - **On demand**: commissioners get a **"Sync UFC Data Now"** button in League →
    Settings (`POST /api/leagues/[id]/sync`). Use it right after an event for a
    near-live refresh (Hobby cron only fires once/day).
- **Egress**: production (Vercel) reaches ufcstats.com fine. The Claude web sandbox
  blocks it via an egress allow-list, so the scraper can't be exercised from there —
  it was written against ufcstats' known HTML structure; the sync returns parse
  stats + an `errors[]` array so the first real run surfaces any selector drift.
- Pages parsed: `/statistics/events/{upcoming,completed}?page=all`,
  `/event-details/{id}`, `/fighter-details/{id}`.

The older `syncUfcData()` (mirror from a separate scraped Supabase project) still
exists but is no longer the scheduled path.

## Data / scraping strategy (legacy mirror)

The app does **not** scrape directly. It mirrors a separate "scraped UFC data"
Supabase project (ufcstats.com → Postgres) via PostgREST (`src/lib/ufcData`).
`syncUfcData()` copies `fighters` / `events` / `fights` into the app's
`fighters` / `events` / `bouts` tables.

### Why there is currently no upcoming data
1. The scraped `fights` table only contains **completed** fights (it has
   `winner_id`, `method`, `round`). ufcstats does publish an *upcoming events*
   page with announced matchups; the scraper isn't capturing those yet.
2. The cron that runs the sync was **never scheduled** (now fixed — see below).

### To get future data flowing (scraper-side work, in the data project)
Add upcoming cards to the scraped `events` + `fights` tables:
- Scrape ufcstats "Upcoming Events" (or the UFC site / Wikipedia event pages) for
  each future event: date, location, and the announced bouts (the two fighter
  IDs + weight class). Leave `winner_id`/`method`/`round` null.
- Keep re-scraping each event as the card firms up and after it happens (results
  back-fill the same rows).

The app side is already forward-compatible: `syncUfcData()` now marks any bout on
a future-dated event with no winner as `status = "scheduled"` and the event as
`scheduled`, which powers the draft "Soon" filter, lineup planning, scoring, and
the waiver wire. No app change is needed once the scraped data includes future
cards.

### Lock time
Scraped data has no per-bout start time, so `lock_time = event_date` (noon UTC).
If you want finer locks, add a start time to the scraped events and map it in
`sync.ts`.

## Cron jobs (Vercel)
Configured in `vercel.json`:
| Path | Schedule (UTC) | Purpose |
|------|----------------|---------|
| `/api/jobs/sync-ufc-data` | `0 9 * * *` (daily) | Mirror scraped data |
| `/api/jobs/snapshot-events` | `*/15 * * * *` | Snapshot rankings at lock, flip events to in_progress |
| `/api/jobs/process-waivers` | `0 13 * * 1` (Mon) | Process waiver claims |

**Required env:** set `CRON_SECRET` in Vercel. Vercel Cron automatically sends
`Authorization: Bearer $CRON_SECRET`; the jobs accept that or an `x-cron-secret`
header (`src/lib/jobs/cron-auth.ts`). Without `CRON_SECRET` the jobs return 401.
Also required for sync: `UFC_DATA_SUPABASE_URL`, `UFC_DATA_SUPABASE_SERVICE_KEY`.

## Waiver wire
- Each team submits up to **2 prioritized bids**; wins **at most one**.
- Processed **Monday morning** in **reverse draft order** (last drafter gets
  first preference).
- You may only **drop a fighter who has already fought** this season.
- Winning a bid does **not** consume the "Season Burn" (that's only for ad-hoc
  free-agent drops of fought fighters).
- Code: `src/lib/waivers/*`, `src/app/api/leagues/[id]/waivers`,
  `src/app/api/jobs/process-waivers`, UI in `WaiverPanel`.
- Note: waivers require **in-season fights** to exist (a fighter must have
  fought to be droppable), so they stay dormant until the data pipeline has
  current-season results.
