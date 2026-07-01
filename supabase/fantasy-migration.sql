-- ============================================================
-- UFC FANTASY LEAGUE — FULL MIGRATION
-- Run this entire script in the SQL Editor of project:
--   nzmrrdfasnmgdzhpkmve  (your main UFC data project)
-- ============================================================

-- ─── STEP 1: Enum Types ──────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE slot AS ENUM ('FLW','BW','FW','LW','WW','MW','LHW','HW','WILDCARD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE member_role AS ENUM ('commissioner','member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE league_status AS ENUM ('setup','drafting','active','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE acquired_via AS ENUM ('draft','free_agent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE waiver_status AS ENUM ('pending','won','lost','invalid','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE transaction_type AS ENUM ('draft_pick','add','drop');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── STEP 2: Tables ──────────────────────────────────────────────────────────
-- NOTE: fighter_id and bout_id use UUID to match your existing fighters/bouts tables.
--       league_id and membership_id use TEXT (our new tables use text PKs).

CREATE TABLE IF NOT EXISTS public.profiles (
  id           text PRIMARY KEY,
  display_name text NOT NULL,
  avatar_url   text,
  timezone     text NOT NULL DEFAULT 'America/New_York',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leagues (
  id                text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name              text NOT NULL,
  logo_url          text,
  commissioner_id   text NOT NULL REFERENCES public.profiles(id),
  is_public         boolean NOT NULL DEFAULT false,
  invite_code       text NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  season_start_date date NOT NULL DEFAULT CURRENT_DATE,
  status            league_status NOT NULL DEFAULT 'active',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.league_memberships (
  id                text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  league_id         text NOT NULL REFERENCES public.leagues(id),
  user_id           text NOT NULL REFERENCES public.profiles(id),
  team_name         text NOT NULL,
  role              member_role NOT NULL DEFAULT 'member',
  joined_at         timestamptz NOT NULL DEFAULT now(),
  claimable         boolean NOT NULL DEFAULT false,
  autodraft_enabled boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.rosters (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  membership_id text NOT NULL REFERENCES public.league_memberships(id),
  league_id     text NOT NULL REFERENCES public.leagues(id),
  fighter_id    text NOT NULL REFERENCES public.fighters(id),
  slot          slot NOT NULL,
  acquired_at   timestamptz NOT NULL DEFAULT now(),
  acquired_via  acquired_via NOT NULL DEFAULT 'draft',
  UNIQUE(membership_id, slot),
  UNIQUE(membership_id, fighter_id)
);

CREATE TABLE IF NOT EXISTS public.scores (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  membership_id text NOT NULL REFERENCES public.league_memberships(id),
  bout_id       uuid NOT NULL REFERENCES public.bouts(id),
  fighter_id    text NOT NULL REFERENCES public.fighters(id),
  points        integer NOT NULL DEFAULT 0,
  breakdown     jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id                 text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  league_id          text NOT NULL REFERENCES public.leagues(id),
  membership_id      text NOT NULL REFERENCES public.league_memberships(id),
  type               transaction_type NOT NULL,
  fighter_id         text NOT NULL REFERENCES public.fighters(id),
  slot               slot NOT NULL,
  was_locked_fighter boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.waiver_claims (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  league_id       text NOT NULL REFERENCES public.leagues(id),
  membership_id   text NOT NULL REFERENCES public.league_memberships(id),
  add_fighter_id  text NOT NULL REFERENCES public.fighters(id),
  drop_fighter_id text NOT NULL REFERENCES public.fighters(id),
  bid_priority    integer NOT NULL,
  status          waiver_status NOT NULL DEFAULT 'pending',
  slot            slot,
  period          text NOT NULL DEFAULT '',
  failure_reason  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz
);

-- ─── STEP 3: Seed Data ───────────────────────────────────────────────────────

INSERT INTO public.profiles (id, display_name) VALUES
  ('pf_commissioner', 'Commissioner'),
  ('pf_isiah',  'Isiah'),
  ('pf_wyatt',  'Wyatt'),
  ('pf_gus',    'Gus'),
  ('pf_conrad', 'Conrad'),
  ('pf_teddy',  'Teddy'),
  ('pf_tommy',  'Tommy'),
  ('pf_sam',    'Sam'),
  ('pf_duncan', 'Duncan')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.leagues (id, name, commissioner_id, status, season_start_date)
VALUES ('lg_ufclg', 'Fantasy UFC League', 'pf_commissioner', 'active', CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.league_memberships (id, league_id, user_id, team_name, role, claimable) VALUES
  ('mb_isiah',  'lg_ufclg', 'pf_isiah',  'Isiah',  'member',       true),
  ('mb_wyatt',  'lg_ufclg', 'pf_wyatt',  'Wyatt',  'member',       true),
  ('mb_gus',    'lg_ufclg', 'pf_gus',    'Gus',    'member',       true),
  ('mb_conrad', 'lg_ufclg', 'pf_conrad', 'Conrad', 'member',       true),
  ('mb_teddy',  'lg_ufclg', 'pf_teddy',  'Teddy',  'member',       true),
  ('mb_tommy',  'lg_ufclg', 'pf_tommy',  'Tommy',  'member',       true),
  ('mb_sam',    'lg_ufclg', 'pf_sam',    'Sam',    'member',       true),
  ('mb_duncan', 'lg_ufclg', 'pf_duncan', 'Duncan', 'commissioner', true)
ON CONFLICT (id) DO NOTHING;

-- ─── STEP 4: Rosters ─────────────────────────────────────────────────────────

-- ISIAH
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'FLW' FROM public.fighters WHERE name = 'Ramazan Temirov' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'BW' FROM public.fighters WHERE name = 'Payton Talbott' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'FW' FROM public.fighters WHERE name = 'Aaron Pico' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'LW' FROM public.fighters WHERE name = 'Benoit Saint Denis' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'WW' FROM public.fighters WHERE name = 'Max Holloway' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'MW' FROM public.fighters WHERE name = 'Yousri Belgaroui' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'LHW' FROM public.fighters WHERE name = 'Paulo Costa' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'HW' FROM public.fighters WHERE name = 'Mario Pinto' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'WILDCARD' FROM public.fighters WHERE name = 'Ian Machado Garry' LIMIT 1 ON CONFLICT DO NOTHING;

-- DUNCAN
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'FLW' FROM public.fighters WHERE name = 'Andre Lima' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'BW' FROM public.fighters WHERE name = 'Mario Bautista' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'FW' FROM public.fighters WHERE name = 'Movsar Evloev' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'LW' FROM public.fighters WHERE name = 'Rafael Fiziev' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'WW' FROM public.fighters WHERE name = 'Jack Della Maddalena' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'MW' FROM public.fighters WHERE name = 'Sean Strickland' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'LHW' FROM public.fighters WHERE name = 'Abdul Rakhman Yakhyaev' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'HW' FROM public.fighters WHERE name = 'Serghei Spivac' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'WILDCARD' FROM public.fighters WHERE name = 'Mansur Abdul-Malik' LIMIT 1 ON CONFLICT DO NOTHING;

-- WYATT
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'FLW' FROM public.fighters WHERE name = 'Brandon Royval' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'BW' FROM public.fighters WHERE name = 'Cory Sandhagen' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'FW' FROM public.fighters WHERE name = 'Yair Rodriguez' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'LW' FROM public.fighters WHERE name = 'Manuel Torres' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'WW' FROM public.fighters WHERE name = 'Islam Makhachev' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'MW' FROM public.fighters WHERE name = 'Dricus Du Plessis' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'LHW' FROM public.fighters WHERE name = 'Jiri Prochazka' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'HW' FROM public.fighters WHERE name = 'Valter Walker' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'WILDCARD' FROM public.fighters WHERE name = 'Conor McGregor' LIMIT 1 ON CONFLICT DO NOTHING;

-- GUS
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'FLW' FROM public.fighters WHERE name = 'Jose Ochoa' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'BW' FROM public.fighters WHERE name = 'Umar Nurmagomedov' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'FW' FROM public.fighters WHERE name = 'Kevin Vallejos' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'LW' FROM public.fighters WHERE name = 'Terrance McKinney' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'WW' FROM public.fighters WHERE name = 'Myktybek Orolbai' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'MW' FROM public.fighters WHERE name = 'Ikram Aliskerov' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'LHW' FROM public.fighters WHERE name = 'Magomed Ankalaev' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'HW' FROM public.fighters WHERE name = 'Josh Hokit' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'WILDCARD' FROM public.fighters WHERE name = 'Gable Steveson' LIMIT 1 ON CONFLICT DO NOTHING;

-- CONRAD
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'FLW' FROM public.fighters WHERE name = 'Alexandre Pantoja' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'BW' FROM public.fighters WHERE name = 'Sean O''Malley' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'FW' FROM public.fighters WHERE name = 'Alexander Volkanovski' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'LW' FROM public.fighters WHERE name = 'Arman Tsarukyan' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'WW' FROM public.fighters WHERE name = 'Jacobe Smith' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'MW' FROM public.fighters WHERE name = 'Damian Pinas' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'LHW' FROM public.fighters WHERE name = 'Robert Whittaker' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'HW' FROM public.fighters WHERE name = 'Waldo Cortes Acosta' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'WILDCARD' FROM public.fighters WHERE name = 'Yaroslav Amosov' LIMIT 1 ON CONFLICT DO NOTHING;

-- TEDDY
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'FLW' FROM public.fighters WHERE name = 'Joshua Van' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'BW' FROM public.fighters WHERE name = 'Petr Yan' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'FW' FROM public.fighters WHERE name = 'Luke Riley' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'LW' FROM public.fighters WHERE name = 'Charles Oliveira' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'WW' FROM public.fighters WHERE name = 'Uros Medic' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'MW' FROM public.fighters WHERE name = 'Ateba Gautier' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'LHW' FROM public.fighters WHERE name = 'Khalil Rountree Jr.' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'HW' FROM public.fighters WHERE name = 'Ciryl Gane' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'WILDCARD' FROM public.fighters WHERE name = 'Ion Cutelaba' LIMIT 1 ON CONFLICT DO NOTHING;

-- TOMMY
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'FLW' FROM public.fighters WHERE name = 'Manel Kape' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'BW' FROM public.fighters WHERE name = 'Song Yadong' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'FW' FROM public.fighters WHERE name = 'Diego Lopes' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'LW' FROM public.fighters WHERE name = 'Mauricio Ruffy' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'WW' FROM public.fighters WHERE name = 'Michael Morales' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'MW' FROM public.fighters WHERE name = 'Gregory Rodrigues' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'LHW' FROM public.fighters WHERE name = 'Jan Blachowicz' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'HW' FROM public.fighters WHERE name = 'Alexander Volkov' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'WILDCARD' FROM public.fighters WHERE name = 'Lone''er Kavanagh' LIMIT 1 ON CONFLICT DO NOTHING;

-- SAM
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'FLW' FROM public.fighters WHERE name = 'Tatsuro Taira' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'BW' FROM public.fighters WHERE name = 'Merab Dvalishvili' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'FW' FROM public.fighters WHERE name = 'Jean Silva' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'LW' FROM public.fighters WHERE name = 'Paddy Pimblett' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'WW' FROM public.fighters WHERE name = 'Carlos Prates' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'MW' FROM public.fighters WHERE name = 'Shara Magomedov' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'LHW' FROM public.fighters WHERE name = 'Bogdan Guskov' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'HW' FROM public.fighters WHERE name = 'Tom Aspinall' LIMIT 1 ON CONFLICT DO NOTHING;
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'WILDCARD' FROM public.fighters WHERE name = 'Khamzat Chimaev' LIMIT 1 ON CONFLICT DO NOTHING;

-- ─── STEP 5: Verify (run separately after) ───────────────────────────────────
-- SELECT lm.team_name, r.slot, f.name
-- FROM rosters r
-- JOIN league_memberships lm ON lm.id = r.membership_id
-- JOIN fighters f ON f.id = r.fighter_id
-- ORDER BY lm.team_name, r.slot;
-- Expected: 72 rows
