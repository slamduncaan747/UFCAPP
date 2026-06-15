/**
 * Snake draft pick-order logic.
 * memberCount members, 9 slots each = 9 * memberCount total picks.
 * Round 1: order[0..N-1], Round 2: order[N-1..0], alternating.
 */
export function getMemberForPick(pickNumber: number, draftOrder: string[]): string {
  const N = draftOrder.length;
  const round = Math.floor(pickNumber / N); // 0-indexed round
  const posInRound = pickNumber % N;

  if (round % 2 === 0) {
    return draftOrder[posInRound];
  } else {
    return draftOrder[N - 1 - posInRound];
  }
}

export function getRound(pickNumber: number, memberCount: number): number {
  return Math.floor(pickNumber / memberCount) + 1; // 1-indexed
}

export function getTotalPicks(memberCount: number): number {
  return 9 * memberCount;
}

/**
 * Determines which slot a fighter should fill given what's already been drafted.
 * Division fighters fill their native slot first; WILDCARD is a fallback.
 */
export function resolveSlot(
  weightClass: string,
  usedSlots: Set<string>
): string | null {
  if (!usedSlots.has(weightClass)) return weightClass;
  if (!usedSlots.has("WILDCARD")) return "WILDCARD";
  return null; // No slot available for this fighter
}
