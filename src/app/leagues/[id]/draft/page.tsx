import { requireProfile } from "@/lib/auth/session";
import { getMembership, getDraftByLeagueId, getLeagueById } from "@/lib/db/queries";
import { redirect, notFound } from "next/navigation";
import { DraftRoom } from "@/components/draft/DraftRoom";

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = await params;
  const { profile } = await requireProfile();

  const [league, membership] = await Promise.all([
    getLeagueById(leagueId),
    getMembership(leagueId, profile.id),
  ]);

  if (!league) notFound();
  if (!membership) redirect("/dashboard");

  const draft = await getDraftByLeagueId(leagueId);

  return (
    <DraftRoom
      leagueId={leagueId}
      membershipId={membership.id}
      userId={profile.id}
      displayName={profile.displayName}
      isCommissioner={membership.role === "commissioner"}
      initialDraftStatus={draft?.status ?? "scheduled"}
    />
  );
}
