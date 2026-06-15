# UFC Data Layer — Integration Guide

This document describes a UFC statistics database and how to integrate it into a Next.js UFC **fantasy** app. It is written to be handed to a coding agent: everything needed to consume the data is here.

---

## 1. What this is

A Python scraper pulls every UFC event, fight, round-by-round stat line, and fighter profile from ufcstats.com into a **Supabase Postgres** database. The scraper runs on the maintainer's machine; **the app never scrapes** — it only reads from Supabase. There is no separate API server to host: Supabase exposes the tables over its auto-generated REST/realtime API, consumed via `@supabase/supabase-js`.

```
ufcstats.com ──(scraper, offline)──▶ Supabase Postgres ◀──(reads)── Next.js app
```

Data refresh cadence: a full historical backfill has been run once; an `update` job runs after each UFC event to add new events and refresh the involved fighters. Treat the data as updating a few times a week, not in real time.

---

## 2. Database schema

Five concepts. All primary keys are the **hex IDs from ufcstats URLs** (stable, permanent). Joins are by ID only — never by name (the UFC has had fighters with identical names).

### `events`
| column | type | notes |
|---|---|---|
| `id` | text PK | |
| `name` | text | e.g. "UFC 319: Du Plessis vs. Chimaev" |
| `date` | date | |
| `location` | text | |
| `scraped` | bool | internal scraper flag; ignore in app |

### `fighters`
| column | type | notes |
|---|---|---|
| `id` | text PK | |
| `name`, `nickname` | text | |
| `height_in`, `reach_in` | real | inches |
| `weight_lbs` | real | |
| `stance` | text | |
| `dob` | date | |
| `wins`, `losses`, `draws` | int | career record |
| `slpm`, `sapm` | real | sig. strikes landed / absorbed per min |
| `str_acc`, `str_def` | real | striking accuracy / defense (%) |
| `td_avg`, `td_acc`, `td_def` | real | takedown averages / accuracy / defense |
| `sub_avg` | real | submission attempts per 15 min |
| `photo_url` | text | may be null (see §6) |
| `photo_license`, `photo_attribution`, `photo_source` | text | display per §6 |

### `fights`
| column | type | notes |
|---|---|---|
| `id` | text PK | |
| `event_id` | text → events.id | |
| `fighter1_id`, `fighter2_id` | text → fighters.id | |
| `winner_id` | text | null on draw / no-contest |
| `result` | text | `'win'` \| `'draw'` \| `'nc'` |
| `weight_class` | text | |
| `is_title_fight` | bool | |
| `method` | text | e.g. "KO/TKO", "Submission", "Decision - Unanimous" |
| `round` | int | round the fight ended |
| `time` | text | time in the final round, "M:SS" |
| `time_format` | text | e.g. "3 Rnd (5-5-5)" |
| `referee`, `details` | text | |

### `fight_stats`
Per-fighter, per-round stat lines. **`round = 0` is the fight total; rounds 1–5 are per-round breakdowns.** For most app needs, query `round = 0`.

Primary key: (`fight_id`, `fighter_id`, `round`).

Key columns (all ints; landed/attempted pairs): `kd` (knockdowns), `sig_landed`/`sig_attempted`, `tot_landed`/`tot_attempted`, `td_landed`/`td_attempted`, `sub_att`, `reversals`, `ctrl_sec` (control time in seconds), and target/position breakdowns: `head_*`, `body_*`, `leg_*`, `dist_*` (distance), `clinch_*`, `ground_*`.

---

## 3. Setup

```bash
npm install @supabase/supabase-js
```

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

> **Security:** the database has Row Level Security enabled — the **anon key is read-only**. Only the scraper (holding the service_role key, never shipped to the app) can write. The anon key is safe to expose to the browser. Do **not** put the service_role key in the Next.js project.

```ts
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## 4. Read patterns

### Fighter search (substring)
```ts
const { data } = await supabase
  .from('fighters')
  .select('id, name, nickname, photo_url, wins, losses, draws')
  .ilike('name', `%${query}%`)
  .limit(25)
```
For heavier search/filtering, use the full-text RPC in §5 instead.

### Fighter profile + full fight history
```ts
const { data: fighter } = await supabase
  .from('fighters').select('*').eq('id', id).single()

const { data: fights } = await supabase
  .from('fights')
  .select(`*,
    event:events(name, date),
    f1:fighters!fights_fighter1_id_fkey(id, name),
    f2:fighters!fights_fighter2_id_fkey(id, name)`)
  .or(`fighter1_id.eq.${id},fighter2_id.eq.${id}`)
  .order('event(date)', { ascending: false })
```

### Event with full card
```ts
const { data: event } = await supabase
  .from('events')
  .select(`*,
    fights(*,
      f1:fighters!fights_fighter1_id_fkey(id, name, photo_url),
      f2:fighters!fights_fighter2_id_fkey(id, name, photo_url))`)
  .eq('id', eventId).single()
```

### Single fight + round-by-round stats
```ts
const { data: fight } = await supabase
  .from('fights').select('*').eq('id', fightId).single()

const { data: stats } = await supabase
  .from('fight_stats')
  .select('*, fighter:fighters(id, name)')
  .eq('fight_id', fightId)
  .order('round')          // row with round=0 is the fight total
```

---

## 5. Recommended Postgres objects (run once in the SQL Editor)

These keep derived logic in the database so the app stays simple and fast — important for the fantasy + search/analysis direction. Pure additions; they don't alter existing tables except adding a search index.

### Full-text fighter search
```sql
alter table fighters add column if not exists fts tsvector
  generated always as (to_tsvector('english',
    coalesce(name,'') || ' ' || coalesce(nickname,''))) stored;
create index if not exists fighters_fts on fighters using gin(fts);

create or replace function search_fighters(q text)
returns setof fighters language sql stable as $$
  select * from fighters
  where fts @@ websearch_to_tsquery('english', q)
  order by ts_rank(fts, websearch_to_tsquery('english', q)) desc
  limit 50;
$$;
```
Call from the app: `supabase.rpc('search_fighters', { q })`.

### Fighter "card" view (avoids N+1 on list screens)
```sql
create or replace view fighter_cards as
select id, name, nickname, photo_url, stance, weight_lbs,
       wins, losses, draws,
       (wins + losses + draws) as total_bouts
from fighters;
```
Query it like a table: `supabase.from('fighter_cards').select('*')`.

### Fantasy scoring (template — adjust to your point system)
Fantasy points are best precomputed in a **materialized view**, refreshed after each data update, so the app reads a leaderboard instead of recomputing per request. Example scoring: 100 per win, 50 per finish, 1 per significant strike landed, 20 per takedown, 40 per knockdown.

```sql
create materialized view if not exists fighter_fantasy as
select
  f.id, f.name, f.photo_url,
  count(*) filter (where fl.winner_id = f.id) * 100
    + count(*) filter (where fl.winner_id = f.id
                         and fl.method not ilike 'decision%') * 50
    + coalesce(sum(fs.sig_landed), 0) * 1
    + coalesce(sum(fs.td_landed), 0) * 20
    + coalesce(sum(fs.kd), 0) * 40
  as fantasy_points
from fighters f
left join fights fl on fl.fighter1_id = f.id or fl.fighter2_id = f.id
left join fight_stats fs on fs.fighter_id = f.id and fs.fight_id = fl.id
                        and fs.round = 0
group by f.id, f.name, f.photo_url;

create unique index if not exists fighter_fantasy_id on fighter_fantasy(id);
-- after each scraper `update` run:  refresh materialized view concurrently fighter_fantasy;
```
Read the leaderboard: `supabase.from('fighter_fantasy').select('*').order('fantasy_points', { ascending: false })`.

---

## 6. Photos

`fighters.photo_url` is populated from Wikimedia (license-clean) with a DuckDuckGo image fallback for coverage. **It can be null** — always render a placeholder/silhouette fallback.

- When `photo_license` is present (Wikimedia images), display `photo_attribution` near the image to honor the license.
- When `photo_license` is null (fallback images), the URL points to a third-party host. Acceptable for personal use; if the app goes public, review usage rights or restrict display to Wikimedia-sourced photos (`photo_license is not null`).
- `photo_url` is an external URL — add those hosts to `next.config.js` `images.remotePatterns` if using `next/image`, or use a plain `<img>`.

---

## 7. Rendering guidance

- **Display pages** (fighter profiles, event cards) are read-heavy and change rarely → render as **Server Components with ISR** (`export const revalidate = 86400`, or revalidate on demand after an `update` run). Keeps keys server-side and pages fast/SEO-friendly.
- **Interactive pieces** (search box, filters, fighter comparison) → Client Components calling `supabase.rpc(...)` or filtered selects.
- Push aggregation into Postgres views/materialized views (§5) rather than fetching raw rows and computing in JS — this matters as the fantasy scoring and analysis features grow.

---

## 8. Gotchas

1. **`fight_stats.round = 0` = fight totals.** Filter on it for career/aggregate stats; use 1–5 only for round-level views.
2. **Joins are ID-based.** Never match fighters by name — duplicates exist.
3. **Supabase returns max 1000 rows per request.** Paginate with `.range(from, to)` for full-table reads (e.g. building the leaderboard client-side — better to use the materialized view).
4. **Null-safe fields:** `winner_id` (draws/NCs), all `photo_*` fields, and some career stats on fighters with few/no UFC bouts.
5. **Old events** (early UFCs) may lack round-by-round `fight_stats`; the fight row still exists.
6. **`method` strings** are free-text from the source ("KO/TKO", "Submission", "Decision - Unanimous", "Decision - Split", etc.) — match with `ilike`, don't assume an enum.
