import { requireProfile } from "@/lib/auth/session";
import { getMembership, getDraftByLeagueId, getLeagueById } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import { DraftRoom } from "@/components/draft/DraftRoom";
import Link from "next/link";

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = await params;
  const { profile } = await requireProfile();

  const [league, membership] = await Promise.all([
    getLeagueById(leagueId),
    getMembership(leagueId, profile.id),
  ]);

  if (!league) notFound();

  if (!membership) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ufc-bg, #0a0b0d)", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, textTransform: "uppercase", color: "var(--ufc-text, #f0f2f5)", marginBottom: 8 }}>
            Not a Member
          </h2>
          <p style={{ color: "var(--ufc-text-2, #9ca3af)", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            You&apos;re not a member of <strong>{league.name}</strong>. Ask the commissioner for an invite code to join.
          </p>
          <Link href="/dashboard" style={{
            display: "inline-block", background: "var(--ufc-accent, #2e8bff)", color: "#fff",
            fontWeight: 700, fontSize: 14, padding: "10px 24px", borderRadius: 10, textDecoration: "none",
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const draft = await getDraftByLeagueId(leagueId);

  return (
    <DraftRoom
      leagueId={leagueId}
      membershipId={membership.id}
      userId={profile.id}
      displayName={profile.displayName}
      isCommissioner={membership.role === "commissioner"}
      initialDraftStatus={draft?.status ?? "scheduled"}
      autodraftEnabled={membership.autodraftEnabled}
    />
  );
}
