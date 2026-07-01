'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { League } from '@/lib/types';

interface SettingsPageProps {
  params: Promise<{ id: string }>;
}

const SCORING_RULES = [
  { label: 'Fight Win', value: '+100 PTS' },
  { label: 'Finish (KO / TKO / Sub)', value: '+50 PTS' },
  { label: 'Ranked Victory (Top 15)', value: '+50 PTS' },
  { label: 'POTN / FOTN Bonus', value: '+50 PTS' },
  { label: 'Main Event', value: '+25 PTS' },
  { label: 'Title Fight', value: '+25 PTS' },
];

const WAIVER_RULES = [
  'Waivers process every Monday at Midnight EST.',
  'Priority ordered by lowest total points (highest priority = worst record).',
  'Maximum 1 successful claim per manager per week.',
  'If Priority 1 bid fails, Priority 2 bid is evaluated.',
  'Bids for locked fighters (already fought) are automatically invalidated.',
];

export default function SettingsPage({ params }: SettingsPageProps) {
  const { id: leagueId } = use(params);
  const [league, setLeague] = useState<League | null>(null);
  const [isCommissioner, setIsCommissioner] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: leagueData }, { data: membership }] = await Promise.all([
        supabase.from('leagues').select('*').eq('id', leagueId).single(),
        supabase
          .from('league_memberships')
          .select('role')
          .eq('league_id', leagueId)
          .eq('user_id', user.id)
          .single(),
      ]);

      setLeague(leagueData as League ?? null);
      setIsCommissioner(membership?.role === 'commissioner');
    }
    load();
  }, [leagueId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function forceProcessWaivers() {
    setProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');
    const { error } = await supabase.rpc('process_waivers', { p_league_id: leagueId });
    setProcessing(false);
    if (error) {
      setErrorMsg(error.message);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setSuccessMsg('Waivers processed successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-white leading-none mb-6">
        Settings
      </h1>

      <div className="bg-[#050507] border-2 border-zinc-800 rounded-2xl p-4 mb-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">League</p>
        <h2 className="text-[18px] font-black uppercase tracking-tighter text-white">{league?.name ?? '—'}</h2>
      </div>

      <div className="mb-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Scoring</p>
        <div className="bg-[#050507] border-2 border-zinc-800 rounded-2xl divide-y divide-zinc-800">
          {SCORING_RULES.map((rule) => (
            <div key={rule.label} className="flex items-center justify-between px-4 py-3">
              <span className="text-[12px] font-black uppercase tracking-tighter text-zinc-300">{rule.label}</span>
              <span className="text-[13px] font-mono font-black text-emerald-400">{rule.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Waiver Wire Rules</p>
        <div className="bg-[#050507] border-2 border-zinc-800 rounded-2xl p-4 space-y-3">
          {WAIVER_RULES.map((rule, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-[10px] font-black text-zinc-700 flex-shrink-0 mt-0.5">{i + 1}.</span>
              <p className="text-[12px] text-zinc-400 font-bold leading-snug">{rule}</p>
            </div>
          ))}
        </div>
      </div>

      {isCommissioner && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
            Commissioner Tools
          </p>
          <div className="bg-[#050507] border-2 border-zinc-800 rounded-2xl p-4 space-y-3">
            {successMsg && (
              <p className="text-[11px] font-black text-emerald-400 uppercase tracking-widest text-center">
                {successMsg}
              </p>
            )}
            {errorMsg && (
              <p className="text-[11px] font-black text-rose-400 uppercase tracking-widest text-center">
                {errorMsg}
              </p>
            )}
            <button
              onClick={forceProcessWaivers}
              disabled={processing}
              className="w-full bg-amber-600/20 border-2 border-amber-700/50 text-amber-400 font-black uppercase tracking-widest text-[12px] py-3 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-40"
            >
              {processing ? 'Processing…' : 'Force Process Waivers'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
