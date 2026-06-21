"use client";

import { useState, useEffect } from "react";
import { TrophyIcon, ShareIcon } from "@/components/shared/Icons";

type Standing = { membershipId: string; userId: string; teamName: string; displayName: string; totalPoints: number };

async function fetchStandings(leagueId: string): Promise<Standing[]> {
  const res = await fetch(`/api/leagues/${leagueId}/standings`);
  if (!res.ok) return [];
  return res.json();
}

export function StandingsTab({ leagueId, userId, leagueName, inviteCode }: {
  leagueId: string; userId: string; leagueName: string; inviteCode: string;
}) {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    fetchStandings(leagueId).then(setStandings);
  }, [leagueId]);

  async function shareStandings() {
    const top3 = standings.slice(0, 3).map((s, i) => {
      const medal = ["🥇", "🥈", "🥉"][i];
      return `${medal} ${s.teamName} — ${Number(s.totalPoints).toLocaleString()} pts`;
    }).join("\n");
    const joinUrl = `${window.location.origin}/leagues/join?code=${inviteCode}`;
    const text = `${leagueName} Standings\n\n${top3}\n\nJoin: ${joinUrl}`;

    if (navigator.share) {
      try { await navigator.share({ title: `${leagueName} Standings`, text }); } catch { }
    } else {
      navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }

  if (standings.length === 0) {
    return (
      <div className="py-16 text-center">
        <TrophyIcon size={32} style={{ color: "var(--text-3)", margin: "0 auto 12px" }} />
        <p style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>No standings yet</p>
        <p className="text-sm" style={{ color: "var(--text-2)" }}>Points appear after events complete.</p>
      </div>
    );
  }

  const leaderPoints = Number(standings[0]?.totalPoints ?? 0);
  const medalColor = ["var(--gold)", "#cbd2dc", "#cd8e54"];

  return (
    <div className="rise-in">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={shareStandings} className="press" style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 11,
          background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          <ShareIcon size={14} />
          {shared ? "Copied!" : "Share"}
        </button>
      </div>

      <div className="inset-group">
        {standings.map((s, i) => {
          const isMe = s.userId === userId;
          const points = Number(s.totalPoints);
          const gap = i === 0 ? 0 : leaderPoints - points;
          return (
            <div key={s.membershipId} className="inset-row" style={{ background: isMe ? "var(--accent-wash)" : "transparent", minHeight: 60 }}>
              <span style={{ width: 26, textAlign: "center", flexShrink: 0, fontSize: 17, fontWeight: 800, color: i < 3 ? medalColor[i] : "var(--text-3)", fontFamily: "var(--font-num)" }}>
                {i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 15.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: -0.01 }}>{s.teamName}</span>
                  {isMe && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "var(--accent-wash)", padding: "1px 6px", borderRadius: 5 }}>YOU</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>
                  {s.displayName}{gap > 0 && <span> · −{gap.toLocaleString()}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div className="font-num" style={{ fontSize: 18, fontWeight: 700, color: i === 0 ? "var(--gold)" : "var(--text)", lineHeight: 1 }}>{points.toLocaleString()}</div>
                <div style={{ fontSize: 8.5, color: "var(--text-3)", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>pts</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
