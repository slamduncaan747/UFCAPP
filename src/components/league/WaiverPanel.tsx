"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type Claim = { claim: { id: string; addFighterId: string; dropFighterId: string; bidPriority: number; status: string }; add: { name: string; weightClass: string } };
type Drop = { id: string; name: string; weightClass: string; slot: string };
type FreeAgent = { id: string; name: string; weightClass: string };

const selStyle: React.CSSProperties = {
  background: "var(--ufc-surface-3)", border: "1px solid var(--ufc-border-2)",
  color: "var(--ufc-text)", borderRadius: 8, padding: "7px 9px", fontSize: 13, width: "100%", outline: "none",
};

export function WaiverPanel({ leagueId, freeAgents }: { leagueId: string; freeAgents: FreeAgent[] }) {
  const router = useRouter();
  const [period, setPeriod] = useState("");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [droppable, setDroppable] = useState<Drop[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<number, { add: string; drop: string }>>({ 1: { add: "", drop: "" }, 2: { add: "", drop: "" } });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/waivers`);
      if (!res.ok) return;
      const data = await res.json();
      setPeriod(data.period ?? "");
      setClaims(data.claims ?? []);
      setDroppable(data.droppable ?? []);
    } catch { /* ignore */ }
  }, [leagueId]);

  useEffect(() => { load(); }, [load]);

  const claimFor = (p: number) => claims.find((c) => c.claim.bidPriority === p);

  async function submit(priority: number) {
    const f = form[priority];
    if (!f.add || !f.drop) { toast.error("Pick a fighter to add and one to drop"); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/waivers`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addFighterId: f.add, dropFighterId: f.drop, bidPriority: priority }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Bid ${priority} submitted`);
      setForm((p) => ({ ...p, [priority]: { add: "", drop: "" } }));
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function cancel(priority: number) {
    setBusy(true);
    try {
      await fetch(`/api/leagues/${leagueId}/waivers?priority=${priority}`, { method: "DELETE" });
      await load();
    } finally { setBusy(false); }
  }

  const niceDate = period ? new Date(period + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }) : "Monday";

  return (
    <div style={{ background: "var(--ufc-surface)", border: "1px solid var(--ufc-border)", borderRadius: 14, padding: 14 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
        <span className="font-display font-bold uppercase tracking-wide" style={{ color: "var(--ufc-text)", fontSize: 16 }}>
          Waiver Wire {claims.length > 0 && <span style={{ color: "var(--ufc-accent)" }}>· {claims.length} bid{claims.length > 1 ? "s" : ""}</span>}
        </span>
        <span style={{ color: "var(--ufc-text-3)", fontSize: 13 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, color: "var(--ufc-text-2)", lineHeight: 1.5, marginBottom: 12 }}>
            Submit up to <strong>2 bids</strong> — you win at most one. Claims process <strong>{niceDate} morning</strong> in
            reverse draft order (the team that drafted last gets first pick). You can only drop a fighter who has <strong>already fought</strong>.
          </p>

          {droppable.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--ufc-text-3)", fontStyle: "italic", marginBottom: 8 }}>
              None of your fighters have fought yet — you can&apos;t submit a waiver claim until one does.
            </p>
          )}

          {[1, 2].map((priority) => {
            const existing = claimFor(priority);
            const drop = existing ? droppable.find((d) => d.id === existing.claim.dropFighterId) : null;
            return (
              <div key={priority} style={{ border: "1px solid var(--ufc-border)", borderRadius: 10, padding: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ufc-text-3)", marginBottom: 8 }}>
                  Bid {priority} · {priority === 1 ? "Preferred" : "Fallback"}
                </div>

                {existing ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 13, color: "var(--ufc-text)" }}>
                      <span style={{ color: "var(--ufc-win)" }}>+ {existing.add.name}</span>
                      <span style={{ color: "var(--ufc-text-3)" }}> for </span>
                      <span style={{ color: "var(--ufc-live)" }}>− {drop?.name ?? "—"}</span>
                    </div>
                    <button onClick={() => cancel(priority)} disabled={busy} style={{ background: "transparent", border: "none", color: "var(--ufc-text-3)", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <select value={form[priority].add} onChange={(e) => setForm((p) => ({ ...p, [priority]: { ...p[priority], add: e.target.value } }))} style={selStyle} disabled={droppable.length === 0}>
                      <option value="">+ Add a fighter…{freeAgents.length ? "" : " (search the list below)"}</option>
                      {freeAgents.slice(0, 200).map((f) => (
                        <option key={f.id} value={f.id}>{f.name} ({f.weightClass})</option>
                      ))}
                    </select>
                    <select value={form[priority].drop} onChange={(e) => setForm((p) => ({ ...p, [priority]: { ...p[priority], drop: e.target.value } }))} style={selStyle} disabled={droppable.length === 0}>
                      <option value="">− Drop (already fought)…</option>
                      {droppable.map((d) => (
                        <option key={d.id} value={d.id}>{d.name} ({d.slot})</option>
                      ))}
                    </select>
                    <Button size="sm" onClick={() => submit(priority)} disabled={busy || droppable.length === 0}
                      style={{ background: "var(--ufc-accent)", color: "var(--ufc-accent-ink)" }}
                      className="font-display font-bold uppercase text-xs">Submit Bid {priority}</Button>
                  </div>
                )}
              </div>
            );
          })}
          <p style={{ fontSize: 11, color: "var(--ufc-text-3)", marginTop: 4 }}>
            Tip: search/filter the Free Agents below to narrow the add list. <button onClick={() => router.refresh()} style={{ background: "none", border: "none", color: "var(--ufc-accent)", cursor: "pointer", fontSize: 11 }}>Refresh</button>
          </p>
        </div>
      )}
    </div>
  );
}
