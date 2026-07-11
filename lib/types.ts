export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ─── Enums (mirror the Postgres enum types) ──────────────────────────────────

export type WeightClassCode = 'FLW' | 'BW' | 'FW' | 'LW' | 'WW' | 'MW' | 'LHW' | 'HW';
export type SlotCode = WeightClassCode | 'WILDCARD';
export type EventStatus = 'scheduled' | 'in_progress' | 'completed';
export type BoutStatus = 'scheduled' | 'completed' | 'cancelled';
export type BoutMethod = 'KO' | 'TKO' | 'SUB' | 'DEC' | 'DQ' | 'NC';
export type CardSegment = 'early_prelim' | 'prelim' | 'main';

export const WEIGHT_CLASS_CODES: WeightClassCode[] = [
  'FLW', 'BW', 'FW', 'LW', 'WW', 'MW', 'LHW', 'HW',
];

// DB slot / weight-class enum code → display name
export const SLOT_DISPLAY: Record<string, string> = {
  FLW: 'Flyweight',
  BW: 'Bantamweight',
  FW: 'Featherweight',
  LW: 'Lightweight',
  WW: 'Welterweight',
  MW: 'Middleweight',
  LHW: 'Light Heavyweight',
  HW: 'Heavyweight',
  WILDCARD: 'Wildcard',
};

export const SLOT_ORDER: SlotCode[] = [
  'FLW', 'BW', 'FW', 'LW', 'WW', 'MW', 'LHW', 'HW', 'WILDCARD',
];

// ─── Database Tables ────────────────────────────────────────────────────────

export interface Fighter {
  id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
  weight_class: WeightClassCode;
  gender: string;
  record_w: number;
  record_l: number;
  record_d: number;
  current_ranking: number | null;
  is_champion: boolean;
  ranking_division: WeightClassCode | null;
  status: 'active' | 'inactive' | 'retired';
  draft_score: number | null;
  last_fight_at: string | null;
}

export interface League {
  id: string;
  name: string;
  logo_url: string | null;
  commissioner_id: string;
  is_public: boolean;
  invite_code: string;
  season_start_date: string;
  status: 'setup' | 'drafting' | 'active' | 'completed';
  created_at: string;
}

// Row from league_memberships (+ computed standings fields)
export interface Manager {
  id: string;
  league_id: string;
  user_id: string | null;
  team_name: string;
  display_name: string;  // same as team_name, kept for component compat
  total_points: number;  // computed from scores table
  role?: 'commissioner' | 'member';
}

export interface Event {
  id: string;
  name: string;
  event_date: string;
  location: string | null;
  lock_time: string;
  status: EventStatus;
}

export interface Bout {
  id: string;
  event_id: string;
  fighter_a_id: string;
  fighter_b_id: string;
  weight_class: WeightClassCode;
  is_title_fight: boolean;
  is_main_event: boolean;
  card_segment: CardSegment;
  bout_order: number;
  scheduled_start: string | null;
  status: BoutStatus;
  winner_id: string | null;
  method: BoutMethod | null;
  is_finish: boolean;
  end_round: number | null;
  fighter_a_ranked: boolean;
  fighter_b_ranked: boolean;
  fotn: boolean;
  fighter_a_potn: boolean;
  fighter_b_potn: boolean;
}

// Row from rosters
export interface Roster {
  id: string;
  membership_id: string;
  league_id: string;
  fighter_id: string;
  slot: SlotCode;
  acquired_at: string;
  acquired_via: 'draft' | 'free_agent';
}

// Row from waiver_claims
export interface WaiverBid {
  id: string;
  league_id: string;
  membership_id: string;
  add_fighter_id: string;
  drop_fighter_id: string;
  bid_priority: number;
  status: 'pending' | 'won' | 'lost' | 'invalid' | 'cancelled';
  slot: SlotCode | null;
  period: string;
  failure_reason: string | null;
  created_at?: string;
  processed_at?: string | null;
}

// Row from scores
export interface FighterScore {
  id: string;
  membership_id: string;
  bout_id: string;
  fighter_id: string;
  points: number;
  breakdown: {
    base_win_points?: number;
    finish_bonus?: number;
    rank_bonus?: number;
    performance_bonus?: number;
    title_fight_bonus?: number;
    main_event_bonus?: number;
    [key: string]: number | undefined;
  };
}

// ─── Joined / Enriched Types ─────────────────────────────────────────────────

export interface RosterSlot extends Roster {
  fighter: Fighter;
  slot_type: string;  // display name derived from slot code
  next_bout: (Bout & { event: Event }) | null;
  is_locked: boolean;
}

export interface BoutWithFighters extends Bout {
  fighter_a: Fighter;
  fighter_b: Fighter;
  event?: Event;
}

export interface EventWithBouts extends Event {
  bouts: BoutWithFighters[];
  rostered_count?: number;
}

export interface ManagerWithRoster extends Manager {
  rosters?: RosterSlot[];
  completed_fighters?: number;
}

export interface WaiverBidWithFighters extends WaiverBid {
  add_fighter: Fighter;
  drop_fighter: Fighter;
}

// ─── UI State Types ──────────────────────────────────────────────────────────

export type TabRoute = 'roster' | 'fights' | 'standings' | 'market' | 'settings';
