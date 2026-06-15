// Maps the scraped data's free-text fields onto the app's enums.
// The app's domain is men's UFC, 8 weight classes (see schema weightClassEnum).

export type WeightClass = "FLW" | "BW" | "FW" | "LW" | "WW" | "MW" | "LHW" | "HW";
export type BoutMethod = "KO" | "TKO" | "SUB" | "DEC" | "DQ" | "NC";

// Order matters: "Light Heavyweight" must be tested before "Heavyweight" and
// "Lightweight", since it contains both as substrings.
const TEXT_RULES: [RegExp, WeightClass][] = [
  [/flyweight/i, "FLW"],
  [/bantamweight/i, "BW"],
  [/featherweight/i, "FW"],
  [/light\s*heavyweight/i, "LHW"],
  [/welterweight/i, "WW"],
  [/middleweight/i, "MW"],
  [/lightweight/i, "LW"],
  [/heavyweight/i, "HW"],
];

export function isWomensBout(weightClassText: string | null): boolean {
  return !!weightClassText && /women/i.test(weightClassText);
}

/** lbs → division, used when the free-text class is a catch/open weight. */
export function weightClassFromLbs(lbs: number | null | undefined): WeightClass | null {
  if (!lbs) return null;
  if (lbs <= 126) return "FLW";
  if (lbs <= 136) return "BW";
  if (lbs <= 146) return "FW";
  if (lbs <= 156) return "LW";
  if (lbs <= 171) return "WW";
  if (lbs <= 186) return "MW";
  if (lbs <= 206) return "LHW";
  return "HW";
}

/**
 * Resolve a men's weight class from a fight's free-text class (preferred) with
 * the fighter's listed weight as a fallback. Returns null for women's bouts and
 * unmappable classes so the caller can skip them (app is men's-only).
 */
export function mapWeightClass(
  weightClassText: string | null,
  fallbackLbs?: number | null
): WeightClass | null {
  if (isWomensBout(weightClassText)) return null;
  if (weightClassText) {
    // strip "Light Heavyweight" check ordering handled by rule order
    for (const [re, wc] of TEXT_RULES) {
      if (re.test(weightClassText)) {
        // guard: "Lightweight" rule would wrongly catch "Light Heavyweight";
        // rule order already tests LHW first, so a LW match here is genuine.
        return wc;
      }
    }
  }
  return weightClassFromLbs(fallbackLbs);
}

/**
 * Map free-text method to the bout_method enum + whether it was a finish.
 * Examples: "KO/TKO", "Submission", "Decision - Unanimous", "Decision - Split",
 * "DQ", "Could Not Continue", "Overturned", "Other".
 */
export function mapMethod(
  methodText: string | null
): { method: BoutMethod | null; isFinish: boolean } {
  if (!methodText) return { method: null, isFinish: false };
  const m = methodText.toLowerCase();
  if (m.includes("submission")) return { method: "SUB", isFinish: true };
  if (m.includes("ko/tko") || m === "ko" || m === "tko" || m.includes("knockout"))
    return { method: "TKO", isFinish: true };
  if (m.includes("tko")) return { method: "TKO", isFinish: true };
  if (m.startsWith("ko")) return { method: "KO", isFinish: true };
  if (m.includes("decision")) return { method: "DEC", isFinish: false };
  if (m.includes("dq") || m.includes("disqualification"))
    return { method: "DQ", isFinish: false };
  // No contest, overturned, could not continue, etc.
  return { method: "NC", isFinish: false };
}
