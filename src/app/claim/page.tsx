"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Team = { id: string; teamName: string };

export default function ClaimPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagueName, setLeagueName] = useState("");
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/claim");
        const data = await res.json();
        if (data.alreadyMember) { router.replace(`/leagues/${data.leagueId}`); return; }
        if (!data.league && !data.leagueId) { router.replace("/dashboard"); return; }
        setLeagueName(data.leagueName ?? "");
        setTeams(data.teams ?? []);
      } finally { setLoading(false); }
    })();
  }, [router]);

  async function claim(team: Team) {
    setClaiming(team.id);
    try {
      const res = await fetch("/api/claim", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId: team.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`You're now ${team.teamName}!`);
      router.replace(`/leagues/${data.leagueId}`);
    } catch (e: any) {
      toast.error(e.message);
      // Refresh the list in case the team was taken.
      const res = await fetch("/api/claim"); const d = await res.json();
      setTeams(d.teams ?? []);
      setClaiming(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "var(--ufc-bg)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="font-display font-black text-3xl uppercase tracking-wide mb-2" style={{ color: "var(--ufc-accent)" }}>
            Which team are you?
          </h1>
          <p style={{ color: "var(--ufc-text-2)", fontSize: 14 }}>
            {leagueName ? `Pick your team in ${leagueName}.` : "Pick your team."} This locks in your roster.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-10" style={{ color: "var(--ufc-text-3)" }}>Loading teams…</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-10" style={{ color: "var(--ufc-text-3)" }}>
            All teams have been claimed. <button onClick={() => router.replace("/dashboard")} style={{ color: "var(--ufc-accent)", background: "none", border: "none", cursor: "pointer" }}>Go to dashboard</button>
          </div>
        ) : (
          <div className="space-y-2">
            {teams.map((t) => (
              <button key={t.id} onClick={() => claim(t)} disabled={!!claiming}
                style={{
                  width: "100%", textAlign: "left", padding: "16px 18px", borderRadius: 12, cursor: "pointer",
                  background: "var(--ufc-surface)", border: "1px solid var(--ufc-border)",
                  color: "var(--ufc-text)", fontWeight: 700, fontSize: 16, opacity: claiming && claiming !== t.id ? 0.5 : 1,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                <span className="font-display uppercase tracking-wide">{t.teamName}</span>
                <span style={{ color: "var(--ufc-accent)", fontSize: 13 }}>{claiming === t.id ? "…" : "Claim →"}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
