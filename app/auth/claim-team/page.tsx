'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface ClaimableMembership {
  id: string;
  team_name: string;
}

export default function ClaimTeamPage() {
  const [memberships, setMemberships] = useState<ClaimableMembership[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function loadClaimable() {
    const { data } = await supabase
      .from('league_memberships')
      .select('id, team_name')
      .eq('claimable', true)
      .order('team_name');
    setMemberships((data as ClaimableMembership[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadClaimable(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleClaim() {
    if (!selected || claiming) return;
    setClaiming(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not authenticated. Please sign in again.');
      setClaiming(false);
      return;
    }

    // Upsert a profile row for this user (safe to re-run if it already exists)
    await supabase.from('profiles').upsert(
      { id: user.id, display_name: user.user_metadata?.full_name ?? user.email ?? 'Player' },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    // Atomically claim: only succeeds if still claimable
    const { error: err } = await supabase
      .from('league_memberships')
      .update({ user_id: user.id, claimable: false })
      .eq('id', selected)
      .eq('claimable', true);

    if (err) {
      setError('This team was just claimed. Please choose another.');
      setClaiming(false);
      setSelected(null);
      await loadClaimable();
      return;
    }

    router.push('/leagues');
  }

  return (
    <div className="fixed inset-0 bg-[#030303] flex flex-col px-5 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white leading-none">
          Claim Your<br />Team
        </h1>
        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mt-2">
          Select your name
        </p>
        <div className="w-12 h-0.5 bg-zinc-800 mt-3" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-7 h-7 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 scroll-area mb-5">
          {memberships.length === 0 ? (
            <p className="text-zinc-600 text-[12px] font-black uppercase tracking-widest text-center py-8">
              No teams available to claim
            </p>
          ) : (
            memberships.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={`w-full flex items-center justify-between bg-[#050507] border-2 rounded-xl p-4 active:scale-[0.98] transition-transform text-left ${
                  selected === m.id ? 'border-white' : 'border-zinc-800'
                }`}
              >
                <span className="text-[16px] font-black uppercase tracking-tighter text-white">
                  {m.team_name}
                </span>
                {selected === m.id && (
                  <div className="w-5 h-5 rounded-full bg-white border-2 border-zinc-400 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      )}

      {error && (
        <p className="text-[11px] font-black text-rose-400 uppercase tracking-widest text-center mb-4">
          {error}
        </p>
      )}

      <button
        onClick={handleClaim}
        disabled={!selected || claiming}
        className="w-full bg-white text-black font-black uppercase tracking-widest text-[13px] py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-30 disabled:cursor-not-allowed min-h-[52px]"
      >
        {claiming ? 'Claiming…' : 'Claim Team'}
      </button>
    </div>
  );
}
