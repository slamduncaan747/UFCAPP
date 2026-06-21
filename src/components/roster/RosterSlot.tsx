"use client";

import { useState } from "react";
import { Headshot } from "@/components/shared/Headshot";
import { RankTag } from "@/components/shared/Tags";
import { LockIcon, UnlockIcon } from "@/components/shared/Icons";
import { FighterDetailSheet } from "@/components/roster/FighterDetailSheet";

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

const SLOT_W = 40;

export function RosterSlot({ slot, fighter, roster, lockState, leagueId, membershipId, isLive, livePoints, draftPending }: RosterSlotProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  if (!fighter) {
    return (
      <div className="inset-row" style={{ minHeight: 62 }}>
        <span style={{ width: SLOT_W, fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0 }}>{slot}</span>
        <div style={{ width: 38, height: 38, borderRadius: 19, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "var(--text-3)", fontSize: 16 }}>+</span>
        </div>
        <span style={{ fontSize: 14, color: "var(--text-3)" }}>
          {draftPending ? "Filled during draft" : "Open · claim via waivers"}
        </span>
      </div>
    );
  }

  const isLocked = lockState === "LOCKED";

  return (
    <>
      <button onClick={() => setDetailOpen(true)} className="inset-row tappable" style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", minHeight: 62 }}>
        <span style={{ width: SLOT_W, fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0 }}>{slot}</span>
        <Headshot name={fighter.name} photoUrl={fighter.photoUrl} weightClass={fighter.weightClass} size={40} isLive={isLive} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 15.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: -0.01 }}>{fighter.name}</span>
            {fighter.isChampion && <RankTag isChamp />}
            {!fighter.isChampion && fighter.currentRanking && <RankTag rank={fighter.currentRanking} />}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
            {isLocked ? (
              <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--frost)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                <LockIcon size={10} /> Locked
              </span>
            ) : (
              <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                <UnlockIcon size={10} /> Active
              </span>
            )}
            <span style={{ color: "var(--text-3)", fontSize: 11 }}>·</span>
            <span className="font-num" style={{ fontSize: 11.5, color: "var(--text-3)" }}>{fighter.recordW ?? 0}–{fighter.recordL ?? 0}</span>
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: "right", display: "flex", alignItems: "center", gap: 8 }}>
          {livePoints !== undefined && (
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>+{livePoints}</span>
          )}
          <svg width="9" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
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
