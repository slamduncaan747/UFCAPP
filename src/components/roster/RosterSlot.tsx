"use client";

import { useState } from "react";
import { Headshot } from "@/components/shared/Headshot";
import { RankTag } from "@/components/shared/Tags";
import { LockIcon, UnlockIcon, PlusIcon, ClockIcon } from "@/components/shared/Icons";
import { FighterDetailSheet } from "@/components/roster/FighterDetailSheet";
import { AddFighterSheet } from "@/components/roster/AddFighterSheet";

const DIV_LABELS: Record<string, string> = {
  FLW: "Flyweight", BW: "Bantamweight", FW: "Featherweight", LW: "Lightweight",
  WW: "Welterweight", MW: "Middleweight", LHW: "Light HW", HW: "Heavyweight",
  WILDCARD: "Wildcard",
};

type RosterSlotProps = {
  slot: string;
  fighter: any | null;
  roster: any | null;
  lockState?: "LOCKED" | "UNLOCKED";
  leagueId: string;
  membershipId: string;
  isLive?: boolean;
  livePoints?: number;
  draftPending?: boolean;
};

export function RosterSlot({ slot, fighter, roster, lockState, leagueId, membershipId, isLive, livePoints, draftPending }: RosterSlotProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const card: React.CSSProperties = {
    position: "relative",
    width: "100%",
    borderRadius: 14,
    padding: "13px 14px 13px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    textAlign: "left",
    border: "none",
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    WebkitTapHighlightColor: "transparent",
    minHeight: 74,
    overflow: "hidden",
  };

  if (!fighter) {
    if (draftPending) {
      return (
        <div style={{
          ...card,
          background: "var(--surface)",
          border: "1px dashed var(--border)",
          cursor: "default",
        }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: 10,
            background: "var(--surface-2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <ClockIcon size={18} style={{ color: "var(--text-3)" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
              {slot}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-3)" }}>Filled during draft</div>
          </div>
        </div>
      );
    }

    return (
      <>
        <button
          onClick={() => setAddOpen(true)}
          style={{
            ...card,
            background: "var(--surface)",
            border: "1px dashed var(--border-2)",
          }}
        >
          <div style={{
            width: 48, height: 48,
            borderRadius: 10,
            background: "rgba(234,179,8,0.07)",
            border: "1px dashed rgba(234,179,8,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <PlusIcon size={18} style={{ color: "var(--gold)" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
              {slot}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-2)" }}>
              Add {DIV_LABELS[slot]}
            </div>
          </div>
        </button>

        <AddFighterSheet open={addOpen} onClose={() => setAddOpen(false)} slot={slot} leagueId={leagueId} membershipId={membershipId} />
      </>
    );
  }

  const isLocked = lockState === "LOCKED";

  return (
    <>
      <button
        onClick={() => setDetailOpen(true)}
        className="card-premium"
        style={{ ...card }}
      >
        {/* Status rail */}
        <span aria-hidden style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: isLive ? "var(--grad-primary)" : isLocked ? "var(--frost)" : "var(--green)",
          opacity: isLive ? 1 : 0.7,
        }} />
        <Headshot name={fighter.name} photoUrl={fighter.photoUrl} weightClass={fighter.weightClass} size={48} isLive={isLive} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {fighter.name}
            </span>
            {fighter.isChampion && <RankTag isChamp />}
            {!fighter.isChampion && fighter.currentRanking && <RankTag rank={fighter.currentRanking} />}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>
              {slot}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)" }}>·</span>
            {isLocked ? (
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--frost)", display: "flex", alignItems: "center", gap: 3 }}>
                <LockIcon size={10} /> Locked
              </span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--green)", display: "flex", alignItems: "center", gap: 3 }}>
                <UnlockIcon size={10} /> Active
              </span>
            )}
          </div>
        </div>

        <div style={{ flexShrink: 0, textAlign: "right" }}>
          {livePoints !== undefined && (
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--red)", marginBottom: 2 }}>
              +{livePoints}
            </div>
          )}
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-num)", color: "var(--text-2)" }}>
            {fighter.recordW ?? 0}–{fighter.recordL ?? 0}
          </div>
        </div>
      </button>

      <FighterDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        fighter={fighter}
        roster={roster}
        lockState={lockState}
        leagueId={leagueId}
        membershipId={membershipId}
        slot={slot}
      />
    </>
  );
}
