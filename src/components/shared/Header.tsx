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
    <header style={{ ...headerBase, padding: "0 16px", paddingTop: "var(--sat)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <div style={{
          width: 5, height: 30, borderRadius: 3, flexShrink: 0,
          background: "var(--grad-primary)", boxShadow: "0 0 12px var(--accent-glow)",
        }} />
        <div style={{ minWidth: 0 }}>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: 0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.1 }}>
            {leagueName}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: 0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {teamName}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", letterSpacing: 1.2, textTransform: "uppercase" }}>
            Points
          </div>
          <div className="font-hero grad-text" style={{ fontSize: 22, lineHeight: 1 }}>
            {teamPoints.toLocaleString()}
          </div>
        </div>
        <Link href="/settings" style={{
          color: "var(--text-2)", display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 11, background: "var(--surface)", border: "1px solid var(--border)",
        }}>
          <SettingsIcon size={18} />
        </Link>
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
