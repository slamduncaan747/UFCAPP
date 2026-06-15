import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{
      position: "relative",
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      paddingTop: "max(48px, env(safe-area-inset-top))",
      paddingBottom: "max(40px, env(safe-area-inset-bottom))",
      paddingLeft: "max(24px, env(safe-area-inset-left))",
      paddingRight: "max(24px, env(safe-area-inset-right))",
    }}>

      {/* Ambient glows */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background:
          "radial-gradient(620px 420px at 20% 12%, rgba(255,59,78,0.18), transparent 65%)," +
          "radial-gradient(560px 420px at 92% 78%, rgba(255,122,60,0.12), transparent 60%)",
      }} />

      {/* Wordmark */}
      <div style={{ position: "relative", marginBottom: "auto" }}>
        <div className="font-display" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: "var(--accent)",
          marginBottom: 10,
        }}>
          <span style={{ width: 18, height: 2, borderRadius: 2, background: "var(--grad-primary)" }} />
          Fantasy
        </div>
        <div className="font-hero" style={{
          fontSize: "clamp(64px, 19vw, 104px)",
          lineHeight: 0.86,
          letterSpacing: -1,
          color: "var(--text)",
          textTransform: "uppercase",
        }}>
          Fantasy<br />
          <span className="grad-text">UFC</span>
        </div>
      </div>

      {/* Center content */}
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: 40 }}>
        <p style={{
          fontSize: 21,
          fontWeight: 600,
          lineHeight: 1.45,
          color: "var(--text-2)",
          marginBottom: 36,
          maxWidth: 300,
        }}>
          Draft UFC fighters. Score points every fight night.{" "}
          <span style={{ color: "var(--text)" }}>Best roster wins the season.</span>
        </p>

        {/* Quick feature row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {[
            { k: "Draft", v: "Snake" },
            { k: "Divisions", v: "9 Slots" },
            { k: "Scoring", v: "Live" },
          ].map((f) => (
            <div key={f.k} className="card-premium" style={{ flex: 1, padding: "12px 10px", textAlign: "center", borderRadius: 14 }}>
              <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", textTransform: "uppercase" }}>{f.v}</div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-3)", marginTop: 2 }}>{f.k}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/signup" className="btn-primary font-display" style={{
            display: "block",
            padding: "17px 24px",
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            textAlign: "center",
            textDecoration: "none",
          }}>
            Create Account
          </Link>
          <Link href="/login" className="font-display" style={{
            display: "block",
            padding: "16px 24px",
            borderRadius: 16,
            background: "var(--surface)",
            border: "1px solid var(--border-2)",
            color: "var(--text)",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            textAlign: "center",
            textDecoration: "none",
          }}>
            Sign In
          </Link>
        </div>
      </div>

      {/* Bottom link */}
      <div style={{ position: "relative", textAlign: "center" }}>
        <Link href="/leagues/join" style={{
          fontSize: 14,
          color: "var(--text-3)",
          textDecoration: "none",
          fontWeight: 500,
        }}>
          Have an invite code? <span style={{ color: "var(--text-2)" }}>Join a league →</span>
        </Link>
      </div>
    </div>
  );
}
