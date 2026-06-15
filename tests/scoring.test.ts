import { describe, it, expect } from "vitest";
import { computeBoutPoints, type BoutResult } from "../src/lib/scoring/engine";

const base: BoutResult = {
  fighterAId: "a",
  fighterBId: "b",
  winnerId: null,
  method: "DEC",
  isFinish: false,
  isTitleFight: false,
  isMainEvent: false,
  fotn: false,
  fighterAPotn: false,
  fighterBPotn: false,
  fighterARanked: false,
  fighterBRanked: false,
};

describe("computeBoutPoints — §2.5 fixtures", () => {
  it("fixture 1: ranked champ wins title main event by KO earns PotN = 300", () => {
    const bout: BoutResult = {
      ...base,
      winnerId: "a",
      method: "KO",
      isFinish: true,
      isTitleFight: true,
      isMainEvent: true,
      fighterAPotn: true,
      fighterBRanked: true, // opponent was ranked
    };
    const { total, breakdown } = computeBoutPoints(bout, "a");
    expect(breakdown.win).toBe(100);
    expect(breakdown.finish).toBe(50);
    expect(breakdown.rankedWin).toBe(50);
    expect(breakdown.nightBonus).toBe(50);
    expect(breakdown.title).toBe(25);
    expect(breakdown.main).toBe(25);
    expect(total).toBe(300);
  });

  it("fixture 2: fighter loses main event decision = 25", () => {
    const bout: BoutResult = {
      ...base,
      winnerId: "a",
      method: "DEC",
      isMainEvent: true,
    };
    const { total } = computeBoutPoints(bout, "b"); // b is the loser
    expect(total).toBe(25); // only main participation
  });

  it("fixture 3a: FotN prelim decision — winner gets +100 +50 = 150", () => {
    const bout: BoutResult = {
      ...base,
      winnerId: "a",
      method: "DEC",
      fotn: true,
    };
    const { total } = computeBoutPoints(bout, "a");
    expect(total).toBe(150);
  });

  it("fixture 3b: FotN prelim decision — loser gets +50", () => {
    const bout: BoutResult = {
      ...base,
      winnerId: "a",
      method: "DEC",
      fotn: true,
    };
    const { total } = computeBoutPoints(bout, "b");
    expect(total).toBe(50);
  });

  it("fixture 4: wins non-title prelim by SUB over unranked = 150", () => {
    const bout: BoutResult = {
      ...base,
      winnerId: "a",
      method: "SUB",
      isFinish: true,
    };
    const { total } = computeBoutPoints(bout, "a");
    expect(total).toBe(150);
  });

  it("fixture 5: fighter with no bout scores 0", () => {
    const { total } = computeBoutPoints(base, "not-in-bout");
    expect(total).toBe(0);
  });

  it("fixture 6: PotN AND FotN — single +50 night bonus, not +100", () => {
    const bout: BoutResult = {
      ...base,
      winnerId: "a",
      method: "KO",
      isFinish: true,
      fotn: true,
      fighterAPotn: true,
    };
    const { breakdown, total } = computeBoutPoints(bout, "a");
    expect(breakdown.nightBonus).toBe(50); // single +50
    expect(total).toBe(200); // win100 + finish50 + nightBonus50
  });
});

describe("computeBoutPoints — additional rules", () => {
  it("loser gets no win, finish, or rankedWin", () => {
    const bout: BoutResult = {
      ...base,
      winnerId: "a",
      method: "KO",
      isFinish: true,
      fighterARanked: false,
      fighterBRanked: true,
    };
    const { breakdown } = computeBoutPoints(bout, "b");
    expect(breakdown.win).toBeUndefined();
    expect(breakdown.finish).toBeUndefined();
    expect(breakdown.rankedWin).toBeUndefined();
  });

  it("both fighters get title bonus regardless of result", () => {
    const bout: BoutResult = {
      ...base,
      winnerId: "a",
      isTitleFight: true,
    };
    expect(computeBoutPoints(bout, "a").breakdown.title).toBe(25);
    expect(computeBoutPoints(bout, "b").breakdown.title).toBe(25);
  });

  it("both fighters get main event bonus regardless of result", () => {
    const bout: BoutResult = {
      ...base,
      winnerId: "a",
      isMainEvent: true,
    };
    expect(computeBoutPoints(bout, "a").breakdown.main).toBe(25);
    expect(computeBoutPoints(bout, "b").breakdown.main).toBe(25);
  });

  it("FotN credits both fighters", () => {
    const bout: BoutResult = { ...base, winnerId: "a", fotn: true };
    expect(computeBoutPoints(bout, "a").breakdown.nightBonus).toBe(50);
    expect(computeBoutPoints(bout, "b").breakdown.nightBonus).toBe(50);
  });

  it("idempotent — calling twice returns identical total", () => {
    const bout: BoutResult = {
      ...base,
      winnerId: "a",
      method: "KO",
      isFinish: true,
      isMainEvent: true,
      isTitleFight: true,
    };
    const r1 = computeBoutPoints(bout, "a");
    const r2 = computeBoutPoints(bout, "a");
    expect(r1.total).toBe(r2.total);
    expect(r1.breakdown).toEqual(r2.breakdown);
  });

  it("no-fight = no bonus (unranked, non-title, non-main, no finish)", () => {
    const bout: BoutResult = { ...base, winnerId: "a" };
    expect(computeBoutPoints(bout, "a").total).toBe(100);
    expect(computeBoutPoints(bout, "b").total).toBe(0);
  });
});
