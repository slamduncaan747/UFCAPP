# UFC Fantasy League

A mobile-first fantasy UFC app for a private league. Each manager fields a
9-slot roster (one fighter per male division plus a wildcard), scores points
when their fighters win, and adds free agents through a weekly waiver wire.

Built with Next.js (App Router) + Supabase. No authentication — players pick
who they are once and the choice is stored in a cookie (`lib/identity.ts`).

## Pages

| Tab | What it shows |
| --- | --- |
| **Roster** | Your 9 slots, points per fighter, next bout + lineup-lock state |
| **Fights** | Live / upcoming / recent events with every bout tagged by owning team |
| **Standings** | League table, tap a team to inspect their roster, season chart |
| **Market** | Free agents with search, weight-class filter, and sorting (fights soon / rank / rating / A–Z); submit up to 2 waiver bids |
| **Settings** | Scoring + waiver rules, switch player, commissioner tools |

## Scoring

Win **+100** · Finish **+50** · Ranked opponent **+50** · POTN/FOTN **+50** ·
Main event **+25** · Title fight **+25** (bonuses other than POTN/FOTN require the win).

Scores are computed in Postgres: a trigger (`trg_score_bout`) scores every
rostered fighter the moment a bout is marked completed, and
`recompute_league_scores(league_id)` rebuilds a league from scratch
(commissioner → Settings → *Recalculate Scores*).

## Waiver wire

Managers submit up to two prioritized add/drop claims. `process_waivers(league_id)`
awards claims worst-team-first (lowest total points), enforcing weight-class/slot
fit, fighter availability, lineup locks (on both sides of the swap), and one
successful claim per manager per run. A `pg_cron` job (`process-waivers-weekly`)
runs it automatically every Tuesday 05:00 UTC (Monday midnight ET); the
commissioner can also force a run from Settings.

SQL for both lives in [`supabase/waivers-and-scoring.sql`](supabase/waivers-and-scoring.sql)
and is applied to the live project as the `waivers_and_scoring` migration.

## Development

```bash
npm install
npm run dev
```

Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
`.env.local`.
