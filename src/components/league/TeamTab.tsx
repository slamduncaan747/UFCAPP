import { getRoster, getFighterLockState } from "@/lib/db/queries";
import { RosterSlot } from "@/components/roster/RosterSlot";

const ALL_SLOTS = ["FLW", "BW", "FW", "LW", "WW", "MW", "LHW", "HW", "WILDCARD"] as const;

export async function TeamTab({ leagueId, membershipId, leagueStatus }: {
  leagueId: string; membershipId: string; userId: string; leagueStatus: string;
}) {
  const rosterEntries = await getRoster(membershipId);
  const slotMap = new Map<string, { fighter: any; roster: any }>();
  for (const { roster, fighter } of rosterEntries) slotMap.set(roster.slot, { fighter, roster });

  const lockStates = new Map<string, "LOCKED" | "UNLOCKED">();
  await Promise.all(
    rosterEntries.map(async ({ fighter }) => {
      const state = await getFighterLockState(fighter.id, leagueId);
      lockStates.set(fighter.id, state);
    })
  );

  const filled = rosterEntries.length;
  const draftPending = leagueStatus === "setup" || leagueStatus === "drafting";

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span className="font-display" style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: 0.3 }}>Roster</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 64, height: 6, borderRadius: 3, background: "var(--surface-3)", overflow: "hidden" }}>
            <div style={{ width: `${(filled / 9) * 100}%`, height: "100%", borderRadius: 3, background: filled < 9 ? "var(--grad-primary)" : "linear-gradient(135deg,#2fe07e,#16a34a)" }} />
          </div>
          <span className="font-num" style={{ fontSize: 13, fontWeight: 700, color: filled < 9 ? "var(--gold)" : "var(--green)" }}>
            {filled}/9
          </span>
        </div>
      </div>

      {draftPending && filled === 0 && (
        <div style={{
          padding: "14px 16px",
          borderRadius: 12,
          background: "var(--accent-wash)",
          border: "1px solid var(--accent-glow)",
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 16,
          lineHeight: 1.5,
        }}>
          <p style={{ color: "var(--accent)", margin: "0 0 10px" }}>
            {leagueStatus === "setup"
              ? "Your roster is filled during the draft. Waiting for the commissioner to start."
              : "Draft in progress — head to the Draft Room to make your picks."}
          </p>
          <a
            href={`/leagues/${leagueId}/draft`}
            style={{
              display: "inline-block",
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              padding: "8px 18px",
              borderRadius: 9,
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {leagueStatus === "drafting" ? "Enter Draft Room →" : "Go to Draft Room →"}
          </a>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ALL_SLOTS.map((slot) => {
          const entry = slotMap.get(slot);
          const lockState = entry ? lockStates.get(entry.fighter.id) : undefined;
          return (
            <RosterSlot
              key={slot}
              slot={slot}
              fighter={entry?.fighter ?? null}
              roster={entry?.roster ?? null}
              lockState={lockState}
              leagueId={leagueId}
              membershipId={membershipId}
              draftPending={draftPending}
            />
          );
        })}
      </div>
    </div>
  );
}
