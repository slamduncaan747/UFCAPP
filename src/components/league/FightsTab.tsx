import { getUpcomingEvents, getAllRostersForLeague } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { bouts, fighters } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Headshot } from "@/components/shared/Headshot";
import { ClockIcon, BoltIcon } from "@/components/shared/Icons";
import { formatDistanceToNow, format } from "date-fns";

export async function FightsTab({ leagueId }: { leagueId: string }) {
  const upcomingEvents = await getUpcomingEvents(5);

  if (upcomingEvents.length === 0) {
    return (
      <div className="py-16 text-center">
        <BoltIcon size={32} style={{ color: "var(--ufc-text-3)", margin: "0 auto 12px" }} />
        <p className="font-display font-bold uppercase">No upcoming events</p>
      </div>
    );
  }

  const allRosters = await getAllRostersForLeague(leagueId);
  const fighterOwnership = new Map<string, string>(); // fighterId -> teamName
  for (const { fighter, membership } of allRosters) {
    fighterOwnership.set(fighter.id, membership.teamName);
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-xl uppercase tracking-wide">Upcoming Fights</h2>

      {upcomingEvents.map(async (event) => {
        const eventBouts = await db
          .select()
          .from(bouts)
          .where(eq(bouts.eventId, event.id))
          .orderBy(desc(bouts.isMainEvent), desc(bouts.boutOrder));

        const isLocked = new Date(event.lockTime) <= new Date();
        const isLive = event.status === "in_progress";

        return (
          <div key={event.id} className="ufc-surface rounded-xl overflow-hidden">
            {/* Event header */}
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ background: "var(--ufc-surface-2)", borderBottom: "1px solid var(--ufc-border)" }}>
              <div>
                <div className="flex items-center gap-2">
                  {isLive && <span className="live-dot" style={{ width: 7, height: 7 }} />}
                  <span className="font-display font-bold uppercase text-sm">{event.name}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <ClockIcon size={12} style={{ color: "var(--ufc-text-3)" }} />
                  <span className="text-xs" style={{ color: "var(--ufc-text-2)" }}>
                    {format(new Date(event.eventDate), "MMM d, yyyy")}
                    {!isLocked && ` · Locks ${formatDistanceToNow(new Date(event.lockTime), { addSuffix: true })}`}
                    {isLocked && !isLive && " · Locked"}
                  </span>
                </div>
              </div>
              {event.location && (
                <span className="text-xs" style={{ color: "var(--ufc-text-3)" }}>{event.location}</span>
              )}
            </div>

            {/* Bouts */}
            <div className="divide-y" style={{ borderColor: "var(--ufc-border)" }}>
              {eventBouts.length === 0 && (
                <div className="py-4 text-center text-sm" style={{ color: "var(--ufc-text-3)" }}>
                  Card not yet announced
                </div>
              )}
              {eventBouts.map(async (bout) => {
                const fighterA = await db.select().from(fighters).where(eq(fighters.id, bout.fighterAId)).then(r => r[0]);
                const fighterB = await db.select().from(fighters).where(eq(fighters.id, bout.fighterBId)).then(r => r[0]);
                if (!fighterA || !fighterB) return null;

                const aOwner = fighterOwnership.get(fighterA.id);
                const bOwner = fighterOwnership.get(fighterB.id);

                return (
                  <div key={bout.id} className="px-4 py-3 flex items-center gap-3">
                    <FighterBadge fighter={fighterA} owner={aOwner} />
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      {bout.isTitleFight && <span className="font-display" style={{ color: "var(--gold)", fontSize: 8, fontWeight: 700, letterSpacing: 0.8, padding: "2px 5px", borderRadius: 5, background: "var(--gold-wash)" }}>TITLE</span>}
                      {bout.isMainEvent && !bout.isTitleFight && <span className="font-display" style={{ color: "var(--accent)", fontSize: 8, fontWeight: 700, letterSpacing: 0.8, padding: "2px 5px", borderRadius: 5, background: "var(--accent-wash)" }}>MAIN</span>}
                      <span className="font-hero grad-text" style={{ fontSize: 14, lineHeight: 1 }}>VS</span>
                    </div>
                    <FighterBadge fighter={fighterB} owner={bOwner} right />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FighterBadge({ fighter, owner, right }: { fighter: any; owner?: string; right?: boolean }) {
  return (
    <div className={`flex-1 flex items-center gap-2 ${right ? "flex-row-reverse" : ""}`}>
      <Headshot name={fighter.name} photoUrl={fighter.photoUrl} weightClass={fighter.weightClass} size={36} />
      <div className={`min-w-0 ${right ? "text-right" : ""}`}>
        <div className="font-display font-bold text-xs uppercase truncate">{fighter.name}</div>
        {owner ? (
          <div className="text-xs font-bold" style={{ color: "var(--ufc-accent)" }}>{owner}</div>
        ) : (
          <div className="text-xs" style={{ color: "var(--ufc-text-3)" }}>FA</div>
        )}
      </div>
    </div>
  );
}
