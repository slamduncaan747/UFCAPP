"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Headshot } from "@/components/shared/Headshot";
import { DivTag, RankTag } from "@/components/shared/Tags";

function age(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 86_400_000));
}

function fmtLast(days?: number | null): string | null {
  if (days == null) return null;
  if (days < 60) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${(days / 365).toFixed(1)}y ago`;
}

type Props = {
  fighter: any | null;
  onClose: () => void;
  canPick: boolean;
  picking: boolean;
  onPick: (id: string) => void;
  inQueue: boolean;
  onToggleQueue: (f: any) => void;
  slotNote?: string | null;
};

export function DraftFighterSheet({ fighter, onClose, canPick, picking, onPick, inQueue, onToggleQueue, slotNote }: Props) {
  const open = !!fighter;
  const a = age(fighter?.dob);
  const last = fmtLast(fighter?.daysSinceLastFight);

  const stats = fighter ? [
    { label: "Sig. Str./min", value: fighter.slpm?.toFixed(2) },
    { label: "Str. Acc.", value: fighter.strAcc != null ? `${fighter.strAcc}%` : null },
    { label: "Absorbed/min", value: fighter.sapm?.toFixed(2) },
    { label: "Str. Def.", value: fighter.strDef != null ? `${fighter.strDef}%` : null },
    { label: "TD/15m", value: fighter.tdAvg?.toFixed(2) },
    { label: "TD Def.", value: fighter.tdDef != null ? `${fighter.tdDef}%` : null },
    { label: "Sub/15m", value: fighter.subAvg?.toFixed(1) },
    { label: "Stance", value: fighter.stance },
  ].filter((s) => s.value != null && s.value !== "") : [];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl border-t max-h-[88vh] overflow-y-auto"
        style={{ background: "var(--ufc-surface)", borderColor: "var(--ufc-border-2)" }}>
        {fighter && (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-start gap-4">
                <Headshot name={fighter.name} photoUrl={fighter.photoUrl} weightClass={fighter.weightClass} size={64} />
                <div className="flex-1 min-w-0">
                  <SheetTitle className="font-display font-black text-xl uppercase leading-tight text-left" style={{ color: "var(--ufc-text)" }}>
                    {fighter.name}
                  </SheetTitle>
                  {fighter.nickname && <p className="text-sm italic mt-0.5" style={{ color: "var(--ufc-text-3)" }}>&ldquo;{fighter.nickname}&rdquo;</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <DivTag slot={fighter.weightClass} />
                    {fighter.isChampion && <RankTag isChamp />}
                    {!fighter.isChampion && fighter.currentRanking && <RankTag rank={fighter.currentRanking} />}
                    {fighter.draftScore != null && (
                      <span className="font-num text-xs font-bold px-2 py-0.5 rounded" style={{ background: "var(--ufc-accent-wash)", color: "var(--ufc-accent)" }}>
                        ★ {fighter.draftScore}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* Record + meta */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Box label="Record" value={`${fighter.recordW}-${fighter.recordL}${fighter.recordD ? `-${fighter.recordD}` : ""}`} />
              <Box label="Age" value={a != null ? `${a}` : "—"} />
              <Box label="Last Fight" value={last ?? "—"} small />
            </div>

            {stats.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {stats.map(({ label, value }) => (
                  <div key={label} className="rounded-lg p-2.5" style={{ background: "var(--ufc-surface-2)", border: "1px solid var(--ufc-border)" }}>
                    <div className="font-num text-sm font-bold" style={{ color: "var(--ufc-text)" }}>{value}</div>
                    <div className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: "var(--ufc-text-3)" }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {(fighter.heightIn != null || fighter.reachIn != null) && (
              <div className="text-xs mb-4" style={{ color: "var(--ufc-text-3)" }}>
                {fighter.heightIn != null && `${Math.floor(fighter.heightIn / 12)}'${Math.round(fighter.heightIn % 12)}"`}
                {fighter.reachIn != null && ` · ${fighter.reachIn}" reach`}
              </div>
            )}

            {slotNote && (
              <div className="text-xs mb-3 px-1" style={{ color: slotNote.includes("full") ? "var(--ufc-live)" : "var(--ufc-text-2)" }}>{slotNote}</div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => onToggleQueue(fighter)} variant="outline" className="flex-1 font-display font-bold uppercase tracking-wide"
                style={{ border: "1px solid var(--ufc-border-2)", color: inQueue ? "var(--ufc-accent)" : "var(--ufc-text-2)" }}>
                {inQueue ? "✓ Queued" : "+ Queue"}
              </Button>
              <Button onClick={() => onPick(fighter.id)} disabled={!canPick || picking}
                className="flex-1 font-display font-bold uppercase tracking-wide"
                style={{ background: canPick ? "var(--ufc-accent)" : "var(--ufc-surface-3)", color: canPick ? "var(--ufc-accent-ink)" : "var(--ufc-text-3)" }}>
                {picking ? "…" : "Draft"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Box({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="ufc-surface-2 rounded-lg p-3 text-center" style={{ background: "var(--ufc-surface-2)", border: "1px solid var(--ufc-border)" }}>
      <div className="font-num font-bold" style={{ color: "var(--ufc-text)", fontSize: small ? 13 : 20 }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: "var(--ufc-text-3)" }}>{label}</div>
    </div>
  );
}
