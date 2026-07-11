-- ============================================================
-- UFC FANTASY — WAIVER PROCESSING + SCORING ENGINE
-- Applied to the live project as migration `waivers_and_scoring`.
-- Safe to re-run (CREATE OR REPLACE / DROP IF EXISTS).
-- ============================================================

-- Claims are tagged with an ISO-week period; make the column self-sufficient.
ALTER TABLE public.waiver_claims ALTER COLUMN period SET DEFAULT '';

-- ─── Scoring: points a fighter earned in one completed bout ─────────────────
-- Rules (mirrored in the app's Settings page):
--   Win +100 · Finish +50 · Ranked opponent +50 · POTN/FOTN +50
--   Main event +25 · Title fight +25 (win-dependent except POTN/FOTN)
CREATE OR REPLACE FUNCTION public.fighter_bout_score(b public.bouts, p_fighter_id text)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_won boolean := b.winner_id = p_fighter_id;
  v_opp_ranked boolean := CASE WHEN b.fighter_a_id = p_fighter_id THEN b.fighter_b_ranked ELSE b.fighter_a_ranked END;
  v_potn boolean := b.fotn OR (CASE WHEN b.fighter_a_id = p_fighter_id THEN b.fighter_a_potn ELSE b.fighter_b_potn END);
  v_base int := 0; v_finish int := 0; v_rank int := 0; v_perf int := 0; v_main int := 0; v_title int := 0;
BEGIN
  IF coalesce(v_won, false) THEN
    v_base := 100;
    IF b.is_finish THEN v_finish := 50; END IF;
    IF coalesce(v_opp_ranked, false) THEN v_rank := 50; END IF;
    IF b.is_main_event THEN v_main := 25; END IF;
    IF b.is_title_fight THEN v_title := 25; END IF;
  END IF;
  IF coalesce(v_potn, false) THEN v_perf := 50; END IF;
  RETURN jsonb_build_object(
    'points', v_base + v_finish + v_rank + v_perf + v_main + v_title,
    'breakdown', jsonb_strip_nulls(jsonb_build_object(
      'base_win_points',   nullif(v_base, 0),
      'finish_bonus',      nullif(v_finish, 0),
      'rank_bonus',        nullif(v_rank, 0),
      'performance_bonus', nullif(v_perf, 0),
      'main_event_bonus',  nullif(v_main, 0),
      'title_fight_bonus', nullif(v_title, 0)
    ))
  );
END $$;

-- ─── Full rebuild of one league's scores from current rosters ───────────────
-- NOTE: rebuilds against *current* rosters, so points earned by since-dropped
-- fighters are reassigned. Day-to-day scoring flows through the bout trigger
-- below; this is the bootstrap / repair tool.
CREATE OR REPLACE FUNCTION public.recompute_league_scores(p_league_id text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_season date;
BEGIN
  SELECT season_start_date INTO v_season FROM leagues WHERE id = p_league_id;
  IF v_season IS NULL THEN
    RAISE EXCEPTION 'League % not found', p_league_id;
  END IF;

  DELETE FROM scores s USING league_memberships lm
   WHERE s.membership_id = lm.id AND lm.league_id = p_league_id;

  INSERT INTO scores (membership_id, bout_id, fighter_id, points, breakdown)
  SELECT r.membership_id, b.id, r.fighter_id,
         (sc.j->>'points')::int, sc.j->'breakdown'
  FROM rosters r
  JOIN bouts b
    ON b.status = 'completed'
   AND (b.fighter_a_id = r.fighter_id OR b.fighter_b_id = r.fighter_id)
  JOIN events e ON e.id = b.event_id AND e.event_date >= v_season
  CROSS JOIN LATERAL (SELECT fighter_bout_score(b, r.fighter_id) AS j) sc
  WHERE r.league_id = p_league_id
    AND (r.acquired_via = 'draft' OR e.event_date >= r.acquired_at);
END $$;

-- ─── Incremental scoring when a bout result lands ───────────────────────────
CREATE OR REPLACE FUNCTION public.score_bout_trigger()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;

  DELETE FROM scores WHERE bout_id = NEW.id;

  INSERT INTO scores (membership_id, bout_id, fighter_id, points, breakdown)
  SELECT r.membership_id, NEW.id, r.fighter_id,
         (sc.j->>'points')::int, sc.j->'breakdown'
  FROM rosters r
  JOIN leagues l ON l.id = r.league_id AND l.status = 'active'
  JOIN events e ON e.id = NEW.event_id AND e.event_date >= l.season_start_date
  CROSS JOIN LATERAL (SELECT fighter_bout_score(NEW, r.fighter_id) AS j) sc
  WHERE r.fighter_id IN (NEW.fighter_a_id, NEW.fighter_b_id)
    AND (r.acquired_via = 'draft' OR e.event_date >= r.acquired_at);

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_score_bout ON public.bouts;
CREATE TRIGGER trg_score_bout
AFTER INSERT OR UPDATE OF status, winner_id, method, is_finish, end_round, fotn, fighter_a_potn, fighter_b_potn
ON public.bouts
FOR EACH ROW EXECUTE FUNCTION public.score_bout_trigger();

-- ─── Query indexes for the app's hot paths ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bouts_fighter_a ON public.bouts (fighter_a_id);
CREATE INDEX IF NOT EXISTS idx_bouts_fighter_b ON public.bouts (fighter_b_id);
CREATE INDEX IF NOT EXISTS idx_bouts_event ON public.bouts (event_id);
CREATE INDEX IF NOT EXISTS idx_rosters_membership ON public.rosters (membership_id);
CREATE INDEX IF NOT EXISTS idx_rosters_league_fighter ON public.rosters (league_id, fighter_id);
CREATE INDEX IF NOT EXISTS idx_scores_membership ON public.scores (membership_id);
CREATE INDEX IF NOT EXISTS idx_scores_bout ON public.scores (bout_id);
CREATE INDEX IF NOT EXISTS idx_scores_fighter ON public.scores (fighter_id);
CREATE INDEX IF NOT EXISTS idx_waiver_claims_league_status ON public.waiver_claims (league_id, status);
CREATE INDEX IF NOT EXISTS idx_waiver_claims_membership_status ON public.waiver_claims (membership_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_league ON public.league_memberships (league_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.league_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_events_status_date ON public.events (status, event_date);
CREATE INDEX IF NOT EXISTS idx_fighters_status ON public.fighters (status);

-- One pending claim per fighter per manager (cancel-and-rebid still works).
CREATE UNIQUE INDEX IF NOT EXISTS uq_waiver_pending_add
  ON public.waiver_claims (membership_id, add_fighter_id) WHERE status = 'pending';

-- ─── Waiver processing ───────────────────────────────────────────────────────
-- Priority: lowest total points first (worst team gets first pick), ties by
-- earliest join. One successful claim per manager per run. Runs automatically
-- via pg_cron every Tuesday 05:00 UTC (Monday midnight ET); the commissioner
-- can also force a run from Settings.
CREATE OR REPLACE FUNCTION public.process_waivers(p_league_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_won int := 0; v_lost int := 0; v_invalid int := 0;
  m record; c record; v_roster record;
  v_awarded boolean;
  v_add_wc text;
BEGIN
  FOR m IN
    SELECT lm.id, coalesce(sum(s.points), 0) AS pts, lm.joined_at
    FROM league_memberships lm
    LEFT JOIN scores s ON s.membership_id = lm.id
    WHERE lm.league_id = p_league_id
    GROUP BY lm.id, lm.joined_at
    ORDER BY pts ASC, lm.joined_at ASC
  LOOP
    v_awarded := false;
    FOR c IN
      SELECT * FROM waiver_claims
      WHERE league_id = p_league_id AND membership_id = m.id AND status = 'pending'
      ORDER BY bid_priority ASC, created_at ASC
    LOOP
      IF v_awarded THEN
        UPDATE waiver_claims SET status = 'lost',
          failure_reason = 'Weekly claim limit reached', processed_at = now()
          WHERE id = c.id;
        v_lost := v_lost + 1;
        CONTINUE;
      END IF;

      -- Fighter already grabbed by a higher-priority claim / another roster?
      IF EXISTS (SELECT 1 FROM rosters r
                 WHERE r.league_id = p_league_id AND r.fighter_id = c.add_fighter_id) THEN
        UPDATE waiver_claims SET status = 'lost',
          failure_reason = 'Fighter already claimed', processed_at = now()
          WHERE id = c.id;
        v_lost := v_lost + 1;
        CONTINUE;
      END IF;

      -- Drop fighter must still be on this manager's roster.
      SELECT * INTO v_roster FROM rosters r
       WHERE r.membership_id = m.id AND r.fighter_id = c.drop_fighter_id;
      IF NOT FOUND THEN
        UPDATE waiver_claims SET status = 'invalid',
          failure_reason = 'Drop fighter no longer on roster', processed_at = now()
          WHERE id = c.id;
        v_invalid := v_invalid + 1;
        CONTINUE;
      END IF;

      -- Weight class must fit the vacated slot (wildcard takes anyone).
      SELECT weight_class::text INTO v_add_wc FROM fighters WHERE id = c.add_fighter_id;
      IF v_roster.slot::text <> 'WILDCARD' AND v_roster.slot::text <> v_add_wc THEN
        UPDATE waiver_claims SET status = 'invalid',
          failure_reason = 'Weight class does not fit slot', processed_at = now()
          WHERE id = c.id;
        v_invalid := v_invalid + 1;
        CONTINUE;
      END IF;

      -- Neither side of the swap may be locked into an underway event.
      IF EXISTS (
        SELECT 1 FROM bouts b
        JOIN events e ON e.id = b.event_id
        WHERE b.status = 'scheduled'
          AND e.status <> 'completed'
          AND (e.status = 'in_progress' OR e.lock_time <= now())
          AND (b.fighter_a_id = c.drop_fighter_id OR b.fighter_b_id = c.drop_fighter_id)
      ) THEN
        UPDATE waiver_claims SET status = 'invalid',
          failure_reason = 'Drop fighter is locked into a live event', processed_at = now()
          WHERE id = c.id;
        v_invalid := v_invalid + 1;
        CONTINUE;
      END IF;

      IF EXISTS (
        SELECT 1 FROM bouts b
        JOIN events e ON e.id = b.event_id
        WHERE b.status = 'scheduled'
          AND e.status <> 'completed'
          AND (e.status = 'in_progress' OR e.lock_time <= now())
          AND (b.fighter_a_id = c.add_fighter_id OR b.fighter_b_id = c.add_fighter_id)
      ) THEN
        UPDATE waiver_claims SET status = 'invalid',
          failure_reason = 'Add fighter is locked into a live event', processed_at = now()
          WHERE id = c.id;
        v_invalid := v_invalid + 1;
        CONTINUE;
      END IF;

      -- Execute the swap.
      UPDATE rosters SET fighter_id = c.add_fighter_id,
        acquired_via = 'free_agent', acquired_at = now()
        WHERE id = v_roster.id;
      INSERT INTO transactions (league_id, membership_id, type, fighter_id, slot) VALUES
        (p_league_id, m.id, 'drop', c.drop_fighter_id, v_roster.slot),
        (p_league_id, m.id, 'add',  c.add_fighter_id,  v_roster.slot);
      UPDATE waiver_claims SET status = 'won', slot = v_roster.slot, processed_at = now()
        WHERE id = c.id;
      v_won := v_won + 1;
      v_awarded := true;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('won', v_won, 'lost', v_lost, 'invalid', v_invalid);
END $$;

-- ─── Automatic weekly processing (Mon midnight ET ≈ Tue 05:00 UTC) ───────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
  PERFORM cron.unschedule('process-waivers-weekly')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-waivers-weekly');
  PERFORM cron.schedule(
    'process-waivers-weekly',
    '0 5 * * 2',
    $job$SELECT public.process_waivers(id) FROM public.leagues WHERE status = 'active'$job$
  );
END $$;
