"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Headshot } from "@/components/shared/Headshot";
import { DivTag, RankTag, StatusChip } from "@/components/shared/Tags";
import { LockIcon, FlameIcon, WarnIcon } from "@/components/shared/Icons";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
  fighter: any;
  roster: any;
  lockState?: "LOCKED" | "UNLOCKED";
  leagueId: string;
  membershipId: string;
  slot: string;
  foughtDropUsed?: boolean;
};

export function FighterDetailSheet({ open, onClose, fighter, roster, lockState, leagueId, membershipId, slot, foughtDropUsed }: Props) {
  const router = useRouter();
  const [dropping, setDropping] = useState(false);
  const [confirmBurn, setConfirmBurn] = useState(false);

  const isLocked = lockState === "LOCKED";
  const canDrop = !isLocked || !foughtDropUsed;

  async function handleDrop() {
    if (isLocked && !confirmBurn) {
      setConfirmBurn(true);
      return;
    }
    setDropping(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "drop", fighterId: fighter.id, slot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Drop failed");
      toast.success(`Dropped ${fighter.name}`);
      onClose();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDropping(false);
      setConfirmBurn(false);
    }
  }

  if (!fighter) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-t max-h-[85vh] overflow-y-auto"
        style={{ background: "var(--ufc-surface)", borderColor: "var(--ufc-border-2)" }}
      >
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-4">
            <Headshot name={fighter.name} photoUrl={fighter.photoUrl} weightClass={fighter.weightClass} size={64} />
            <div className="flex-1 min-w-0">
              <SheetTitle className="font-display font-black text-xl uppercase leading-tight text-left"
                style={{ color: "var(--ufc-text)" }}>
                {fighter.name}
              </SheetTitle>
              {fighter.nickname && (
                <p className="text-sm italic mt-0.5" style={{ color: "var(--ufc-text-3)" }}>
                  &ldquo;{fighter.nickname}&rdquo;
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <DivTag slot={slot} />
                {fighter.isChampion && <RankTag isChamp />}
                {!fighter.isChampion && fighter.currentRanking && <RankTag rank={fighter.currentRanking} />}
                {lockState && <StatusChip status={lockState} />}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Record */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: "Wins", value: fighter.recordW ?? 0, color: "var(--ufc-win)" },
            { label: "Losses", value: fighter.recordL ?? 0, color: "var(--ufc-live)" },
            { label: "Draws", value: fighter.recordD ?? 0, color: "var(--ufc-text-2)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="ufc-surface-2 rounded-lg p-3 text-center">
              <div className="font-num text-2xl font-bold" style={{ color }}>{value}</div>
              <div className="text-xs uppercase tracking-wide mt-0.5" style={{ color: "var(--ufc-text-3)" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Career stats (live from scraped UFC data) */}
        {(fighter.slpm != null || fighter.tdAvg != null || fighter.heightIn != null) && (
          <div className="mb-5">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Sig. Str. / min", value: fighter.slpm?.toFixed(2) },
                { label: "Str. Acc.", value: fighter.strAcc != null ? `${fighter.strAcc}%` : null },
                { label: "Str. Absorbed / min", value: fighter.sapm?.toFixed(2) },
                { label: "Str. Def.", value: fighter.strDef != null ? `${fighter.strDef}%` : null },
                { label: "Takedowns / 15m", value: fighter.tdAvg?.toFixed(2) },
                { label: "TD Def.", value: fighter.tdDef != null ? `${fighter.tdDef}%` : null },
                { label: "Sub. att / 15m", value: fighter.subAvg?.toFixed(1) },
                { label: "Stance", value: fighter.stance },
              ]
                .filter((s) => s.value != null && s.value !== "")
                .map(({ label, value }) => (
                  <div key={label} className="rounded-lg p-2.5"
                    style={{ background: "var(--ufc-surface-2)", border: "1px solid var(--ufc-border)" }}>
                    <div className="font-num text-sm font-bold" style={{ color: "var(--ufc-text)" }}>{value}</div>
                    <div className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: "var(--ufc-text-3)" }}>{label}</div>
                  </div>
                ))}
            </div>
            {(fighter.heightIn != null || fighter.reachIn != null) && (
              <div className="text-xs mt-2" style={{ color: "var(--ufc-text-3)" }}>
                {fighter.heightIn != null && `${Math.floor(fighter.heightIn / 12)}'${Math.round(fighter.heightIn % 12)}" `}
                {fighter.reachIn != null && `· ${fighter.reachIn}" reach`}
              </div>
            )}
            {fighter.photoAttribution && (
              <div className="text-[10px] mt-2" style={{ color: "var(--ufc-text-3)" }}>
                Photo: {fighter.photoAttribution}
              </div>
            )}
          </div>
        )}

        {/* Drop / Burn zone */}
        {roster && (
          <div className="space-y-3">
            {confirmBurn ? (
              <div className="rounded-xl p-4 space-y-3"
                style={{ background: "rgba(255,77,87,0.08)", border: "1px solid rgba(255,77,87,0.25)" }}>
                <div className="flex items-center gap-2">
                  <FlameIcon size={18} style={{ color: "var(--ufc-live)" }} />
                  <span className="font-display font-bold uppercase text-sm tracking-wide" style={{ color: "var(--ufc-live)" }}>
                    Season Burn
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--ufc-text-2)" }}>
                  <strong style={{ color: "var(--ufc-text)" }}>{fighter.name}</strong> has already fought this season and is <strong style={{ color: "var(--ufc-frost)" }}>LOCKED</strong>.
                  Using your Season Burn is a <strong style={{ color: "var(--ufc-live)" }}>once-per-season</strong> action — you cannot undo this.
                  Points they already scored remain on your team.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => setConfirmBurn(false)} variant="outline" className="flex-1"
                    style={{ border: "1px solid var(--ufc-border-2)", color: "var(--ufc-text-2)" }}>
                    Cancel
                  </Button>
                  <Button onClick={handleDrop} disabled={dropping} className="flex-1 font-bold"
                    style={{ background: "var(--ufc-live)", color: "#fff" }}>
                    {dropping ? "Burning…" : "Burn & Drop"}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {isLocked && (
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <LockIcon size={13} style={{ color: "var(--ufc-frost)" }} />
                    <p className="text-xs" style={{ color: "var(--ufc-frost)" }}>
                      This fighter has fought this season. Dropping them costs your Season Burn.
                      {foughtDropUsed && " (Already used — cannot drop locked fighters)"}
                    </p>
                  </div>
                )}
                <Button
                  onClick={handleDrop}
                  disabled={dropping || (isLocked && !!foughtDropUsed)}
                  variant="outline"
                  className="w-full font-display font-bold uppercase tracking-wide"
                  style={{
                    borderColor: isLocked ? "rgba(255,77,87,0.3)" : "var(--ufc-border-2)",
                    color: isLocked ? "var(--ufc-live)" : "var(--ufc-text-2)",
                  }}
                >
                  {isLocked ? (
                    <><FlameIcon size={14} /> Use Season Burn & Drop</>
                  ) : (
                    "Drop Fighter"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
