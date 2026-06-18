"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type Provider = "google" | "apple";

const button: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid var(--border-2)",
  background: "var(--surface-2)",
  color: "var(--text)",
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "var(--font-body)",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.36 12.78c.02 2.5 2.19 3.33 2.21 3.34-.02.05-.35 1.18-1.14 2.35-.69 1.01-1.4 2.02-2.53 2.04-1.1.02-1.46-.65-2.72-.65-1.26 0-1.66.63-2.7.67-1.09.04-1.92-1.09-2.61-2.1-1.42-2.05-2.5-5.8-1.05-8.33.72-1.26 2.01-2.05 3.41-2.07 1.07-.02 2.08.72 2.73.72.66 0 1.88-.89 3.17-.76.54.02 2.05.22 3.02 1.64-.08.05-1.8 1.05-1.78 3.15M14.3 4.93c.58-.7.97-1.67.86-2.64-.83.03-1.84.55-2.44 1.25-.54.62-1 1.6-.88 2.55.92.07 1.87-.47 2.46-1.16" />
    </svg>
  );
}

export default function OAuthButtons() {
  const supabase = createClient();
  const [pending, setPending] = useState<Provider | null>(null);

  async function signIn(provider: Provider) {
    setPending(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      toast.error(error.message);
      setPending(null);
    }
    // On success the browser is redirected to the provider, so no reset needed.
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 8px" }}>
        <div style={{ flex: 1, height: 1, background: "var(--border-2)" }} />
        <span style={{ color: "var(--text-3)", fontSize: 12, fontWeight: 600 }}>OR</span>
        <div style={{ flex: 1, height: 1, background: "var(--border-2)" }} />
      </div>

      <button
        type="button"
        onClick={() => signIn("google")}
        disabled={pending !== null}
        style={{ ...button, opacity: pending && pending !== "google" ? 0.5 : 1 }}
      >
        <GoogleIcon />
        {pending === "google" ? "Redirecting…" : "Continue with Google"}
      </button>

      <button
        type="button"
        onClick={() => signIn("apple")}
        disabled={pending !== null}
        style={{ ...button, opacity: pending && pending !== "apple" ? 0.5 : 1 }}
      >
        <AppleIcon />
        {pending === "apple" ? "Redirecting…" : "Continue with Apple"}
      </button>
    </div>
  );
}
