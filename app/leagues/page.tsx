'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getUserId } from '@/lib/identity';
import { League } from '@/lib/types';

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check localStorage for last visited league
    const lastLeagueId = localStorage.getItem('last_visited_league_id');
    if (lastLeagueId) {
      router.replace(`/leagues/${lastLeagueId}/roster`);
      return;
    }

    async function load() {
      const userId = getUserId();
      if (!userId) { router.push('/auth/login'); return; }

      const { data: managerRows } = await supabase
        .from('league_memberships')
        .select('league_id')
        .eq('user_id', userId);

      const leagueIds = (managerRows ?? []).map((m: { league_id: string }) => m.league_id);
      if (leagueIds.length === 0) { setLoading(false); return; }

      const { data } = await supabase
        .from('leagues')
        .select('*')
        .in('id', leagueIds)
        .order('name');

      setLeagues((data as League[]) ?? []);
      setLoading(false);
    }

    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function selectLeague(id: string) {
    localStorage.setItem('last_visited_league_id', id);
    router.push(`/leagues/${id}/roster`);
  }

  return (
    <div className="fixed inset-0 bg-[#030303] flex flex-col px-5 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white leading-none">Your<br />Leagues</h1>
        <div className="w-12 h-0.5 bg-zinc-800 mt-3" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-7 h-7 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
        </div>
      ) : leagues.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-600 text-[12px] font-black uppercase tracking-widest text-center">
            No leagues found.<br />Contact your commissioner.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 scroll-area">
          {leagues.map((league) => (
            <button
              key={league.id}
              onClick={() => selectLeague(league.id)}
              className="w-full bg-[#050507] border-2 border-zinc-800 rounded-2xl p-5 flex items-center justify-between active:scale-[0.98] transition-transform text-left"
            >
              <div>
                <h3 className="text-[18px] font-black uppercase tracking-tighter text-white leading-none">
                  {league.name}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-1 block">
                  Fantasy League
                </span>
              </div>
              <svg className="w-5 h-5 text-zinc-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
