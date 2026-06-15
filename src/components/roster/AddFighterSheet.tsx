"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Headshot } from "@/components/shared/Headshot";
import { RankTag } from "@/components/shared/Tags";
import { SearchIcon } from "@/components/shared/Icons";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const DIV_LABELS: Record<string, string> = {
  FLW: "Flyweight", BW: "Bantamweight", FW: "Featherweight", LW: "Lightweight",
  WW: "Welterweight", MW: "Middleweight", LHW: "Light Heavyweight", HW: "Heavyweight",
  WILDCARD: "Any Division",
};

type Props = {
  open: boolean;
  onClose: () => void;
  slot: string;
  leagueId: string;
  membershipId: string;
};

export function AddFighterSheet({ open, onClose, slot, leagueId, membershipId }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [fighters, setFighters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    loadFighters();
  }, [open, slot]);

  async function loadFighters() {
    setLoading(true);
    const wc = slot !== "WILDCARD" ? `&weightClass=${slot}` : "";
    const res = await fetch(`/api/leagues/${leagueId}/free-agents?${wc}`);
    const data = await res.json();
    setFighters(data.fighters ?? []);
    setLoading(false);
  }

  const filtered = fighters.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd(fighter: any) {
    setAdding(fighter.id);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "add", fighterId: fighter.id, slot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Add failed");
      toast.success(`Added ${fighter.name}`);
      onClose();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdding(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-t max-h-[90vh] flex flex-col"
        style={{ background: "var(--ufc-surface)", borderColor: "var(--ufc-border-2)" }}
      >
        <SheetHeader className="pb-3 flex-shrink-0">
          <SheetTitle className="font-display font-black uppercase text-left" style={{ color: "var(--ufc-text)" }}>
            Add {DIV_LABELS[slot] ?? slot} Fighter
          </SheetTitle>
        </SheetHeader>

        <div className="flex-shrink-0 relative mb-3">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ufc-text-3)" }} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fighters…"
            className="pl-9"
            style={{ background: "var(--ufc-surface-3)", border: "1px solid var(--ufc-border-2)", color: "var(--ufc-text)" }}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading && (
            <div className="py-8 text-center" style={{ color: "var(--ufc-text-3)" }}>Loading free agents…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="py-8 text-center" style={{ color: "var(--ufc-text-3)" }}>
              No {slot !== "WILDCARD" ? DIV_LABELS[slot] : ""} free agents available
            </div>
          )}
          {!loading && filtered.map((fighter) => (
            <div key={fighter.id}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "var(--ufc-surface-2)", border: "1px solid var(--ufc-border)" }}>
              <Headshot name={fighter.name} photoUrl={fighter.photoUrl} weightClass={fighter.weightClass} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-display font-bold text-sm uppercase truncate">{fighter.name}</span>
                  {fighter.isChampion && <RankTag isChamp />}
                  {!fighter.isChampion && fighter.currentRanking && <RankTag rank={fighter.currentRanking} />}
                </div>
                <span className="text-xs" style={{ color: "var(--ufc-text-3)" }}>
                  {fighter.recordW ?? 0}–{fighter.recordL ?? 0}–{fighter.recordD ?? 0}
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => handleAdd(fighter)}
                disabled={adding === fighter.id}
                style={{ background: "var(--ufc-accent)", color: "var(--ufc-accent-ink)" }}
                className="font-display font-bold uppercase text-xs flex-shrink-0"
              >
                {adding === fighter.id ? "Adding…" : "Add"}
              </Button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
