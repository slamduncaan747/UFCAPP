"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/profile/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });

    if (res.ok) {
      router.push("/claim");
    } else {
      toast.error("Failed to set up profile");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--ufc-bg)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display font-black text-4xl uppercase tracking-wide mb-2" style={{ color: "var(--ufc-accent)" }}>
            Welcome
          </h1>
          <p style={{ color: "var(--ufc-text-2)" }}>Set up your Fantasy UFC profile</p>
        </div>

        <form onSubmit={handleComplete} className="ufc-surface rounded-xl p-6 space-y-4">
          <div className="space-y-1.5">
            <Label style={{ color: "var(--ufc-text-2)" }}>Display Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Octagon Overlord" required
              style={{ background: "var(--ufc-surface-3)", border: "1px solid var(--ufc-border-2)", color: "var(--ufc-text)" }} />
          </div>
          <Button type="submit" disabled={loading} className="w-full font-display font-bold uppercase"
            style={{ background: "var(--ufc-accent)", color: "var(--ufc-accent-ink)" }}>
            {loading ? "Setting up…" : "Get Started"}
          </Button>
        </form>
      </div>
    </div>
  );
}
