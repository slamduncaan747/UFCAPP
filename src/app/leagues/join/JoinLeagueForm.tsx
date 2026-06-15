"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const inputStyle = {
  background: "var(--ufc-surface-3)",
  border: "1px solid var(--ufc-border-2)",
  color: "var(--ufc-text)",
};

export function JoinLeagueForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase(), teamName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to join league");
      toast.success(`Joined ${data.leagueName}!`);
      router.push(`/leagues/${data.leagueId}?tab=team`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleJoin} className="ufc-surface rounded-xl p-5 space-y-5">
      <div className="space-y-1.5">
        <Label style={{ color: "var(--ufc-text-2)" }}>Invite Code</Label>
        <Input
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          placeholder="ABCD1234"
          required
          maxLength={12}
          className="font-num text-xl tracking-widest text-center"
          style={inputStyle}
        />
        <p className="text-xs" style={{ color: "var(--ufc-text-3)" }}>
          Ask your league commissioner for the invite code, or use a join link.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label style={{ color: "var(--ufc-text-2)" }}>Your Team Name</Label>
        <Input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Choke Artist FC"
          required
          style={inputStyle}
        />
      </div>

      <Button
        type="submit"
        className="w-full font-display font-bold uppercase tracking-wider py-3"
        disabled={loading}
        style={{ background: "var(--ufc-accent)", color: "var(--ufc-accent-ink)" }}
      >
        {loading ? "Joining…" : "Join League"}
      </Button>
    </form>
  );
}
