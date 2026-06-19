# Operations: data pipeline, crons, waivers

## Data / scraping strategy

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
