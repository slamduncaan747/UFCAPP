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

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

const TAB_TITLES: Record<string, string> = {
  team: "Roster", fights: "Fights", standings: "Standings",
  marketplace: "Market", scores: "Scores", activity: "Activity", settings: "Settings",
};

export default async function LeaguePage({ params, searchParams }: PageProps) {
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

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "8px 16px 0", paddingBottom: "calc(var(--nav-h) + var(--sab) + 16px)" }}>
        <DraftBanner
          leagueId={id}
          leagueStatus={league.status}
          draftStatus={draft?.status ?? null}
          currentPickNumber={draft?.currentPickNumber ?? 0}
          totalPicks={members.length * 9}
          isCommissioner={membership.role === "commissioner"}
        />

        <h1 className="ios-large-title rise-in" style={{ margin: "8px 2px 16px" }}>
          {TAB_TITLES[tab] ?? "League"}
        </h1>
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
