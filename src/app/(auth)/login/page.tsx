"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
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
          Sign in
        </h1>
      </div>

      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
          placeholder="Password"
          required
          autoComplete="current-password"
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
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <div style={{ marginTop: "auto", paddingTop: 32, textAlign: "center" }}>
        <span style={{ color: "var(--text-3)", fontSize: 14 }}>Don't have an account? </span>
        <Link href="/signup" style={{ color: "var(--accent)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
          Sign up
        </Link>
      </div>
    </div>
  );
}
