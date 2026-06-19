"use client";

import { useEffect, useRef, useState, useCallback, useMemo, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Headshot } from "@/components/shared/Headshot";
import { DivTag, RankTag } from "@/components/shared/Tags";
import { SearchIcon, ClockIcon, TrophyIcon, BoltIcon } from "@/components/shared/Icons";
import { toast } from "sonner";
import { getMemberForPick, resolveSlot } from "@/lib/draft/snake";
import { useRouter } from "next/navigation";
import { QueuePanel } from "./QueuePanel";
import { DraftFighterSheet } from "./DraftFighterSheet";

type DraftState = {
  draft: any;
  picks: any[];
  members: any[];
  queue: { fighterId: string; priority: number }[];
  availableFighters: any[];
};

const WEIGHT_CLASSES = ["FLW", "BW", "FW", "LW", "WW", "MW", "LHW", "HW"] as const;
const ROSTER_SLOTS = [...WEIGHT_CLASSES, "WILDCARD"] as const;
const TIMER_OPTIONS = [30, 60, 90, 120, 300];

type MainTab = "pick" | "team" | "board" | "rosters" | "queue";
type SortKey = "score" | "recent" | "record" | "name";

function chipStyle(active: boolean): CSSProperties {
  return {
    padding: "0 12px", height: 32, borderRadius: 9, cursor: "pointer",
    background: active ? "var(--ufc-accent)" : "var(--ufc-surface)",
    border: `1px solid ${active ? "var(--ufc-accent)" : "var(--ufc-border)"}`,
    color: active ? "#fff" : "var(--ufc-text-2)",
    fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5,
    flexShrink: 0, whiteSpace: "nowrap",
  };
}

function winRate(f: any): number {
  const t = (f.recordW ?? 0) + (f.recordL ?? 0) + (f.recordD ?? 0);
  return t > 0 ? (f.recordW ?? 0) / t : 0;
}

// How many picks until this member is on the clock again (0 = right now).
function picksUntil(membershipId: string, currentPick: number, order: string[], totalPicks: number): number | null {
  if (!order.length) return null;
  for (let p = currentPick; p < totalPicks; p++) {
    if (getMemberForPick(p, order) === membershipId) return p - currentPick;
  }
  return null;
}

type Props = {
  leagueId: string;
  membershipId: string;
  userId: string;
  displayName: string;
  isCommissioner: boolean;
  initialDraftStatus: string;
  autodraftEnabled?: boolean;
};

export function DraftRoom({ leagueId, membershipId, isCommissioner, initialDraftStatus, autodraftEnabled: initialAutodraft = false }: Props) {
  const router = useRouter();
  const [state, setState] = useState<DraftState | null>(null);
  const [search, setSearch] = useState("");
  const [picking, setPicking] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [draftStatus, setDraftStatus] = useState(initialDraftStatus);
  const [starting, setStarting] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>("pick");
  const [autodraft, setAutodraft] = useState(initialAutodraft);
  const [autodraftSaving, setAutodraftSaving] = useState(false);
  const [divFilter, setDivFilter] = useState<string | null>(null);
  const [needsOnly, setNeedsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [viewTeamId, setViewTeamId] = useState<string | null>(null);
  const [selectedFighter, setSelectedFighter] = useState<any | null>(null);
  const [connLive, setConnLive] = useState(true);
  const lastPickCountRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef<DraftState | null>(null);
  const tickingRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBeepRef = useRef<number | null>(null);
  const prevTurnRef = useRef(false);
  const supabase = useMemo(() => createClient(), []);

  // Short beep via Web Audio — no asset needed.
  const beep = useCallback((freq = 880) => {
    try {
      const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioCtxRef.current ?? (audioCtxRef.current = new Ctx());
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.17);
    } catch { /* audio blocked — non-critical */ }
  }, []);

  const loadState = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/draft`, { cache: "no-store" });
      if (!res.ok) {
        setState((prev) => prev ?? { draft: null, picks: [], members: [], queue: [], availableFighters: [] });
        return;
      }
      const data = await res.json();
      // Normalize queue rows ({queue,fighter}[]) -> {fighterId,priority}[]
      const queue = (data.queue ?? []).map((q: any) =>
        q?.queue ? { fighterId: q.queue.fighterId, priority: q.queue.priority } : q
      );
      // Announce picks made by other teams since our last sync.
      const picks: any[] = data.picks ?? [];
      const prevCount = lastPickCountRef.current;
      if (prevCount > 0 && picks.length > prevCount) {
        const newest = picks[picks.length - 1];
        if (newest?.fighter && newest.pick.membershipId !== membershipId) {
          toast(`${newest.membership?.teamName ?? "A team"} drafted ${newest.fighter.name}`, { duration: 2500 });
        }
      }
      lastPickCountRef.current = picks.length;
      setState({ ...data, queue });
      setConnLive(true);
      if (data.draft?.status) setDraftStatus(data.draft.status);
    } catch { /* transient — polling/realtime will retry */ }
  }, [leagueId, membershipId]);

  useEffect(() => { stateRef.current = state; }, [state]);

  // Advance the draft when the clock expires or the on-clock member auto-drafts.
  const triggerTick = useCallback(async () => {
    if (tickingRef.current) return;
    tickingRef.current = true;
    try {
      const res = await fetch(`/api/leagues/${leagueId}/draft/tick`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data?.changed) await loadState();
    } catch { /* transient */ } finally {
      tickingRef.current = false;
    }
  }, [leagueId, loadState]);

  useEffect(() => {
    if (draftStatus !== "in_progress") return;
    const interval = setInterval(() => {
      const d = stateRef.current?.draft;
      if (!d || d.status !== "in_progress") return;
      const order = (d.draftOrder ?? []) as string[];
      if (!order.length) return;
      const onClockId = getMemberForPick(d.currentPickNumber, order);
      const onClock = stateRef.current!.members.find((m: any) => m.membership.id === onClockId);
      const autoOn = onClock?.membership.autodraftEnabled ?? false;
      const expired = d.clockExpiresAt ? Date.now() >= new Date(d.clockExpiresAt).getTime() : false;
      if (autoOn || expired) triggerTick();
    }, 2000);
    return () => clearInterval(interval);
  }, [draftStatus, triggerTick]);

  // Realtime + resilient reconnection. We never want a dropped socket to freeze
  // the room, so we also poll on a slow timer and refresh on focus/online.
  useEffect(() => {
    loadState();
    const channel = supabase.channel(`draft:${leagueId}`)
      .on("broadcast", { event: "draft:picked" }, () => loadState())
      .on("broadcast", { event: "draft:started" }, () => { setDraftStatus("in_progress"); loadState(); })
      .on("broadcast", { event: "draft:paused" }, () => { setDraftStatus("paused"); loadState(); })
      .on("broadcast", { event: "draft:resumed" }, () => { setDraftStatus("in_progress"); loadState(); })
      .on("broadcast", { event: "draft:config" }, () => loadState())
      .on("broadcast", { event: "draft:complete" }, () => { setDraftStatus("completed"); loadState(); })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { setConnLive(true); loadState(); }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setConnLive(false);
      });

    const refresh = () => { if (document.visibilityState === "visible") loadState(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    // Safety net poll so the room self-heals even if realtime silently drops.
    const poll = setInterval(loadState, 7000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(poll);
    };
  }, [leagueId, loadState, supabase]);

  // Register push subscription on mount
  useEffect(() => {
    async function registerPush() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      try {
        const res = await fetch("/api/push/subscribe");
        const { vapidPublicKey } = await res.json();
        if (!vapidPublicKey) return;
        const reg = await navigator.serviceWorker.ready;
        if (await reg.pushManager.getSubscription()) return;
        if ((await Notification.requestPermission()) !== "granted") return;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidPublicKey });
        await fetch("/api/push/subscribe", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()),
        });
      } catch { /* push is optional */ }
    }
    registerPush();
  }, []);

  // Clock countdown + final-10s warning beep (only when it's your pick).
  useEffect(() => {
    if (!state?.draft?.clockExpiresAt || draftStatus !== "in_progress") {
      setTimeLeft(null); lastBeepRef.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    const order = (state.draft.draftOrder ?? []) as string[];
    const myTurn = order.length > 0 && getMemberForPick(state.draft.currentPickNumber, order) === membershipId;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(state.draft.clockExpiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      if (myTurn && diff > 0 && diff <= 10 && lastBeepRef.current !== diff) {
        lastBeepRef.current = diff;
        beep();
      }
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state?.draft?.clockExpiresAt, state?.draft?.currentPickNumber, draftStatus, membershipId, beep]);

  // ── Derived draft data ──────────────────────────────────────────────────
  const draft = state?.draft;
  const draftOrder = (draft?.draftOrder ?? []) as string[];
  const currentPickNumber = draft?.currentPickNumber ?? 0;
  const onClockMembershipId = draftOrder.length > 0 ? getMemberForPick(currentPickNumber, draftOrder) : null;
  const isMyTurn = onClockMembershipId === membershipId && draftStatus === "in_progress";

  // Buzz the device + screen when it becomes your turn.
  useEffect(() => {
    if (isMyTurn && !prevTurnRef.current) {
      try { navigator.vibrate?.([180, 90, 180]); } catch { /* unsupported */ }
      beep(660); setTimeout(() => beep(880), 180);
      toast.success("You're on the clock — make your pick!");
    }
    prevTurnRef.current = isMyTurn;
  }, [isMyTurn, beep]);

  // Per-membership roster (slot -> {fighter}) built from picks.
  const rostersByMember = useMemo(() => {
    const map = new Map<string, Map<string, any>>();
    for (const p of state?.picks ?? []) {
      if (!p.pick.fighterId || !p.pick.slot) continue;
      if (!map.has(p.pick.membershipId)) map.set(p.pick.membershipId, new Map());
      map.get(p.pick.membershipId)!.set(p.pick.slot, p.fighter);
    }
    return map;
  }, [state?.picks]);

  const myRoster = rostersByMember.get(membershipId) ?? new Map<string, any>();
  const myUsedSlots = useMemo(() => new Set(myRoster.keys()), [myRoster]);
  const myMissingSlots = ROSTER_SLOTS.filter((s) => !myUsedSlots.has(s));

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ufc-bg)" }}>
        <div style={{ color: "var(--ufc-text-3)" }}>Loading draft room…</div>
      </div>
    );
  }

  const { picks, members, availableFighters } = state;
  const totalPicks = draftOrder.length * 9;
  const onClockMember = members.find((m: any) => m.membership.id === onClockMembershipId);
  const myDistance = !isMyTurn ? picksUntil(membershipId, currentPickNumber, draftOrder, totalPicks) : 0;
  const pickTimerSeconds = draft?.pickTimerSeconds ?? 60;

  async function handlePick(fighterId: string) {
    setPicking(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/draft/pick`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fighterId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Pick failed");
      setSelectedFighter(null);
      if (data.isDraftComplete) {
        toast.success("Draft complete! Rosters populated.");
        // Show the completion screen instead of hard-navigating immediately —
        // draft-end is the most server-stressed moment; let the user tap through
        // when they're ready (the screen has a "View My Team" button).
        setDraftStatus("completed");
        await loadState();
      } else {
        await loadState();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPicking(false);
    }
  }

  async function toggleQueue(f: any) {
    const exists = state!.queue.some((q) => q.fighterId === f.id);
    const next = exists
      ? state!.queue.filter((q) => q.fighterId !== f.id).map((q, i) => ({ ...q, priority: i }))
      : [...state!.queue, { fighterId: f.id, priority: state!.queue.length }];
    setState((prev) => prev ? { ...prev, queue: next } : prev);
    toast.success(exists ? `Removed ${f.name} from queue` : `Queued ${f.name}`);
    try {
      await fetch(`/api/leagues/${leagueId}/draft/queue`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ queue: next }),
      });
    } catch { toast.error("Failed to save queue"); }
  }

  async function handleStartDraft() {
    setStarting(true);
    const res = await fetch(`/api/leagues/${leagueId}/draft/start`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) toast.error(data.error ?? "Failed to start draft");
    else await loadState();
    setStarting(false);
  }

  async function handleTogglePause() {
    setPausing(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/draft/pause`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setDraftStatus(data.status);
      toast.success(data.status === "paused" ? "Draft paused" : "Draft resumed");
      await loadState();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPausing(false);
    }
  }

  async function handleSetTimer(secs: number) {
    const res = await fetch(`/api/leagues/${leagueId}/draft/config`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickTimerSeconds: secs }),
    });
    if (res.ok) await loadState();
    else toast.error("Couldn't update timer");
  }

  async function handleAutodraftToggle() {
    setAutodraftSaving(true);
    const newVal = !autodraft;
    try {
      const res = await fetch(`/api/leagues/${leagueId}/draft/autodraft`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newVal }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setAutodraft(newVal);
      toast.success(newVal ? "Auto-draft ON — we'll pick for you." : "Auto-draft OFF — you're in control.");
    } catch {
      toast.error("Failed to update auto-draft setting");
    } finally {
      setAutodraftSaving(false);
    }
  }

  // ── Pre-draft lobby ──────────────────────────────────────────────────────
  if (draftStatus === "scheduled") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--ufc-bg)" }}>
        <RoomHeader pickLabel={`${members.length} ready`} />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm w-full">
            <TrophyIcon size={48} style={{ color: "var(--ufc-accent)", margin: "0 auto 16px" }} />
            <h2 className="font-display font-bold text-2xl uppercase mb-2">Draft Lobby</h2>
            <p className="text-sm mb-5" style={{ color: "var(--ufc-text-2)" }}>
              {members.length} member{members.length !== 1 ? "s" : ""} ready.
              {isCommissioner ? " When everyone's in, start the snake draft." : " Waiting for the commissioner to start."}
            </p>

            <div className="ufc-surface rounded-xl p-3 mb-4 text-left">
              <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--ufc-text-3)" }}>In the Room</div>
              {members.length === 0 && <p className="text-xs" style={{ color: "var(--ufc-text-3)" }}>No members yet.</p>}
              <div className="space-y-1.5">
                {members.map((m: any) => (
                  <div key={m.membership.id} className="flex items-center gap-2 text-sm">
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ufc-accent)", flexShrink: 0 }} />
                    <span className="truncate font-bold" style={{ color: "var(--ufc-text)" }}>
                      {m.membership.teamName ?? m.profile?.displayName ?? "Team"}
                    </span>
                    {m.membership.id === membershipId && <span style={{ fontSize: 10, color: "var(--ufc-accent)", fontWeight: 700 }}>YOU</span>}
                    {m.membership.role === "commissioner" && <span style={{ fontSize: 10, color: "var(--ufc-text-3)", fontWeight: 700 }}>COMMISH</span>}
                  </div>
                ))}
              </div>
            </div>

            {isCommissioner && draft && (
              <div className="ufc-surface rounded-xl p-3 mb-5 text-left">
                <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--ufc-text-3)" }}>
                  Pick Timer · {draft.pickTimerSeconds}s
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {TIMER_OPTIONS.map((s) => (
                    <button key={s} onClick={() => handleSetTimer(s)} style={chipStyle(draft.pickTimerSeconds === s)}>
                      {s >= 60 ? `${s / 60}m` : `${s}s`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isCommissioner ? (
              <Button onClick={handleStartDraft} disabled={starting || !draft || members.length < 2}
                className="font-display font-bold uppercase tracking-wider px-8 py-3"
                style={{ background: "var(--ufc-accent)", color: "var(--ufc-accent-ink)" }}>
                {starting ? "Starting…" : !draft ? "Draft Not Configured" : members.length < 2 ? "Need 2+ Members" : "Start Draft"}
              </Button>
            ) : (
              <div className="text-sm" style={{ color: "var(--ufc-text-3)" }}>⏳ Hang tight — the draft will begin shortly.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Draft complete ───────────────────────────────────────────────────────
  if (draftStatus === "completed") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--ufc-bg)" }}>
        <RoomHeader pickLabel="Final" />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="font-display font-bold text-2xl uppercase mb-2">Draft Complete!</h2>
            <p className="text-sm mb-6" style={{ color: "var(--ufc-text-2)" }}>Rosters have been populated. Let the season begin.</p>
            <Button onClick={() => router.push(`/leagues/${leagueId}?tab=team`)}
              style={{ background: "var(--ufc-accent)", color: "var(--ufc-accent-ink)" }}
              className="font-display font-bold uppercase tracking-wider">View My Team</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Active / paused draft ────────────────────────────────────────────────
  const isPaused = draftStatus === "paused";

  // Available fighters: filter + sort (all backed by real data now).
  let filtered = availableFighters.filter((f: any) => f.name.toLowerCase().includes(search.toLowerCase()));
  if (divFilter) filtered = filtered.filter((f: any) => f.weightClass === divFilter);
  if (needsOnly) filtered = filtered.filter((f: any) => !myUsedSlots.has(f.weightClass));

  filtered = [...filtered].sort((a: any, b: any) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "record") return winRate(b) - winRate(a) || (b.draftScore ?? 0) - (a.draftScore ?? 0);
    if (sortBy === "recent") {
      const da = a.daysSinceLastFight ?? 99999, dbb = b.daysSinceLastFight ?? 99999;
      return da - dbb || (b.draftScore ?? 0) - (a.draftScore ?? 0);
    }
    return (b.draftScore ?? 0) - (a.draftScore ?? 0); // score
  });

  const TABS: { key: MainTab; label: string }[] = [
    { key: "pick", label: "Pick" },
    { key: "team", label: `My Team ${9 - myMissingSlots.length}/9` },
    { key: "board", label: "Board" },
    { key: "rosters", label: "Rosters" },
    { key: "queue", label: `Queue ${state.queue.length}` },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ufc-bg)" }}>
      <RoomHeader pickLabel={`Pick ${Math.min(currentPickNumber + 1, totalPicks)}/${totalPicks}`} live={connLive} />

      {/* Paused overlay banner */}
      {isPaused && (
        <div className="px-4 py-2 flex items-center justify-between" style={{ background: "var(--ufc-accent-wash)", borderBottom: "1px solid var(--ufc-accent)" }}>
          <span className="font-display font-bold uppercase text-sm" style={{ color: "var(--ufc-accent)" }}>⏸ Draft Paused</span>
          {isCommissioner && (
            <Button size="sm" onClick={handleTogglePause} disabled={pausing}
              style={{ background: "var(--ufc-accent)", color: "var(--ufc-accent-ink)" }}
              className="font-display font-bold uppercase text-xs">Resume</Button>
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-4 gap-3 overflow-hidden">
        {/* On-clock banner */}
        <div className={`rounded-xl p-3 flex items-center justify-between ${isMyTurn ? "card-glow turn-buzz" : ""} ${isMyTurn && timeLeft !== null && timeLeft <= 10 ? "clock-warn" : ""}`}
          style={{
            background: isMyTurn ? "var(--ufc-accent-wash)" : "var(--ufc-surface)",
            border: `1px solid ${isMyTurn ? "var(--ufc-accent)" : "var(--ufc-border)"}`,
          }}>
          <div style={{ minWidth: 0 }}>
            <div className="text-xs uppercase tracking-widest mb-0.5" style={{ color: "var(--ufc-text-3)" }}>On the Clock</div>
            <div className="font-display font-bold uppercase text-sm truncate">
              {isMyTurn ? "YOUR PICK" : (onClockMember?.membership.teamName ?? "—")}
            </div>
            {isMyTurn && autodraft && <div style={{ fontSize: 11, color: "var(--ufc-accent)", marginTop: 2 }}>Auto-draft will pick for you</div>}
            {!isMyTurn && myDistance != null && !isPaused && (
              <div style={{ fontSize: 11, color: "var(--ufc-text-3)", marginTop: 2 }}>
                {myDistance === 1 ? "You're up next" : `${myDistance} picks until you · ~${Math.round((myDistance * pickTimerSeconds) / 60)}m`}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {timeLeft !== null && !isPaused && (
              <div className="flex items-center gap-1.5">
                <ClockIcon size={14} style={{ color: timeLeft <= 10 ? "var(--ufc-live)" : "var(--ufc-text-2)" }} />
                <span className="font-num text-xl font-bold" style={{ color: timeLeft <= 10 ? "var(--ufc-live)" : "var(--ufc-text)" }}>{timeLeft}s</span>
              </div>
            )}
            {isCommissioner && (
              <button onClick={handleTogglePause} disabled={pausing} title={isPaused ? "Resume draft" : "Pause draft"}
                style={{ padding: "5px 9px", borderRadius: 8, background: "var(--ufc-surface-3)", border: "1px solid var(--ufc-border)", color: "var(--ufc-text-2)", cursor: "pointer", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {isPaused ? "▶" : "⏸"}
              </button>
            )}
            <button onClick={handleAutodraftToggle} disabled={autodraftSaving} title={autodraft ? "Disable auto-draft" : "Enable auto-draft"}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8,
                background: autodraft ? "var(--ufc-accent)" : "var(--ufc-surface-3)",
                border: `1px solid ${autodraft ? "var(--ufc-accent)" : "var(--ufc-border)"}`,
                color: autodraft ? "#fff" : "var(--ufc-text-2)", cursor: "pointer", fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0,
              }}>
              <BoltIcon size={12} /> Auto
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", flexShrink: 0, paddingBottom: 2 }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              flex: "1 0 auto", padding: "8px 12px", borderRadius: 9, cursor: "pointer",
              background: activeTab === t.key ? "var(--ufc-accent)" : "var(--ufc-surface)",
              border: `1px solid ${activeTab === t.key ? "var(--ufc-accent)" : "var(--ufc-border)"}`,
              color: activeTab === t.key ? "#fff" : "var(--ufc-text-2)",
              fontWeight: 700, fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── PICK TAB ── */}
        {activeTab === "pick" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Best-available quick pick — only when you're on the clock */}
            {isMyTurn && (() => {
              const best = availableFighters[0];
              const need = availableFighters.find((f: any) => !myUsedSlots.has(f.weightClass));
              const rec = need ?? best;
              if (!rec) return null;
              return (
                <div className="rounded-xl p-3 mb-2 flex items-center gap-3" style={{ background: "var(--ufc-accent-wash)", border: "1px solid var(--ufc-accent)" }}>
                  <Headshot name={rec.name} photoUrl={rec.photoUrl} weightClass={rec.weightClass} size={36} />
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ufc-accent)" }}>
                      {need ? `Best ${rec.weightClass} (fills need)` : "Best available"}
                    </div>
                    <div className="font-display font-bold text-sm uppercase truncate" style={{ color: "var(--ufc-text)" }}>{rec.name}</div>
                  </div>
                  <Button size="sm" onClick={() => handlePick(rec.id)} disabled={picking}
                    style={{ background: "var(--ufc-accent)", color: "var(--ufc-accent-ink)" }}
                    className="font-display font-bold uppercase text-xs flex-shrink-0">{picking ? "…" : "Draft"}</Button>
                </div>
              );
            })()}

            {/* Roster-need strip */}
            {myMissingSlots.length > 0 && (
              <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 8, flexShrink: 0, overflowX: "auto" }}>
                <span style={{ fontSize: 10, color: "var(--ufc-text-3)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, flexShrink: 0 }}>Need</span>
                {myMissingSlots.map((s) => (
                  <button key={s} onClick={() => { setDivFilter(s === "WILDCARD" ? null : s); setNeedsOnly(s !== "WILDCARD"); }}
                    style={{ ...chipStyle(divFilter === s), height: 26, fontSize: 10 }}>{s}</button>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexShrink: 0 }}>
              <div className="relative flex-1">
                <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ufc-text-3)" }} />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fighters…"
                  className="pl-9" style={{ background: "var(--ufc-surface-3)", border: "1px solid var(--ufc-border-2)", color: "var(--ufc-text)" }} />
              </div>
              <button onClick={() => setNeedsOnly(!needsOnly)} style={chipStyle(needsOnly)} title="Only fighters that fill an open slot">Fills Need</button>
            </div>

            <div style={{ display: "flex", gap: 5, marginBottom: 8, overflowX: "auto", flexShrink: 0, paddingBottom: 2 }}>
              <button onClick={() => setDivFilter(null)} style={chipStyle(divFilter === null)}>All</button>
              {WEIGHT_CLASSES.map((wc) => (
                <button key={wc} onClick={() => setDivFilter(divFilter === wc ? null : wc)} style={chipStyle(divFilter === wc)}>{wc}</button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 5, marginBottom: 8, alignItems: "center", flexShrink: 0, overflowX: "auto", paddingBottom: 2 }}>
              <span style={{ fontSize: 10, color: "var(--ufc-text-3)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, flexShrink: 0 }}>Sort</span>
              {([["score", "★ Score"], ["recent", "⏱ Recent"], ["record", "✓ Record"], ["name", "A–Z"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setSortBy(key)} style={chipStyle(sortBy === key)}>{label}</button>
              ))}
            </div>

            {filtered.length === 0 && <p style={{ fontSize: 12, color: "var(--ufc-text-3)", padding: "12px 2px" }}>No fighters match these filters.</p>}

            <div className="flex-1 overflow-y-auto space-y-1.5">
              {filtered.slice(0, 150).map((f: any) => {
                const slot = resolveSlot(f.weightClass, myUsedSlots);
                const fillsNeed = slot === f.weightClass;
                return (
                  <div key={f.id} onClick={() => setSelectedFighter(f)} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "var(--ufc-surface)", border: `1px solid ${fillsNeed && isMyTurn ? "var(--ufc-accent)" : "var(--ufc-border)"}`, cursor: "pointer" }}>
                    <Headshot name={f.name} photoUrl={f.photoUrl} weightClass={f.weightClass} size={38} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-display font-bold text-sm uppercase truncate">{f.name}</span>
                        {f.isChampion && <RankTag isChamp />}
                        {!f.isChampion && f.currentRanking && <RankTag rank={f.currentRanking} />}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <DivTag slot={f.weightClass} short />
                        <span style={{ fontSize: 10, color: "var(--ufc-text-3)" }}>{f.recordW}-{f.recordL}{f.recordD ? `-${f.recordD}` : ""}</span>
                        {f.draftScore != null && <span style={{ fontSize: 10, color: "var(--ufc-text-3)" }}>★ {f.draftScore}</span>}
                        {f.daysSinceLastFight != null && (
                          <span style={{ fontSize: 10, color: "var(--ufc-text-3)" }}>⏱ {fmtDays(f.daysSinceLastFight)}</span>
                        )}
                        {!slot && <span style={{ fontSize: 10, color: "var(--ufc-live)", fontWeight: 700 }}>Slot full</span>}
                        {slot === "WILDCARD" && <span style={{ fontSize: 10, color: "var(--ufc-text-3)" }}>→ WC</span>}
                      </div>
                    </div>
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); handlePick(f.id); }} disabled={!isMyTurn || picking || !slot}
                      style={{
                        background: isMyTurn && slot ? "var(--ufc-accent)" : "var(--ufc-surface-3)",
                        color: isMyTurn && slot ? "var(--ufc-accent-ink)" : "var(--ufc-text-3)",
                      }}
                      className="font-display font-bold uppercase text-xs flex-shrink-0">{picking ? "…" : "Pick"}</Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MY TEAM TAB ── */}
        {activeTab === "team" && (
          <div className="flex-1 overflow-y-auto">
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <StatBox label="Drafted" value={`${9 - myMissingSlots.length}/9`} />
              <StatBox label="Open Slots" value={`${myMissingSlots.length}`} />
            </div>
            <RosterGrid roster={myRoster} onSelect={setSelectedFighter} />
          </div>
        )}

        {/* ── BOARD TAB ── */}
        {activeTab === "board" && (
          <div className="flex-1 overflow-auto">
            <DraftBoard draftOrder={draftOrder} members={members} picks={picks}
              currentPickNumber={currentPickNumber} myId={membershipId} />
          </div>
        )}

        {/* ── ROSTERS TAB ── */}
        {activeTab === "rosters" && (
          <div className="flex-1 overflow-y-auto">
            {/* Live power ranking — cumulative draft score per team */}
            <PowerRanking members={members} rostersByMember={rostersByMember} myId={membershipId}
              onSelect={(id) => setViewTeamId(id)} selected={viewTeamId ?? membershipId} />
            <div style={{ display: "flex", gap: 5, margin: "12px 0", overflowX: "auto", paddingBottom: 2 }}>
              {members.map((m: any) => {
                const id = m.membership.id;
                const active = (viewTeamId ?? membershipId) === id;
                return (
                  <button key={id} onClick={() => setViewTeamId(id)} style={{ ...chipStyle(active), height: 30 }}>
                    {m.membership.teamName ?? m.profile?.displayName ?? "Team"}
                    {id === membershipId ? " (You)" : ""}
                  </button>
                );
              })}
            </div>
            <RosterGrid roster={rostersByMember.get(viewTeamId ?? membershipId) ?? new Map()} onSelect={setSelectedFighter} />
          </div>
        )}

        {/* ── QUEUE TAB ── */}
        {activeTab === "queue" && (
          <div className="flex-1 overflow-y-auto">
            <p style={{ fontSize: 12, color: "var(--ufc-text-3)", marginBottom: 10 }}>
              Build your priority queue. If you&apos;re AFK or auto-draft is on, we&apos;ll pick the first available fighter here.
            </p>
            <QueuePanel leagueId={leagueId} queue={state.queue} fighters={availableFighters}
              onQueueChange={(q) => setState((prev) => prev ? { ...prev, queue: q } : prev)} />
          </div>
        )}
      </div>

      <DraftFighterSheet
        fighter={selectedFighter}
        onClose={() => setSelectedFighter(null)}
        canPick={isMyTurn && !!selectedFighter && !!resolveSlot(selectedFighter.weightClass, myUsedSlots)}
        picking={picking}
        onPick={handlePick}
        inQueue={!!selectedFighter && state.queue.some((q) => q.fighterId === selectedFighter.id)}
        onToggleQueue={toggleQueue}
        slotNote={selectedFighter ? (() => {
          const s = resolveSlot(selectedFighter.weightClass, myUsedSlots);
          if (!s) return `Your ${selectedFighter.weightClass} and Wildcard slots are full.`;
          if (s === "WILDCARD") return "Would fill your Wildcard slot.";
          return `Fills your open ${selectedFighter.weightClass} slot.`;
        })() : null}
      />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function RoomHeader({ pickLabel, live }: { pickLabel: string; live?: boolean }) {
  return (
    <header className="px-4 h-14 flex items-center justify-between flex-shrink-0"
      style={{ background: "var(--ufc-surface)", borderBottom: "1px solid var(--ufc-border)" }}>
      <span className="font-display font-black text-xl uppercase tracking-wide" style={{ color: "var(--ufc-accent)" }}>Draft Room</span>
      <div className="flex items-center gap-2.5 text-sm" style={{ color: "var(--ufc-text-2)" }}>
        {live !== undefined && (
          <span title={live ? "Connected" : "Reconnecting…"} style={{
            display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 0.5, color: live ? "var(--ufc-win)" : "var(--ufc-gold)",
          }}>
            <span className={live ? "live-dot" : ""} style={{ width: 6, height: 6, borderRadius: "50%", background: live ? "var(--ufc-win)" : "var(--ufc-gold)", display: "inline-block" }} />
            {live ? "Live" : "Reconnecting"}
          </span>
        )}
        {pickLabel}
      </div>
    </header>
  );
}

function PowerRanking({ members, rostersByMember, myId, selected, onSelect }: {
  members: any[]; rostersByMember: Map<string, Map<string, any>>; myId: string;
  selected: string; onSelect: (id: string) => void;
}) {
  const rows = members.map((m: any) => {
    const id = m.membership.id;
    const roster = rostersByMember.get(id);
    let score = 0, count = 0;
    if (roster) for (const f of roster.values()) { score += f.draftScore ?? 0; count++; }
    return { id, name: m.membership.teamName ?? m.profile?.displayName ?? "Team", score: Math.round(score * 10) / 10, count };
  }).sort((a, b) => b.score - a.score);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--ufc-text-3)", marginBottom: 2 }}>Power Ranking · by draft value</div>
      {rows.map((r, i) => (
        <button key={r.id} onClick={() => onSelect(r.id)} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 9, textAlign: "left", cursor: "pointer",
          background: selected === r.id ? "var(--ufc-accent-wash)" : "var(--ufc-surface)",
          border: `1px solid ${selected === r.id ? "var(--ufc-accent)" : "var(--ufc-border)"}`,
        }}>
          <span className="font-num" style={{ width: 18, fontSize: 12, fontWeight: 800, color: i === 0 ? "var(--ufc-gold)" : "var(--ufc-text-3)" }}>{i + 1}</span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: r.id === myId ? "var(--ufc-accent)" : "var(--ufc-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.name}{r.id === myId ? " · You" : ""}
          </span>
          <span style={{ fontSize: 11, color: "var(--ufc-text-3)" }}>{r.count} pk</span>
          <span className="font-num" style={{ fontSize: 14, fontWeight: 800, color: "var(--ufc-text)" }}>{r.score}</span>
        </button>
      ))}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: "var(--ufc-surface)", border: "1px solid var(--ufc-border)", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ufc-text-3)", fontWeight: 700 }}>{label}</div>
      <div className="font-num" style={{ fontSize: 22, fontWeight: 800, color: "var(--ufc-text)" }}>{value}</div>
    </div>
  );
}

function RosterGrid({ roster, onSelect }: { roster: Map<string, any>; onSelect?: (f: any) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {ROSTER_SLOTS.map((slot) => {
        const f = roster.get(slot);
        return (
          <div key={slot} onClick={() => f && onSelect?.(f)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
            background: f ? "var(--ufc-surface)" : "transparent",
            border: `1px dashed ${f ? "transparent" : "var(--ufc-border-2)"}`,
            borderRadius: 10, minHeight: 52, cursor: f && onSelect ? "pointer" : "default",
            borderStyle: f ? "solid" : "dashed",
          }}>
            <span style={{ width: 54, fontSize: 11, fontWeight: 800, color: "var(--ufc-text-3)", textTransform: "uppercase", flexShrink: 0 }}>{slot}</span>
            {f ? (
              <>
                <Headshot name={f.name} photoUrl={f.photoUrl} weightClass={f.weightClass} size={32} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ufc-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <DivTag slot={f.weightClass} short />
                    {f.draftScore != null && <span style={{ fontSize: 10, color: "var(--ufc-text-3)" }}>★ {f.draftScore}</span>}
                  </div>
                </div>
              </>
            ) : (
              <span style={{ fontSize: 12, color: "var(--ufc-text-3)", fontStyle: "italic" }}>Open — needs a fighter</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DraftBoard({ draftOrder, members, picks, currentPickNumber, myId }: {
  draftOrder: string[]; members: any[]; picks: any[];
  currentPickNumber: number; myId: string;
}) {
  const teamName = (id: string) => {
    const m = members.find((x: any) => x.membership.id === id);
    return m?.membership.teamName ?? m?.profile?.displayName ?? "Team";
  };
  // pickNumber -> {fighter, isAutopick}
  const byNum = new Map<number, any>();
  for (const p of picks) byNum.set(p.pick.pickNumber, p);
  const rounds = 9;
  const N = draftOrder.length || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: rounds }, (_, r) => {
        const roundNum = r + 1;
        // Snake: even round index (0-based) keeps order, odd reverses.
        const seq = r % 2 === 0 ? draftOrder : [...draftOrder].slice().reverse();
        return (
          <div key={r}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--ufc-text-3)", marginBottom: 5 }}>
              Round {roundNum}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {seq.map((mid, i) => {
                const pickNum = r * N + i;
                const entry = byNum.get(pickNum);
                const isCurrent = pickNum === currentPickNumber;
                const mine = mid === myId;
                return (
                  <div key={mid} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8,
                    background: isCurrent ? "var(--ufc-accent-wash)" : "var(--ufc-surface)",
                    border: `1px solid ${isCurrent ? "var(--ufc-accent)" : mine ? "var(--ufc-border-2)" : "var(--ufc-border)"}`,
                  }}>
                    <span className="font-num" style={{ width: 28, fontSize: 11, color: "var(--ufc-text-3)", flexShrink: 0 }}>{pickNum + 1}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: mine ? "var(--ufc-accent)" : "var(--ufc-text-2)", width: 84, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {teamName(mid)}{mine ? " ·You" : ""}
                    </span>
                    {entry?.fighter ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ufc-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.fighter.name}{entry.pick.isAutopick ? " ·AUTO" : ""}
                      </span>
                    ) : isCurrent ? (
                      <span style={{ fontSize: 11, color: "var(--ufc-accent)", fontWeight: 700 }}>● On the clock</span>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--ufc-text-3)" }}>—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function fmtDays(d: number): string {
  if (d < 60) return `${d}d`;
  if (d < 365) return `${Math.round(d / 30)}mo`;
  return `${(d / 365).toFixed(1)}y`;
}
