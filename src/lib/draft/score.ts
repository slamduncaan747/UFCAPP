export function computeDraftScore(fighter: {
  recordW: number;
  recordL: number;
  recordD: number;
  isChampion: boolean;
  currentRanking: number | null;
}, lastFightDateStr: string | null): number {
  const { recordW, recordL, recordD, isChampion, currentRanking } = fighter;
  const total = recordW + recordL + recordD;
  const winRate = total > 0 ? recordW / total : 0;
  const volumeBonus = Math.min(recordW / 20, 1); // caps at 20 wins

  // Recency: decay score if fighter hasn't fought in a while (days since last fight)
  let recencyFactor = 0.5;
  if (lastFightDateStr) {
    const daysSince = (Date.now() - new Date(lastFightDateStr + "T12:00:00Z").getTime()) / 86_400_000;
    // 1.0 at 0 days, 0.5 at 270 days, 0.0 at 540 days
    recencyFactor = Math.max(0, 1 - daysSince / 540);
  }

  let score = winRate * 40 + volumeBonus * 20 + recencyFactor * 30;

  if (isChampion) score += 20;
  else if (currentRanking !== null && currentRanking <= 5) score += 12;
  else if (currentRanking !== null && currentRanking <= 15) score += 6;

  return Math.round(score * 10) / 10;
}
