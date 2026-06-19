"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[app error]", error); }, [error]);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ufc-bg, #0a0b0d)", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 380 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, textTransform: "uppercase", color: "var(--ufc-text, #f0f2f5)", marginBottom: 8 }}>
          Something hiccuped
        </h2>
        <p style={{ color: "var(--ufc-text-2, #9ca3af)", fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
          A temporary error occurred. This usually clears up right away — try again.
        </p>

        {(error?.message || error?.digest) && (
          <pre style={{
            textAlign: "left", whiteSpace: "pre-wrap", wordBreak: "break-word",
            background: "var(--ufc-surface, #12141a)", border: "1px solid var(--ufc-border, #2a2d36)",
            borderRadius: 10, padding: "10px 12px", fontSize: 11.5, lineHeight: 1.5,
            color: "var(--ufc-text-3, #6b7280)", marginBottom: 18, maxHeight: 160, overflow: "auto",
          }}>
            {error?.message || "Server error"}{error?.digest ? `\n\ndigest: ${error.digest}` : ""}
          </pre>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={reset} style={{
            background: "var(--ufc-accent, #2e8bff)", color: "#fff", fontWeight: 700, fontSize: 14,
            padding: "10px 24px", borderRadius: 10, border: "none", cursor: "pointer",
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>
            Try Again
          </button>
          <button onClick={() => location.reload()} style={{
            background: "var(--ufc-surface-3, #1a1d26)", color: "var(--ufc-text-2, #9ca3af)", fontWeight: 700, fontSize: 14,
            padding: "10px 24px", borderRadius: 10, border: "1px solid var(--ufc-border, #2a2d36)", cursor: "pointer",
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
