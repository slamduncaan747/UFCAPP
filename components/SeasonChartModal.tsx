'use client';

import { useState } from 'react';
import { Manager } from '@/lib/types';
import SlideUpModal from './SlideUpModal';

interface EventSnapshot {
  eventTitle: string;
  managerPoints: Record<string, number>; // manager_id → cumulative points after this event
}

interface SeasonChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  managers: Manager[];
  snapshots: EventSnapshot[];
}

// Minimal line-graph rendered with SVG
function LineGraph({
  managers,
  snapshots,
  mode,
}: {
  managers: Manager[];
  snapshots: EventSnapshot[];
  mode: 'points' | 'rank';
}) {
  if (snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-600 text-[11px] font-black uppercase tracking-widest">
        No data yet
      </div>
    );
  }

  const W = 320;
  const H = 180;
  const padL = 28;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const colors = [
    '#a855f7', '#3b82f6', '#22c55e', '#f59e0b',
    '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
  ];

  const maxPoints = Math.max(
    ...snapshots.flatMap((s) => Object.values(s.managerPoints))
  ) || 1;

  function getValue(managerId: string, snapshot: EventSnapshot): number {
    if (mode === 'points') {
      return snapshot.managerPoints[managerId] ?? 0;
    }
    // Rank: sort managers descending by points, find position
    const sorted = managers
      .map((m) => ({ id: m.id, pts: snapshot.managerPoints[m.id] ?? 0 }))
      .sort((a, b) => b.pts - a.pts);
    const pos = sorted.findIndex((m) => m.id === managerId);
    return pos === -1 ? managers.length : pos + 1;
  }

  const maxY = mode === 'points' ? maxPoints : managers.length;
  const invertY = mode === 'rank'; // rank 1 should be at the top

  function yCoord(val: number) {
    const norm = invertY
      ? (maxY - val) / (maxY - 1 || 1)
      : val / maxY;
    return padT + innerH * (1 - norm);
  }

  function xCoord(i: number) {
    return padL + (i / Math.max(snapshots.length - 1, 1)) * innerW;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48 overflow-visible">
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map((frac) => (
        <line
          key={frac}
          x1={padL}
          x2={W - padR}
          y1={padT + innerH * frac}
          y2={padT + innerH * frac}
          stroke="#27272a"
          strokeWidth={1}
        />
      ))}

      {/* Manager lines */}
      {managers.map((manager, mi) => {
        const pts = snapshots.map((s, i) => ({
          x: xCoord(i),
          y: yCoord(getValue(manager.id, s)),
        }));
        const d = pts
          .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(' ');
        return (
          <path
            key={manager.id}
            d={d}
            fill="none"
            stroke={colors[mi % colors.length]}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
        );
      })}

      {/* X-axis labels */}
      {snapshots.map((s, i) => (
        <text
          key={i}
          x={xCoord(i)}
          y={H - 4}
          textAnchor="middle"
          fontSize={7}
          fill="#52525b"
          fontWeight="bold"
          fontFamily="system-ui"
        >
          {s.eventTitle.replace('UFC ', '').slice(0, 6)}
        </text>
      ))}
    </svg>
  );
}

export default function SeasonChartModal({
  isOpen,
  onClose,
  managers,
  snapshots,
}: SeasonChartModalProps) {
  const [mode, setMode] = useState<'points' | 'rank'>('points');

  const colors = [
    '#a855f7', '#3b82f6', '#22c55e', '#f59e0b',
    '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
  ];

  return (
    <SlideUpModal isOpen={isOpen} onClose={onClose} heightClass="h-[85vh]">
      <div className="px-5 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-black uppercase tracking-tighter text-white">Season Chart</h2>
          {/* Toggle */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setMode('points')}
              className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded transition-all ${
                mode === 'points'
                  ? 'bg-white text-black'
                  : 'text-zinc-500'
              }`}
            >
              Points
            </button>
            <button
              onClick={() => setMode('rank')}
              className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded transition-all ${
                mode === 'rank'
                  ? 'bg-white text-black'
                  : 'text-zinc-500'
              }`}
            >
              Rank
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-[#030303] border-2 border-zinc-800 rounded-xl p-3 mb-5">
          <LineGraph managers={managers} snapshots={snapshots} mode={mode} />
        </div>

        {/* Legend */}
        <div className="space-y-2">
          {managers.map((manager, i) => (
            <div key={manager.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colors[i % colors.length] }}
                />
                <span className="text-[12px] font-black uppercase tracking-tighter text-white">
                  {manager.display_name}
                </span>
              </div>
              <span className="text-[11px] font-mono font-black text-zinc-400 tabular-nums">
                {manager.total_points.toFixed(0)} PTS
              </span>
            </div>
          ))}
        </div>
      </div>
    </SlideUpModal>
  );
}
