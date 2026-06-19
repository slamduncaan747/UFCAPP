"use client";

import { useRouter } from "next/navigation";

type Props = {
  leagueId: string;
  leagueStatus: string;
  draftStatus?: string | null;
  currentPickNumber?: number;
  totalPicks?: number;
  isCommissioner?: boolean;
};

export function DraftBanner({ leagueId, leagueStatus, draftStatus, currentPickNumber, totalPicks, isCommissioner }: Props) {
  const router = useRouter();
  const showDraft = leagueStatus === "setup" || leagueStatus === "drafting";
  if (!showDraft) return null;

  const isLive = draftStatus === "in_progress" || draftStatus === "paused";
  const isPaused = draftStatus === "paused";
  const pickDisplay = isLive && totalPicks ? `Pick ${(currentPickNumber ?? 0) + 1}/${totalPicks}` : null;

  return (
    <div
      onClick={() => router.push(`/leagues/${leagueId}/draft`)}
      style={{
        background: isLive ? "var(--ufc-accent-wash, #0f2040)" : "var(--ufc-surface, #12141a)",
        border: `1px solid ${isLive ? "var(--ufc-accent, #2e8bff)" : "var(--ufc-border, #2a2d36)"}`,
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 16,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          {isLive && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: "var(--ufc-live, #ef4444)", color: "#fff",
              fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
              textTransform: "uppercase", letterSpacing: 1,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
              LIVE
            </span>
          )}
          <span style={{
            fontFamily: "var(--font-display, sans-serif)",
            fontWeight: 800, fontSize: 15, textTransform: "uppercase",
            letterSpacing: 0.5, color: "var(--ufc-text, #f0f2f5)",
          }}>
            {isLive ? "Draft Room" : isCommissioner ? "Start the Draft" : "Draft Room"}
          </span>
          {pickDisplay && (
            <span style={{ fontSize: 12, color: "var(--ufc-text-3, #6b7280)", fontFamily: "var(--font-num, monospace)" }}>
              {pickDisplay}
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--ufc-text-2, #9ca3af)", margin: 0 }}>
          {isLive
            ? isPaused ? "Draft paused — tap to head back in." : "Draft in progress — head in to make your picks."
            : isCommissioner
              ? "All members joined? Start the snake draft."
              : "Waiting for the commissioner to start the draft."}
        </p>
      </div>
      <div style={{
        flexShrink: 0,
        background: "var(--ufc-accent, #2e8bff)",
        color: "#fff",
        fontWeight: 700, fontSize: 13,
        padding: "8px 16px", borderRadius: 10,
        fontFamily: "var(--font-display, sans-serif)",
        textTransform: "uppercase", letterSpacing: 0.5,
        whiteSpace: "nowrap",
      }}>
        Enter →
      </div>
    </div>
  );
}
