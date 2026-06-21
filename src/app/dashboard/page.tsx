import { requireProfile } from "@/lib/auth/session";
import { getUserLeagues, getStandings, getUpcomingEvents } from "@/lib/db/queries";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { DashboardHeader } from "@/components/shared/Header";
import { InviteButton } from "@/components/shared/InviteButton";

export default async function DashboardPage() {
  const { profile } = await requireProfile();
  const [userLeagues, nextEvents] = await Promise.all([
    getUserLeagues(profile.id),
    getUpcomingEvents(1),
  ]);

  return (
    <div style={{ minHeight: "100dvh" }}>
      <DashboardHeader displayName={profile.displayName} />

      <main className="rise-in" style={{ padding: "20px 20px", maxWidth: 480, margin: "0 auto", paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>

        {/* Next event — hero card */}
        {nextEvents[0] && (
          <div className="card-premium" style={{
            position: "relative",
            overflow: "hidden",
            padding: "18px 18px",
            marginBottom: 28,
          }}>
            <div aria-hidden style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "radial-gradient(280px 160px at 100% 0%, rgba(255,59,78,0.16), transparent 70%)",
            }} />
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div className="font-display" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />
                  Next Event
                </div>
                <div className="font-display" style={{ fontSize: 19, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: 0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {nextEvents[0].name}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>Locks</div>
                <div className="font-num" style={{ fontSize: 13, color: "var(--text)", fontWeight: 700 }}>
                  {formatDistanceToNow(new Date(nextEvents[0].lockTime), { addSuffix: true })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leagues */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span className="font-display" style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: 0.3 }}>My Leagues</span>
          <Link href="/leagues/new" className="btn-primary font-display" style={{
            padding: "9px 16px",
            borderRadius: 11,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            textDecoration: "none",
          }}>
            + New
          </Link>
        </div>

        {userLeagues.length === 0 ? (
          <div style={{
            padding: "40px 24px",
            borderRadius: 16,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🥊</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
              You&apos;re not in the league yet
            </div>
            <div style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 24, lineHeight: 1.5 }}>
              Claim your team to see your roster and standings.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <Link href="/claim" style={{
                padding: "12px 24px",
                borderRadius: 12,
                background: "var(--accent)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}>
                Claim My Team
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {userLeagues.map(({ league, membership }) => (
              <LeagueCard key={league.id} league={league} membership={membership} userId={profile.id} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

async function LeagueCard({ league, membership, userId }: { league: any; membership: any; userId: string }) {
  const standings = await getStandings(league.id);
  const myStanding = standings.find((s: any) => s.userId === userId);
  const myRank = myStanding ? standings.indexOf(myStanding) + 1 : null;
  const isSetup = league.status === "setup";

  const statusColors: Record<string, { fg: string; bg: string }> = {
    setup:     { fg: "var(--gold)",   bg: "var(--gold-wash)" },
    drafting:  { fg: "var(--accent)", bg: "var(--accent-wash)" },
    active:    { fg: "var(--green)",  bg: "rgba(47,224,126,0.10)" },
    completed: { fg: "var(--text-3)", bg: "rgba(255,255,255,0.05)" },
  };
  const sc = statusColors[league.status] ?? statusColors.completed;
  const isLeader = myRank === 1;

  return (
    <div className="card-premium" style={{ overflow: "hidden" }}>
      <Link href={`/leagues/${league.id}?tab=team`} style={{ textDecoration: "none", display: "flex", alignItems: "stretch" }}>
        {/* Accent rail */}
        <div style={{ width: 4, flexShrink: 0, background: isLeader ? "var(--grad-gold)" : "var(--grad-primary)" }} />
        <div style={{ flex: 1, padding: "15px 16px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="font-display" style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: 0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {league.name}
                </span>
                <span className="font-display" style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  color: sc.fg,
                  background: sc.bg,
                  padding: "3px 7px",
                  borderRadius: 6,
                  flexShrink: 0,
                }}>
                  {league.status}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>
                {membership.teamName}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div className="font-hero" style={{ fontSize: 24, color: isLeader ? "transparent" : "var(--text)", lineHeight: 1 }}>
                <span className={isLeader ? "grad-text-gold" : ""}>{(myStanding?.totalPoints ?? 0).toLocaleString()}</span>
              </div>
              {myRank && (
                <div className="font-display" style={{ fontSize: 11, color: isLeader ? "var(--gold)" : "var(--text-3)", marginTop: 3, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                  {isLeader && "🏆 "}#{myRank} of {standings.length}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>

      {isSetup && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderTop: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>
            {standings.length} {standings.length === 1 ? "member" : "members"} · waiting for draft
          </span>
          <InviteButton inviteUrl={`/leagues/join?code=${league.inviteCode}`} leagueName={league.name} />
        </div>
      )}
    </div>
  );
}
