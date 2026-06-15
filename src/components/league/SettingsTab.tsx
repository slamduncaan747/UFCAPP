"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ShieldIcon, ClockIcon, UsersIcon } from "@/components/shared/Icons";

type Props = { league: any; membership: any; memberCount: number };

export function SettingsTab({ league, membership, memberCount }: Props) {
  const router = useRouter();
  const isCommissioner = membership.role === "commissioner";
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/leagues/join?code=${league.inviteCode}`
    : `/leagues/join?code=${league.inviteCode}`;

  function copyCode() {
    navigator.clipboard.writeText(league.inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  async function shareLink() {
    const url = `${window.location.origin}/leagues/join?code=${league.inviteCode}`;
    const shareData = {
      title: `Join ${league.name} on Fantasy UFC`,
      text: `I'm playing Fantasy UFC — draft fighters, score real points. Join my league: ${league.name}`,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }

  async function startDraft() {
    const res = await fetch(`/api/leagues/${league.id}/draft/start`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to start draft");
      return;
    }
    toast.success("Draft started!");
    router.push(`/leagues/${league.id}/draft`);
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display font-bold text-xl uppercase tracking-wide">Settings</h2>

      {/* Invite section */}
      <div className="card-premium p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldIcon size={15} style={{ color: "var(--accent)" }} />
            <span className="font-display font-bold uppercase text-sm tracking-wide" style={{ color: "var(--text)" }}>
              Invite Friends
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-display font-semibold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
            <UsersIcon size={13} />
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </div>
        </div>

        {/* Code display */}
        <div className="flex items-center gap-3">
          <div
            className="flex-1 font-num text-2xl font-bold text-center py-3 rounded-xl"
            style={{ background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--text)", letterSpacing: "0.18em" }}
          >
            {league.inviteCode}
          </div>
          <Button onClick={copyCode} variant="outline" className="flex-shrink-0 font-display font-bold uppercase text-xs"
            style={{ border: "1px solid var(--border-2)", color: "var(--text-2)", background: "var(--surface-2)", borderRadius: 12 }}>
            {codeCopied ? "Copied!" : "Copy"}
          </Button>
        </div>

        {/* Share link button — primary CTA */}
        <Button
          onClick={shareLink}
          className="btn-primary w-full font-display font-bold uppercase tracking-wide"
          style={{ borderRadius: 12 }}
        >
          {linkCopied ? "Link Copied!" : "Share Join Link"}
        </Button>

        <p className="text-xs text-center" style={{ color: "var(--text-3)" }}>
          Anyone with the link can join your league directly — no manual code entry needed.
        </p>
      </div>

      {/* Draft controls (commissioner only, setup status) */}
      {isCommissioner && league.status === "setup" && (
        <div className="card-premium p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <ClockIcon size={15} style={{ color: "var(--accent)" }} />
            <span className="font-display font-bold uppercase text-sm tracking-wide" style={{ color: "var(--text)" }}>
              Draft
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>
            When all members have joined, start the snake draft. Each team gets {league.pickTimerSeconds ?? 60}s per pick (autopick on timeout).
          </p>
          <Button onClick={startDraft} className="btn-primary w-full font-display font-bold uppercase tracking-wide"
            style={{ borderRadius: 12 }}>
            Start Draft Now
          </Button>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            Or go to{" "}
            <a href={`/leagues/${league.id}/draft`} style={{ color: "var(--accent)", fontWeight: 600 }}>
              the draft room
            </a>{" "}
            first to check the board.
          </p>
        </div>
      )}

      {/* League info */}
      <div className="card-premium p-5 space-y-3">
        <span className="font-display font-bold uppercase text-sm tracking-wide" style={{ color: "var(--text)" }}>
          League Info
        </span>
        <div className="space-y-1 text-sm">
          {[
            { label: "League name", value: league.name },
            { label: "Status", value: league.status },
            { label: "Season start", value: league.seasonStartDate },
            { label: "Your role", value: membership.role },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-3)" }}>{label}</span>
              <span className="font-display font-semibold capitalize" style={{ color: "var(--text)", letterSpacing: 0.2 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
