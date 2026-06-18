"use client";

import { useState, useTransition } from "react";
import { Headshot } from "@/components/shared/Headshot";
import { DivTag } from "@/components/shared/Tags";
import { toast } from "sonner";

type Fighter = {
  id: string;
  name: string;
  weightClass: string;
  photoUrl?: string | null;
  draftScore?: number | null;
  hasUpcomingBout?: boolean;
};

type QueueItem = { fighterId: string; priority: number };

type Props = {
  leagueId: string;
  queue: QueueItem[];
  fighters: Fighter[];
  onQueueChange: (q: QueueItem[]) => void;
};

export function QueuePanel({ leagueId, queue, fighters, onQueueChange }: Props) {
  const [saving, startSave] = useTransition();

  const queuedFighters = queue
    .sort((a, b) => a.priority - b.priority)
    .map(q => fighters.find(f => f.id === q.fighterId))
    .filter(Boolean) as Fighter[];

  async function saveQueue(newQueue: QueueItem[]) {
    onQueueChange(newQueue);
    startSave(async () => {
      const res = await fetch(`/api/leagues/${leagueId}/draft/queue`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue: newQueue }),
      });
      if (!res.ok) toast.error("Failed to save queue");
    });
  }

  function addToQueue(fighter: Fighter) {
    if (queue.some(q => q.fighterId === fighter.id)) return;
    saveQueue([...queue, { fighterId: fighter.id, priority: queue.length }]);
  }

  function removeFromQueue(fighterId: string) {
    const newQueue = queue
      .filter(q => q.fighterId !== fighterId)
      .map((q, i) => ({ ...q, priority: i }));
    saveQueue(newQueue);
  }

  function moveUp(fighterId: string) {
    const sorted = [...queue].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(q => q.fighterId === fighterId);
    if (idx <= 0) return;
    [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
    saveQueue(sorted.map((q, i) => ({ ...q, priority: i })));
  }

  function moveDown(fighterId: string) {
    const sorted = [...queue].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(q => q.fighterId === fighterId);
    if (idx === -1 || idx >= sorted.length - 1) return;
    [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
    saveQueue(sorted.map((q, i) => ({ ...q, priority: i })));
  }

  const isQueued = new Set(queue.map(q => q.fighterId));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Queue list */}
      {queuedFighters.length > 0 ? (
        <div style={{ background: "var(--ufc-surface)", border: "1px solid var(--ufc-border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--ufc-border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--ufc-text-3)" }}>
            My Queue {saving && "·  saving…"}
          </div>
          {queuedFighters.map((f, i) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: i < queuedFighters.length - 1 ? "1px solid var(--ufc-border)" : undefined }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ufc-text-3)", width: 18, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
              <Headshot name={f.name} photoUrl={f.photoUrl} weightClass={f.weightClass} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ufc-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <DivTag slot={f.weightClass as any} short />
                  {f.hasUpcomingBout && (
                    <span style={{ fontSize: 10, color: "var(--ufc-accent)", fontWeight: 600 }}>⚡ Upcoming</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => moveUp(f.id)} style={{ background: "var(--ufc-surface-3)", border: "1px solid var(--ufc-border)", borderRadius: 6, padding: "3px 7px", color: "var(--ufc-text-2)", cursor: "pointer", fontSize: 12 }}>↑</button>
                <button onClick={() => moveDown(f.id)} style={{ background: "var(--ufc-surface-3)", border: "1px solid var(--ufc-border)", borderRadius: 6, padding: "3px 7px", color: "var(--ufc-text-2)", cursor: "pointer", fontSize: 12 }}>↓</button>
                <button onClick={() => removeFromQueue(f.id)} style={{ background: "transparent", border: "none", color: "var(--ufc-text-3)", cursor: "pointer", fontSize: 15, padding: "0 4px" }}>×</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "var(--ufc-text-3)", textAlign: "center", padding: "8px 0", margin: 0 }}>
          Tap + to add fighters to your auto-pick queue
        </p>
      )}

      {/* Available fighters with + button */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {fighters.slice(0, 20).map(f => (
          <div key={f.id} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
            background: isQueued.has(f.id) ? "var(--ufc-surface-2, #1a1d26)" : "var(--ufc-surface)",
            border: `1px solid ${isQueued.has(f.id) ? "var(--ufc-accent)" : "var(--ufc-border)"}`,
            borderRadius: 10, opacity: isQueued.has(f.id) ? 0.55 : 1,
          }}>
            <Headshot name={f.name} photoUrl={f.photoUrl} weightClass={f.weightClass} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ufc-text)" }}>{f.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <DivTag slot={f.weightClass as any} short />
                {f.draftScore != null && (
                  <span style={{ fontSize: 10, color: "var(--ufc-text-3)" }}>Score {f.draftScore}</span>
                )}
                {f.hasUpcomingBout && (
                  <span style={{ fontSize: 10, color: "var(--ufc-accent)", fontWeight: 600 }}>⚡</span>
                )}
              </div>
            </div>
            {!isQueued.has(f.id) && (
              <button
                onClick={() => addToQueue(f)}
                style={{
                  flexShrink: 0, background: "var(--ufc-surface-3)", border: "1px solid var(--ufc-border)",
                  borderRadius: 8, padding: "5px 10px", color: "var(--ufc-text-2)", cursor: "pointer", fontWeight: 700, fontSize: 16,
                }}
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
