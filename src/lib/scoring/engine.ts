export type BoutMethod = "KO" | "TKO" | "SUB" | "DEC" | "DQ" | "NC";

export type BoutResult = {
  fighterAId: string;
  fighterBId: string;
  winnerId: string | null;
  method: BoutMethod;
  isFinish: boolean;
  isTitleFight: boolean;
  isMainEvent: boolean;
  fotn: boolean;
  fighterAPotn: boolean;
  fighterBPotn: boolean;
  fighterARanked: boolean;
  fighterBRanked: boolean;
};

export type Breakdown = Partial<
  Record<"win" | "finish" | "nightBonus" | "rankedWin" | "title" | "main", number>
>;

export type ScoringResult = {
  total: number;
  breakdown: Breakdown;
};

export function computeBoutPoints(
  bout: BoutResult,
  fighterId: string
): ScoringResult {
  const isA = fighterId === bout.fighterAId;
  const isB = fighterId === bout.fighterBId;

  if (!isA && !isB) {
    return { total: 0, breakdown: {} };
  }

  const won = bout.winnerId === fighterId;
  const oppRanked = isA ? bout.fighterBRanked : bout.fighterARanked;
  const gotPotn = isA ? bout.fighterAPotn : bout.fighterBPotn;

  const b: Breakdown = {};

  if (won) b.win = 100;
  if (won && bout.isFinish) b.finish = 50;
  if (won && oppRanked) b.rankedWin = 50;
  if (gotPotn || bout.fotn) b.nightBonus = 50; // single +50 even if both apply
  if (bout.isTitleFight) b.title = 25;         // participation — win or lose
  if (bout.isMainEvent) b.main = 25;           // participation — win or lose

  const total = Object.values(b).reduce((s, n) => s + (n ?? 0), 0);
  return { total, breakdown: b };
}
