"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Headshot } from "@/components/shared/Headshot";
import { DivTag, RankTag } from "@/components/shared/Tags";
import { SearchIcon, ClockIcon, TrophyIcon, BoltIcon } from "@/components/shared/Icons";
import { toast } from "sonner";
import { getMemberForPick } from "@/lib/draft/snake";
import { useRouter } from "next/navigation";

type DraftState = {
  draft: any;
  picks: any[];
  members: any[];
  queue: any[];
  availableFighters: any[];
};

type Props = {
  leagueId: string;
  membershipId: string;
  userId: string;
  displayName: string;
  isCommissioner: boolean;
  initialDraftStatus: string;
};

export function DraftRoom({ leagueId, membershipId, userId, displayName, isCommissioner, initialDraftStatus }: Props) {
  const router = useRouter();
  const [state, setState] = useState<DraftState | null>(null);
  const [search, setSearch] = useState("");
  const [picking, setPicking] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [draftStatus, setDraftStatus] = useState(initialDraftStatus);
  const [starting, setStarting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  const loadState = useCallback(async () => {
    const res = await fetch(`/api/leagues/${leagueId}/draft`);
    if (!res.ok) return;
    const data = await res.json();
    setState(data);
    setDraftStatus(data.draft?.status ?? initialDraftStatus);
  }, [leagueId]);

  useEffect(() => {
    loadState();

    const channel = supabase.channel(`draft:${leagueId}`)
      .on("broadcast", { event: "draft:picked" }, () => loadState())
      .on("broadcast", { event: "draft:started" }, () => loadState())
      .on("broadcast", { event: "draft:complete" }, () => {
        setDraftStatus("completed");
        loadState();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [leagueId]);

  // Clock countdown
  useEffect(() => {
    if (!state?.draft?.clockExpiresAt) { setTimeLeft(null); return; }
    if (timerRef.current) clearInterval(timerRef.current);

    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(state.draft.clockExpiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state?.draft?.clockExpiresAt]);

  async function handlePick(fighterId: string) {
    setPicking(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/draft/pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fighterId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Pick failed");
      if (data.isDraftComplete) {
        toast.success("Draft complete! Rosters populated.");
        router.push(`/leagues/${leagueId}?tab=team`);
      } else {
        await loadState();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPicking(false);
    }
  }

  async function handleStartDraft() {
    setStarting(true);
    const res = await fetch(`/api/leagues/${leagueId}/draft/start`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to start draft");
    } else {
      await loadState();
    }
    setStarting(false);
  }

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ufc-bg)" }}>
        <div style={{ color: "var(--ufc-text-3)" }}>Loading draft room…</div>
      </div>
    );
  }

  const { draft, picks, members, availableFighters } = state;
  const draftOrder = (draft?.draftOrder ?? []) as string[];
  const currentPickNumber = draft?.currentPickNumber ?? 0;
  const onClockMembershipId = draftOrder.length > 0 ? getMemberForPick(currentPickNumber, draftOrder) : null;
  const isMyTurn = onClockMembershipId === membershipId;
  const totalPicks = draftOrder.length * 9;

  const filtered = availableFighters.filter((f: any) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const onClockMember = members.find((m: any) => m.membership.id === onClockMembershipId);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ufc-bg)" }}>
      {/* Header */}
      <header className="px-4 h-14 flex items-center justify-between flex-shrink-0"
        style={{ background: "var(--ufc-surface)", borderBottom: "1px solid var(--ufc-border)" }}>
        <span className="font-display font-black text-xl uppercase tracking-wide" style={{ color: "var(--ufc-accent)" }}>
          Draft Room
        </span>
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--ufc-text-2)" }}>
          Pick {Math.min(currentPickNumber + 1, totalPicks)}/{totalPicks}
        </div>
      </header>

      {/* Pre-draft: not started */}
      {draftStatus === "scheduled" && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <TrophyIcon size={48} style={{ color: "var(--ufc-accent)", margin: "0 auto 16px" }} />
            <h2 className="font-display font-bold text-2xl uppercase mb-2">Draft Not Started</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ufc-text-2)" }}>
              {members.length} member{members.length !== 1 ? "s" : ""} in the league.
              {isCommissioner ? " When ready, start the snake draft." : " Waiting for the commissioner to start."}
            </p>
            {isCommissioner && (
              <Button onClick={handleStartDraft} disabled={starting}
                className="font-display font-bold uppercase tracking-wider px-8 py-3"
                style={{ background: "var(--ufc-accent)", color: "var(--ufc-accent-ink)" }}>
                {starting ? "Starting…" : "Start Draft"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Draft complete */}
      {draftStatus === "completed" && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="font-display font-bold text-2xl uppercase mb-2">Draft Complete!</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ufc-text-2)" }}>
              Rosters have been populated. Let the season begin.
            </p>
            <Button onClick={() => router.push(`/leagues/${leagueId}?tab=team`)}
              style={{ background: "var(--ufc-accent)", color: "var(--ufc-accent-ink)" }}
              className="font-display font-bold uppercase tracking-wider">
              View My Team
            </Button>
          </div>
        </div>
      )}

      {/* Active draft */}
      {draftStatus === "in_progress" && (
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-4 gap-4 overflow-hidden">
          {/* On-clock banner */}
          <div className={`rounded-xl p-3 flex items-center justify-between ${isMyTurn ? "card-glow" : ""}`}
            style={{
              background: isMyTurn ? "var(--ufc-accent-wash)" : "var(--ufc-surface)",
              border: `1px solid ${isMyTurn ? "var(--ufc-accent)" : "var(--ufc-border)"}`,
            }}>
            <div>
              <div className="text-xs uppercase tracking-widest mb-0.5" style={{ color: "var(--ufc-text-3)" }}>On the Clock</div>
              <div className="font-display font-bold uppercase text-sm">
                {isMyTurn ? "YOUR PICK" : (onClockMember?.membership.teamName ?? "—")}
              </div>
            </div>
            {timeLeft !== null && (
              <div className="flex items-center gap-1.5">
                <ClockIcon size={14} style={{ color: timeLeft <= 10 ? "var(--ufc-live)" : "var(--ufc-text-2)" }} />
                <span className="font-num text-xl font-bold"
                  style={{ color: timeLeft <= 10 ? "var(--ufc-live)" : "var(--ufc-text)" }}>
                  {timeLeft}s
                </span>
              </div>
            )}
          </div>

          {/* Pick board — recent picks */}
          <div className="ufc-surface rounded-xl p-3 max-h-40 overflow-y-auto">
            <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--ufc-text-3)" }}>
              Recent Picks
            </div>
            {picks.length === 0 && (
              <p className="text-xs" style={{ color: "var(--ufc-text-3)" }}>No picks yet</p>
            )}
            <div className="space-y-1.5">
              {[...picks].reverse().slice(0, 10).map(({ pick, fighter, membership: m }) => (
                <div key={pick.id} className="flex items-center gap-2 text-xs">
                  <span className="font-num w-6 text-right flex-shrink-0" style={{ color: "var(--ufc-text-3)" }}>
                    #{pick.pickNumber + 1}
                  </span>
                  {fighter && <Headshot name={fighter.name} photoUrl={fighter.photoUrl} weightClass={fighter.weightClass} size={20} />}
                  <span className="truncate font-bold" style={{ color: "var(--ufc-text)" }}>{fighter?.name ?? "—"}</span>
                  <span className="truncate flex-shrink-0" style={{ color: "var(--ufc-text-3)" }}>{m.teamName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Available fighters */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="relative mb-2 flex-shrink-0">
              <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ufc-text-3)" }} />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fighters…"
                className="pl-9" style={{ background: "var(--ufc-surface-3)", border: "1px solid var(--ufc-border-2)", color: "var(--ufc-text)" }} />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {filtered.map((f: any) => (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "var(--ufc-surface)", border: "1px solid var(--ufc-border)" }}>
                  <Headshot name={f.name} photoUrl={f.photoUrl} weightClass={f.weightClass} size={38} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-display font-bold text-sm uppercase truncate">{f.name}</span>
                      {f.isChampion && <RankTag isChamp />}
                      {!f.isChampion && f.currentRanking && <RankTag rank={f.currentRanking} />}
                    </div>
                    <DivTag slot={f.weightClass} short />
                  </div>
                  <Button size="sm" onClick={() => handlePick(f.id)}
                    disabled={!isMyTurn || picking}
                    style={{
                      background: isMyTurn ? "var(--ufc-accent)" : "var(--ufc-surface-3)",
                      color: isMyTurn ? "var(--ufc-accent-ink)" : "var(--ufc-text-3)",
                    }}
                    className="font-display font-bold uppercase text-xs flex-shrink-0">
                    {picking ? "…" : "Pick"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
