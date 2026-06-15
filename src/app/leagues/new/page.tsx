"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronLeftIcon } from "@/components/shared/Icons";

export default function NewLeaguePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    teamName: "",
    seasonStartDate: "",
    pickTimerSeconds: "60",
    isPublic: false,
  });

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create league");
      toast.success("League created!");
      router.push(`/leagues/${data.id}?tab=team`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "var(--ufc-surface-3)",
    border: "1px solid var(--ufc-border-2)",
    color: "var(--ufc-text)",
  };
  const labelStyle = { color: "var(--ufc-text-2)" };

  return (
    <div className="min-h-screen" style={{ background: "var(--ufc-bg)" }}>
      <header className="px-4 h-14 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--ufc-border)" }}>
        <Link href="/dashboard" style={{ color: "var(--ufc-text-2)" }}>
          <ChevronLeftIcon size={20} />
        </Link>
        <h1 className="font-display font-bold text-xl uppercase">Create League</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="ufc-surface rounded-xl p-5 space-y-5">
            <h2 className="font-display font-bold uppercase tracking-wide" style={{ color: "var(--ufc-text-2)" }}>
              League Details
            </h2>

            <div className="space-y-1.5">
              <Label style={labelStyle}>League Name</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="The Iron Circle" required style={inputStyle} />
            </div>

            <div className="space-y-1.5">
              <Label style={labelStyle}>Your Team Name</Label>
              <Input value={form.teamName} onChange={(e) => set("teamName", e.target.value)}
                placeholder="Death by Triangle" required style={inputStyle} />
            </div>

            <div className="space-y-1.5">
              <Label style={labelStyle}>Season Start Date</Label>
              <Input type="date" value={form.seasonStartDate} onChange={(e) => set("seasonStartDate", e.target.value)}
                required style={inputStyle} />
              <p className="text-xs" style={{ color: "var(--ufc-text-3)" }}>
                All UFC events on or after this date count toward the season.
              </p>
            </div>
          </div>

          <div className="ufc-surface rounded-xl p-5 space-y-5">
            <h2 className="font-display font-bold uppercase tracking-wide" style={{ color: "var(--ufc-text-2)" }}>
              Draft Settings
            </h2>

            <div className="space-y-1.5">
              <Label style={labelStyle}>Pick Timer (seconds)</Label>
              <select value={form.pickTimerSeconds} onChange={(e) => set("pickTimerSeconds", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ ...inputStyle, outline: "none" }}>
                <option value="30">30 seconds</option>
                <option value="60">60 seconds (recommended)</option>
                <option value="90">90 seconds</option>
                <option value="120">2 minutes</option>
                <option value="300">5 minutes</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="public" checked={form.isPublic} onChange={(e) => set("isPublic", e.target.checked)}
                className="w-4 h-4 rounded" />
              <label htmlFor="public" className="text-sm" style={labelStyle}>
                Public league (visible without invite code)
              </label>
            </div>
          </div>

          <Button type="submit" className="w-full font-display font-bold uppercase tracking-wider py-3" disabled={loading}
            style={{ background: "var(--ufc-accent)", color: "var(--ufc-accent-ink)" }}>
            {loading ? "Creating…" : "Create League"}
          </Button>
        </form>
      </main>
    </div>
  );
}
