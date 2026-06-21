"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Headshot } from "@/components/shared/Headshot";
import { DivTag, RankTag } from "@/components/shared/Tags";
import { SearchIcon, ClockIcon } from "@/components/shared/Icons";
import { ClaimSheet } from "./ClaimSheet";

const WEIGHT = ["FLW", "BW", "FW", "LW", "WW", "MW", "LHW", "HW"] as const;

type Claim = { claim: { id: string; addFighterId: string; dropFighterId: string; bidPriority: number }; add: { name: string } };
type Drop = { id: string; name: string; weightClass: string; slot: string; photoUrl?: string | null };

export function MarketplaceTab({ leagueId, leagueStatus }: { leagueId: string; membershipId: string; leagueStatus: string }) {
  const [fighters, setFighters] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [loading, setLoading] = useState(true);

  const [claims, setClaims] = useState<Claim[]>([]);
  const [droppable, setDroppable] = useState<Drop[]>([]);
  const [period, setPeriod] = useState("");
  const [claimTarget, setClaimTarget] = useState<any | null>(null);

  const draftPending = leagueStatus === "setup" || leagueStatus === "drafting";

  const loadFighters = useCallback(async () => {
    setLoading(true);
    const wc = filterClass ? `&weightClass=${filterClass}` : "";
    const res = await fetch(`/api/leagues/${leagueId}/free-agents?${wc}`);
    const data = await res.json();
    setFighters(data.fighters ?? []);
    setLoading(false);
  }, [leagueId, filterClass]);

  const loadWaivers = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/waivers`);
      if (!res.ok) return;
      const data = await res.json();
      setClaims(data.claims ?? []);
      setDroppable(data.droppable ?? []);
      setPeriod(data.period ?? "");
    } catch { /* ignore */ }
  }, [leagueId]);

  useEffect(() => { if (!draftPending) loadFighters(); }, [loadFighters, draftPending]);
  useEffect(() => { if (!draftPending) loadWaivers(); }, [loadWaivers, draftPending]);

  async function cancelBid(priority: number) {
    await fetch(`/api/leagues/${leagueId}/waivers?priority=${priority}`, { method: "DELETE" });
    loadWaivers();
  }

  if (draftPending) {
    return (
      <div className="inset-group">
        <div className="inset-row" style={{ flexDirection: "column", alignItems: "center", textAlign: "center", padding: "32px 20px", gap: 8 }}>
          <ClockIcon size={26} style={{ color: "var(--text-3)" }} />
          <div style={{ fontWeight: 700, color: "var(--text)" }}>Market opens after the draft</div>
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>Free agency and waivers go live once the draft wraps up.</div>
        </div>
      </div>
    );
  }

  const filtered = fighters.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));
  const niceDate = period ? new Date(period + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }) : "Monday";
  const bids = claims.map((c) => ({ bidPriority: c.claim.bidPriority, addFighterId: c.claim.addFighterId }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Your claims */}
      <section>
        <div className="inset-label">Your Waiver Claims · {claims.length}/2</div>
        <div className="inset-group">
          {claims.length === 0 ? (
            <div className="inset-row" style={{ color: "var(--text-3)", fontSize: 13 }}>
              No claims yet. Tap <strong style={{ color: "var(--text-2)" }}>Claim</strong> on a fighter below to place a bid.
            </div>
          ) : (
            [...claims].sort((a, b) => a.claim.bidPriority - b.claim.bidPriority).map((c) => {
              const drop = droppable.find((d) => d.id === c.claim.dropFighterId);
              return (
                <div key={c.claim.id} className="inset-row">
                  <span style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, background: "var(--accent-wash)", color: "var(--accent)", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {c.claim.bidPriority}
                  </span>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
                    <span style={{ color: "var(--green)", fontWeight: 600 }}>{c.add.name}</span>
                    <span style={{ color: "var(--text-3)" }}> for </span>
                    <span style={{ color: "var(--text-2)" }}>{drop?.name ?? "—"}</span>
                  </div>
                  <button onClick={() => cancelBid(c.claim.bidPriority)} className="press" style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
                </div>
              );
            })
          )}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-3)", margin: "8px 4px 0", lineHeight: 1.5 }}>
          Up to 2 bids, win one. Processed <strong style={{ color: "var(--text-2)" }}>{niceDate} morning</strong>, reverse draft order.
        </p>
      </section>

      {/* Free agents */}
      <section>
        <div className="inset-label">Free Agents</div>

        <div style={{ position: "relative", marginBottom: 10 }}>
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fighters…"
            className="pl-9" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", height: 40, borderRadius: 12 }} />
        </div>

        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 4 }}>
          {[["", "All"], ...WEIGHT.map((w) => [w, w] as const)].map(([val, label]) => (
            <button key={val} onClick={() => setFilterClass(val)} className="press" style={{
              flexShrink: 0, padding: "6px 13px", borderRadius: 99, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              background: filterClass === val ? "var(--accent)" : "var(--surface-2)",
              color: filterClass === val ? "#fff" : "var(--text-2)",
              border: `1px solid ${filterClass === val ? "var(--accent)" : "var(--border)"}`,
            }}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-3)" }}>No fighters found</div>
        ) : (
          <div className="inset-group">
            {filtered.slice(0, 100).map((f) => (
              <div key={f.id} className="inset-row">
                <Headshot name={f.name} photoUrl={f.photoUrl} weightClass={f.weightClass} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                    {f.isChampion && <RankTag isChamp />}
                    {!f.isChampion && f.currentRanking && <RankTag rank={f.currentRanking} />}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <DivTag slot={f.weightClass} short />
                    <span className="font-num" style={{ fontSize: 11, color: "var(--text-3)" }}>{f.recordW ?? 0}–{f.recordL ?? 0}</span>
                    {f.draftScore != null && <span style={{ fontSize: 11, color: "var(--text-3)" }}>★ {f.draftScore}</span>}
                  </div>
                </div>
                <button onClick={() => setClaimTarget(f)} className="press" style={{
                  flexShrink: 0, padding: "7px 14px", borderRadius: 10, cursor: "pointer",
                  background: "var(--accent-wash)", color: "var(--accent)", border: "none",
                  fontSize: 13, fontWeight: 700,
                }}>Claim</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <ClaimSheet
        leagueId={leagueId}
        addFighter={claimTarget}
        droppable={droppable}
        bids={bids}
        periodLabel={`${niceDate} morning`}
        onClose={() => setClaimTarget(null)}
        onSubmitted={loadWaivers}
      />
    </div>
  );
}
