import { getLeagueTransactions } from "@/lib/db/queries";
import { formatDistanceToNow } from "date-fns";
import { PlusIcon, SwapIcon, BoltIcon } from "@/components/shared/Icons";
import { Headshot } from "@/components/shared/Headshot";

export async function ActivityTab({ leagueId }: { leagueId: string }) {
  const transactions = await getLeagueTransactions(leagueId);

  if (transactions.length === 0) {
    return (
      <div className="py-16 text-center">
        <SwapIcon size={32} style={{ color: "var(--ufc-text-3)", margin: "0 auto 12px" }} />
        <p className="font-display font-bold uppercase mb-1">No transactions yet</p>
        <p className="text-sm" style={{ color: "var(--ufc-text-2)" }}>Add/drop activity will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <h2 className="font-display font-bold text-xl uppercase tracking-wide mb-4">Activity</h2>
      {transactions.map(({ tx, fighter, membership, profile }) => {
        const isAdd = tx.type === "add" || tx.type === "draft_pick";
        const isDrop = tx.type === "drop";
        const isBurn = isDrop && tx.wasLockedFighter;

        const iconColor = isAdd ? "var(--ufc-win)" : isBurn ? "var(--ufc-live)" : "var(--ufc-text-3)";
        const icon = isAdd ? <PlusIcon size={14} /> : isBurn ? <BoltIcon size={14} /> : <SwapIcon size={14} />;
        const verb = tx.type === "draft_pick" ? "drafted" : isAdd ? "added" : isBurn ? "burned & dropped" : "dropped";

        return (
          <div key={tx.id} className="flex items-center gap-3 py-3"
            style={{ borderBottom: "1px solid var(--ufc-border)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: isAdd ? "rgba(47,191,113,0.12)" : isBurn ? "rgba(255,59,59,0.12)" : "var(--ufc-surface-2)", color: iconColor }}>
              {icon}
            </div>
            <Headshot name={fighter.name} photoUrl={fighter.photoUrl} weightClass={fighter.weightClass} size={32} />
            <div className="flex-1 min-w-0 text-sm">
              <span className="font-bold" style={{ color: "var(--ufc-text)" }}>{profile.displayName}</span>
              <span style={{ color: "var(--ufc-text-2)" }}> {verb} </span>
              <span className="font-bold" style={{ color: "var(--ufc-text)" }}>{fighter.name}</span>
            </div>
            <span className="text-xs flex-shrink-0" style={{ color: "var(--ufc-text-3)" }}>
              {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
