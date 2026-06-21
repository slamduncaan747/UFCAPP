"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Headshot } from "@/components/shared/Headshot";
import { DivTag, RankTag } from "@/components/shared/Tags";
import { SearchIcon, ClockIcon } from "@/components/shared/Icons";
import { WaiverPanel } from "./WaiverPanel";

const SLOTS = ["FLW", "BW", "FW", "LW", "WW", "MW", "LHW", "HW", "WILDCARD"] as const;
const DIV_LABELS: Record<string, string> = {
  FLW: "Flyweight", BW: "Bantamweight", FW: "Featherweight", LW: "Lightweight",
  WW: "Welterweight", MW: "Middleweight", LHW: "Light HW", HW: "Heavyweight",
};

export function MarketplaceTab({ leagueId, leagueStatus }: { leagueId: string; membershipId: string; leagueStatus: string }) {
  const [fighters, setFighters] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const wc = filterClass && filterClass !== "WILDCARD" ? `&weightClass=${filterClass}` : "";
    const res = await fetch(`/api/leagues/${leagueId}/free-agents?${wc}`);
    const data = await res.json();
    setFighters(data.fighters ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filterClass]);

  const filtered = fighters.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const draftPending = leagueStatus === "setup" || leagueStatus === "drafting";

  if (draftPending) {
    return (
      <div className="space-y-4">
        <h2 className="font-display font-bold text-xl uppercase tracking-wide">Free Agents</h2>
        <div className="rounded-xl p-8 text-center"
          style={{ background: "var(--ufc-surface)", border: "1px solid var(--ufc-border)" }}>
          <ClockIcon size={28} style={{ color: "var(--ufc-text-3)", margin: "0 auto 12px" }} />
          <p className="font-display font-bold uppercase mb-1">Draft First</p>
          <p className="text-sm" style={{ color: "var(--ufc-text-2)" }}>
            {leagueStatus === "setup"
              ? "Free agency opens after the draft is complete."
              : "The draft is in progress — free agency opens once it wraps up."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <WaiverPanel leagueId={leagueId} freeAgents={filtered} />

      <h2 className="font-display font-bold text-xl uppercase tracking-wide">Free Agents</h2>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ufc-text-3)" }} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fighters…"
            className="pl-9" style={{ background: "var(--ufc-surface-3)", border: "1px solid var(--ufc-border-2)", color: "var(--ufc-text)" }} />
        </div>
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm flex-shrink-0"
          style={{ background: "var(--ufc-surface-3)", border: "1px solid var(--ufc-border-2)", color: "var(--ufc-text)", outline: "none" }}>
          <option value="">All classes</option>
          {SLOTS.filter(s => s !== "WILDCARD").map((s) => (
            <option key={s} value={s}>{DIV_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading && (
        <div className="py-12 text-center" style={{ color: "var(--ufc-text-3)" }}>Loading free agents…</div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="py-12 text-center" style={{ color: "var(--ufc-text-3)" }}>
          No free agents found
        </div>
      )}
      <div className="space-y-2">
        {!loading && filtered.map((fighter) => (
          <div key={fighter.id}
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: "var(--ufc-surface)", border: "1px solid var(--ufc-border)" }}>
            <Headshot name={fighter.name} photoUrl={fighter.photoUrl} weightClass={fighter.weightClass} size={48} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display font-bold uppercase truncate">{fighter.name}</span>
                {fighter.isChampion && <RankTag isChamp />}
                {!fighter.isChampion && fighter.currentRanking && <RankTag rank={fighter.currentRanking} />}
              </div>
              <div className="flex items-center gap-2">
                <DivTag slot={fighter.weightClass} short />
                <span className="text-xs font-num" style={{ color: "var(--ufc-text-3)" }}>
                  {fighter.recordW ?? 0}–{fighter.recordL ?? 0}–{fighter.recordD ?? 0}
                </span>
              </div>
            </div>
            {fighter.draftScore != null && (
              <span className="font-num text-xs flex-shrink-0" style={{ color: "var(--ufc-text-3)" }}>★ {fighter.draftScore}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
