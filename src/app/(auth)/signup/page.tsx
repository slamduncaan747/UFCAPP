"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const field: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid var(--border-2)",
  background: "var(--surface-2)",
  color: "var(--text)",
  fontSize: 16,
  fontFamily: "var(--font-body)",
  outline: "none",
  WebkitAppearance: "none",
};

export default function SignupPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px max(24px,env(safe-area-inset-right)) 24px max(24px,env(safe-area-inset-left))",
        background: "var(--bg)",
        textAlign: "center",
        gap: 16,
      }}>
        <div style={{ fontSize: 48 }}>✉️</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>Check your email</h2>
        <p style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.5, maxWidth: 300, margin: 0 }}>
          We sent a confirmation link to <strong style={{ color: "var(--text)" }}>{email}</strong>
        </p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      padding: "max(48px,env(safe-area-inset-top)) 24px max(32px,env(safe-area-inset-bottom))",
      background: "var(--bg)",
    }}>
      <Link href="/" style={{ color: "var(--text-3)", fontSize: 14, fontWeight: 500, marginBottom: 40, textDecoration: "none" }}>
        ← Back
      </Link>

      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--accent)", marginBottom: 6 }}>
          Fantasy UFC
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5, color: "var(--text)", margin: 0 }}>
          Create account
        </h1>
      </div>

      <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          required
          autoComplete="name"
          style={field}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          autoComplete="email"
          style={field}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (8+ characters)"
          minLength={8}
          required
          autoComplete="new-password"
          style={field}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8,
            padding: "16px",
            borderRadius: 14,
            background: "var(--accent)",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            fontFamily: "var(--font-body)",
          }}
        >
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <div style={{ marginTop: "auto", paddingTop: 32, textAlign: "center" }}>
        <span style={{ color: "var(--text-3)", fontSize: 14 }}>Already have an account? </span>
        <Link href="/login" style={{ color: "var(--accent)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          Sign in
        </Link>
      </div>
    </div>
  );
}
