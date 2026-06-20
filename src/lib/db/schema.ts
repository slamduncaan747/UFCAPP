import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  date,
  unique,
  index,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const weightClassEnum = pgEnum("weight_class", [
  "FLW",
  "BW",
  "FW",
  "LW",
  "WW",
  "MW",
  "LHW",
  "HW",
]);

export const slotEnum = pgEnum("slot", [
  "FLW",
  "BW",
  "FW",
  "LW",
  "WW",
  "MW",
  "LHW",
  "HW",
  "WILDCARD",
]);

export const fighterStatusEnum = pgEnum("fighter_status", [
  "active",
  "inactive",
  "retired",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "scheduled",
  "in_progress",
  "completed",
]);

export const cardSegmentEnum = pgEnum("card_segment", [
  "early_prelim",
  "prelim",
  "main",
]);

export const boutStatusEnum = pgEnum("bout_status", [
  "scheduled",
  "completed",
  "cancelled",
]);

export const boutMethodEnum = pgEnum("bout_method", [
  "KO",
  "TKO",
  "SUB",
  "DEC",
  "DQ",
  "NC",
]);

export const leagueStatusEnum = pgEnum("league_status", [
  "setup",
  "drafting",
  "active",
  "completed",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "commissioner",
  "member",
]);

export const acquiredViaEnum = pgEnum("acquired_via", [
  "draft",
  "free_agent",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "draft_pick",
  "add",
  "drop",
]);

export const draftStatusEnum = pgEnum("draft_status", [
  "scheduled",
  "in_progress",
  "paused",
  "completed",
]);

export const waiverStatusEnum = pgEnum("waiver_status", [
  "pending",
  "won",
  "lost",
  "invalid",
  "cancelled",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "draft_starting",
  "lock_reminder",
  "results_posted",
  "pick_on_clock",
  "league_invite",
]);

// ─── Auth domain ─────────────────────────────────────────────────────────────

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(), // = auth.users.id
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  timezone: text("timezone").notNull().default("America/New_York"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── UFC reference domain ────────────────────────────────────────────────────

export const fighters = pgTable("fighters", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  externalId: text("external_id").notNull().unique(),
  name: text("name").notNull(),
  nickname: text("nickname"),
  weightClass: weightClassEnum("weight_class").notNull(),
  gender: text("gender").notNull().default("male"),
  photoUrl: text("photo_url"),
  recordW: integer("record_w").notNull().default(0),
  recordL: integer("record_l").notNull().default(0),
  recordD: integer("record_d").notNull().default(0),
  currentRanking: integer("current_ranking"),
  isChampion: boolean("is_champion").notNull().default(false),
  rankingDivision: weightClassEnum("ranking_division"),
  status: fighterStatusEnum("status").notNull().default("active"),
  // ── Physical / career stats (mirrored live from the scraped UFC data) ──────
  heightIn: real("height_in"),
  reachIn: real("reach_in"),
  weightLbs: real("weight_lbs"),
  stance: text("stance"),
  dob: date("dob"),
  slpm: real("slpm"), // sig. strikes landed per min
  sapm: real("sapm"), // sig. strikes absorbed per min
  strAcc: real("str_acc"), // striking accuracy (%)
  strDef: real("str_def"), // striking defense (%)
  tdAvg: real("td_avg"), // takedowns per 15 min
  tdAcc: real("td_acc"), // takedown accuracy (%)
  tdDef: real("td_def"), // takedown defense (%)
  subAvg: real("sub_avg"), // submission attempts per 15 min
  photoLicense: text("photo_license"),
  photoAttribution: text("photo_attribution"),
  photoSource: text("photo_source"),
  draftScore: real("draft_score"),
  lastFightAt: date("last_fight_at"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const events = pgTable("events", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  externalId: text("external_id").notNull().unique(),
  name: text("name").notNull(),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  location: text("location"),
  lockTime: timestamp("lock_time", { withTimezone: true }).notNull(),
  status: eventStatusEnum("status").notNull().default("scheduled"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bouts = pgTable("bouts", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  fighterAId: text("fighter_a_id")
    .notNull()
    .references(() => fighters.id),
  fighterBId: text("fighter_b_id")
    .notNull()
    .references(() => fighters.id),
  weightClass: weightClassEnum("weight_class").notNull(),
  isTitleFight: boolean("is_title_fight").notNull().default(false),
  isMainEvent: boolean("is_main_event").notNull().default(false),
  cardSegment: cardSegmentEnum("card_segment").notNull().default("prelim"),
  boutOrder: integer("bout_order").notNull().default(0),
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }),
  status: boutStatusEnum("status").notNull().default("scheduled"),
  // Post-fight results
  winnerId: text("winner_id").references(() => fighters.id),
  method: boutMethodEnum("method"),
  isFinish: boolean("is_finish").notNull().default(false),
  endRound: integer("end_round"),
  // Lock-time snapshots (written at event lock_time)
  fighterARanked: boolean("fighter_a_ranked").notNull().default(false),
  fighterBRanked: boolean("fighter_b_ranked").notNull().default(false),
  // Admin-confirmed bonuses
  fotn: boolean("fotn").notNull().default(false),
  fighterAPotn: boolean("fighter_a_potn").notNull().default(false),
  fighterBPotn: boolean("fighter_b_potn").notNull().default(false),
});

// ─── League / fantasy domain ──────────────────────────────────────────────────

export const leagues = pgTable("leagues", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  commissionerId: text("commissioner_id")
    .notNull()
    .references(() => profiles.id),
  isPublic: boolean("is_public").notNull().default(false),
  inviteCode: text("invite_code").notNull().unique(),
  seasonStartDate: date("season_start_date").notNull(),
  seasonEndEventId: text("season_end_event_id").references(() => events.id),
  status: leagueStatusEnum("status").notNull().default("setup"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const leagueMemberships = pgTable(
  "league_memberships",
  {
    id: text("id").primaryKey().default("gen_random_uuid()"),
    leagueId: text("league_id")
      .notNull()
      .references(() => leagues.id),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id),
    teamName: text("team_name").notNull(),
    role: memberRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    foughtDropUsed: boolean("fought_drop_used").notNull().default(false),
    autodraftEnabled: boolean("autodraft_enabled").notNull().default(false),
    // Pre-seeded team that a new signup can claim as their own (private-league bootstrap).
    claimable: boolean("claimable").notNull().default(false),
  },
  (t) => [unique().on(t.leagueId, t.userId)]
);

export const rosters = pgTable(
  "rosters",
  {
    id: text("id").primaryKey().default("gen_random_uuid()"),
    membershipId: text("membership_id")
      .notNull()
      .references(() => leagueMemberships.id),
    leagueId: text("league_id")
      .notNull()
      .references(() => leagues.id),
    fighterId: text("fighter_id")
      .notNull()
      .references(() => fighters.id),
    slot: slotEnum("slot").notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    acquiredVia: acquiredViaEnum("acquired_via").notNull().default("draft"),
  },
  (t) => [
    unique().on(t.membershipId, t.slot),
    unique().on(t.leagueId, t.fighterId),
  ]
);

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  membershipId: text("membership_id")
    .notNull()
    .references(() => leagueMemberships.id),
  type: transactionTypeEnum("type").notNull(),
  fighterId: text("fighter_id")
    .notNull()
    .references(() => fighters.id),
  slot: slotEnum("slot").notNull(),
  wasLockedFighter: boolean("was_locked_fighter").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const scores = pgTable(
  "scores",
  {
    id: text("id").primaryKey().default("gen_random_uuid()"),
    membershipId: text("membership_id")
      .notNull()
      .references(() => leagueMemberships.id),
    boutId: text("bout_id")
      .notNull()
      .references(() => bouts.id),
    fighterId: text("fighter_id")
      .notNull()
      .references(() => fighters.id),
    points: integer("points").notNull().default(0),
    breakdown: jsonb("breakdown").notNull().default({}),
  },
  (t) => [unique().on(t.membershipId, t.boutId)]
);

// ─── Draft domain ─────────────────────────────────────────────────────────────

export const drafts = pgTable("drafts", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id)
    .unique(),
  type: text("type").notNull().default("snake"),
  status: draftStatusEnum("status").notNull().default("scheduled"),
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }),
  pickTimerSeconds: integer("pick_timer_seconds").notNull().default(60),
  currentPickNumber: integer("current_pick_number").notNull().default(0),
  draftOrder: jsonb("draft_order").notNull().default([]), // membership_id[]
  clockExpiresAt: timestamp("clock_expires_at", { withTimezone: true }),
});

export const draftPicks = pgTable("draft_picks", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  draftId: text("draft_id")
    .notNull()
    .references(() => drafts.id),
  pickNumber: integer("pick_number").notNull(),
  round: integer("round").notNull(),
  membershipId: text("membership_id")
    .notNull()
    .references(() => leagueMemberships.id),
  fighterId: text("fighter_id").references(() => fighters.id),
  slot: slotEnum("slot"),
  pickedAt: timestamp("picked_at", { withTimezone: true }),
  isAutopick: boolean("is_autopick").notNull().default(false),
});

export const draftQueues = pgTable(
  "draft_queues",
  {
    id: text("id").primaryKey().default("gen_random_uuid()"),
    membershipId: text("membership_id")
      .notNull()
      .references(() => leagueMemberships.id),
    fighterId: text("fighter_id")
      .notNull()
      .references(() => fighters.id),
    priority: integer("priority").notNull(),
  },
  (t) => [unique().on(t.membershipId, t.fighterId)]
);

// ─── Waiver wire ──────────────────────────────────────────────────────────────
// Weekly blind-bid claims. Each team may submit up to 2 prioritized bids and win
// at most one. Processed Monday morning in REVERSE draft order (the team that
// drafted last gets first preference). The dropped fighter must already have
// fought this season.
export const waiverClaims = pgTable(
  "waiver_claims",
  {
    id: text("id").primaryKey().default("gen_random_uuid()"),
    leagueId: text("league_id").notNull().references(() => leagues.id),
    membershipId: text("membership_id").notNull().references(() => leagueMemberships.id),
    addFighterId: text("add_fighter_id").notNull().references(() => fighters.id),
    dropFighterId: text("drop_fighter_id").notNull().references(() => fighters.id),
    bidPriority: integer("bid_priority").notNull(), // 1 (preferred) or 2 (fallback)
    status: waiverStatusEnum("status").notNull().default("pending"),
    slot: slotEnum("slot"), // resolved slot, set when a claim is won
    period: text("period").notNull(), // YYYY-MM-DD of the processing Monday
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [
    unique().on(t.membershipId, t.period, t.bidPriority),
    index("waiver_claims_league_status_idx").on(t.leagueId, t.status),
    index("waiver_claims_membership_idx").on(t.membershipId),
  ]
);

// ─── Push subscriptions ───────────────────────────────────────────────────────

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id),
  type: notificationTypeEnum("type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
