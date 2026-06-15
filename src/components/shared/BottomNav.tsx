"use client";

import Link from "next/link";
import { UserIcon, BoltIcon, TrophyIcon, SwapIcon, SettingsIcon } from "./Icons";

const TABS = [
  { id: "team",        label: "Roster",    Icon: UserIcon },
  { id: "fights",      label: "Fights",    Icon: BoltIcon },
  { id: "standings",   label: "League",    Icon: TrophyIcon },
  { id: "marketplace", label: "Market",    Icon: SwapIcon },
  { id: "settings",    label: "Settings",  Icon: SettingsIcon },
] as const;

export function BottomNav({ leagueId, currentTab }: { leagueId: string; currentTab: string }) {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "rgba(8,8,11,0.78)",
        backdropFilter: "blur(22px) saturate(160%)",
        WebkitBackdropFilter: "blur(22px) saturate(160%)",
        borderTop: "1px solid var(--border-2)",
        paddingBottom: "var(--sab)",
        height: "calc(var(--nav-h) + var(--sab))",
        display: "flex",
        alignItems: "flex-start",
      }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = currentTab === id;
        return (
          <Link
            key={id}
            href={`/leagues/${leagueId}?tab=${id}`}
            style={{
              position: "relative",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              height: "var(--nav-h)",
              color: active ? "var(--accent)" : "var(--text-3)",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
          >
            {/* Active top indicator */}
            <span style={{
              position: "absolute",
              top: 0,
              width: 26,
              height: 3,
              borderRadius: "0 0 3px 3px",
              background: active ? "var(--grad-primary)" : "transparent",
              boxShadow: active ? "0 2px 12px var(--accent-glow)" : "none",
              transition: "background 0.15s",
            }} />
            <span style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 26,
              borderRadius: 9,
              background: active ? "var(--accent-wash)" : "transparent",
              transition: "background 0.15s",
            }}>
              <Icon size={21} />
            </span>
            <span className="font-display" style={{ fontSize: 10, fontWeight: active ? 700 : 600, letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
