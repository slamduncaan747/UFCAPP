export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// Maps DB slot enum → display weight class name
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

// ─── Database Tables ────────────────────────────────────────────────────────

export interface Fighter {
  id: string;
  name: string;
  nickname: string | null;
  image_url: string | null;
  weight_class: string;
  wins: number;
  losses: number;
  draws: number;
  official_rank: number | null;
  created_at: string;
}

export interface League {
  id: string;
  name: string;
  commissioner_id: string | null;
  created_at: string;
}

// Maps from league_memberships table
export interface Manager {
  id: string;
  league_id: string;
  user_id: string | null;
  team_name: string;
  display_name: string;  // same as team_name, kept for component compat
  total_points: number;  // computed from scores table
  waiver_priority?: number;
}

export interface Event {
  id: string;
  title: string;
  event_date: string;
  status: 'upcoming' | 'live' | 'completed';
}

export interface Bout {
  id: string;
  event_id: string;
  fighter_a_id: string;
  fighter_b_id: string;
  is_main_event: boolean;
  is_title_fight: boolean;
  status: 'scheduled' | 'live' | 'completed';
  current_round: number | null;
  method_of_victory: string | null;
  round_ended: number | null;
  time_ended: string | null;
  winner_id: string | null;
}

// Maps from rosters table (new schema)
export interface Roster {
  id: string;
  membership_id: string;
  league_id: string;
  fighter_id: string;
  slot: string;       // DB enum value: 'FLW', 'BW', etc.
  slot_type: string;  // Display name: 'Flyweight', 'Bantamweight', etc. (derived)
}

// Maps from waiver_claims table
export interface WaiverBid {
  id: string;
  league_id: string;
  membership_id: string;
  add_fighter_id: string;
  drop_fighter_id: string;
  bid_priority: number;
  status: 'pending' | 'won' | 'lost' | 'invalid' | 'cancelled';
  created_at?: string;
}

// Maps from scores table
export interface FighterScore {
  id: string;
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
  next_bout: (Bout & { event: Event }) | null;
  is_locked: boolean;
}

export interface BoutWithFighters extends Bout {
  fighter_a: Fighter;
  fighter_b: Fighter;
  event?: Event;
  scores?: FighterScore[];
}

export interface EventWithBouts extends Event {
  bouts: BoutWithFighters[];
  rostered_count?: number;
}

export interface ManagerWithRoster extends Manager {
  rosters?: RosterSlot[];
  completed_fighters?: number;
}

export interface FighterWithHistory extends Fighter {
  bouts: (BoutWithFighters & {
    score?: FighterScore;
    is_locked: boolean;
  })[];
}

export interface WaiverBidWithFighters extends WaiverBid {
  add_fighter: Fighter;
  drop_fighter: Fighter;
}

// ─── UI State Types ──────────────────────────────────────────────────────────

export type ModalType =
  | { type: 'fighter'; fighter_id: string }
  | { type: 'event'; event_id: string }
  | { type: 'transfer'; add_fighter: Fighter }
  | { type: 'season-chart' }
  | { type: 'transfer-history' }
  | { type: 'opponent-roster'; manager_id: string };

export type TabRoute = 'roster' | 'fights' | 'standings' | 'market' | 'settings';

export const WEIGHT_CLASSES = [
  'Strawweight',
  'Flyweight',
  'Bantamweight',
  'Featherweight',
  'Lightweight',
  'Welterweight',
  'Middleweight',
  'Light Heavyweight',
  'Heavyweight',
] as const;

export type WeightClass = (typeof WEIGHT_CLASSES)[number];

export const ROSTER_SLOTS: string[] = [
  ...WEIGHT_CLASSES,
  'Wildcard',
];
