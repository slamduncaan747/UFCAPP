"use client";

import { useEffect, useState } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    console.error("[app error]", error);
    // Transient serverless/connection blips: silently retry once per 10s window
    // so the user sees a brief flash instead of an error screen.
    try {
      const KEY = "__app_err_retry_at";
      const last = Number(sessionStorage.getItem(KEY) || "0");
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        setRecovering(true);
        const t = setTimeout(() => reset(), 350);
        return () => clearTimeout(t);
      }
    } catch { /* sessionStorage unavailable */ }
  }, [error, reset]);

  if (recovering) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg, #08080b)" }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", border: "3px solid var(--border-2, #2a2d36)", borderTopColor: "var(--accent, #ff3b4e)", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg, #08080b)", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontWeight: 800, fontSize: 22, color: "var(--text, #f4f6fa)", marginBottom: 8 }}>
          Something hiccuped
        </h2>
        <p style={{ color: "var(--text-2, #969eb0)", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
          A temporary error occurred. Tap to try again.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={() => reset()} style={{
            background: "var(--accent, #ff3b4e)", color: "#fff", fontWeight: 700, fontSize: 15,
            padding: "12px 28px", borderRadius: 13, border: "none", cursor: "pointer",
          }}>
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
