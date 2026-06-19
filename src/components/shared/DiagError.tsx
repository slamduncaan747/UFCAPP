// Temporary diagnostic: surfaces a server-side error message + stack in the UI.
// Production strips Server Component error messages, so we render our own.
export function DiagError({ where, error }: { where: string; error: unknown }) {
  const e = error as any;
  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 13, color: "#ff5b6e", marginBottom: 8 }}>
        Error in {where}
      </div>
      <pre style={{
        whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11.5, lineHeight: 1.5,
        background: "#12141a", border: "1px solid #2a2d36", borderRadius: 10, padding: "10px 12px",
        color: "#cbd2dc", maxHeight: 320, overflow: "auto",
      }}>
        {String(e?.message ?? e ?? "unknown")}
        {e?.code ? `\n\ncode: ${e.code}` : ""}
        {e?.stack ? `\n\n${e.stack}` : ""}
      </pre>
    </div>
  );
}
