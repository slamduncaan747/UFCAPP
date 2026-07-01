'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Fighter, WaiverBidWithFighters, Roster } from '@/lib/types';
import TransferBidCard from '@/components/TransferBidCard';
import FreeAgentCard from '@/components/FreeAgentCard';
import TransferFlowModal from '@/components/TransferFlowModal';
import TransferHistoryModal from '@/components/TransferHistoryModal';
import { CardSkeletonList } from '@/components/Skeleton';

interface MarketPageProps {
  params: Promise<{ id: string }>;
}

type SortMode = 'rank' | 'schedule' | 'alpha';

function useCountdown(): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    function calc() {
      const now = new Date();
      const day = now.getDay();
      // Days until the upcoming Monday. On Monday itself the deadline is tonight
      // (0 days); Sunday is tomorrow (1); otherwise count forward to next Monday.
      const daysUntilMonday = day === 1 ? 0 : day === 0 ? 1 : 8 - day;
      const next = new Date(now);
      next.setDate(now.getDate() + daysUntilMonday);
      next.setHours(23, 59, 59, 0);
      const diff = next.getTime() - now.getTime();
      if (diff <= 0) { setLabel('Processing…'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  return label;
}

export default function MarketPage({ params }: MarketPageProps) {
  const { id: leagueId } = use(params);
  const countdown = useCountdown();
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [activeBids, setActiveBids] = useState<WaiverBidWithFighters[]>([]);
  const [freeAgents, setFreeAgents] = useState<Fighter[]>([]);
  const [boutDateMap, setBoutDateMap] = useState<Record<string, string>>({});
  const [filterClass, setFilterClass] = useState<string>('All');
  const [sortMode, setSortMode] = useState<SortMode>('rank');
  const [loading, setLoading] = useState(true);
  const [selectedAddFighter, setSelectedAddFighter] = useState<Fighter | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const supabase = createClient();

  const weightClasses = [
    'All', 'Strawweight', 'Flyweight', 'Bantamweight', 'Featherweight',
    'Lightweight', 'Welterweight', 'Middleweight', 'Light Heavyweight', 'Heavyweight',
  ];

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await supabase
      .from('league_memberships')
      .select('id')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('claimable', false)
      .single();

    if (!membership) { setLoading(false); return; }
    setMembershipId(membership.id);

    // Active waiver claims for this membership
    const { data: bidsData } = await supabase
      .from('waiver_claims')
      .select(`
        *,
        add_fighter:fighters!waiver_claims_add_fighter_id_fkey(*),
        drop_fighter:fighters!waiver_claims_drop_fighter_id_fkey(*)
      `)
      .eq('membership_id', membership.id)
      .eq('status', 'pending')
      .order('bid_priority');

    setActiveBids((bidsData as WaiverBidWithFighters[]) ?? []);

    // All rostered fighter IDs in the league
    const { data: allMemberships } = await supabase
      .from('league_memberships')
      .select('id')
      .eq('league_id', leagueId);

    const membershipIds = (allMemberships ?? []).map((m: { id: string }) => m.id);
    let rosteredIds: string[] = [];
    if (membershipIds.length > 0) {
      const { data: rosters } = await supabase
        .from('rosters')
        .select('fighter_id')
        .in('membership_id', membershipIds);
      rosteredIds = (rosters ?? []).map((r: Pick<Roster, 'fighter_id'>) => r.fighter_id);
    }

    let query = supabase.from('fighters').select('*');
    if (rosteredIds.length > 0) {
      query = query.not('id', 'in', `(${rosteredIds.join(',')})`);
    }
    const { data: faData } = await query;
    setFreeAgents((faData as Fighter[]) ?? []);

    // Map each fighter → their earliest upcoming bout date (for the schedule
    // sort + the date badge on each card).
    const { data: schedBouts } = await supabase
      .from('bouts')
      .select('fighter_a_id, fighter_b_id, event:events!inner(event_date)')
      .eq('status', 'scheduled');

    const dateMap: Record<string, string> = {};
    (schedBouts ?? []).forEach((b: { fighter_a_id: string; fighter_b_id: string; event: { event_date: string } | { event_date: string }[] | null }) => {
      const ev = Array.isArray(b.event) ? b.event[0] : b.event;
      const start = ev?.event_date;
      if (!start) return;
      for (const fid of [b.fighter_a_id, b.fighter_b_id]) {
        if (!dateMap[fid] || new Date(start) < new Date(dateMap[fid])) {
          dateMap[fid] = start;
        }
      }
    });
    setBoutDateMap(dateMap);
    setLoading(false);
  }, [leagueId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData(); }, [loadData]);

  async function cancelBid(bidId: string) {
    await supabase.from('waiver_claims').delete().eq('id', bidId);
    setActiveBids((prev) => prev.filter((b) => b.id !== bidId));
  }

  const filtered = freeAgents
    .filter((f) => filterClass === 'All' || f.weight_class === filterClass)
    .sort((a, b) => {
      if (sortMode === 'alpha') return a.name.localeCompare(b.name);
      if (sortMode === 'schedule') {
        const aDate = boutDateMap[a.id];
        const bDate = boutDateMap[b.id];
        // Fighters with an upcoming bout sort first, soonest at the top.
        if (aDate && bDate) return new Date(aDate).getTime() - new Date(bDate).getTime();
        if (aDate) return -1;
        if (bDate) return 1;
        return 0;
      }
      return (a.official_rank ?? 999) - (b.official_rank ?? 999);
    });

  return (
    <>
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">Market</h1>
          <button
            onClick={() => setShowHistory(true)}
            aria-label="Transfer history"
            className="w-10 h-10 bg-zinc-900 border-2 border-zinc-800 rounded-xl flex items-center justify-center hover:border-zinc-700 hover:text-white active:scale-90 transition-all duration-150"
          >
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl p-3 flex items-center justify-between mb-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Waiver Deadline</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-300">Monday Midnight EST</p>
          </div>
          <span className="text-[20px] font-mono font-black text-white tracking-tighter tabular-nums">{countdown}</span>
        </div>

        {activeBids.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Active Bids</p>
            {activeBids.map((bid) => (
              <TransferBidCard
                key={bid.id}
                bid={bid}
                prioritySlot={(bid.bid_priority === 2 ? 2 : 1)}
                onCancel={() => cancelBid(bid.id)}
              />
            ))}
          </div>
        )}

        <div className="mb-3">
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
            {weightClasses.map((wc) => (
              <button
                key={wc}
                onClick={() => setFilterClass(wc)}
                className={`flex-shrink-0 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all duration-150 active:scale-95 ${
                  filterClass === wc
                    ? 'bg-white text-black border-white'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                {wc}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            {(['rank', 'schedule', 'alpha'] as SortMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded border active:scale-95 transition-all duration-150 ${
                  sortMode === mode
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'text-zinc-600 border-zinc-900 hover:text-zinc-400 hover:border-zinc-800'
                }`}
              >
                {mode === 'rank' ? 'Rank' : mode === 'schedule' ? 'Schedule' : 'A–Z'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <CardSkeletonList count={7} className="space-y-2" />
        ) : filtered.length === 0 ? (
          <p className="text-zinc-600 text-[12px] font-black uppercase tracking-widest text-center py-8">
            No free agents in this class
          </p>
        ) : (
          <div className="space-y-2">
            {activeBids.length >= 2 && (
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-500/80 text-center pb-1">
                Maximum 2 bids active — cancel one to add another
              </p>
            )}
            {filtered.map((fighter, i) => (
              <div
                key={fighter.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
              >
                <FreeAgentCard
                  fighter={fighter}
                  nextBoutDate={boutDateMap[fighter.id] ?? null}
                  disabled={activeBids.length >= 2}
                  onAdd={() => {
                    if (activeBids.length >= 2) return;
                    setSelectedAddFighter(fighter);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <TransferFlowModal
        addFighter={selectedAddFighter}
        membershipId={membershipId ?? ''}
        leagueId={leagueId}
        isOpen={!!selectedAddFighter}
        onClose={() => setSelectedAddFighter(null)}
        onSuccess={loadData}
      />

      <TransferHistoryModal
        leagueId={leagueId}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
}
