"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Headshot } from "@/components/shared/Headshot";
import { DivTag } from "@/components/shared/Tags";
import { toast } from "sonner";

type Drop = { id: string; name: string; weightClass: string; slot: string; photoUrl?: string | null };
type Bid = { bidPriority: number; addFighterId: string };

export function ClaimSheet({
  leagueId, addFighter, droppable, bids, periodLabel, onClose, onSubmitted,
}: {
  leagueId: string;
  addFighter: any | null;
  droppable: Drop[];
  bids: Bid[];
  periodLabel: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const open = !!addFighter;
  const [dropId, setDropId] = useState("");
  const [priority, setPriority] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);

  // Default the bid to the first open slot whenever the sheet opens.
  useEffect(() => {
    if (!addFighter) return;
    const used = new Set(bids.map((b) => b.bidPriority));
    setPriority(!used.has(1) ? 1 : !used.has(2) ? 2 : 1);
    setDropId(droppable.length === 1 ? droppable[0].id : "");
  }, [addFighter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (!dropId) { toast.error("Pick a fighter to drop"); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/waivers`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addFighterId: addFighter.id, dropFighterId: dropId, bidPriority: priority }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Waiver claim placed — Bid ${priority}`);
      onSubmitted();
      onClose();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl border-t max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface)", borderColor: "var(--border-2)" }}>
        {addFighter && (
          <>
            <SheetHeader className="pb-3">
              <SheetTitle className="text-left" style={{ color: "var(--text-3)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Waiver Claim
              </SheetTitle>
            </SheetHeader>

            {/* Add */}
            <div className="inset-group" style={{ marginBottom: 16 }}>
              <div className="inset-row">
                <Headshot name={addFighter.name} photoUrl={addFighter.photoUrl} weightClass={addFighter.weightClass} size={44} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--green)", letterSpacing: 0.4, textTransform: "uppercase" }}>Add</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{addFighter.name}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                    <DivTag slot={addFighter.weightClass} short />
                    <span className="font-num" style={{ fontSize: 11, color: "var(--text-3)" }}>{addFighter.recordW ?? 0}–{addFighter.recordL ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drop picker */}
            <div className="inset-label">Drop a fighter (one who hasn&apos;t fought)</div>
            {droppable.length === 0 ? (
              <div className="inset-group" style={{ marginBottom: 16 }}>
                <div className="inset-row" style={{ color: "var(--text-3)", fontSize: 13 }}>
                  None of your fighters are eligible to drop right now.
                </div>
              </div>
            ) : (
              <div className="inset-group" style={{ marginBottom: 16 }}>
                {droppable.map((d) => {
                  const sel = dropId === d.id;
                  return (
                    <button key={d.id} onClick={() => setDropId(d.id)} className="inset-row tappable" style={{ width: "100%", textAlign: "left", background: sel ? "var(--accent-wash)" : "transparent", border: "none" }}>
                      <Headshot name={d.name} photoUrl={d.photoUrl} weightClass={d.weightClass} size={36} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>{d.slot}</div>
                      </div>
                      <span style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${sel ? "var(--accent)" : "var(--border-2)"}`,
                        background: sel ? "var(--accent)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {sel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bid priority */}
            <div className="inset-label">Bid priority</div>
            <div className="segmented" style={{ marginBottom: 8 }}>
              {[1, 2].map((p) => {
                const taken = bids.find((b) => b.bidPriority === p);
                return (
                  <button key={p} data-active={priority === p} onClick={() => setPriority(p as 1 | 2)}>
                    Bid {p}{p === 1 ? " · Preferred" : " · Backup"}{taken ? " (replace)" : ""}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5, margin: "0 2px 16px" }}>
              You can place up to 2 bids and win at most one. Processed <strong style={{ color: "var(--text-2)" }}>{periodLabel}</strong> in reverse draft order.
            </p>

            <Button onClick={submit} disabled={busy || droppable.length === 0 || !dropId}
              className="w-full press" style={{ height: 50, borderRadius: 14, background: "var(--accent)", color: "#fff", fontSize: 16, fontWeight: 700 }}>
              {busy ? "Placing…" : "Place Waiver Claim"}
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
