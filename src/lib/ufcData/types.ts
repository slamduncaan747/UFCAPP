// Row shapes for the scraped UFC data project (ufcstats.com → Supabase).
// Primary keys are the stable hex IDs from ufcstats URLs. See INTEGRATION.md §2.

export type DataEvent = {
  id: string;
  name: string;
  date: string; // ISO date
  location: string | null;
  scraped: boolean;
};

export type DataFighter = {
  id: string;
  name: string;
  nickname: string | null;
  height_in: number | null;
  reach_in: number | null;
  weight_lbs: number | null;
  stance: string | null;
  dob: string | null;
  wins: number | null;
  losses: number | null;
  draws: number | null;
  slpm: number | null;
  sapm: number | null;
  str_acc: number | null;
  str_def: number | null;
  td_avg: number | null;
  td_acc: number | null;
  td_def: number | null;
  sub_avg: number | null;
  photo_url: string | null;
  photo_license: string | null;
  photo_attribution: string | null;
  photo_source: string | null;
};

export type DataFight = {
  id: string;
  event_id: string;
  fighter1_id: string;
  fighter2_id: string;
  winner_id: string | null;
  result: "win" | "draw" | "nc" | null;
  weight_class: string | null; // free text, e.g. "Welterweight Bout"
  is_title_fight: boolean | null;
  method: string | null; // free text, e.g. "KO/TKO", "Decision - Unanimous"
  round: number | null;
  time: string | null;
  time_format: string | null;
  referee: string | null;
  details: string | null;
};

export type DataFightStat = {
  fight_id: string;
  fighter_id: string;
  round: number; // 0 = fight total, 1-5 = per round
  kd: number;
  sig_landed: number;
  sig_attempted: number;
  tot_landed: number;
  tot_attempted: number;
  td_landed: number;
  td_attempted: number;
  sub_att: number;
  reversals: number;
  ctrl_sec: number;
  head_landed: number;
  head_attempted: number;
  body_landed: number;
  body_attempted: number;
  leg_landed: number;
  leg_attempted: number;
  dist_landed: number;
  dist_attempted: number;
  clinch_landed: number;
  clinch_attempted: number;
  ground_landed: number;
  ground_attempted: number;
};
