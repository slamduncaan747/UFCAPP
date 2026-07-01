'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SLOT_DISPLAY } from '@/lib/types';
import SlideUpModal from './SlideUpModal';

interface ActivityModalProps {
  leagueId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ActivityEntry {
  id: string;
  type: 'draft_pick' | 'add' | 'drop';
  slot: string;
  created_at: string;
  fighter: { name: string; image_url: string | null; weight_class: string } | null;
  membership: { team_name: string } | null;
}

const TYPE_META: Record<ActivityEntry['type'], { label: string; color: string; sign: string }> = {
  add:        { label: 'Added',   color: 'text-emerald-400', sign: '+' },
  drop:       { label: 'Dropped', color: 'text-rose-400',    sign: '−' },
  draft_pick: { label: 'Drafted', color: 'text-zinc-300',    sign: '•' },
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ActivityModal({ leagueId, isOpen, onClose }: ActivityModalProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    async function load() {
      const { data } = await supabase
        .from('transactions')
        .select('id, type, slot, created_at, fighter:fighters(name, image_url, weight_class), membership:league_memberships(team_name)')
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false })
        .limit(60);

      setEntries((data as unknown as ActivityEntry[]) ?? []);
      setLoading(false);
    }

    load();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SlideUpModal isOpen={isOpen} onClose={onClose}>
      <div className="px-5 pb-8">
        <div className="flex justify-center -mt-2 mb-5">
          <div className="bg-zinc-900 border-x border-b border-zinc-700 px-5 py-1.5 rounded-b-lg text-[10px] font-black uppercase tracking-widest text-zinc-300">
            League Activity
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-zinc-600 text-[12px] font-black uppercase tracking-widest text-center py-8">
            No activity yet
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => {
              const meta = TYPE_META[e.type] ?? TYPE_META.add;
              const slot = SLOT_DISPLAY[e.slot] ?? e.slot;
              return (
                <div key={e.id} className="bg-[#050507] border-2 border-zinc-800 rounded-xl p-3 flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full bg-zinc-900 border-2 border-zinc-700 flex-shrink-0 overflow-hidden">
                    {e.fighter?.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.fighter.image_url} alt={e.fighter.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${meta.color}`}>
                        {meta.sign} {meta.label}
                      </span>
                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">• {slot}</span>
                    </div>
                    <h4 className="text-[14px] font-black uppercase tracking-tighter text-white leading-none mt-1 truncate">
                      {e.fighter?.name ?? 'Unknown Fighter'}
                    </h4>
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                      {e.membership?.team_name ?? 'Unknown Team'}
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest flex-shrink-0 self-start">
                    {timeAgo(e.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SlideUpModal>
  );
}
