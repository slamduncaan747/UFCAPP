-- ============================================================
-- ROSTER FIX — fuzzy name matching for all 72 entries
-- Safe to re-run: ON CONFLICT DO NOTHING skips existing rows
-- Run in: nzmrrdfasnmgdzhpkmve SQL editor
-- ============================================================

-- ── STEP 1: Diagnostic (run first to see current state) ─────
-- SELECT lm.team_name, COUNT(r.id) AS roster_count
-- FROM league_memberships lm
-- LEFT JOIN rosters r ON r.membership_id = lm.id
-- WHERE lm.league_id = 'lg_ufclg'
-- GROUP BY lm.team_name ORDER BY lm.team_name;

-- ── STEP 2: Re-insert all 72 entries with fuzzy matching ─────

-- ── ISIAH ────────────────────────────────────────────────────
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'FLW' FROM public.fighters WHERE name ILIKE 'ramazan temirov%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'BW' FROM public.fighters WHERE name ILIKE 'payton talbott%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'FW' FROM public.fighters WHERE name ILIKE 'aaron pico%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'LW' FROM public.fighters WHERE name ILIKE 'benoit saint denis%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'WW' FROM public.fighters WHERE name ILIKE 'max holloway%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'MW' FROM public.fighters WHERE name ILIKE 'yousri belgaroui%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'LHW' FROM public.fighters WHERE name ILIKE 'paulo costa%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'HW' FROM public.fighters WHERE name ILIKE 'mario pinto%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_isiah','lg_ufclg', id, 'WILDCARD' FROM public.fighters WHERE name ILIKE 'ian machado garry%' LIMIT 1
ON CONFLICT DO NOTHING;

-- ── DUNCAN ───────────────────────────────────────────────────
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'FLW' FROM public.fighters WHERE name ILIKE '%andr_ lima%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'BW' FROM public.fighters WHERE name ILIKE 'mario bautista%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'FW' FROM public.fighters WHERE name ILIKE 'movsar evloev%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'LW' FROM public.fighters WHERE name ILIKE 'rafael fiziev%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'WW' FROM public.fighters WHERE name ILIKE 'jack della maddalena%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'MW' FROM public.fighters WHERE name ILIKE 'sean strickland%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'LHW' FROM public.fighters WHERE name ILIKE '%yakhyaev%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'HW' FROM public.fighters WHERE name ILIKE 'serghei spivac%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_duncan','lg_ufclg', id, 'WILDCARD' FROM public.fighters WHERE name ILIKE 'mansur abdul%malik%' LIMIT 1
ON CONFLICT DO NOTHING;

-- ── WYATT ────────────────────────────────────────────────────
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'FLW' FROM public.fighters WHERE name ILIKE 'brandon royval%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'BW' FROM public.fighters WHERE name ILIKE 'cory sandhagen%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'FW' FROM public.fighters WHERE name ILIKE 'yair rodriguez%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'LW' FROM public.fighters WHERE name ILIKE 'manuel torres%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'WW' FROM public.fighters WHERE name ILIKE 'islam makhachev%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'MW' FROM public.fighters WHERE name ILIKE 'dricus du plessis%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'LHW' FROM public.fighters WHERE name ILIKE 'jiri prochazka%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'HW' FROM public.fighters WHERE name ILIKE 'valter walker%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_wyatt','lg_ufclg', id, 'WILDCARD' FROM public.fighters WHERE name ILIKE 'conor mcgregor%' LIMIT 1
ON CONFLICT DO NOTHING;

-- ── GUS ──────────────────────────────────────────────────────
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'FLW' FROM public.fighters WHERE name ILIKE 'jose ochoa%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'BW' FROM public.fighters WHERE name ILIKE 'umar nurmagomedov%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'FW' FROM public.fighters WHERE name ILIKE 'kevin vallejos%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'LW' FROM public.fighters WHERE name ILIKE 'terrance mckinney%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'WW' FROM public.fighters WHERE name ILIKE 'myktybek orolbai%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'MW' FROM public.fighters WHERE name ILIKE 'ikram aliskerov%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'LHW' FROM public.fighters WHERE name ILIKE 'magomed ankalaev%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'HW' FROM public.fighters WHERE name ILIKE 'josh hokit%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_gus','lg_ufclg', id, 'WILDCARD' FROM public.fighters WHERE name ILIKE 'gable steveson%' LIMIT 1
ON CONFLICT DO NOTHING;

-- ── CONRAD ───────────────────────────────────────────────────
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'FLW' FROM public.fighters WHERE name ILIKE 'alexandre pantoja%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'BW' FROM public.fighters WHERE name ILIKE 'sean o_malley%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'FW' FROM public.fighters WHERE name ILIKE 'alexander volkanovski%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'LW' FROM public.fighters WHERE name ILIKE 'arman tsarukyan%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'WW' FROM public.fighters WHERE name ILIKE 'jacobe smith%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'MW' FROM public.fighters WHERE name ILIKE 'damian pinas%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'LHW' FROM public.fighters WHERE name ILIKE 'robert whittaker%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'HW' FROM public.fighters WHERE name ILIKE 'waldo cort%acosta%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_conrad','lg_ufclg', id, 'WILDCARD' FROM public.fighters WHERE name ILIKE 'yaroslav amosov%' LIMIT 1
ON CONFLICT DO NOTHING;

-- ── TEDDY ────────────────────────────────────────────────────
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'FLW' FROM public.fighters WHERE name ILIKE 'joshua van%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'BW' FROM public.fighters WHERE name ILIKE 'petr yan%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'FW' FROM public.fighters WHERE name ILIKE 'luke riley%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'LW' FROM public.fighters WHERE name ILIKE 'charles oliveira%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'WW' FROM public.fighters WHERE name ILIKE 'uros medic%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'MW' FROM public.fighters WHERE name ILIKE 'ateba gautier%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'LHW' FROM public.fighters WHERE name ILIKE 'khalil rountree%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'HW' FROM public.fighters WHERE name ILIKE 'ciryl gane%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_teddy','lg_ufclg', id, 'WILDCARD' FROM public.fighters WHERE name ILIKE 'ion cutelaba%' LIMIT 1
ON CONFLICT DO NOTHING;

-- ── TOMMY ────────────────────────────────────────────────────
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'FLW' FROM public.fighters WHERE name ILIKE 'manel kape%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'BW' FROM public.fighters WHERE name ILIKE 'song yadong%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'FW' FROM public.fighters WHERE name ILIKE 'diego lopes%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'LW' FROM public.fighters WHERE name ILIKE 'mauricio ruffy%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'WW' FROM public.fighters WHERE name ILIKE 'michael morales%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'MW' FROM public.fighters WHERE name ILIKE 'gregory rodrigues%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'LHW' FROM public.fighters WHERE name ILIKE 'jan blachowicz%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'HW' FROM public.fighters WHERE name ILIKE 'alexander volkov%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_tommy','lg_ufclg', id, 'WILDCARD' FROM public.fighters WHERE name ILIKE '%kavanagh%' LIMIT 1
ON CONFLICT DO NOTHING;

-- ── SAM ──────────────────────────────────────────────────────
INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'FLW' FROM public.fighters WHERE name ILIKE 'tatsuro taira%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'BW' FROM public.fighters WHERE name ILIKE 'merab dvalishvili%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'FW' FROM public.fighters WHERE name ILIKE 'jean silva%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'LW' FROM public.fighters WHERE name ILIKE 'paddy pimblett%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'WW' FROM public.fighters WHERE name ILIKE 'carlos prates%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'MW' FROM public.fighters WHERE name ILIKE 'shara magomedov%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'LHW' FROM public.fighters WHERE name ILIKE 'bogdan guskov%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'HW' FROM public.fighters WHERE name ILIKE 'tom aspinall%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rosters (membership_id, league_id, fighter_id, slot)
SELECT 'mb_sam','lg_ufclg', id, 'WILDCARD' FROM public.fighters WHERE name ILIKE 'khamzat chimaev%' LIMIT 1
ON CONFLICT DO NOTHING;

-- ── STEP 3: Verify (run after) ───────────────────────────────
-- SELECT lm.team_name, COUNT(r.id) AS roster_count
-- FROM league_memberships lm
-- LEFT JOIN rosters r ON r.membership_id = lm.id
-- WHERE lm.league_id = 'lg_ufclg'
-- GROUP BY lm.team_name ORDER BY lm.team_name;
-- Expected: all 8 managers at 9
