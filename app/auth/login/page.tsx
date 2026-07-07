'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { setUserId } from '@/lib/identity';

interface Person {
  user_id: string;
  team_name: string;
}

export default function SelectPersonPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('league_memberships')
        .select('user_id, team_name')
        .order('team_name');

      // One entry per person, even if they belong to multiple leagues.
      const seen = new Set<string>();
      const unique: Person[] = [];
      for (const row of (data as Person[]) ?? []) {
        if (!row.user_id || seen.has(row.user_id)) continue;
        seen.add(row.user_id);
        unique.push(row);
      }
      setPeople(unique);
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleContinue() {
    if (!selected) return;
    setUserId(selected);
    router.replace('/leagues');
  }

  return (
    <div className="fixed inset-0 bg-[#030303] flex flex-col px-5 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
      {/* Wordmark */}
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white leading-none">
          Who Are<br />You?
        </h1>
        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mt-2">
          Select your name to continue
        </p>
        <div className="w-12 h-0.5 bg-zinc-800 mt-3" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-7 h-7 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 scroll-area mb-5">
          {people.length === 0 ? (
            <p className="text-zinc-600 text-[12px] font-black uppercase tracking-widest text-center py-8">
              No players found
            </p>
          ) : (
            people.map((p) => (
              <button
                key={p.user_id}
                onClick={() => setSelected(p.user_id)}
                className={`w-full flex items-center justify-between bg-[#050507] border-2 rounded-xl p-4 active:scale-[0.98] transition-transform text-left ${
                  selected === p.user_id ? 'border-white' : 'border-zinc-800'
                }`}
              >
                <span className="text-[16px] font-black uppercase tracking-tighter text-white">
                  {p.team_name}
                </span>
                {selected === p.user_id && (
                  <div className="w-5 h-5 rounded-full bg-white border-2 border-zinc-400 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={!selected}
        className="w-full bg-white text-black font-black uppercase tracking-widest text-[13px] py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-30 disabled:cursor-not-allowed min-h-[52px]"
      >
        Continue
      </button>
    </div>
  );
}
