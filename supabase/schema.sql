-- UFC Fantasy League — Supabase Schema
-- Run this in the Supabase SQL Editor to bootstrap your database.

create extension if not exists "uuid-ossp";

create table public.fighters (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    nickname text,
    image_url text,
    weight_class text not null,
    wins integer default 0,
    losses integer default 0,
    draws integer default 0,
    official_rank integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.leagues (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    commissioner_id uuid,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.managers (
    id uuid default gen_random_uuid() primary key,
    league_id uuid references public.leagues(id) on delete cascade not null,
    user_id uuid,
    display_name text not null,
    total_points numeric(10, 2) default 0.00,
    waiver_priority integer not null,
    unique(league_id, user_id)
);

create table public.events (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    early_prelims_start timestamp with time zone not null,
    status text not null default 'upcoming'
);

create table public.bouts (
    id uuid default gen_random_uuid() primary key,
    event_id uuid references public.events(id) on delete cascade not null,
    fighter_a_id uuid references public.fighters(id) not null,
    fighter_b_id uuid references public.fighters(id) not null,
    is_main_event boolean default false,
    is_title_fight boolean default false,
    status text not null default 'scheduled',
    current_round integer,
    method_of_victory text,
    round_ended integer,
    time_ended text,
    winner_id uuid references public.fighters(id)
);

create table public.rosters (
    id uuid default gen_random_uuid() primary key,
    manager_id uuid references public.managers(id) on delete cascade not null,
    fighter_id uuid references public.fighters(id) not null,
    slot_type text not null,
    unique(manager_id, fighter_id),
    unique(manager_id, slot_type)
);

create table public.waiver_bids (
    id uuid default gen_random_uuid() primary key,
    league_id uuid references public.leagues(id) on delete cascade not null,
    manager_id uuid references public.managers(id) on delete cascade not null,
    add_fighter_id uuid references public.fighters(id) not null,
    drop_fighter_id uuid references public.fighters(id) not null,
    priority_slot integer not null check (priority_slot in (1, 2)),
    status text default 'pending' not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.fighter_scores (
    id uuid default gen_random_uuid() primary key,
    bout_id uuid references public.bouts(id) on delete cascade not null,
    fighter_id uuid references public.fighters(id) on delete cascade not null,
    base_win_points integer default 0,
    main_event_bonus integer default 0,
    title_fight_bonus integer default 0,
    rank_bonus integer default 0,
    performance_bonus integer default 0,
    finish_bonus integer default 0,
    total_points_earned integer default 0,
    unique(bout_id, fighter_id)
);

-- ─── Row-Level Security ──────────────────────────────────────────────────────
alter table public.fighters enable row level security;
alter table public.leagues enable row level security;
alter table public.managers enable row level security;
alter table public.events enable row level security;
alter table public.bouts enable row level security;
alter table public.rosters enable row level security;
alter table public.waiver_bids enable row level security;
alter table public.fighter_scores enable row level security;

-- Public read on fighters / events / bouts / fighter_scores
create policy "Fighters are publicly readable" on public.fighters for select using (true);
create policy "Events are publicly readable" on public.events for select using (true);
create policy "Bouts are publicly readable" on public.bouts for select using (true);
create policy "Scores are publicly readable" on public.fighter_scores for select using (true);

-- Leagues: readable by authenticated
create policy "Leagues readable by authenticated" on public.leagues for select to authenticated using (true);

-- Managers: readable by authenticated, writable by own user
create policy "Managers readable by authenticated" on public.managers for select to authenticated using (true);
create policy "Manager claim own row" on public.managers for update to authenticated using (user_id is null or user_id = auth.uid());

-- Rosters: readable by authenticated
create policy "Rosters readable by authenticated" on public.rosters for select to authenticated using (true);

-- Waiver bids: owned by manager's user
create policy "Waiver bids: own user read" on public.waiver_bids for select to authenticated
    using (manager_id in (select id from public.managers where user_id = auth.uid()));
create policy "Waiver bids: own user insert" on public.waiver_bids for insert to authenticated
    with check (manager_id in (select id from public.managers where user_id = auth.uid()));
create policy "Waiver bids: own user delete" on public.waiver_bids for delete to authenticated
    using (manager_id in (select id from public.managers where user_id = auth.uid()));

-- ─── Realtime ────────────────────────────────────────────────────────────────
-- Enable realtime on bouts table in Supabase dashboard or via:
-- alter publication supabase_realtime add table public.bouts;

-- ─── Waiver processing RPC (stub) ────────────────────────────────────────────
-- Implement this as a Supabase Edge Function or Postgres function.
-- create or replace function public.process_waivers(p_league_id uuid) returns void ...
