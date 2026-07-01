-- ============================================================================
-- process_scores(p_league_id)
-- Computes fantasy points for every completed bout that involves a fighter
-- rostered in the given league, and writes them into public.scores.
--
-- Scoring (matches the app's Settings screen):
--   Fight Win ............... +100
--   Finish (KO / TKO / Sub) . +50
--   Ranked Victory (Top 15) . +50   (winner's official_rank between 0 and 15; 0 = champion)
--   Title Fight ............. +25
--   Main Event .............. +25
--   POTN / FOTN ............. +0    (no data field available yet)
--
-- Robustness: fighter ids are matched across the uuid (bouts) / text (rosters)
-- boundary, and fall back to case-insensitive name matching so duplicate
-- fighter rows in the scraped data still score correctly.
--
-- Idempotent: re-running recomputes and replaces existing score rows.
-- Returns the number of score rows written.
-- ============================================================================

create or replace function public.process_scores(p_league_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count  integer := 0;
  r        record;
  v_won    boolean;
  v_method text;
  v_base   int; v_finish int; v_rank int; v_title int; v_main int; v_total int;
begin
  for r in
    select
      b.id                as bout_id,
      b.winner_id::text   as winner_id,
      b.method_of_victory as method,
      b.is_title_fight    as is_title_fight,
      b.is_main_event     as is_main_event,
      ro.membership_id    as membership_id,
      ro.fighter_id       as roster_fighter_id,
      rf.name             as roster_name,
      rf.official_rank    as official_rank
    from bouts b
    join rosters ro    on ro.league_id = p_league_id
    join fighters rf   on rf.id::text = ro.fighter_id::text
    where b.status = 'completed'
      and (
        ro.fighter_id::text in (b.fighter_a_id::text, b.fighter_b_id::text)
        or exists (
          select 1 from fighters bf
          where bf.id::text in (b.fighter_a_id::text, b.fighter_b_id::text)
            and lower(btrim(bf.name)) = lower(btrim(rf.name))
        )
      )
  loop
    -- Did this rostered fighter win? Match winner by id, then by name.
    v_won := (r.winner_id is not null) and (
      r.winner_id = r.roster_fighter_id::text
      or exists (
        select 1 from fighters wf
        where wf.id::text = r.winner_id
          and lower(btrim(wf.name)) = lower(btrim(r.roster_name))
      )
    );

    v_method := lower(coalesce(r.method, ''));
    v_base := 0; v_finish := 0; v_rank := 0; v_title := 0; v_main := 0;

    if v_won then
      v_base := 100;
      if v_method ~ '(ko|tko|sub)' and v_method !~ 'decision' then v_finish := 50; end if;
      if r.official_rank is not null and r.official_rank between 0 and 15 then v_rank := 50; end if;
      if r.is_title_fight then v_title := 25; end if;
      if r.is_main_event then v_main := 25; end if;
    end if;

    v_total := v_base + v_finish + v_rank + v_title + v_main;

    delete from scores
      where bout_id = r.bout_id and fighter_id::text = r.roster_fighter_id::text;

    insert into scores (membership_id, bout_id, fighter_id, points, breakdown)
    values (
      r.membership_id, r.bout_id, r.roster_fighter_id, v_total,
      jsonb_build_object(
        'base_win_points',   v_base,
        'finish_bonus',      v_finish,
        'rank_bonus',        v_rank,
        'title_fight_bonus', v_title,
        'main_event_bonus',  v_main,
        'performance_bonus', 0
      )
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.process_scores(text) to authenticated;
