'use client';

import { WaiverBidWithFighters } from '@/lib/types';
import { FighterAvatar } from '@/components/FighterAvatar';
import { rankLabel, recordString, weightClassName } from '@/lib/helpers';

interface TransferBidCardProps {
  bid: WaiverBidWithFighters;
  prioritySlot: 1 | 2;
  onCancel: () => void;
}

export default function TransferBidCard({ bid, prioritySlot, onCancel }: TransferBidCardProps) {
  const drop = bid.drop_fighter;
  const add = bid.add_fighter;
  const dropRank = rankLabel(drop);
  const addRank = rankLabel(add);

  return (
    <div className="relative bg-zinc-900/40 border-2 border-zinc-800/80 rounded-2xl p-4 pt-6 flex flex-col shadow-sm mt-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-zinc-900 border-x border-b border-zinc-700 px-4 py-0.5 rounded-b text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap">
        Priority {prioritySlot} • {weightClassName(bid.slot ?? drop.weight_class)}
      </div>

      <div className="flex items-center justify-between w-full mt-2">
        {/* DROP side */}
        <div className="flex items-center space-x-3 w-[35%]">
          <div className="relative flex-shrink-0">
            <FighterAvatar fighter={drop} size={48} className="border-[3px] border-rose-900/80" />
            {dropRank && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 text-zinc-400 text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                {dropRank}
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className="text-[12px] font-black uppercase text-zinc-300 truncate leading-none mb-1">
              {drop.name.split(' ').pop()}
            </h4>
            <span className="text-[10px] font-bold text-zinc-500 tracking-widest">
              {recordString(drop)}
            </span>
          </div>
        </div>

        {/* Transfer arrows */}
        <div className="flex items-center justify-center space-x-2 w-[30%]">
          <div className="flex items-center space-x-1">
            <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
        </div>

        {/* ADD side */}
        <div className="flex items-center space-x-3 justify-end text-right w-[35%]">
          <div className="flex flex-col items-end min-w-0">
            <h4 className="text-[12px] font-black uppercase text-white truncate leading-none mb-1">
              {add.name.split(' ').pop()}
            </h4>
            <span className="text-[10px] font-bold text-zinc-500 tracking-widest">
              {recordString(add)}
            </span>
          </div>
          <div className="relative flex-shrink-0">
            <FighterAvatar fighter={add} size={48} className="border-[3px] border-emerald-500/80" />
            {addRank && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-black border border-zinc-700 text-white text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                {addRank}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Cancel button — 40px touch target */}
      <button
        onClick={onCancel}
        aria-label={`Cancel bid for ${add.name}`}
        className="absolute -top-3 -right-3 bg-zinc-900 border-2 border-zinc-700 rounded-lg text-zinc-400 active:text-white transition-colors w-10 h-10 flex items-center justify-center"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
