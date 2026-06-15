import { CSSProperties } from "react";

const DIV_LABELS: Record<string, string> = {
  FLW: "Flyweight",
  BW:  "Bantamweight",
  FW:  "Featherweight",
  LW:  "Lightweight",
  WW:  "Welterweight",
  MW:  "Middleweight",
  LHW: "Light HW",
  HW:  "Heavyweight",
  WILDCARD: "Wildcard",
};

export function DivTag({ slot, short }: { slot: string; short?: boolean }) {
  const label = short ? slot : (DIV_LABELS[slot] ?? slot);
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-display font-bold uppercase tracking-wide"
      style={{
        background: "var(--ufc-surface-3)",
        color: "var(--ufc-text-2)",
        border: "1px solid var(--ufc-border)",
      }}
    >
      {label}
    </span>
  );
}

export function RankTag({ rank, isChamp }: { rank?: number | null; isChamp?: boolean }) {
  if (isChamp) {
    return (
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-num font-bold"
        style={{ background: "rgba(245,176,20,0.15)", color: "var(--ufc-gold)" }}
      >
        C
      </span>
    );
  }
  if (!rank) return null;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-num font-bold"
      style={{ background: "rgba(245,176,20,0.1)", color: "var(--ufc-gold)" }}
    >
      #{rank}
    </span>
  );
}

export function StatusChip({ status }: { status: "LOCKED" | "UNLOCKED" | "LIVE" | "EMPTY" }) {
  const config = {
    LOCKED:   { bg: "rgba(125,138,163,0.12)", color: "var(--ufc-frost)", label: "Locked" },
    UNLOCKED: { bg: "rgba(47,191,113,0.12)",  color: "var(--ufc-win)",   label: "Unlocked" },
    LIVE:     { bg: "rgba(255,59,59,0.12)",   color: "var(--ufc-live)",  label: "Live" },
    EMPTY:    { bg: "rgba(245,176,20,0.12)",  color: "var(--ufc-gold)",  label: "Empty" },
  }[status];

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide"
      style={{ background: config.bg, color: config.color }}
    >
      {status === "LIVE" && <span className="live-dot" style={{ width: 5, height: 5 }} />}
      {config.label}
    </span>
  );
}

export function ScoreChip({ label, points, style }: { label: string; points: number; style?: CSSProperties }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-num text-xs font-bold"
      style={{ background: "var(--ufc-accent-wash)", color: "var(--ufc-accent)", ...style }}
    >
      <span style={{ color: "var(--ufc-text-3)", fontFamily: "var(--font-body)", fontWeight: 400 }}>{label}</span>
      +{points}
    </span>
  );
}
