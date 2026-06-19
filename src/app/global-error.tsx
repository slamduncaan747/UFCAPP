"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body style={{ margin: 0, background: "#0a0b0d", color: "#f0f2f5", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ textAlign: "center", maxWidth: 340 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontWeight: 800, fontSize: 22, textTransform: "uppercase", marginBottom: 8 }}>Something hiccuped</h2>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              A temporary error occurred. Please try again.
            </p>
            <button onClick={() => reset()} style={{
              background: "#2e8bff", color: "#fff", fontWeight: 700, fontSize: 14,
              padding: "10px 24px", borderRadius: 10, border: "none", cursor: "pointer",
              textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
