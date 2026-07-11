'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/identity';
import { Fighter, WaiverBidWithFighters, WEIGHT_CLASS_CODES, SLOT_DISPLAY } from '@/lib/types';
import { fetchUpcomingBoutMap, UpcomingBoutInfo } from '@/lib/data';
import TransferBidCard from '@/components/TransferBidCard';
import FreeAgentCard, { FreeAgentCardSkeleton } from '@/components/FreeAgentCard';
import TransferFlowModal from '@/components/TransferFlowModal';
import TransferHistoryModal from '@/components/TransferHistoryModal';

interface MarketPageProps {
  params: Promise<{ id: string }>;
}

type SortMode = 'schedule' | 'score' | 'record' | 'alpha';

const SORT_LABELS: Record<SortMode, string> = {
  schedule: 'Fights Soon',
  score: 'Top Rated',
  record: 'Best Record',
  alpha: 'A–Z',
};

const PAGE_SIZE = 50;

function useCountdown(): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    function calc() {
      const now = new Date();
      const day = now.getDay();
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
  const [upcomingMap, setUpcomingMap] = useState<Record<string, UpcomingBoutInfo>>({});
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState<string>('All');
  const [sortMode, setSortMode] = useState<SortMode>('schedule');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [selectedAddFighter, setSelectedAddFighter] = useState<Fighter | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  // Bumped after a successful bid to re-fetch bids + free agents.
  const [refreshNonce, setRefreshNonce] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const userId = getUserId();
      if (!userId) return;

      const { data: membership } = await supabase
        .from('league_memberships')
        .select('id')
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .single();

      if (!membership) { setLoading(false); return; }
      setMembershipId(membership.id);

      const [bidsRes, membershipsRes, upcoming] = await Promise.all([
        supabase
          .from('waiver_claims')
          .select(`
            *,
            add_fighter:fighters!waiver_claims_add_fighter_id_fkey(*),
            drop_fighter:fighters!waiver_claims_drop_fighter_id_fkey(*)
          `)
          .eq('membership_id', membership.id)
          .eq('status', 'pending')
          .order('bid_priority'),
        supabase.from('league_memberships').select('id').eq('league_id', leagueId),
        fetchUpcomingBoutMap(supabase),
      ]);

      setActiveBids((bidsRes.data as WaiverBidWithFighters[]) ?? []);
      setUpcomingMap(upcoming);

      // Everyone rostered anywhere in this league is off the market.
      const membershipIds = ((membershipsRes.data as Array<{ id: string }>) ?? []).map((m) => m.id);
      let rosteredIds = new Set<string>();
      if (membershipIds.length > 0) {
        const { data: rosters } = await supabase
          .from('rosters')
          .select('fighter_id')
          .in('membership_id', membershipIds);
        rosteredIds = new Set(((rosters as Array<{ fighter_id: string }>) ?? []).map((r) => r.fighter_id));
      }

      const { data: faData } = await supabase
        .from('fighters')
        .select('id, name, nickname, photo_url, weight_class, gender, record_w, record_l, record_d, current_ranking, is_champion, ranking_division, status, draft_score, last_fight_at')
        .eq('status', 'active');

      setFreeAgents(((faData as Fighter[]) ?? []).filter((f) => !rosteredIds.has(f.id)));
      setLoading(false);
    }

    loadData();
  }, [leagueId, refreshNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // Changing the query resets paging (done in the handlers, not an effect).
  function updateSearch(v: string) { setSearch(v); setVisibleCount(PAGE_SIZE); }
  function updateFilterClass(v: string) { setFilterClass(v); setVisibleCount(PAGE_SIZE); }
  function updateSortMode(v: SortMode) { setSortMode(v); setVisibleCount(PAGE_SIZE); }

  async function cancelBid(bidId: string) {
    await supabase.from('waiver_claims').delete().eq('id', bidId);
    setActiveBids((prev) => prev.filter((b) => b.id !== bidId));
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rating = (f: Fighter) => f.draft_score ?? -1;
    const winPct = (f: Fighter) => {
      const fights = f.record_w + f.record_l + f.record_d;
      return fights === 0 ? 0 : f.record_w / fights;
    };

    return freeAgents
      .filter((f) => filterClass === 'All' || f.weight_class === filterClass)
      .filter((f) =>
        q === '' ||
        f.name.toLowerCase().includes(q) ||
        (f.nickname ?? '').toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (sortMode === 'alpha') return a.name.localeCompare(b.name);
        if (sortMode === 'score') return rating(b) - rating(a);
        if (sortMode === 'record') {
          const wins = b.record_w - a.record_w;
          if (wins !== 0) return wins;
          return winPct(b) - winPct(a);
        }
        // schedule: booked fighters first by date, then best available.
        const aDate = upcomingMap[a.id]?.event_date;
        const bDate = upcomingMap[b.id]?.event_date;
        if (aDate && bDate) {
          const diff = new Date(aDate).getTime() - new Date(bDate).getTime();
          if (diff !== 0) return diff;
          return rating(b) - rating(a);
        }
        if (aDate) return -1;
        if (bDate) return 1;
        return rating(b) - rating(a);
      });
  }, [freeAgents, filterClass, search, sortMode, upcomingMap]);

  const visible = filtered.slice(0, visibleCount);
  const pendingAddIds = useMemo(
    () => new Set(activeBids.map((b) => b.add_fighter_id)),
    [activeBids]
  );

  return (
    <>
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">Market</h1>
          <button
            onClick={() => setShowHistory(true)}
            aria-label="Transfer history"
            className="w-9 h-9 bg-zinc-900 border-2 border-zinc-800 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          >
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl p-3 flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Waiver Deadline</p>
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

        {/* Search */}
        <div className="relative mb-3">
          <svg className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Search fighters…"
            className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-[13px] font-bold text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => updateSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-zinc-500"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="mb-3">
          {/* Weight class filter with scroll fade */}
          <div className="relative">
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
              {['All', ...WEIGHT_CLASS_CODES].map((wc) => (
                <button
                  key={wc}
                  onClick={() => updateFilterClass(wc)}
                  className={`flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
                    filterClass === wc
                      ? 'bg-white text-black border-white'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                  }`}
                >
                  {wc === 'All' ? 'All' : SLOT_DISPLAY[wc]}
                </button>
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-[#030303] to-transparent pointer-events-none" />
          </div>

          <div className="flex gap-2 mt-2">
            {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => updateSortMode(mode)}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded border active:scale-95 transition-all ${
                  sortMode === mode
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'text-zinc-600 border-zinc-900'
                }`}
              >
                {SORT_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <FreeAgentCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-zinc-600 text-[12px] font-black uppercase tracking-widest text-center py-8">
            No free agents match
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 pb-1">
              {filtered.length} free agent{filtered.length === 1 ? '' : 's'}
            </p>
            {activeBids.length >= 2 && (
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/80 text-center pb-1">
                Maximum 2 bids active — cancel one to add another
              </p>
            )}
            {visible.map((fighter) => (
              <FreeAgentCard
                key={fighter.id}
                fighter={fighter}
                nextBout={upcomingMap[fighter.id] ?? null}
                disabled={activeBids.length >= 2 || pendingAddIds.has(fighter.id)}
                onAdd={() => {
                  if (activeBids.length >= 2 || pendingAddIds.has(fighter.id)) return;
                  setSelectedAddFighter(fighter);
                }}
              />
            ))}
            {visibleCount < filtered.length && (
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="w-full bg-zinc-900 border-2 border-zinc-800 text-zinc-400 font-black uppercase tracking-widest text-[11px] py-3 rounded-xl active:scale-[0.98] transition-transform"
              >
                Show more ({filtered.length - visibleCount} remaining)
              </button>
            )}
          </div>
        )}
      </div>

      <TransferFlowModal
        addFighter={selectedAddFighter}
        membershipId={membershipId ?? ''}
        leagueId={leagueId}
        isOpen={!!selectedAddFighter}
        onClose={() => setSelectedAddFighter(null)}
        onSuccess={() => setRefreshNonce((n) => n + 1)}
      />

      <TransferHistoryModal
        leagueId={leagueId}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
}
