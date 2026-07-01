'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { WaiverBid, Fighter } from '@/lib/types';
import SlideUpModal from './SlideUpModal';

interface HistoryEntry extends WaiverBid {
  add_fighter: Fighter;
  drop_fighter: Fighter;
  membership: { team_name: string };
}

interface TransferHistoryModalProps {
  leagueId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function TransferHistoryModal({ leagueId, isOpen, onClose }: TransferHistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    async function load() {
      const { data } = await supabase
        .from('waiver_claims')
        .select(`
          *,
          add_fighter:fighters!waiver_claims_add_fighter_id_fkey(*),
          drop_fighter:fighters!waiver_claims_drop_fighter_id_fkey(*),
          membership:league_memberships!waiver_claims_membership_id_fkey(team_name)
        `)
        .eq('league_id', leagueId)
        .eq('status', 'won')
        .order('created_at', { ascending: false });

      setHistory((data as HistoryEntry[]) ?? []);
      setLoading(false);
    }

    load();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SlideUpModal isOpen={isOpen} onClose={onClose}>
      <div className="px-5 pb-8">
        <div className="flex justify-center -mt-2 mb-5">
          <div className="bg-zinc-900 border-x border-b border-zinc-700 px-5 py-1.5 rounded-b-lg text-[10px] font-black uppercase tracking-widest text-zinc-300">
            Transfer History
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-zinc-600 text-[12px] font-black uppercase tracking-widest text-center py-8">
            No completed transactions yet
          </p>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <div key={entry.id} className="bg-[#030303] border-2 border-zinc-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    {entry.membership?.team_name ?? '—'}
                  </span>
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                    {new Date(entry.created_at ?? '').toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border-[2px] border-rose-900/70 flex-shrink-0">
                      {entry.drop_fighter.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.drop_fighter.image_url} alt={entry.drop_fighter.name} className="w-full h-full rounded-full object-cover" />
                      )}
                    </div>
                    <span className="text-[12px] font-black uppercase tracking-tighter text-zinc-400 truncate">
                      {entry.drop_fighter.name}
                    </span>
                  </div>

                  <div className="flex px-2 flex-shrink-0">
                    <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </div>

                  <div className="flex items-center space-x-2 flex-1 justify-end">
                    <span className="text-[12px] font-black uppercase tracking-tighter text-white truncate">
                      {entry.add_fighter.name}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border-[2px] border-emerald-500/70 flex-shrink-0">
                      {entry.add_fighter.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.add_fighter.image_url} alt={entry.add_fighter.name} className="w-full h-full rounded-full object-cover" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SlideUpModal>
  );
}
