"use client";

import Link from "next/link";
import { SettingsIcon } from "./Icons";

type LeagueHeaderProps = {
  leagueName: string;
  teamName: string;
  teamPoints: number;
  leagueId: string;
};

const headerBase: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: "var(--sat)",
  height: "calc(56px + var(--sat))",
  background: "rgba(8,8,11,0.72)",
  backdropFilter: "blur(22px) saturate(160%)",
  WebkitBackdropFilter: "blur(22px) saturate(160%)",
  borderBottom: "1px solid var(--border)",
};

export function AppHeader({ leagueName, teamName, teamPoints }: LeagueHeaderProps) {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 40,
      display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
      paddingTop: "var(--sat)", height: "calc(50px + var(--sat))", padding: "var(--sat) 6px 0",
      background: "color-mix(in srgb, var(--bg) 70%, transparent)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      borderBottom: "1px solid var(--border)",
    }}>
      {/* Exit league — iOS back button (left, tinted) */}
      <div style={{ justifySelf: "start" }}>
        <Link href="/dashboard?hub=1" className="ios-nav-btn press" aria-label="Back to leagues">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span style={{ fontSize: 15 }}>Leagues</span>
        </Link>
      </div>

      {/* Title + team subtitle (centered) */}
      <div style={{ textAlign: "center", minWidth: 0, maxWidth: "62vw" }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", letterSpacing: -0.01, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.15 }}>
          {leagueName}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 500, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {teamName}
        </div>
      </div>

      {/* Points (right, balances the back button) */}
      <div style={{ justifySelf: "end", textAlign: "right", paddingRight: 12, lineHeight: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{teamPoints.toLocaleString()}</div>
        <div style={{ fontSize: 8, fontWeight: 700, color: "var(--text-3)", letterSpacing: 1, textTransform: "uppercase", marginTop: 1 }}>Pts</div>
      </div>
    </header>
  );
}

// Dashboard header — simpler
export function DashboardHeader(_props: { displayName?: string }) {
  return (
    <header style={{ ...headerBase, padding: "0 20px", paddingTop: "var(--sat)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 4, height: 22, borderRadius: 3, background: "var(--grad-primary)", boxShadow: "0 0 12px var(--accent-glow)" }} />
        <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: 0.3, textTransform: "uppercase" }}>
          Fantasy <span className="grad-text">UFC</span>
        </span>
      </div>
      <Link href="/settings" style={{
        color: "var(--text-2)", display: "flex", alignItems: "center", justifyContent: "center",
        width: 36, height: 36, borderRadius: 11, background: "var(--surface)", border: "1px solid var(--border)",
      }}>
        <SettingsIcon size={18} />
      </Link>
    </header>
  );
}

// Keep LeagueTabs as a no-op export so old imports don't break
export function LeagueTabs(_props: { leagueId: string; currentTab: string }) {
  return null;
}
