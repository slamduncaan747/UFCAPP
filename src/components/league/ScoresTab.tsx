import { getTeamScoreBreakdown } from "@/lib/db/queries";
import { format } from "date-fns";
import { TrophyIcon } from "@/components/shared/Icons";
import { ScoreChip } from "@/components/shared/Tags";
import { Headshot } from "@/components/shared/Headshot";

export async function ScoresTab({ leagueId, membershipId }: { leagueId: string; membershipId: string }) {
  const entries = await getTeamScoreBreakdown(membershipId);

  if (entries.length === 0) {
    return (
      <div className="py-16 text-center">
        <TrophyIcon size={32} style={{ color: "var(--ufc-text-3)", margin: "0 auto 12px" }} />
        <p className="font-display font-bold uppercase mb-1">No scores yet</p>
        <p className="text-sm" style={{ color: "var(--ufc-text-2)" }}>Points will appear after bouts complete.</p>
      </div>
    );
  }

  const totalPoints = entries.reduce((sum, e) => sum + e.score.points, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="font-display font-bold text-xl uppercase tracking-wide">My Scores</h2>
        <div className="text-right">
          <div className="font-hero grad-text" style={{ fontSize: 30, lineHeight: 1 }}>
            {totalPoints.toLocaleString()}
          </div>
          <div className="font-display" style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: 1.4, textTransform: "uppercase" }}>Total Points</div>
        </div>
      </div>

      {entries.map(({ score, fighter, bout, event }) => {
        const bd = score.breakdown as Record<string, number>;
        return (
          <div key={score.id} className="ufc-surface rounded-xl p-4">
            {/* Event + bout header */}
            <div className="text-xs mb-2" style={{ color: "var(--ufc-text-3)" }}>
              {event.name} · {format(new Date(event.eventDate), "MMM d")}
            </div>

            <div className="flex items-center gap-3 mb-3">
              <Headshot name={fighter.name} photoUrl={fighter.photoUrl} weightClass={fighter.weightClass} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold uppercase text-sm truncate">{fighter.name}</div>
                <div className="text-xs" style={{ color: "var(--ufc-text-2)" }}>
                  {bout.method ?? "Result pending"}
                </div>
              </div>
              <div className="font-num text-xl font-bold" style={{ color: score.points > 0 ? "var(--ufc-win)" : "var(--ufc-text-3)" }}>
                +{score.points}
              </div>
            </div>

            {/* Breakdown chips */}
            <div className="flex flex-wrap gap-1.5">
              {bd.win && <ScoreChip label="Win" points={bd.win} />}
              {bd.finish && <ScoreChip label="Finish" points={bd.finish} />}
              {bd.rankedWin && <ScoreChip label="Ranked Win" points={bd.rankedWin} />}
              {bd.nightBonus && <ScoreChip label="Night Bonus" points={bd.nightBonus} />}
              {bd.title && <ScoreChip label="Title Fight" points={bd.title} />}
              {bd.main && <ScoreChip label="Main Event" points={bd.main} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
