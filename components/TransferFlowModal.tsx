'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Fighter, RosterSlot, SLOT_DISPLAY } from '@/lib/types';
import SlideUpModal from './SlideUpModal';
import { FighterAvatar } from '@/components/FighterAvatar';

interface TransferFlowModalProps {
  addFighter: Fighter | null;
  membershipId: string;
  leagueId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferFlowModal({
  addFighter,
  membershipId,
  leagueId,
  isOpen,
  onClose,
  onSuccess,
}: TransferFlowModalProps) {
  const [rosterSlots, setRosterSlots] = useState<RosterSlot[]>([]);
  const [selectedDrop, setSelectedDrop] = useState<RosterSlot | null>(null);
  const [existingBidCount, setExistingBidCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!addFighter || !isOpen) return;
    setSelectedDrop(null);
    setError(null);
    setLoading(true);

    async function load() {
      const [{ data: rostersData }, { data: bids }] = await Promise.all([
        supabase.from('rosters').select('*, fighter:fighters(*)').eq('membership_id', membershipId),
        supabase.from('waiver_claims').select('id').eq('membership_id', membershipId).eq('status', 'pending'),
      ]);

      const fighterIds = (rostersData ?? []).map((r) => r.fighter_id);

      type BoutRow = { id: string; fighter_a_id: string; fighter_b_id: string; event?: { event_date: string } | null };
      let allBouts: BoutRow[] = [];
      if (fighterIds.length > 0) {
        const { data } = await supabase
          .from('bouts')
          .select('*, event:events(*)')
          .or(fighterIds.map((id) => `fighter_a_id.eq.${id},fighter_b_id.eq.${id}`).join(','))
          .order('created_at', { ascending: false });
        allBouts = (data ?? []) as BoutRow[];
      }

      const boutByFighter = new Map<string, BoutRow>();
      for (const bout of allBouts) {
        for (const fid of [bout.fighter_a_id, bout.fighter_b_id]) {
          if (fighterIds.includes(fid) && !boutByFighter.has(fid)) {
            boutByFighter.set(fid, bout);
          }
        }
      }

      const now = new Date();
      const enriched: RosterSlot[] = (rostersData ?? []).map((r) => {
        const boutData = boutByFighter.get(r.fighter_id) ?? null;
        const eventStart = boutData?.event?.event_date ? new Date(boutData.event.event_date) : null;
        return {
          ...r,
          slot_type: SLOT_DISPLAY[r.slot] ?? r.slot,
          next_bout: boutData ?? null,
          is_locked: !!eventStart && eventStart <= now,
        } as RosterSlot;
      });

      const weightMatch = enriched.find((s) => s.slot_type === addFighter!.weight_class);
      const wildcardSlot = enriched.find((s) => s.slot_type === 'Wildcard');
      setSelectedDrop(weightMatch ?? wildcardSlot ?? null);
      setRosterSlots(enriched);
      setExistingBidCount((bids ?? []).length);
      setLoading(false);
    }

    load();
  }, [addFighter, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const bothLocked =
    rosterSlots.length > 0 &&
    rosterSlots
      .filter((s) => s.slot_type === addFighter?.weight_class || s.slot_type === 'Wildcard')
      .every((s) => s.is_locked);

  const prioritySlot = Math.min(existingBidCount + 1, 2) as 1 | 2;

  async function handleSubmit() {
    if (!selectedDrop || !addFighter || bothLocked || submitting) return;
    if (existingBidCount >= 2) {
      setError('Maximum 2 bids allowed per week.');
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.from('waiver_claims').insert({
      league_id: leagueId,
      membership_id: membershipId,
      add_fighter_id: addFighter.id,
      drop_fighter_id: selectedDrop.fighter_id,
      bid_priority: prioritySlot,
      status: 'pending',
    });
    setSubmitting(false);
    if (err) {
      setError(err.message);
    } else {
      onSuccess();
      onClose();
    }
  }

  if (!addFighter) return null;

  const dropCandidates = rosterSlots.filter(
    (s) => s.slot_type === addFighter.weight_class || s.slot_type === 'Wildcard'
  );

  return (
    <SlideUpModal isOpen={isOpen} onClose={onClose} heightClass="h-[82vh]">
      <div className="px-5 pb-8">
        <div className="flex justify-center -mt-2 mb-5">
          <div className="bg-zinc-900 border-x border-b border-zinc-700 px-5 py-1.5 rounded-b-lg text-[10px] font-black uppercase tracking-widest text-zinc-300 shadow-md">
            Add Fighter
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-4 bg-emerald-900/10 border-2 border-emerald-800/40 rounded-xl p-3 mb-5">
              <FighterAvatar fighter={addFighter} size={48} className="border-[3px] border-emerald-500/70 flex-shrink-0" />
              <div>
                <h3 className="text-[15px] font-black uppercase tracking-tighter text-white leading-none">
                  {addFighter.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Adding</span>
                  <span className="text-[10px] font-bold text-zinc-500 tracking-widest">
                    {addFighter.wins}-{addFighter.losses}-{addFighter.draws}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
              Select Fighter to Drop
            </p>

            {bothLocked && (
              <div className="bg-rose-950/30 border-2 border-rose-800/50 rounded-xl p-3 mb-4">
                <p className="text-[11px] font-black text-rose-400 uppercase tracking-widest text-center">
                  Lineup Lock: Selected fighters are already locked in live events.
                </p>
              </div>
            )}

            <div className="space-y-2 mb-6">
              {dropCandidates.map((slot) => {
                const isSelected = selectedDrop?.id === slot.id;
                return (
                  <button
                    key={slot.id}
                    onClick={() => !slot.is_locked && setSelectedDrop(slot)}
                    disabled={slot.is_locked}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all active:scale-[0.98] ${
                      slot.is_locked
                        ? 'border-zinc-800 opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'border-rose-600 bg-rose-900/10'
                        : 'border-zinc-800 bg-[#050507]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <FighterAvatar
                        fighter={slot.fighter}
                        size={40}
                        className={`border-[3px] ${isSelected ? 'border-rose-600/60' : 'border-zinc-700'}`}
                      />
                      <div className="text-left">
                        <span className="text-[13px] font-black uppercase tracking-tighter text-white block leading-none">
                          {slot.fighter.name}
                        </span>
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          {slot.slot_type}
                          {slot.is_locked && ' • LOCKED'}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-rose-600 border-2 border-rose-400 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {error && (
              <p className="text-[11px] font-black text-rose-400 uppercase tracking-widest text-center mb-4">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
              <span>Priority Slot</span>
              <span className="text-white">{prioritySlot} of 2</span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!selectedDrop || bothLocked || submitting || existingBidCount >= 2}
              className="w-full bg-emerald-600 border border-emerald-500 text-white font-black uppercase tracking-widest text-[13px] py-3.5 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : `Submit Priority ${prioritySlot} Bid`}
            </button>
          </>
        )}
      </div>
    </SlideUpModal>
  );
}
