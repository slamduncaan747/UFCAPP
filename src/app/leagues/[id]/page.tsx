import { requireProfile } from "@/lib/auth/session";
import {
  getLeagueById, getMembership, getLeagueMembers, getStandings, getDraftByLeagueId,
} from "@/lib/db/queries";
import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";
import { TeamTab } from "@/components/league/TeamTab";
import { StandingsTab } from "@/components/league/StandingsTab";
import { ActivityTab } from "@/components/league/ActivityTab";
import { MarketplaceTab } from "@/components/league/MarketplaceTab";
import { FightsTab } from "@/components/league/FightsTab";
import { SettingsTab } from "@/components/league/SettingsTab";
import { ScoresTab } from "@/components/league/ScoresTab";
import { DraftBanner } from "@/components/league/DraftBanner";
import { DiagError } from "@/components/shared/DiagError";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

// Next signals redirect()/notFound() by throwing — never swallow those.
function isControlFlow(e: any): boolean {
  const d = e?.digest;
  return typeof d === "string" && (d.startsWith("NEXT_REDIRECT") || d === "NEXT_NOT_FOUND" || d.startsWith("NEXT_HTTP"));
}

export default async function LeaguePage(props: PageProps) {
  try {
    return await LeaguePageInner(props);
  } catch (error) {
    if (isControlFlow(error)) throw error;
    return <DiagError where="LeaguePage" error={error} />;
  }
}

async function LeaguePageInner({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab = "team" } = await searchParams;
  const { profile } = await requireProfile();

  const [league, membership] = await Promise.all([
    getLeagueById(id),
    getMembership(id, profile.id),
  ]);

  if (!league) notFound();
  if (!membership) redirect("/dashboard");

  const [standings, members, draft] = await Promise.all([
    getStandings(id),
    getLeagueMembers(id),
    getDraftByLeagueId(id),
  ]);
  const myStanding = standings.find((s) => s.userId === profile.id);
  const teamPoints = myStanding?.totalPoints ?? 0;

  return (
    <div style={{ minHeight: "100dvh" }}>
      <AppHeader
        leagueName={league.name}
        teamName={membership.teamName}
        teamPoints={teamPoints}
        leagueId={id}
      />

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px", paddingBottom: "calc(var(--nav-h) + var(--sab) + 16px)" }}>
        <DraftBanner
          leagueId={id}
          leagueStatus={league.status}
          draftStatus={draft?.status ?? null}
          currentPickNumber={draft?.currentPickNumber ?? 0}
          totalPicks={members.length * 9}
          isCommissioner={membership.role === "commissioner"}
        />
        {tab === "team" && (
          <TeamTab leagueId={id} membershipId={membership.id} userId={profile.id} leagueStatus={league.status} />
        )}
        {tab === "fights" && (
          <FightsTab leagueId={id} />
        )}
        {tab === "marketplace" && (
          <MarketplaceTab leagueId={id} membershipId={membership.id} leagueStatus={league.status} />
        )}
        {tab === "standings" && (
          <StandingsTab leagueId={id} userId={profile.id} leagueName={league.name} inviteCode={league.inviteCode} />
        )}
        {tab === "scores" && (
          <ScoresTab leagueId={id} membershipId={membership.id} />
        )}
        {tab === "activity" && (
          <ActivityTab leagueId={id} />
        )}
        {tab === "settings" && (
          <SettingsTab league={league} membership={membership} memberCount={members.length} />
        )}
      </main>

      <BottomNav leagueId={id} currentTab={tab} />
    </div>
  );
}
