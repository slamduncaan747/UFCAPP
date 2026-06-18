CREATE TYPE "public"."acquired_via" AS ENUM('draft', 'free_agent');--> statement-breakpoint
CREATE TYPE "public"."bout_method" AS ENUM('KO', 'TKO', 'SUB', 'DEC', 'DQ', 'NC');--> statement-breakpoint
CREATE TYPE "public"."bout_status" AS ENUM('scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."card_segment" AS ENUM('early_prelim', 'prelim', 'main');--> statement-breakpoint
CREATE TYPE "public"."draft_status" AS ENUM('scheduled', 'in_progress', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('scheduled', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."fighter_status" AS ENUM('active', 'inactive', 'retired');--> statement-breakpoint
CREATE TYPE "public"."league_status" AS ENUM('setup', 'drafting', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('commissioner', 'member');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('draft_starting', 'lock_reminder', 'results_posted', 'pick_on_clock', 'league_invite');--> statement-breakpoint
CREATE TYPE "public"."slot" AS ENUM('FLW', 'BW', 'FW', 'LW', 'WW', 'MW', 'LHW', 'HW', 'WILDCARD');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('draft_pick', 'add', 'drop');--> statement-breakpoint
CREATE TYPE "public"."weight_class" AS ENUM('FLW', 'BW', 'FW', 'LW', 'WW', 'MW', 'LHW', 'HW');--> statement-breakpoint
CREATE TABLE "bouts" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"event_id" text NOT NULL,
	"fighter_a_id" text NOT NULL,
	"fighter_b_id" text NOT NULL,
	"weight_class" "weight_class" NOT NULL,
	"is_title_fight" boolean DEFAULT false NOT NULL,
	"is_main_event" boolean DEFAULT false NOT NULL,
	"card_segment" "card_segment" DEFAULT 'prelim' NOT NULL,
	"bout_order" integer DEFAULT 0 NOT NULL,
	"scheduled_start" timestamp with time zone,
	"status" "bout_status" DEFAULT 'scheduled' NOT NULL,
	"winner_id" text,
	"method" "bout_method",
	"is_finish" boolean DEFAULT false NOT NULL,
	"end_round" integer,
	"fighter_a_ranked" boolean DEFAULT false NOT NULL,
	"fighter_b_ranked" boolean DEFAULT false NOT NULL,
	"fotn" boolean DEFAULT false NOT NULL,
	"fighter_a_potn" boolean DEFAULT false NOT NULL,
	"fighter_b_potn" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draft_picks" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"draft_id" text NOT NULL,
	"pick_number" integer NOT NULL,
	"round" integer NOT NULL,
	"membership_id" text NOT NULL,
	"fighter_id" text,
	"slot" "slot",
	"picked_at" timestamp with time zone,
	"is_autopick" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draft_queues" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"membership_id" text NOT NULL,
	"fighter_id" text NOT NULL,
	"priority" integer NOT NULL,
	CONSTRAINT "draft_queues_membership_id_fighter_id_unique" UNIQUE("membership_id","fighter_id")
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"league_id" text NOT NULL,
	"type" text DEFAULT 'snake' NOT NULL,
	"status" "draft_status" DEFAULT 'scheduled' NOT NULL,
	"scheduled_start" timestamp with time zone,
	"pick_timer_seconds" integer DEFAULT 60 NOT NULL,
	"current_pick_number" integer DEFAULT 0 NOT NULL,
	"draft_order" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"clock_expires_at" timestamp with time zone,
	CONSTRAINT "drafts_league_id_unique" UNIQUE("league_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"event_date" timestamp with time zone NOT NULL,
	"location" text,
	"lock_time" timestamp with time zone NOT NULL,
	"status" "event_status" DEFAULT 'scheduled' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "fighters" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"nickname" text,
	"weight_class" "weight_class" NOT NULL,
	"gender" text DEFAULT 'male' NOT NULL,
	"photo_url" text,
	"record_w" integer DEFAULT 0 NOT NULL,
	"record_l" integer DEFAULT 0 NOT NULL,
	"record_d" integer DEFAULT 0 NOT NULL,
	"current_ranking" integer,
	"is_champion" boolean DEFAULT false NOT NULL,
	"ranking_division" "weight_class",
	"status" "fighter_status" DEFAULT 'active' NOT NULL,
	"height_in" real,
	"reach_in" real,
	"weight_lbs" real,
	"stance" text,
	"dob" date,
	"slpm" real,
	"sapm" real,
	"str_acc" real,
	"str_def" real,
	"td_avg" real,
	"td_acc" real,
	"td_def" real,
	"sub_avg" real,
	"photo_license" text,
	"photo_attribution" text,
	"photo_source" text,
	"draft_score" real,
	"last_fight_at" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fighters_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "league_memberships" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"league_id" text NOT NULL,
	"user_id" text NOT NULL,
	"team_name" text NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fought_drop_used" boolean DEFAULT false NOT NULL,
	"autodraft_enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "league_memberships_league_id_user_id_unique" UNIQUE("league_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"commissioner_id" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"invite_code" text NOT NULL,
	"season_start_date" date NOT NULL,
	"season_end_event_id" text,
	"status" "league_status" DEFAULT 'setup' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leagues_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "rosters" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"membership_id" text NOT NULL,
	"league_id" text NOT NULL,
	"fighter_id" text NOT NULL,
	"slot" "slot" NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acquired_via" "acquired_via" DEFAULT 'draft' NOT NULL,
	CONSTRAINT "rosters_membership_id_slot_unique" UNIQUE("membership_id","slot"),
	CONSTRAINT "rosters_league_id_fighter_id_unique" UNIQUE("league_id","fighter_id")
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"membership_id" text NOT NULL,
	"bout_id" text NOT NULL,
	"fighter_id" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "scores_membership_id_bout_id_unique" UNIQUE("membership_id","bout_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY DEFAULT 'gen_random_uuid()' NOT NULL,
	"league_id" text NOT NULL,
	"membership_id" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"fighter_id" text NOT NULL,
	"slot" "slot" NOT NULL,
	"was_locked_fighter" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_fighter_a_id_fighters_id_fk" FOREIGN KEY ("fighter_a_id") REFERENCES "public"."fighters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_fighter_b_id_fighters_id_fk" FOREIGN KEY ("fighter_b_id") REFERENCES "public"."fighters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bouts" ADD CONSTRAINT "bouts_winner_id_fighters_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."fighters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_membership_id_league_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."league_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_fighter_id_fighters_id_fk" FOREIGN KEY ("fighter_id") REFERENCES "public"."fighters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_queues" ADD CONSTRAINT "draft_queues_membership_id_league_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."league_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_queues" ADD CONSTRAINT "draft_queues_fighter_id_fighters_id_fk" FOREIGN KEY ("fighter_id") REFERENCES "public"."fighters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_commissioner_id_profiles_id_fk" FOREIGN KEY ("commissioner_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_season_end_event_id_events_id_fk" FOREIGN KEY ("season_end_event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_membership_id_league_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."league_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_fighter_id_fighters_id_fk" FOREIGN KEY ("fighter_id") REFERENCES "public"."fighters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_membership_id_league_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."league_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_bout_id_bouts_id_fk" FOREIGN KEY ("bout_id") REFERENCES "public"."bouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_fighter_id_fighters_id_fk" FOREIGN KEY ("fighter_id") REFERENCES "public"."fighters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_membership_id_league_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."league_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fighter_id_fighters_id_fk" FOREIGN KEY ("fighter_id") REFERENCES "public"."fighters"("id") ON DELETE no action ON UPDATE no action;