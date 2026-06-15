"use client";

import { useState } from "react";
import { TrophyIcon, ShareIcon } from "@/components/shared/Icons";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

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
        <TrophyIcon size={32} style={{ color: "var(--ufc-text-3)", margin: "0 auto 12px" }} />
        <p className="font-display font-bold uppercase mb-1">No standings yet</p>
        <p className="text-sm" style={{ color: "var(--ufc-text-2)" }}>Points will appear after events complete.</p>
      </div>
    );
  }

  const medalGrad = ["var(--grad-gold)", "var(--grad-silver)", "var(--grad-bronze)"];
  const leaderPoints = Number(standings[0]?.totalPoints ?? 0);

  return (
    <div className="space-y-2.5 rise-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-xl uppercase tracking-wide">Standings</h2>
        <Button variant="outline" size="sm" onClick={shareStandings}
          className="flex items-center gap-1.5 font-display font-bold uppercase text-xs"
          style={{ border: "1px solid var(--ufc-border-2)", color: "var(--ufc-text-2)", borderRadius: 10 }}>
          <ShareIcon size={13} />
          {shared ? "Copied!" : "Share"}
        </Button>
      </div>

      {standings.map((s, i) => {
        const isMe = s.userId === userId;
        const isPodium = i < 3;
        const points = Number(s.totalPoints);
        const gap = i === 0 ? 0 : leaderPoints - points;
        return (
          <div
            key={s.membershipId}
            className="card-premium flex items-center gap-3 p-3.5"
            style={ isMe ? { background: "var(--accent-wash)", borderColor: "var(--accent-glow)" } : undefined }
          >
            {/* Rank medallion */}
            <div className="flex-shrink-0 flex items-center justify-center" style={{
              width: 36, height: 36, borderRadius: 11,
              background: isPodium ? medalGrad[i] : "var(--surface-3)",
              boxShadow: i === 0 ? "var(--shadow-gold)" : "none",
            }}>
              <span className="font-hero" style={{
                fontSize: isPodium ? 16 : 14,
                color: isPodium ? "#1a1207" : "var(--text-2)",
                lineHeight: 1,
              }}>
                {i + 1}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold uppercase truncate" style={{ color: "var(--text)", letterSpacing: 0.2 }}>
                {s.teamName}
                {isMe && <span className="ml-2 text-[10px] font-bold lowercase px-1.5 py-0.5 rounded" style={{ color: "var(--accent)", background: "var(--accent-wash)" }}>you</span>}
              </div>
              <div className="text-xs" style={{ color: "var(--text-3)" }}>
                {s.displayName}
                {gap > 0 && <span style={{ marginLeft: 6, color: "var(--text-3)" }}>· −{gap.toLocaleString()}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="font-hero" style={{ fontSize: 21, lineHeight: 1, color: i === 0 ? "transparent" : "var(--text)" }}>
                <span className={i === 0 ? "grad-text-gold" : ""}>{points.toLocaleString()}</span>
              </div>
              <div className="font-display" style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: 1, textTransform: "uppercase", marginTop: 1 }}>pts</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
