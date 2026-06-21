"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronLeftIcon } from "@/components/shared/Icons";
import { Headshot } from "@/components/shared/Headshot";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function SettingsClient({ profile, email }: { profile: any; email: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, timezone }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Profile updated");
      router.refresh();
    } else {
      toast.error("Failed to save");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const inputStyle = { background: "var(--ufc-surface-3)", border: "1px solid var(--ufc-border-2)", color: "var(--ufc-text)" };
  const labelStyle = { color: "var(--ufc-text-2)" };

  return (
    <div className="min-h-screen" style={{ background: "var(--ufc-bg)" }}>
      <header className="px-4 h-14 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--ufc-border)" }}>
        <Link href="/dashboard" style={{ color: "var(--ufc-text-2)" }}>
          <ChevronLeftIcon size={20} />
        </Link>
        <h1 className="font-display font-bold text-xl uppercase">Account Settings</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4 ufc-surface rounded-xl p-5">
          <Headshot name={profile.displayName} photoUrl={profile.avatarUrl} size={56} />
          <div>
            <div className="font-display font-bold uppercase text-lg">{profile.displayName}</div>
            <div className="text-sm" style={{ color: "var(--ufc-text-2)" }}>{email}</div>
          </div>
        </div>

        {/* Profile form */}
        <form onSubmit={handleSave} className="ufc-surface rounded-xl p-5 space-y-4">
          <h2 className="font-display font-bold uppercase tracking-wide" style={{ color: "var(--ufc-text-2)" }}>
            Profile
          </h2>

          <div className="space-y-1.5">
            <Label style={labelStyle}>Display Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required style={inputStyle} />
          </div>

          <div className="space-y-1.5">
            <Label style={labelStyle}>Timezone</Label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ ...inputStyle, outline: "none" }}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          <Button type="submit" disabled={saving} className="w-full font-display font-bold uppercase"
            style={{ background: "var(--ufc-accent)", color: "var(--ufc-accent-ink)" }}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </form>

        {/* Sign out */}
        <div className="ufc-surface rounded-xl p-5">
          <Button onClick={handleSignOut} variant="outline" className="w-full font-display font-bold uppercase"
            style={{ border: "1px solid rgba(255,77,87,0.3)", color: "var(--ufc-live)" }}>
            Sign Out
          </Button>
        </div>
      </main>
    </div>
  );
}
