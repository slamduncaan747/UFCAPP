-- Backfill draft data from existing historical bouts/records.
-- Safe to re-run. Run after a fighter import that doesn't populate
-- last_fight_at / draft_score (mirrors src/lib/draft/score.ts).

-- 1) last_fight_at = date of each fighter's most recent completed bout
WITH lf AS (
  SELECT f.id AS fid, max(e.event_date) AS last_date
  FROM fighters f
  JOIN bouts b ON (b.fighter_a_id = f.id OR b.fighter_b_id = f.id)
  JOIN events e ON b.event_id = e.id
  WHERE b.status = 'completed'
  GROUP BY f.id
)
UPDATE fighters f
SET last_fight_at = lf.last_date::date
FROM lf
WHERE f.id = lf.fid;

-- 2) draft_score from win rate + volume + recency (+ rank/champ bonus)
UPDATE fighters f
SET draft_score = round((
    (CASE WHEN (record_w+record_l+record_d) > 0
          THEN record_w::numeric/(record_w+record_l+record_d) ELSE 0 END) * 40
  + LEAST(record_w::numeric/20.0, 1) * 20
  + GREATEST(0, 1 - (CASE WHEN last_fight_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (now() - (last_fight_at::timestamp + interval '12 hours')))/86400.0
          ELSE 540 END)/540.0) * 30
  + CASE WHEN is_champion THEN 20
         WHEN current_ranking IS NOT NULL AND current_ranking <= 5 THEN 12
         WHEN current_ranking IS NOT NULL AND current_ranking <= 15 THEN 6
         ELSE 0 END
  ) * 10) / 10.0
WHERE status='active' AND gender='male';
