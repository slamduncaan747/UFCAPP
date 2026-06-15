# Fantasy UFC — MVP Build Plan

**Handoff document for Claude Code.** This is the single source of truth for building the Fantasy UFC SaaS MVP. Build in the phase order given in §15. When a detail here conflicts with a default assumption, **this document wins**. Where something is genuinely undecided it is flagged in §17.

---

## 1. Overview & Goals

A season-long fantasy sports web app for the UFC. A user creates or joins a **league**, drafts a **9-fighter roster** (one per male weight class + a wild card) via a live **snake draft**, then accumulates points as those fighters compete across every UFC event inside the league's season window. Highest cumulative total at the end of the season wins.

**MVP must ship, fully functioning and polished:**
- Email/OAuth auth (Supabase Auth)
- League creation + invite/join
- Live real-time snake draft
- 9-slot rigid roster with the lock/burn transaction system
- Free-agent marketplace (add/drop, FCFS)
- Automated UFC data ingestion + scoring engine
- Live + post-event scoring
- Standings, fighter detail, transaction activity feed
- Mobile-first, dark, polished UI matching the supplied design system (§11.2)

**Explicit non-goals for MVP (do not build):**
- Head-to-head weekly matchups, playoffs/brackets
- Configurable scoring (scoring is fixed — see §2.2)
- Bench slots / weekly lineup-setting
- Waivers, FAAB, trades between teams
- Auction drafts (snake only)
- Women's divisions
- Native mobile apps (responsive web only)
- Payments/billing

---

## 2. Product Rules (Canonical)

> These rules are the heart of the product. The scoring engine (§7) and transaction logic (§2.3) implement them exactly. Read this section twice.

### 2.1 Roster structure
- Every team has **exactly 9 slots**, one fighter each, **no bench**:

  | Slot key | Slot |
  |---|---|
  | `FLW` | Flyweight |
  | `BW` | Bantamweight |
  | `FW` | Featherweight |
  | `LW` | Lightweight |
  | `WW` | Welterweight |
  | `MW` | Middleweight |
  | `LHW` | Light Heavyweight |
  | `HW` | Heavyweight |
  | `WILDCARD` | Any male division |

- **Male divisions only.** The 8 division slots accept only fighters whose weight class matches. `WILDCARD` accepts any male-division fighter.
- A fighter may be rostered by **only one team per league** at a time (enforced in DB, see §6).
- Rosters are built entirely through the draft (§9); afterward modified only through the marketplace (§2.3).

### 2.2 Scoring system (FIXED — not configurable)

Points are awarded **per fighter, per bout**. A single fighter can stack multiple categories in one fight. Points are **cumulative across the whole season** (total-points format).

| Category | Points | Condition |
|---|---|---|
| Win | **+100** | Fighter wins the bout |
| Finish | **+50** | Fighter wins **and** the bout ended by finish (KO/TKO or submission) |
| Night bonus | **+50** | Fighter earned Performance of the Night **OR** the bout was Fight of the Night. **Single +50** even if both apply. FotN is credited to **both** fighters in the bout. |
| Ranked win | **+50** | Fighter wins **and** the opponent was ranked (divisional #1–15 or champion) **at event start** |
| Title fight | **+25** | Bout is a title fight — **awarded win or lose** |
| Main event | **+25** | Bout is the event's main event — **awarded win or lose** |

**Rules of resolution:**
- **Win / Finish / Ranked-win require winning.** The loser gets none of these.
- **Title-fight / Main-event are participation-based** — both fighters get them regardless of result.
- **Finish** bonus goes only to the winner (the finisher), never the fighter who was finished.
- **Ranked status** is snapshotted onto the bout at the event's lock time so later ranking changes never retroactively alter a score. **Pound-for-pound rankings do NOT count** — divisional ranking or a belt only.
- A fighter with **no bout** during the season scores **0**. There is no automatic replacement.
- **Banked points are permanent.** Dropping a fighter (locked or unlocked) never removes points they already scored.

### 2.3 Transactions, locking & the Season Burn

This is the most distinctive mechanic. Roster moves hinge on whether a rostered fighter **has already fought this season**.

**Lock timing (event-level):**
- An entire event's roster impact freezes at **event start = the scheduled start time of the first bout** (early prelims). `events.lock_time` stores this single timestamp.
- Once an event reaches `lock_time`, **every fighter who competes on that event is considered "has fought"** and becomes **locked** to whichever roster holds them. This single-timestamp rule deliberately prevents mid-event/between-segment strategic drops.

**Fighter lock state (derived, never stored as a flag):**
- A fighter is **UNLOCKED** if they have not yet fought this season (no event of theirs has passed its `lock_time`). Unlocked fighters are **freely droppable**.
- A fighter is **LOCKED** if they have fought this season (an event of theirs has passed `lock_time` and they were on its card). Locked fighters **cannot normally be dropped**.

**Adds & drops:**
- **Unlimited** adds/drops, subject to the constraints below.
- Dropping an UNLOCKED fighter is always allowed and opens that slot.
- **Slot-rigid adds:** dropping a division fighter (e.g. `WW`) requires adding a fighter of that same division into that slot. Dropping the `WILDCARD` allows adding any male-division fighter.
- A free agent can only be added if **no other team in the league** currently rosters them.
- **First-come-first-served, instant.** No waivers, no bidding. Whoever commits the add first gets the fighter.
- A previously dropped fighter **can be re-added** later if still a free agent and slot-eligible. No cooldown.

**The Season Burn (the key scarce decision):**
- Each team gets **exactly one** "fought-fighter drop" for the entire season.
- One time, a team may drop a **LOCKED** (already-fought) fighter — e.g. to cut an underperformer and free the slot going forward.
- Spending the burn **does not remove** points that fighter already banked.
- Tracked per team via `league_memberships.fought_drop_used` (boolean). Once true, no further locked-fighter drops are permitted for that team for the rest of the season. Subsequently-acquired fighters lock normally; the burn does not refresh.

### 2.4 Season & format
- At league creation the commissioner sets a **season window**: a `season_start_date` and a `season_end_event` (a specific UFC event whose conclusion ends the season). Typical length ~3 months.
- The season comprises **all UFC events within the window**.
- **Total-points cumulative** competition. Standings = sum of every team's per-bout scores. No weekly matchups, no playoffs.

### 2.5 Worked scoring examples (use as engine test fixtures)

1. **Ranked champ wins title main event by KO, earns PotN:** +100 (win) +50 (finish) +50 (ranked opp) +50 (night bonus) +25 (title) +25 (main) = **300**.
2. **Fighter loses a main-event decision (was not ranked-relevant):** participation only → +25 (main) = **25**.
3. **Fight of the Night, prelim, goes to decision, neither ranked.** Winner: +100 (win) +50 (FotN) = **150**. Loser: +50 (FotN) = **50**.
4. **Wins a non-title prelim by submission over an unranked opponent:** +100 (win) +50 (finish) = **150**.
5. **Rostered fighter has no bout all season:** **0**.
6. **Fighter wins, earned PotN AND bout was FotN:** night bonus is a single **+50**, not +100. Total (non-title prelim, unranked opp) = +100 +50 (finish, if applicable) + 50 (single night bonus).

---

## 3. Tech Stack (Final)

| Layer | Choice | Notes / rationale |
|---|---|---|
| Framework | **Next.js (App Router)** + **TypeScript** | Server Components for read-heavy screens; Client Components for draft/live/interactive. |
| Styling | **Tailwind CSS** | Design tokens in §11.2 mapped to CSS variables + Tailwind theme. |
| UI primitives | **shadcn/ui** (Radix) | Accessible primitives; restyle to match the dark sport aesthetic. |
| Database | **Supabase Postgres** | Single platform for DB + auth + realtime + storage. |
| Auth | **Supabase Auth** (built-in) | Email/password + email verification + password reset + Google OAuth. Cookie sessions via `@supabase/ssr`. |
| Data access | **Drizzle ORM** | Type-safe queries + `drizzle-kit` migrations against Supabase Postgres (transaction pooler for serverless). *Decision: Drizzle over Prisma for lighter runtime + SQL-closeness; override if you prefer Prisma.* |
| Realtime (draft) | **Supabase Realtime** (Broadcast + Presence) | Client sync for the draft room. Server-authoritative timer/autopick handled by the draft worker (§9). |
| Storage | **Supabase Storage** | League logos, team/user avatars. |
| Draft worker | **Small always-on Node process** (Render free tier or Fly.io) | The one non-serverless component: holds per-draft clocks, performs autopick on timeout, broadcasts. See §9. |
| Scheduled jobs | **Vercel Cron** (daily/periodic) + **GitHub Actions** (frequent event-day polling) | Keeps polling at $0 vs. Vercel Pro cron. See §8. |
| UFC data | **API-Sports MMA (PRO, ~$10/mo)** + UFC.com rankings scrape + commissioner bonus override | Behind a provider adapter (§5). |
| Email | **Resend** (free tier) | Transactional: verification, draft alerts, lock reminders, results. Wire as Supabase Auth custom SMTP + app-triggered mail. |
| Hosting | **Vercel** | Next.js-native. Hobby for dev; Pro when commercial. |

**Monthly cost floor at MVP scale: ~$10** (API-Sports). Everything else sits on free tiers; the draft worker fits a free/hobby instance.

---

## 4. Architecture Overview

```
                    ┌─────────────────────────────────────────────┐
                    │              Next.js (Vercel)                │
   Browser  ◄─────► │  Server Components · Route Handlers ·        │
   (mobile  │       │  Server Actions · middleware (auth)          │
    web)    │       └───────────────┬─────────────────────────────┘
            │                       │ Drizzle (server-side, pooled)
            │                       ▼
            │             ┌───────────────────┐
            │             │  Supabase Postgres │  ◄── RLS (defense-in-depth)
            │             └─────────┬─────────┘
            │  Supabase Realtime    │
            └─ (draft channel) ◄────┤
                                    │
   ┌──────────────────┐            │            ┌─────────────────────────┐
   │  Draft Worker     │◄──────────┘            │  Scheduled Jobs          │
   │ (Render/Fly)      │  reads/writes draft     │  • Vercel Cron (daily)   │
   │ timer + autopick  │  broadcasts via Realtime│  • GitHub Actions (poll) │
   └──────────────────┘                         └───────────┬─────────────┘
                                                            │ calls
                                          ┌─────────────────▼──────────────┐
                                          │  Provider Adapter (§5)          │
                                          │  API-Sports · rankings scrape   │
                                          └─────────────────────────────────┘
```

**The two hard problems** (everything else is CRUD):
1. **UFC data ingestion + the scoring engine** (§5, §7). Biggest external risk: bonuses + official rankings are poorly covered by cheap APIs.
2. **Real-time snake draft** (§9): server-authoritative turn/timer state with autopick and multi-client sync.

Build and unit-test the scoring engine against fixtures (§2.5) **before** wiring any live data source.

---

## 5. Data Provider Strategy

No affordable API cleanly provides **everything** this scoring system needs. Architect around that with a **two-source + manual-override** model, all behind an adapter so the rest of the app is provider-agnostic.

**Primary: API-Sports MMA (PRO ~$10/mo, 7,500 req/day).** Source of: event schedule, fight cards, fighter bios/records, and post-fight results (winner, method, round). Free tier (100 req/day) is enough to build/test before paying.

**Supplement the two weak fields:**
- **Rankings** (powers +50 ranked-win): daily lightweight scrape of the official UFC.com rankings page (changes weekly; stable). Populates `fighters.current_ranking` / `is_champion`. Snapshotted onto bouts at lock time.
- **Bonuses** (PotN/FotN, +50): build a **commissioner/admin confirmation step**. After an event, the poller fills winner/method/round automatically; an admin screen confirms the 2–4 bonus winners and flags FotN to both fighters. The scoring engine reads these as plain `bouts` columns, so manual vs. automated population is interchangeable.
- **Title/main-event flags** (+25 each): derive from card structure (main event = top bout) and championship designation; admin screen is the fallback.

**Adapter contract** (`lib/providers/types.ts`) — implement `ApiSportsProvider` against this so a future swap (e.g. SportsDataIO) touches nothing else:

```ts
interface UFCDataProvider {
  listUpcomingEvents(): Promise<ProviderEvent[]>;
  getEventCard(externalEventId: string): Promise<ProviderBout[]>;
  listFighters(): Promise<ProviderFighter[]>;          // bios, records
  getResultsForEvent(externalEventId: string): Promise<ProviderResult[]>; // winner, method, round
}
// Rankings come from a separate RankingsSource (scrape). Bonuses are admin-entered.
```

Normalize all provider output into our schema (§6) at the adapter boundary. Never let provider field shapes leak into app code.

---

## 6. Database Schema

Postgres (Supabase). Three domains: **UFC reference** (global, sync-populated), **league/fantasy** (per-league state), **auth** (Supabase-managed + profiles). Define in Drizzle; below is the canonical shape with constraints.

### 6.1 Auth domain
- `auth.users` — managed by Supabase Auth. Do not modify.
- **`profiles`** — `id` (PK, = `auth.users.id`), `display_name`, `avatar_url`, `timezone` (IANA string; default from client), `created_at`. Row created on signup via trigger or first-login upsert.

### 6.2 UFC reference domain (mutated only by sync jobs)

**`fighters`**
- `id` (PK), `external_id` (unique, from provider), `name`, `nickname`, `weight_class` (enum: the 8 male divisions), `gender`, `photo_url`
- `record_w`, `record_l`, `record_d`
- `current_ranking` (int, nullable, 1–15), `is_champion` (bool), `ranking_division` (enum, nullable)
- `status` (enum: active/inactive/retired), `updated_at`

**`events`**
- `id` (PK), `external_id` (unique), `name`, `event_date` (timestamptz), `location`
- **`lock_time`** (timestamptz) — scheduled start of the first bout; the roster-freeze trigger
- `status` (enum: scheduled/in_progress/completed), `updated_at`

**`bouts`** — one fight on a card
- `id` (PK), `event_id` (FK→events), `fighter_a_id` (FK→fighters), `fighter_b_id` (FK→fighters), `weight_class`
- `is_title_fight` (bool), `is_main_event` (bool), `card_segment` (enum: early_prelim/prelim/main), `bout_order` (int), `scheduled_start` (timestamptz)
- `status` (enum: scheduled/completed/cancelled)
- Result (post-fight): `winner_id` (FK→fighters, nullable), `method` (enum: KO/TKO/SUB/DEC/DQ/NC), `is_finish` (bool), `end_round` (int, nullable)
- **Snapshotted at lock_time:** `fighter_a_ranked` (bool), `fighter_b_ranked` (bool)
- Bonuses (admin-confirmed): `fotn` (bool), `fighter_a_potn` (bool), `fighter_b_potn` (bool)

> The scoring engine is a pure function of `bouts` result/flag columns. Keep all scoring-relevant truth on this table.

### 6.3 League / fantasy domain

**`leagues`**
- `id` (PK), `name`, `logo_url`, `commissioner_id` (FK→profiles), `is_public` (bool), `invite_code` (unique)
- `season_start_date` (date), `season_end_event_id` (FK→events)
- `status` (enum: setup/drafting/active/completed), `created_at`

**`league_memberships`**
- `id` (PK), `league_id` (FK), `user_id` (FK→profiles), `team_name`, `role` (enum: commissioner/member), `joined_at`
- **`fought_drop_used`** (bool, default false) — the Season Burn tracker
- Unique (`league_id`, `user_id`)

**`rosters`** — a team's fighter in a slot (live roster)
- `id` (PK), `membership_id` (FK), `league_id` (FK, denormalized for constraint), `fighter_id` (FK→fighters), `slot` (enum, §2.1)
- `acquired_at`, `acquired_via` (enum: draft/free_agent)
- Unique (`membership_id`, `slot`) — one fighter per slot
- **Partial unique (`league_id`, `fighter_id`)** — enforces a fighter is on only one roster per league (FCFS exclusivity)

**`transactions`** — immutable audit log
- `id` (PK), `league_id` (FK), `membership_id` (FK), `type` (enum: draft_pick/add/drop), `fighter_id` (FK), `slot`
- `was_locked_fighter` (bool) — true when a drop spent the burn
- `created_at`

**`scores`** — materialized fantasy points (recomputed by engine)
- `id` (PK), `membership_id` (FK), `bout_id` (FK→bouts), `fighter_id` (FK), `points` (int), `breakdown` (jsonb, e.g. `{"win":100,"finish":50,"main":25}`)
- Unique (`membership_id`, `bout_id`) — idempotent upsert target
- Team season total = `SUM(points)` grouped by membership.

### 6.4 Draft domain

**`drafts`**
- `id` (PK), `league_id` (FK, unique), `type` (enum: snake), `status` (enum: scheduled/in_progress/paused/completed)
- `scheduled_start` (timestamptz), `pick_timer_seconds` (int), `current_pick_number` (int), `draft_order` (jsonb: ordered `membership_id[]`)
- `clock_expires_at` (timestamptz, nullable) — current pick deadline, set by worker

**`draft_picks`**
- `id` (PK), `draft_id` (FK), `pick_number` (int), `round` (int), `membership_id` (FK), `fighter_id` (FK, nullable until made), `slot`, `picked_at`, `is_autopick` (bool)

**`draft_queues`** — per-user pre-ranked list
- `id` (PK), `membership_id` (FK), `fighter_id` (FK), `priority` (int)

### 6.5 Notifications
**`notifications`** — `id`, `user_id` (FK→profiles), `type` (enum), `payload` (jsonb), `read_at` (nullable), `created_at`.

### 6.6 Lock-state is derived
Do **not** store a per-fighter `locked` boolean. Compute it at request time: a rostered fighter is **locked** iff there exists a bout in the league's season window where the fighter is a participant and that bout's event has `lock_time <= now()`. Provide a SQL view or a `getFighterLockState(membershipId, fighterId)` helper. This eliminates stale-flag bugs. The only persisted transaction state is `fought_drop_used`.

### 6.7 RLS & authorization model
- **Primary enforcement is server-side.** All data access goes through Next.js (Server Components / Route Handlers / Server Actions) using Drizzle with a server connection. Clients do **not** query the DB directly except Supabase Realtime channels for the draft.
- Authorization (is-this-user-in-this-league, is-commissioner, is-it-your-turn, is-fighter-droppable, is-burn-available) is enforced in server code, inside transactions.
- Enable **RLS on all tables** as defense-in-depth, keyed to `auth.uid()` and league membership, so any accidental client-side read is still constrained.

---

## 7. Scoring Engine Spec

The crux of correctness. Implement as a **pure, synchronous, unit-tested function** with zero I/O, then a thin orchestrator that loads bouts/rosters and persists results.

### 7.1 Pure function
```ts
type BoutResult = {
  fighterAId: string; fighterBId: string;
  winnerId: string | null; method: 'KO'|'TKO'|'SUB'|'DEC'|'DQ'|'NC';
  isFinish: boolean;
  isTitleFight: boolean; isMainEvent: boolean;
  fotn: boolean; fighterAPotn: boolean; fighterBPotn: boolean;
  fighterARanked: boolean; fighterBRanked: boolean; // snapshot at lock
};

type Breakdown = Partial<Record<'win'|'finish'|'nightBonus'|'rankedWin'|'title'|'main', number>>;

function computeBoutPoints(bout: BoutResult, fighterId: string): { total: number; breakdown: Breakdown } {
  const isA = fighterId === bout.fighterAId;
  const won = bout.winnerId === fighterId;
  const oppRanked = isA ? bout.fighterBRanked : bout.fighterARanked;
  const gotPotn = isA ? bout.fighterAPotn : bout.fighterBPotn;
  const b: Breakdown = {};
  if (won) b.win = 100;
  if (won && bout.isFinish) b.finish = 50;       // finisher only
  if (won && oppRanked) b.rankedWin = 50;        // beat a ranked opponent
  if (gotPotn || bout.fotn) b.nightBonus = 50;   // single +50 even if both
  if (bout.isTitleFight) b.title = 25;           // win or lose
  if (bout.isMainEvent) b.main = 25;             // win or lose
  const total = Object.values(b).reduce((s, n) => s + (n ?? 0), 0);
  return { total, breakdown: b };
}
```

### 7.2 Orchestrator (idempotent)
For each **completed** bout: find every roster across every active league that holds `fighter_a_id` or `fighter_b_id`; for each such (membership, fighter), compute points and **upsert** into `scores` on (`membership_id`, `bout_id`). Re-running after a data correction self-heals totals. Standings are a simple aggregate (`SUM(points)` per membership), optionally a materialized view refreshed after scoring.

### 7.3 Snapshot rule
At an event's `lock_time`, the pre-event snapshot job (§8) writes `fighter_a_ranked`/`fighter_b_ranked` onto every bout from the current `fighters` ranking data. Scoring reads only these snapshot booleans — never live rankings — so totals are historically stable.

### 7.4 Tests (write first)
Encode every example in §2.5 as a unit test, plus: loser gets no win/finish/ranked; both fighters get title/main; FotN credits both; PotN+FotN caps at +50; no-bout fighter scores 0; idempotent re-run produces identical totals.

---

## 8. Background Jobs

| Job | Schedule | Trigger | Does |
|---|---|---|---|
| **Reference sync** | Daily | Vercel Cron → Route Handler | Upsert fighters, events, bouts from API-Sports; recompute each `events.lock_time`. |
| **Rankings sync** | Daily | Vercel Cron → Route Handler | Scrape UFC.com rankings → update `fighters.current_ranking` / `is_champion`. |
| **Pre-event snapshot** | Every ~10 min | Vercel Cron → Route Handler | For events crossing `lock_time`: snapshot `fighter_*_ranked` onto bouts, flip event → `in_progress`. After this, the add/drop API rejects drops of fighters who compete on this event. |
| **Result poller** | Every ~3–5 min **during event windows** | GitHub Actions scheduled workflow → secured Route Handler | Pull completed bouts (winner/method/round) → write to `bouts` → trigger scoring orchestrator for affected bouts. (GitHub Actions used here to allow sub-Vercel-Pro polling frequency at $0.) |
| **Scoring orchestrator** | Event-driven | Called by poller | §7.2. Idempotent. |

Bonuses (PotN/FotN) are not polled — they're set via the commissioner admin screen (§11.4 settings), which then re-runs scoring for that event.

Secure all job endpoints with a shared secret header (`CRON_SECRET`).

---

## 9. Real-time Snake Draft

The highest-complexity surface. **Server-authoritative**: never trust a client for whose turn it is or whether the clock expired.

### 9.1 Components
- **State** lives in `drafts` + `draft_picks` (Postgres).
- **Sync**: each client subscribes to a Supabase Realtime channel `draft:{leagueId}` (Broadcast for pick/clock events, Presence for who's connected).
- **Draft worker** (always-on Node process): tracks `clock_expires_at` for in-progress drafts; on expiry performs **autopick** and advances; writes DB and broadcasts. This is the only non-serverless component.
- **Pick submission**: client → Next.js Route Handler `POST /api/leagues/:id/draft/pick`. Validates (correct membership for `current_pick_number`, fighter still available, slot-eligible), writes the pick, advances `current_pick_number` + `clock_expires_at`, broadcasts `draft:picked` + `draft:onclock`.

### 9.2 Snake logic
- Total picks = `9 × memberCount`.
- Round 1: `draft_order` forward (1→N). Round 2: reverse (N→1). Alternate each round.
- On each pick, enforce slot eligibility: a fighter can fill a division slot only if their weight class matches; `WILDCARD` accepts any male-division fighter. A team cannot draft two fighters of the same division unless the second fills `WILDCARD`.

### 9.3 Autopick
On clock expiry: pick the top still-available, slot-eligible fighter from that team's `draft_queues`; if none eligible/queued, pick best-available eligible fighter (by ranking, then record). Mark `is_autopick = true`.

### 9.4 Realtime events
- Outbound (worker/server → clients): `draft:state` (full resync on join), `draft:onclock` (`{membershipId, expiresAt}`), `draft:picked` (`{pick}`), `draft:complete`.
- Inbound (client → server REST, not over the channel): submit pick, set queue.
- **Reconnect**: on channel (re)join, client fetches `GET /api/leagues/:id/draft` for authoritative state, then resumes listening.

### 9.5 Lifecycle
`POST .../draft/schedule` (commissioner) → at start the worker picks up the draft, sets first clock → picks proceed → on final pick, set `drafts.status = completed`, populate `rosters` from `draft_picks`, set `leagues.status = active`, broadcast `draft:complete`.

---

## 10. API Surface

REST-style Route Handlers / Server Actions, grouped by domain. All require an authenticated Supabase session except public landing.

**Auth** — handled by Supabase Auth (signup, login, verify email, reset password, Google OAuth, logout). App reads session via `@supabase/ssr` in middleware + server.

**User dashboard**
- `GET /api/leagues` — my leagues + summary (rank, season points, action-needed flags)
- `GET /api/notifications`, `POST /api/notifications/:id/read`
- `GET /api/events/next` — next global UFC event

**League lifecycle**
- `POST /api/leagues` (create) · `GET /api/leagues/:id` · `PATCH /api/leagues/:id` (commissioner)
- `POST /api/leagues/join` (invite code) · `GET /api/leagues/:id/members` · `DELETE /api/leagues/:id/members/:mid` (commissioner)

**Roster / team**
- `GET /api/leagues/:id/roster` — my 9 slots, each fighter's **derived lock state**, whether burn is spent
- `GET /api/leagues/:id/roster/:mid` — view another team
- `POST /api/leagues/:id/transactions` — add/drop. **Server validates atomically:** slot eligibility (rigid), free-agent availability (FCFS via the partial-unique constraint), fighter lock state, and burn rule (locked-fighter drop allowed only if `fought_drop_used = false`, then sets it). Writes `rosters` + `transactions` in one DB transaction.

**Marketplace**
- `GET /api/leagues/:id/free-agents` — unowned fighters; filters: weight_class, ranked, has-upcoming-fight, search
- `GET /api/fighters/:id` — shared detail: bio, record, ranking, fight history, upcoming bout, season fantasy points in this league

**Upcoming fights (league-scoped)**
- `GET /api/leagues/:id/events/:eid/card` — full card; each bout annotated with which league member owns each fighter + lock countdown

**Standings & scoring**
- `GET /api/leagues/:id/standings` — cumulative leaderboard
- `GET /api/leagues/:id/scores?event=:eid` — per-event breakdown
- `GET /api/leagues/:id/scores/:mid` — a team's per-fighter, per-bout breakdown (reads `scores.breakdown`)

**Activity**
- `GET /api/leagues/:id/transactions` — league-wide add/drop feed

**Draft** (REST + Realtime, see §9)
- `GET /api/leagues/:id/draft` · `POST .../draft/schedule|start|pause` (commissioner) · `PUT .../draft/queue` · `POST .../draft/pick`

**Commissioner / admin**
- `POST /api/leagues/:id/events/:eid/bonuses` — confirm PotN/FotN + title/main flags for an event → re-runs scoring for that event

**Jobs** (secret-protected) — §8 endpoints.

---

## 11. Frontend

Mobile-first, dark, polished. Reproduce the supplied design system faithfully (§11.2). Server Components for read-heavy screens; Client Components for draft, add/drop, and live tickers.

### 11.1 Route map (App Router)
```
/                         landing / marketing
/login  /signup           auth (Supabase)
/onboarding               create-or-join routing
/dashboard                user dashboard (all leagues)
/leagues/new              creation wizard
/leagues/join             invite-code entry
/leagues/[id]             league dashboard (tabs via ?tab=)
   ?tab=team              my roster + lock states + burn
   ?tab=fights            upcoming card, ownership annotations
   ?tab=marketplace       free agents, add/drop
   ?tab=standings         cumulative leaderboard
   ?tab=scores            scoreboard + breakdowns (live during events)
   ?tab=activity          transaction feed
   ?tab=settings          commissioner tools + bonus confirmation
/leagues/[id]/draft       real-time draft room
/fighters/[id]            fighter detail (sheet or page)
/settings                 account settings
```

### 11.2 Design system (canonical — from supplied prototype)

**Aesthetic:** dark, broadcast/sport, mobile (≈402×874 frame). Match the supplied `app.jsx` / `ui.jsx` exactly in spirit and tokens.

**Accent themes** (selectable; default `#2e8bff`): each defines `ink`, `glow`, `wash`.
- `#2e8bff` blue (ink `#fff`), `#c8f135` lime (ink `#0a0b0d`), `#f5b014` amber (ink `#0a0b0d`), `#ff4d57` red (ink `#fff`).

**Typography personalities** (default **Sport**):
- **Sport** — display `Saira Condensed`, body `Saira`, numerals `Space Mono`, uppercase display, `0.4px` tracking.
- **Swiss** — `Helvetica Neue` throughout, `-0.2px`.
- **Mono** — `Space Mono` display/numerals, `Saira` body.

**CSS variables to define** (map to Tailwind theme): `--accent`, `--accent-ink`, `--accent-glow`, `--accent-wash`, `--font-display`, `--font-body`, `--font-num`, `--bg`, `--surface`, `--surface-3`, `--border`, `--text`, `--text-2`, `--text-3`, plus status colors `--live` (red, pulsing), `--win` (green `#2fbf71`), `--gold`, `--frost` (slate `#7d8aa3`).

**Status semantics** (drives the roster UI):
- `LOCKED` → frost + lock icon · `UNLOCKED` → win-green + unlock icon · `LIVE` → red pulsing dot · `EMPTY` → amber + warn icon.

**Component inventory** (port from prototype):
- `Header` (league name + team points + bell), `EventBanner` (next event + countdown to lock + lock/go-live toggle), `LivePanel` (live scoring feed with play/step + points gained), `RosterSlot` ×9 (card variants: **Row / Stat / Broadcast**; empty-state emphasis: **Subtle / Bold / Color**), `FighterDetail` sheet (bio, stats, lock state, drop/burn action), `AddSheet` (free-agent picker filtered to the slot's division), `ConfirmDrop` (distinct **Season Burn** confirmation when dropping a locked fighter), `TabBar`, `Toast`, `Headshot` (placeholder: hue-gradient panel + initials + country tab + live pulse; production may swap in `photo_url`), `DivTag`, `RankTag` (`#n` gold), `StatusChip`, `ScoreChip` (`label +pts`).

**Iconography:** simple geometric `currentColor` SVGs (lock, unlock, bolt, plus, chevron, flame, bell, trophy, clock, close, warn, search, swap) — reuse the prototype set.

### 11.3 Key screen specs
- **My Team:** 9 slots top-to-bottom; each shows headshot, name, division tag, rank, season points, and **lock/unlocked/empty** status; tap → `FighterDetail`; empty slot → `AddSheet`. Header shows team total + "N slots open / full lineup". During a live event, show `LivePanel` and live point bursts per fighter.
- **Drop / Burn flow:** dropping an UNLOCKED fighter → normal confirm. Dropping a LOCKED fighter → **Season Burn** confirm that clearly states it's the once-per-season move and is disabled if `fought_drop_used`.
- **Marketplace:** searchable/filterable free-agent list; adding is slot-rigid (division must match unless filling `WILDCARD`); FCFS — surface a clear error if a fighter was just taken.
- **Draft room:** live board (every team's picks by round), on-the-clock indicator + countdown, available-pool search/filter, personal queue (drag to rank), autopick fallback; fully synced via Realtime.
- **Standings:** cumulative leaderboard (rank, team, season points). 
- **Scores:** per-event matchup/breakdown reading `scores.breakdown`; live during events.

### 11.4 States
Every screen needs explicit **loading, empty, and error** states. Time zones: render all fight times and lock countdowns in the user's `profiles.timezone`.

---

## 12. Auth (Supabase)

- **Methods:** email/password (with Supabase email verification), password reset, and **Google OAuth**. Configure providers + email templates in the Supabase dashboard; wire custom SMTP to **Resend** for branded mail.
- **Next.js integration:** `@supabase/ssr` for cookie-based sessions. Middleware refreshes/guards sessions; Server Components and Route Handlers read the user server-side. Protect all `/dashboard`, `/leagues/**`, `/settings` routes.
- **Profile bootstrap:** on first authentication, upsert a `profiles` row (display name from OAuth or signup, default timezone from client).
- **Authorization:** enforced in server code (see §6.7), with RLS as backstop.

---

## 13. Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only; never exposed to client
DATABASE_URL=                     # Supabase Postgres (transaction pooler) for Drizzle

# Data provider
API_SPORTS_KEY=
UFC_RANKINGS_URL=                 # UFC.com rankings page (scrape target)

# Jobs / security
CRON_SECRET=                      # shared header for job + poller endpoints

# Email
RESEND_API_KEY=

# Draft worker
SUPABASE_SERVICE_ROLE_KEY=        # worker writes/broadcasts
DRAFT_WORKER_URL=                 # if app needs to reach the worker

# OAuth (configured in Supabase dashboard; client IDs/secrets stored there)
```

---

## 14. Repo Structure (suggested)

```
/app                      # Next.js App Router (routes per §11.1)
  /(marketing)/page.tsx
  /dashboard/...
  /leagues/...
  /api/...                # Route Handlers (§10) + /api/jobs/*
/components               # shadcn/ui + ported design components (§11.2)
/lib
  /db                     # Drizzle schema, migrations, client
  /scoring                # computeBoutPoints + orchestrator + tests
  /providers              # UFCDataProvider adapter + ApiSportsProvider + rankings scraper
  /supabase               # ssr client, server client, realtime helpers
  /auth                   # session/authorization helpers
/worker                   # standalone draft worker (deploy to Render/Fly)
/tests                    # scoring fixtures (§2.5), transaction-rule tests
drizzle.config.ts
```

---

## 15. Build Phases / Milestones

Build in this order. Each phase should be independently runnable/testable.

1. **Foundation.** Next.js + TS + Tailwind + shadcn/ui scaffold. Design tokens & core components (§11.2) ported from the prototype. Supabase project, Drizzle schema (§6) + migrations. Supabase Auth wired (`@supabase/ssr`), `profiles` bootstrap, route guards.
2. **Scoring engine (no live data).** Implement `computeBoutPoints` + orchestrator (§7) with full unit tests against §2.5 fixtures. This is correctness-critical and has zero external dependencies — do it early.
3. **Leagues & membership.** Create/join (invite codes), user dashboard listing leagues, league shell with tabs, commissioner role.
4. **Data ingestion.** Provider adapter + `ApiSportsProvider`; reference sync + rankings scrape (§5, §8); populate fighters/events/bouts; compute `lock_time`.
5. **Draft.** `drafts`/`draft_picks`/`draft_queues`, draft room UI, Supabase Realtime sync, the draft worker (timer + autopick), snake logic, roster population on completion (§9).
6. **Roster, lock state & transactions.** My Team screen (9 slots, status), derived lock-state helper/view (§6.6), add/drop API with slot-rigid + FCFS + Season Burn enforcement (§2.3, §10), marketplace + add/drop UI.
7. **Live scoring loop.** Pre-event snapshot job, result poller (GitHub Actions), wire orchestrator; live `LivePanel`/scoreboard; standings; per-team breakdowns.
8. **Bonuses & admin.** Commissioner bonus-confirmation screen → re-score event; title/main-event flag overrides.
9. **Notifications & polish.** In-app + Resend email (draft starting, lock reminder, results posted); loading/empty/error states everywhere; timezone formatting; responsive QA; accessibility pass.

---

## 16. Definition of Done (acceptance criteria)

- **Auth:** sign up, verify email, log in (password + Google), reset password, log out; protected routes enforced; profile with timezone.
- **League:** create with season window (start + end event) and snake-draft settings; invite + join by code; dashboard shows all leagues with rank/points.
- **Draft:** full snake draft runs live with multiple connected clients; on-clock timer + autopick work; slot eligibility enforced; rosters populate on completion; reconnect resyncs.
- **Roster/transactions:** 9 rigid slots; unlocked fighters freely droppable; locked fighters blocked **except** one Season Burn per team; adds are slot-rigid; FCFS prevents double-rostering; dropped fighters re-addable. Lock state flips correctly at event start.
- **Scoring:** matches all §2.5 examples; banked points never removed on drop; ranked status uses lock-time snapshot; idempotent re-runs; standings reflect cumulative totals; live updates appear during events.
- **Data:** events/cards/fighters/results populate from API-Sports; rankings from scrape; bonuses confirmable by commissioner and re-score correctly.
- **UI:** matches the supplied dark sport design system; mobile-first; loading/empty/error states present; times in user timezone.

---

## 17. Open Decisions & Assumptions

Resolve or confirm these during the build; current assumptions in **bold**.

1. **ORM = Drizzle.** (Override to Prisma if preferred — schema §6 is ORM-agnostic.)
2. **Draft worker on Render free tier** (or Fly.io). Confirm the host; it's the one always-on, non-serverless component.
3. **Result polling via GitHub Actions** every ~3–5 min during event windows (keeps cost at $0 vs. Vercel Pro cron). Confirm acceptable, or move to Vercel Pro cron.
4. **Bonuses are commissioner-confirmed** post-event (no reliable API field). Confirm this manual step is acceptable for MVP; it's a ~30-second task per event.
5. **Title/main-event flags** derived from card structure with admin override. Confirm the derivation is trusted or always require confirmation.
6. **Draft order** method (random vs. commissioner-set) — default **random** at draft start; expose a commissioner toggle if desired.
7. **Pick timer default** — pick a value (e.g. **60s**) for `pick_timer_seconds`.
8. **Provider coverage check:** before relying on API-Sports in production, validate its MMA results coverage (method/round granularity) against a recent event; the adapter makes swapping to SportsDataIO low-cost if gaps appear.

---

*End of plan. Build §15 in order; treat §2 and §7 as correctness-critical.*